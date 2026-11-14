"""Bounded, cached acquisition. Credentials are consumed only by auth libraries."""

import argparse
import hashlib
import json
import logging
import time
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import quote

import numpy as np
import requests

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / "data" / "raw"
REGIONS = {"eep": (-120, -90, -5, 5), "nwp": (125, 150, 2, 10)}
SOURCES = {
    "viirs": {"base": "https://oceanwatch.pifsc.noaa.gov/erddap",
              "id": "noaa_snpp_chla_monthly", "variables": ["chlor_a"], "stride": 1},
    "mur": {"base": "https://coastwatch.pfeg.noaa.gov/erddap",
            "id": "jplMURSST41mday", "variables": ["sst", "mask", "nobs"], "stride": 10},
}
NASA_FILE = "AQUA_MODIS.20130101_20130131.L3m.MO.CHL.chlor_a.4km.nc"
NASA_URL = "https://obdaac-tea.earthdatacloud.nasa.gov/ob-cumulus-prod-public/" + NASA_FILE
NASA_MIRROR = "https://coastwatch.pfeg.noaa.gov/erddap/files/erdMH1chlamday_R2022SQ/" + NASA_FILE


def bounded_download(url, target, limit, session=None):
    session = session or requests.Session()
    target = Path(target)
    part = target.with_suffix(target.suffix + ".part")
    with session.get(url, stream=True, timeout=(20, 90)) as response:
        response.raise_for_status()
        advertised = int(response.headers.get("Content-Length", 0))
        if advertised > limit:
            raise ValueError("Response exceeds the explicit byte budget")
        target.parent.mkdir(parents=True, exist_ok=True)
        count = 0
        try:
            with part.open("wb") as output:
                for chunk in response.iter_content(chunk_size=262144):
                    if not chunk:
                        continue
                    count += len(chunk)
                    if count > limit:
                        raise ValueError("Response exceeds the explicit byte budget")
                    output.write(chunk)
            if advertised and count != advertised:
                raise ValueError("Incomplete response")
            part.replace(target)
        except BaseException:
            part.unlink(missing_ok=True)
            raise
    return count


def axis_indices(axis, lower, upper):
    values = np.asarray(axis, dtype=float)
    selected = np.flatnonzero((values >= lower - 1e-7) & (values <= upper + 1e-7))
    if not len(selected):
        raise ValueError("Region does not intersect the source grid")
    return int(selected[0]), int(selected[-1])


def build_grid_query(variables, times, latitudes, longitudes, stride=1):
    if stride < 1 or not variables:
        raise ValueError("Invalid grid request")
    suffix = f"[{times[0]}:1:{times[1]}][{latitudes[0]}:{stride}:{latitudes[1]}][{longitudes[0]}:{stride}:{longitudes[1]}]"
    return ",".join(variable + suffix for variable in variables)


def fetch_json(url, target=None):
    if target and Path(target).exists():
        return json.loads(Path(target).read_text(encoding="utf-8"))
    response = requests.get(url, timeout=(15, 45))
    response.raise_for_status()
    data = response.json()
    if target:
        Path(target).parent.mkdir(parents=True, exist_ok=True)
        Path(target).write_text(json.dumps(data), encoding="utf-8")
    return data


def source_axes(key):
    source = SOURCES[key]
    axes = {}
    for axis in ("time", "latitude", "longitude"):
        url = f"{source['base']}/griddap/{source['id']}.json?{axis}"
        payload = fetch_json(url, RAW / f"{key}-{axis}.json")
        axes[axis] = [row[0] for row in payload["table"]["rows"]]
    return axes


def acquire_year(key, region, year, *, stride=None):
    source = SOURCES[key]
    stride = source["stride"] if stride is None else stride
    target = RAW / f"{key}-{region}-{year}-stride{stride}.nc"
    if target.exists():
        return target
    axes = source_axes(key)
    times = [i for i, value in enumerate(axes["time"]) if str(value).startswith(str(year) + "-")]
    if not times:
        raise ValueError(f"No {key} observations for {year}")
    west, east, south, north = REGIONS[region]
    if min(axes["longitude"]) >= 0:
        west, east = west % 360, east % 360
    latitudes = axis_indices(axes["latitude"], south, north)
    longitudes = axis_indices(axes["longitude"], west, east)
    query = build_grid_query(source["variables"], (times[0], times[-1]), latitudes, longitudes, stride)
    url = f"{source['base']}/griddap/{source['id']}.nc?" + quote(query, safe=",:[]")
    size = bounded_download(url, target, 80 * 1024 * 1024)
    manifest = {"source": source["id"], "region": region, "year": year, "stride": stride,
                "query": query, "bytes": size, "sha256": hashlib.sha256(target.read_bytes()).hexdigest(),
                "retrievedAt": datetime.now(timezone.utc).isoformat()}
    target.with_suffix(".manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    print(json.dumps({"downloaded": target.name, "bytes": size}), flush=True)
    return target


def acquire_spatial_validation(region, year=2013, month=1, mask_only=False):
    source = SOURCES["mur"]
    axes = source_axes("mur")
    key = f"{year:04d}-{month:02d}"
    selected = [i for i, value in enumerate(axes["time"]) if str(value).startswith(key)]
    if len(selected) != 1:
        raise ValueError("Expected one monthly MUR observation")
    target = RAW / (f"mur-mask-{region}.nc" if mask_only else f"mur-native-{region}-{key}.nc")
    if target.exists():
        return target
    west, east, south, north = REGIONS[region]
    query = build_grid_query(["mask"] if mask_only else ["sst", "mask", "nobs"],
                             (selected[0], selected[0]),
                             axis_indices(axes["latitude"], south, north),
                             axis_indices(axes["longitude"], west, east), 1)
    url = f"{source['base']}/griddap/{source['id']}.nc?" + quote(query, safe=",:[]")
    size = bounded_download(url, target, 40 * 1024 * 1024)
    print(json.dumps({"downloaded": target.name, "bytes": size}), flush=True)
    return target


def probe_cds():
    import cdsapi
    request = {"variable": ["mass_concentration_of_chlorophyll_a"],
               "projection": "regular_latitude_longitude_grid", "temporal_resolution": "monthly",
               "year": ["2013"], "month": ["01"], "version": "6_0"}
    status = {"dataset": "satellite-ocean-colour", "request": request,
              "checkedAt": datetime.now(timezone.utc).isoformat(), "status": "not_started"}
    remote = None
    try:
        client = cdsapi.Client(quiet=True, debug=False, timeout=20, retry_max=1,
                               sleep_max=2, wait_until_complete=False)
        remote = client.retrieve("satellite-ocean-colour", request)
        deadline = time.monotonic() + 45
        while time.monotonic() < deadline:
            if remote.results_ready:
                result = remote.get_results()
                status.update(status="available", globalFileBytes=result.content_length)
                if result.content_length <= 96 * 1024 * 1024:
                    target = RAW / "cds-2013-01.nc"
                    bounded_download(result.location, target, 96 * 1024 * 1024)
                    status["sampleDownloaded"] = True
                else:
                    status["sampleDownloaded"] = False
                    status["reason"] = "Global file exceeds the 96 MiB feasibility budget; regional subsets unavailable."
                break
            time.sleep(2)
        else:
            status.update(status="timed_out", reason="Bounded 45-second request readiness limit reached")
            remote.delete()
    except Exception as exc:
        response = getattr(exc, "response", None)
        status.update(status="failed", errorType=type(exc).__name__,
                      httpStatus=getattr(response, "status_code", None))
        if "Missing/incomplete configuration" in str(exc):
            status["reason"] = "CDS local credential configuration is unavailable in this Windows profile."
    ROOT.joinpath("data").mkdir(exist_ok=True)
    ROOT.joinpath("data", "access-status.json").write_text(json.dumps(status, indent=2), encoding="utf-8")
    print(json.dumps(status), flush=True)


def acquire_nasa_verification():
    import earthaccess
    target = RAW / NASA_FILE
    if target.exists():
        return target
    authenticated = False
    metadata = fetch_json("https://cmr.earthdata.nasa.gov/search/concepts/G3509017444-OB_CLOUD.umm_json",
                          RAW / "nasa-verification-cmr.json")
    archive = metadata["DataGranule"]["ArchiveAndDistributionInformation"][0]
    expected_size = int(archive["SizeInBytes"])
    try:
        size = bounded_download(NASA_MIRROR, target, 64 * 1024 * 1024)
    except requests.HTTPError as exc:
        if exc.response.status_code not in (401, 403):
            raise
        auth = earthaccess.login(strategy="netrc")
        if not auth.authenticated:
            raise RuntimeError("NASA Earthdata local authentication was not accepted")
        session = earthaccess.get_requests_https_session()
        size = bounded_download(NASA_URL, target, 64 * 1024 * 1024, session)
        authenticated = True
    if target.read_bytes()[:4] not in (b"\x89HDF", b"CDF\x01", b"CDF\x02"):
        target.unlink(missing_ok=True)
        raise ValueError("NASA endpoint returned a non-NetCDF document; no observations accepted")
    if size != expected_size:
        target.unlink(missing_ok=True)
        raise ValueError("NASA mirror size differs from NASA's granule metadata")
    checksum = archive.get("Checksum", {})
    if checksum.get("Algorithm", "").upper() in ("MD5", "SHA-256", "SHA256"):
        algorithm = "md5" if checksum["Algorithm"].upper() == "MD5" else "sha256"
        actual = hashlib.new(algorithm, target.read_bytes()).hexdigest()
        if actual.lower() != checksum["Value"].lower():
            target.unlink(missing_ok=True)
            raise ValueError("NASA mirror checksum differs from NASA's granule metadata")
    print(json.dumps({"downloaded": NASA_FILE, "bytes": size, "authenticated": authenticated}), flush=True)
    return target


def main():
    logging.disable(logging.INFO)
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("command", choices=["probe-cds", "axes", "year", "nasa-verification", "history", "masks", "validate-spatial"])
    parser.add_argument("--source", choices=list(SOURCES), default="viirs")
    parser.add_argument("--region", choices=list(REGIONS), default="eep")
    parser.add_argument("--year", type=int, default=2013)
    parser.add_argument("--start-year", type=int, default=2012)
    parser.add_argument("--end-year", type=int, default=2025)
    args = parser.parse_args()
    if args.command == "probe-cds":
        probe_cds()
    elif args.command == "axes":
        axes = source_axes(args.source)
        print(json.dumps({axis: {"count": len(values), "first": values[0], "last": values[-1]}
                          for axis, values in axes.items()}))
    elif args.command == "year":
        acquire_year(args.source, args.region, args.year)
    elif args.command == "nasa-verification":
        acquire_nasa_verification()
    elif args.command == "masks":
        for region in REGIONS:
            acquire_spatial_validation(region, mask_only=True)
    elif args.command == "validate-spatial":
        for year, month in ((2013, 1), (2019, 7), (2025, 10)):
            for region in REGIONS:
                acquire_spatial_validation(region, year, month)
    else:
        for year in range(args.start_year, args.end_year + 1):
            for region in REGIONS:
                acquire_year(args.source, region, year)


if __name__ == "__main__":
    main()
