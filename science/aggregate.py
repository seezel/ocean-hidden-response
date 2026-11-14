"""Spatial reduction of licensed ocean observations, never temporal filling."""

import numpy as np


def aggregate_month(values, latitudes, *, variable, ocean_mask=None,
                    quality_mask=None, cell_areas=None):
    if variable not in {"chlor_a", "sst"}:
        raise ValueError("Unknown variable")
    data = np.asarray(np.ma.filled(np.ma.asarray(values, dtype=float), np.nan))
    latitudes = np.asarray(latitudes, dtype=float)
    if data.ndim != 2 or latitudes.shape != (data.shape[0],):
        raise ValueError("Values must be latitude-by-longitude with matching latitudes")
    if not np.all(np.isfinite(latitudes)) or np.any(np.abs(latitudes) > 90):
        raise ValueError("Invalid latitude coordinates")
    ocean = np.ones(data.shape, dtype=bool) if ocean_mask is None else np.asarray(ocean_mask, dtype=bool)
    quality = np.ones(data.shape, dtype=bool) if quality_mask is None else np.asarray(quality_mask, dtype=bool)
    if ocean.shape != data.shape or quality.shape != data.shape:
        raise ValueError("Masks must match the spatial grid")
    if cell_areas is None:
        weights = np.broadcast_to(np.cos(np.deg2rad(latitudes))[:, None], data.shape)
    else:
        weights = np.asarray(cell_areas, dtype=float)
        if weights.shape != data.shape or not np.all(np.isfinite(weights)) or np.any(weights <= 0):
            raise ValueError("Cell areas must be finite positive areas matching the grid")
    valid = ocean & quality & np.isfinite(data)
    if variable == "chlor_a":
        valid &= data > 0
    denominator = float(weights[ocean].sum())
    valid_area = float(weights[valid].sum())
    result = {"value": None, "coverage": valid_area / denominator if denominator > 0 else 0.0,
              "validCells": int(valid.sum()), "oceanCells": int(ocean.sum())}
    if valid_area > 0:
        response = np.log(data[valid]) if variable == "chlor_a" else data[valid]
        reduced = float(np.sum(response * weights[valid]) / valid_area)
        result["value"] = float(np.exp(reduced)) if variable == "chlor_a" else reduced
    return result


def normalize_longitudes(longitudes):
    values = np.asarray(longitudes, dtype=float)
    return (values + 180) % 360 - 180


def region_mask(latitudes, longitudes, bounds):
    west, east, south, north = bounds
    latitudes = np.asarray(latitudes, dtype=float)
    longitudes = normalize_longitudes(longitudes)
    latitude_ok = (latitudes >= south) & (latitudes <= north)
    longitude_ok = ((longitudes >= west) & (longitudes <= east)) if west <= east else (
        (longitudes >= west) | (longitudes <= east))
    return latitude_ok[:, None] & longitude_ok[None, :]
