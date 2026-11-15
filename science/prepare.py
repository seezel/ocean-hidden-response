"""Reduce acquired native/source-sampled grids into traceable monthly records."""

import json
from pathlib import Path

import netCDF4
import numpy as np

from science.acquire import RAW, REGIONS, ROOT, NASA_FILE
from science.aggregate import aggregate_month, normalize_longitudes


def nearest_indices(axis, targets):
    axis = np.asarray(axis, dtype=float)
    targets = np.asarray(targets, dtype=float)
    ascending = axis[0] <= axis[-1]
    ordered = axis if ascending else axis[::-1]
    high = np.clip(np.searchsorted(ordered, targets), 0, len(ordered) - 1)
    low = np.maximum(high - 1, 0)
    nearest = np.where(abs(ordered[low] - targets) <= abs(ordered[high] - targets), low, high)
    return nearest if ascending else len(axis) - 1 - nearest


def read_regional_file(path, region, source, ocean_mask):
    variable = "chlor_a" if source == "viirs" else "sst"
    records = []
    with netCDF4.Dataset(path) as file:
        data = file.variables[variable]
        units = data.units
        if variable == "sst" and units not in {"degree_C", "degrees_C", "degC", "Celsius", "kelvin", "K"}:
            raise ValueError("Unrecognized SST units")
        if variable == "chlor_a" and units not in {"mg m-3", "mg m^-3", "mg/m3"}:
            raise ValueError("Unrecognized chlorophyll units")
        times = netCDF4.num2date(file.variables["time"][:], file.variables["time"].units)
        latitudes = file.variables["latitude"][:]
        for index, timestamp in enumerate(times):
            values = np.ma.filled(data[index], np.nan).astype(float)
            if units in {"kelvin", "K"}:
                values -= 273.15
            ocean = ocean_mask
            quality = np.ones(values.shape, dtype=bool)
            if "mask" in file.variables:
                ocean = np.ma.filled(file.variables["mask"][index], 0) == 1
            if "nobs" in file.variables:
                quality &= np.ma.filled(file.variables["nobs"][index], 0) > 0
            reduced = aggregate_month(values, latitudes, variable=variable,
                                      ocean_mask=ocean, quality_mask=quality)
            records.append({"month": timestamp.strftime("%Y-%m"), "region": region,
                            "variable": variable, "units": "mg/m3" if variable == "chlor_a" else "degC",
                            "provenance": "noaa-viirs-monthly" if source == "viirs" else "nasa-mur-monthly",
                            **reduced})
    return records


def complete_calendar(records, start, end):
    if not records:
        return []
    by_month = {record["month"]: record for record in records}
    if len(by_month) != len(records):
        raise ValueError("Duplicate source months")
    first = int(start[:4]) * 12 + int(start[5:]) - 1
    last = int(end[:4]) * 12 + int(end[5:]) - 1
    completed = []
    for index in range(first, last + 1):
        month = f"{index // 12:04d}-{index % 12 + 1:02d}"
        completed.append(by_month.get(month, {**records[0], "month": month, "value": None,
                                             "coverage": 0.0, "validCells": 0}))
    return completed


def mask_for_grid(region, latitudes, longitudes):
    with netCDF4.Dataset(RAW / f"mur-mask-{region}.nc") as file:
        lat_indices = nearest_indices(file.variables["latitude"][:], latitudes)
        lon_indices = nearest_indices(file.variables["longitude"][:], normalize_longitudes(longitudes))
        native = np.ma.filled(file.variables["mask"][0], 0)
        return native[np.ix_(lat_indices, lon_indices)] == 1


def prepare_records():
    records = []
    for source in ("viirs", "mur"):
        for region in REGIONS:
            regional = []
            for path in sorted(RAW.glob(f"{source}-{region}-20??-stride*.nc")):
                with netCDF4.Dataset(path) as file:
                    ocean = mask_for_grid(region, file.variables["latitude"][:], file.variables["longitude"][:])
                regional.extend(read_regional_file(path, region, source, ocean))
            records.extend(complete_calendar(regional, "2012-01", "2025-12"))
    return sorted(records, key=lambda row: (row["variable"], row["region"], row["month"]))


def nasa_verification():
    path = RAW / NASA_FILE
    if not path.exists():
        return {"status": "blocked", "note": "NASA verification file has not been acquired; no values are shown."}
    results = {}
    with netCDF4.Dataset(path) as file:
        latitude = file.variables["lat"][:]
        longitude = normalize_longitudes(file.variables["lon"][:])
        for region, (west, east, south, north) in REGIONS.items():
            lat_indices = np.flatnonzero((latitude >= south) & (latitude <= north))
            lon_indices = np.flatnonzero((longitude >= west) & (longitude <= east))
            values = np.ma.filled(file.variables["chlor_a"][lat_indices, lon_indices], np.nan)
            ocean = mask_for_grid(region, latitude[lat_indices], longitude[lon_indices])
            results[region] = aggregate_month(values, latitude[lat_indices], variable="chlor_a", ocean_mask=ocean)
        collection_processing = str(getattr(file, "processing_version", "not specified in granule"))
    return {"status": "verified", "month": "2013-01", "source": "nasa-modis-r2022-verification",
            "results": results, "granuleProcessingVersion": collection_processing,
            "sha256": __import__("hashlib").sha256(path.read_bytes()).hexdigest(),
            "note": "One authentic NASA MODIS Aqua monthly record is used as a separate source verification. Different algorithms and masks can produce different concentrations; one month does not verify trend agreement."}


def spatial_validation():
    checks = []
    for path in sorted(RAW.glob("mur-native-*.nc")):
        region = path.name.split("-")[2]
        month = path.stem[-7:]
        year = month[:4]
        with netCDF4.Dataset(path) as file:
            ocean = np.ma.filled(file.variables["mask"][0], 0) == 1
        native = read_regional_file(path, region, "mur", ocean)[0]
        sampled_path = RAW / f"mur-{region}-{year}-stride10.nc"
        with netCDF4.Dataset(sampled_path) as file:
            sampled_ocean = mask_for_grid(region, file.variables["latitude"][:], file.variables["longitude"][:])
        sampled = next(row for row in read_regional_file(sampled_path, region, "mur", sampled_ocean) if row["month"] == month)
        delta = abs(native["value"] - sampled["value"])
        checks.append({"region": region, "month": month, "nativeMean": native["value"],
                       "sampledMean": sampled["value"], "absoluteDifferenceDegC": delta})
    if len(checks) != 6 or any(check["absoluteDifferenceDegC"] > 0.05 for check in checks):
        raise ValueError("SST spatial sampling has not passed the predefined six-case 0.05 degree C check")
    return {"method": "Every tenth native latitude/longitude coordinate, 0.1 degree spacing; area weighted",
            "validationToleranceDegC": 0.05, "checks": checks,
            "limitation": "Six native-grid checks bound observed sample differences only; they do not guarantee every month's spatial sampling error."}


def main():
    records = prepare_records()
    payload = {"schemaVersion": 1,
               "regions": {key: {"name": "Eastern equatorial Pacific" if key == "eep" else "Northwestern tropical Pacific",
                                  "bounds": list(bounds)} for key, bounds in REGIONS.items()},
               "variables": {"chlor_a": {"label": "Surface chlorophyll-a", "units": "mg/m3", "source": "noaa-viirs-monthly"},
                             "sst": {"label": "Sea surface temperature", "units": "degC", "source": "nasa-mur-monthly"}},
               "records": records}
    (ROOT / "data" / "observations.json").write_text(json.dumps(payload, indent=2, allow_nan=False) + "\n", encoding="utf-8", newline="\n")
    validation = spatial_validation()
    (ROOT / "data" / "spatial-validation.json").write_text(json.dumps(validation, indent=2, allow_nan=False) + "\n", encoding="utf-8")
    (ROOT / "data" / "nasa-verification.json").write_text(json.dumps(nasa_verification(), indent=2, allow_nan=False) + "\n", encoding="utf-8")
    print(json.dumps({"records": len(records), "observed": sum(row["value"] is not None for row in records),
                      "spatialChecks": len(validation["checks"])}))


if __name__ == "__main__":
    main()
