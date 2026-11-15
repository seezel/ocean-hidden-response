"""Freeze and independently reproduce public reference results from processed records."""

import argparse
import csv
import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path
import zipfile

from science.acquire import ROOT, REGIONS
from science.analyze import fit_trend, compare_trends, MODEL_VERSION

INTERVAL = {"start": "2013-01", "end": "2025-12"}


def read_json(path):
    return json.loads(Path(path).read_text(encoding="utf-8"))


def calculate_reference(observations, interval=INTERVAL):
    results = {}
    for variable in ("chlor_a", "sst"):
        rows = {region: [row for row in observations["records"]
                         if row["variable"] == variable and row["region"] == region] for region in REGIONS}
        results[variable] = {region: fit_trend(records, variable, **interval) for region, records in rows.items()}
        if variable == "chlor_a":
            results[variable]["comparison"] = compare_trends(rows["eep"], rows["nwp"], **interval)
    return results


def public_provenance():
    spatial = read_json(ROOT / "data" / "spatial-validation.json")
    verification = read_json(ROOT / "data" / "nasa-verification.json")
    return {"schemaVersion": 1, "generatedAt": datetime.now(timezone.utc).isoformat(),
        "referenceSelection": "2013-01 through 2025-12, fixed before viewing regional outcomes: a conservative post-startup fallback record ending in the last elapsed calendar year. Missing observations remain missing.",
        "acquisitionDecision": "Copernicus C3S v6.0 was preferred. After local configuration was updated, the authenticated January 2013 request succeeded, returning a 177,604,652-byte global file. This exceeds the prespecified 96 MiB feasibility cap, and the documented interface offers no regional subsetting. The approved Q56 NOAA VIIRS fallback is retained, with its shorter historical interval disclosed. No Copernicus or VIIRS records are spliced.",
        "cdsFeasibility": {"authenticatedRequestSucceeded": True, "globalFileBytes": 177604652,
                           "downloadBudgetBytes": 100663296, "sampleDownloaded": False,
                           "checkedAt": "2026-11-14T02:55:11.125260+00:00"},
        "sources": [
            {"id": "noaa-viirs-monthly", "title": "Suomi-NPP VIIRS monthly chlorophyll-a",
             "producer": "NOAA/NESDIS/STAR Ocean Color Team", "version": "Provider processing_version: Unspecified; acquired 2026-11-14",
             "url": "https://oceanwatch.pifsc.noaa.gov/erddap/griddap/noaa_snpp_chla_monthly.html",
             "licence": "Provider: These data may be redistributed and used without restriction.",
             "doi": None, "temporalCoverage": "Packaged 2012-01 through 2025-12; source gaps preserved",
             "processing": "Native 0.0375 degree grid, source valid range and quality masking, native MUR ocean mask mapped by nearest coordinate, cosine-latitude weighted geometric regional mean of positive concentrations.",
             "limitations": "Single-instrument fallback is shorter than the preferred C3S record. Satellite chlorophyll is a near-surface optical estimate, not total phytoplankton biomass. Cloud/mask changes and unspecified processing version may affect comparability."},
            {"id": "nasa-mur-monthly", "title": "NASA JPL MUR v4.1-derived monthly SST",
             "producer": "NASA JPL (daily foundation analysis); NOAA ERD (monthly composite)", "version": "MUR fv04.1",
             "url": "https://coastwatch.pfeg.noaa.gov/erddap/griddap/jplMURSST41mday.html",
             "licence": "NOAA mirror permits free use and redistribution, without warranty.",
             "doi": "10.5067/GHGMR-4FJ04", "temporalCoverage": "Packaged 2012-01 through 2025-12; source gaps preserved",
             "processing": "0.1 degree spatial sample of native 0.01 degree product, open-sea mask and positive nobs; cosine-latitude weighted arithmetic mean in degrees Celsius. Six native-resolution month/region checks passed the predefined 0.05 degree C tolerance.",
             "limitations": "Blended foundation-temperature analysis, not one instrument's direct measurement. Spatial sampling may introduce errors beyond the six checked cases."},
            {"id": "nasa-modis-r2022-verification", "title": "NASA MODIS Aqua R2022 monthly chlorophyll-a verification",
             "producer": "NASA GSFC Ocean Biology Processing Group", "version": "Collection 2022.0; granule patch recorded separately",
             "url": "https://www.earthdata.nasa.gov/data/catalog/ob-cloud-modisa-l3m-chl-2022.0",
             "licence": "NASA Earth science data openly shared without restriction; cite the producer and product.",
             "doi": "10.5067/AQUA/MODIS/L3M/CHL/2022", "temporalCoverage": "January 2013 verification month only",
             "processing": "Exact NASA monthly granule from public NOAA R2022 mirror, checked against NASA granule size and checksum when supplied; strict regional crop and area-weighted positive log-space average. Kept separate from VIIRS observations and all fitted trend series.",
             "limitations": "One independent source month establishes a traceable NASA-data use, not validation of trend agreement. Algorithms and masks differ."}
        ],
        "nasaResourceEvidence": {
            "challengeResources": "https://www.spaceappschallenge.org/2026/challenges/earth-system-trend-detective/?tab=resources",
            "listedResource": "Giovanni", "field": "MODISA_L3m_CHL_Mo_4km_R2022_0_chlor_a",
            "catalogue": "https://giovanni.gsfc.nasa.gov/giovanni/daac-bin/catalogServices.pl?q=dataFieldId%3AMODISA_L3m_CHL_Mo_4km_R2022_0_chlor_a&version=2.2&wt=json&rows=1",
            "granule": "https://cmr.earthdata.nasa.gov/search/concepts/G3509017444-OB_CLOUD.umm_json",
            "mirror": "https://coastwatch.pfeg.noaa.gov/erddap/files/erdMH1chlamday_R2022SQ/AQUA_MODIS.20130101_20130131.L3m.MO.CHL.chlor_a.4km.nc",
            "claim": "The application actually uses monthly NASA chlorophyll observations from a product supported by the challenge-listed Giovanni portal. This provenance evidence does not guarantee a judging eligibility decision."},
        "verification": verification, "spatialValidation": spatial,
        "limitations": [
            "Regional rectangles are predefined reference areas; they do not by themselves isolate an ocean process or establish causation.",
            "HAC confidence intervals and p-values are approximate. Lag sensitivity is reported rather than selecting favorable settings.",
            "Custom windows are exploratory; choosing many windows can produce chance significance.",
            "Missing months and low-coverage observations are never imputed. Coverage reports sampled ocean area for SST and native-grid ocean area for chlorophyll.",
            "The packaged historical record is frozen. No authenticated browser requests or unvalidated live significance are offered."
        ]}


def freeze():
    observations_path = ROOT / "data" / "observations.json"
    observations = read_json(observations_path)
    observations_path.write_text(json.dumps(observations, indent=2, allow_nan=False) + "\n", encoding="utf-8", newline="\n")
    results = calculate_reference(observations)
    failed = [(variable, key, result["reason"]) for variable, values in results.items()
              for key, result in values.items() if not result["eligible"]]
    if failed:
        raise ValueError(f"Reference analysis is unavailable: {failed}")
    payload = {"schemaVersion": 1, "interval": INTERVAL, "modelVersion": MODEL_VERSION,
               "inputSha256": hashlib.sha256(observations_path.read_bytes()).hexdigest(), "results": results}
    (ROOT / "data" / "reference-results.json").write_text(json.dumps(payload, indent=2, allow_nan=False) + "\n", encoding="utf-8")
    (ROOT / "data" / "provenance.json").write_text(json.dumps(public_provenance(), indent=2, allow_nan=False) + "\n", encoding="utf-8")
    downloads = ROOT / "downloads"
    downloads.mkdir(exist_ok=True)
    with (downloads / "observations.csv").open("w", newline="", encoding="utf-8") as output:
        fields = ["month", "region", "variable", "value", "units", "coverage", "validCells", "oceanCells", "provenance"]
        writer = csv.DictWriter(output, fieldnames=fields)
        writer.writeheader()
        writer.writerows(observations["records"])
    print(json.dumps({variable: {key: {"n": result["n"], "rate": result["trendPerDecade"],
                                                   "p": result["pValue"], "lagSensitive": result["diagnostics"].get("significanceChangesWithLag")}
                               for key, result in values.items()} for variable, values in results.items()}))


def verify():
    reference = read_json(ROOT / "data" / "reference-results.json")
    path = ROOT / "data" / "observations.json"
    if hashlib.sha256(path.read_bytes()).hexdigest() != reference["inputSha256"]:
        raise ValueError("Published observations differ from the frozen reference input")
    recalculated = calculate_reference(read_json(path), reference["interval"])
    for variable, values in recalculated.items():
        for key, result in values.items():
            frozen = reference["results"][variable][key]
            for field in ("slopePerYear", "trendPerDecade", "pValue"):
                if abs(result[field] - frozen[field]) > 1e-8:
                    raise ValueError(f"Reproduction mismatch: {variable}/{key}/{field}")
            if max(abs(a - b) for a, b in zip(result["ci95"], frozen["ci95"])) > 1e-8:
                raise ValueError(f"Reproduction confidence interval mismatch: {variable}/{key}")
    print("Verified all five frozen analyses from published processed observations; input SHA-256 matches.")


def package():
    paths = [
        "README.md", "LICENSE", "requirements.txt", "package.json", "package-lock.json",
        "index.html", "assets/styles.css", "tools/build.mjs",
        "assets/ne_110m_land.geojson", "assets/map-source.json", "assets/MAP-SOURCES.md",
        "assets/BRAND-SOURCES.md", "assets/logo-mark.svg", "assets/favicon.svg",
        "assets/favicon.ico", "assets/favicon-16x16.png", "assets/favicon-32x32.png",
        "assets/apple-touch-icon.png", "assets/social-preview.png",
        "tools/generate-brand-assets.mjs", "playwright.config.js",
        "tests/browser/investigation.spec.js", "tests/browser/enhancement.spec.js",
        "tests/browser/v4-navigation.spec.js", "tests/browser/v4-findings.spec.js",
        "tests/browser/v4-forced-colors.spec.js", "docs/statistics-report.md",
        "data/observations.json", "data/reference-results.json", "data/provenance.json",
        "data/spatial-validation.json", "data/nasa-verification.json", "data/README.md",
        "downloads/observations.csv"
    ]
    paths.extend(str(path.relative_to(ROOT)).replace("\\", "/") for folder, pattern in
                 (("science", "*.py"), ("src", "*.js"), ("tests", "*.py"), ("tests", "*.js"), ("tests/fixtures", "*.json"))
                 for path in (ROOT / folder).glob(pattern))
    target = ROOT / "downloads" / "reproduction.zip"
    target.parent.mkdir(exist_ok=True)
    observations = read_json(ROOT / "data" / "observations.json")
    with (target.parent / "observations.csv").open("w", newline="", encoding="utf-8") as output:
        fields = ["month", "region", "variable", "value", "units", "coverage", "validCells", "oceanCells", "provenance"]
        writer = csv.DictWriter(output, fieldnames=fields)
        writer.writeheader()
        writer.writerows(observations["records"])
    with zipfile.ZipFile(target, "w", compression=zipfile.ZIP_DEFLATED) as archive:
        for name in sorted(set(paths)):
            path = ROOT / name
            if not path.is_file():
                raise ValueError(f"Reproduction input missing: {name}")
            archive.write(path, name)
    print(json.dumps({"package": "downloads/reproduction.zip", "files": len(set(paths)), "bytes": target.stat().st_size}))


def parity_cases():
    data = read_json(ROOT / "data" / "observations.json")
    windows = [("2013-01", "2025-12"), ("2012-01", "2024-12"),
               ("2014-01", "2025-12"), ("2013-02", "2025-11"), ("2020-01", "2025-12")]
    cases = []
    fields = ["eligible", "n", "slopePerYear", "trendPerDecade", "ci95", "pValue"]
    for start, end in windows:
        result = calculate_reference(data, {"start": start, "end": end})
        expected = {variable: {key: {field: value[field] for field in fields}
                               for key, value in values.items()} for variable, values in result.items()}
        cases.append({"start": start, "end": end, "expected": expected})
    target = ROOT / "tests" / "fixtures" / "statistics-real.json"
    target.write_text(json.dumps({"label": "Real licensed observations; Python oracle for independent JS parity",
                                  "modelVersion": MODEL_VERSION, "cases": cases}, indent=2, allow_nan=False) + "\n", encoding="utf-8")
    print(f"Wrote {len(cases)} real-data parity windows, including an insufficient interval.")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--verify", action="store_true")
    parser.add_argument("--package", action="store_true")
    parser.add_argument("--parity", action="store_true")
    args = parser.parse_args()
    if args.verify:
        verify()
    elif args.package:
        package()
    elif args.parity:
        parity_cases()
    else:
        freeze()


if __name__ == "__main__":
    main()
