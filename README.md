# The Ocean's Hidden Response

An English-language static investigation of surface chlorophyll-a and sea surface temperature in two Pacific reference regions, built for NASA Space Apps Challenge 2026, Yogyakarta, **Be An Earth System Trend Detective!**

The application uses authentic licensed monthly observations, a seasonally adjusted trend model, uncertainty estimates that account for temporal dependence, and a direct comparison of regional chlorophyll trends. Custom date windows recalculate the supported statistics in the browser. They are labelled exploratory. Insufficient selections show observations and a reason instead of significance.

The page opens with the research question and a clearly fixed reference finding. Its optional one-minute guide includes working chlorophyll and temperature examples. Regional trend intervals and the direct paired comparison use separate, labelled scales with zero references and numerical equivalents. A locally bundled Natural Earth land map locates the exact region bounds; it is contextual geography, not the analytical ocean mask.

Applied measure, region and dates are shareable in the URL. Invalid links restore the reference selection with an explanation. Draft dates clear results and disable sharing/export until applied. The selected-observation CSV retains explicit nulls, calendar gaps, units, coverage, cell counts and provenance. Row status describes input screening only, not whole-window inferential eligibility. It contains no fitted results. The full archive CSV and reproduction ZIP remain available separately.

V3 changes are local and await human release review. See [the release audit](docs/website-release-audit.md) for verification, known limits and safe PR incorporation, and [map sources](assets/MAP-SOURCES.md) for the public-domain basemap attribution.

## Run locally

Python and Node are development tools only; the public application has no backend, accounts, trackers, or third-party CDN dependencies.

Windows PowerShell:

```powershell
python3 -m venv .venv
& .\.venv\Scripts\python.exe -m pip install -r requirements.txt
npm test
& .\.venv\Scripts\python.exe -m pytest -q
& .\.venv\Scripts\python.exe -m science.export --verify
& .\.venv\Scripts\python.exe -m science.export --package
npm run build
& .\.venv\Scripts\python.exe -m http.server 8000 --bind 127.0.0.1 --directory dist
```

Open http://127.0.0.1:8000. On macOS/Linux use `python3` and `.venv/bin/python` instead of the Windows virtual-environment path. The recorded development environment is Python 3.14 and Node 24. Do not use the broken unrelated MSYS2 `python` command found on the original Windows PATH.

The `dist/` directory is the public static artifact. The build copies an explicit whitelist, excluding raw downloads, authentication files, Git metadata, virtual environments and test fixtures. Serve it through HTTP; opening an ES-module application directly with a `file:` URL is not supported.

After starting the server, run `npx --no-install playwright test` for browser checks. The checked-in configuration uses installed Windows Chrome; on another platform, set its executable path or use a locally installed Playwright browser. JavaScript unit tests run one file at a time to avoid unnecessary memory pressure on the target laptop. No authenticated acquisition is needed for website verification.

## Observations and regions

| Region | Longitude | Latitude |
| --- | --- | --- |
| Eastern equatorial Pacific (EEP) | 120°W to 90°W | 5°S to 5°N |
| Northwestern tropical Pacific (NWP) | 125°E to 150°E | 2°N to 10°N |

These fixed rectangles are reference areas, not claims about a single physical driver. They must not be silently redefined. No spatial prediction or causal attribution is offered.

The packaged record covers 2012–2025. The reference window is **January 2013–December 2025**, fixed before inspecting outcomes to avoid the initial instrument startup period and stop at the last elapsed calendar year. Each reference fit uses 154 eligible months out of 156 calendar months. Missing source months remain explicit null records. The record is historical and frozen, not real-time monitoring.

- Chlorophyll: NOAA/NESDIS/STAR Suomi-NPP VIIRS `noaa_snpp_chla_monthly`, native 0.0375° grid. This is the approved fallback. The authenticated Copernicus C3S v6.0 request succeeded after local configuration was updated, but its January 2013 global file is 177,604,652 bytes, above the prespecified 96 MiB feasibility cap. Regional subsetting is unavailable through the documented interface. Copernicus and VIIRS are never spliced.
- SST: NOAA monthly composites of NASA JPL MUR fv04.1. A 0.1° coordinate sample is used for tractable regional processing. Six prespecified native-grid checks differ by at most 0.0133°C, within the 0.05°C check tolerance. This does not bound every month's sampling error.
- Separate NASA verification: the authentic January 2013 NASA MODIS Aqua R2022 chlorophyll granule, obtained from a public NOAA mirror. Its exact filename and 58,198,505-byte size match NASA CMR. Its collection is explicitly supported by the challenge-listed Giovanni portal. The two regional averages are actually displayed in the application, separate from the VIIRS trend record. One month does not validate trend agreement or guarantee a judging decision.

Source products, licence statements, actual processing details, NASA-resource links, checksums and caveats are in `data/provenance.json` and `data/README.md`.

## Reproduce the reference results

From the distributed processed data, with no account or network request:

```powershell
& .\.venv\Scripts\python.exe -m science.export --verify
```

This checks the exact published input SHA-256 and independently reruns all five Python reference fits, comparing annual slope, decade rate, p-value and confidence limits with the frozen record at 1e-8 absolute tolerance. Browser/Python real-data parity tests additionally cover five full, custom and insufficient windows at 1e-6 tolerance. Statistical synthetic tests compare the Python implementation with statsmodels and a separate missing-calendar covariance oracle.

To reacquire and recompute the public-source record:

```powershell
& .\.venv\Scripts\python.exe -m science.acquire history --source viirs
& .\.venv\Scripts\python.exe -m science.acquire history --source mur
& .\.venv\Scripts\python.exe -m science.acquire masks
& .\.venv\Scripts\python.exe -m science.acquire validate-spatial
& .\.venv\Scripts\python.exe -m science.acquire nasa-verification
& .\.venv\Scripts\python.exe -m science.prepare
& .\.venv\Scripts\python.exe -m science.export
& .\.venv\Scripts\python.exe -m science.export --parity
```

Each normal regional request is capped at 80 MiB; native validation requests at 40 MiB; the NASA verification file at 64 MiB. Downloads are cached in ignored `data/raw/`, with source manifests where applicable. A provider can change or become unavailable; inspect the metadata and licensing again before a later reproduction. An optional bounded CDS feasibility command is `python -m science.acquire probe-cds`; local user-scoped CDS configuration is required, and no credential belongs in this repository.

## Statistical interpretation

The model uses an intercept, a linear calendar-time trend, and eleven month-of-year indicators. It models log chlorophyll and Celsius SST. Bartlett/Newey-West uncertainty preserves calendar gaps, uses a prespecified automatic bandwidth, an n/(n−13) correction and Student-t inference. Alternative lags 6, 12 and 24 are shown as a sensitivity check. These intervals and p-values remain approximate, especially under long climate persistence or model misspecification.

The paired chlorophyll comparison fits **log(EEP) minus log(NWP)** on aligned months. It tests a difference of relative trends, not a difference of absolute mg/m³ slopes. Comparing two individual p-values is not this test. Chlorophyll percentage rates are exponentiated log-trend estimates; baseline-anchored concentration changes are explicitly labelled. SST never uses percentage change relative to Celsius zero.

Inference requires at least 120 valid months, 120 calendar months, 85% completeness, five observations for every calendar month, no missing run longer than six months, acceptable spatial coverage and a full-rank design. These are conservative project rules, not universal guarantees. Arbitrary shorter windows still show observations. Selecting many exploratory windows can produce chance significance. A nonsignificant result is not proof that no change or regional difference exists.

Full formulas and verification evidence: `docs/statistics-report.md`. Region-specific observations cannot establish that SST, ENSO or climate change caused the observed chlorophyll changes.

## Build and competition record

The project workspace was empty during PREP MODE. START BUILD was received after the event gate; the first build clock was verified at November 14, 2026, 09:03 WIB. This project contains no pre-event implementation history. Local Windows work was used; Codex Cloud was deferred.

Codex assisted with code, data-processing scripts, statistical checks, interface construction, documentation and draft submission materials. This assistance must be disclosed in the submission. AI tools are not described as open-source tools. Human participants retain responsibility for scientific claims, rights, final review, publication and submission.

Public deployment, public source publication and NASA submission require separate user authorization. A working local build is not a submitted project. The seven-slide deck and submission text are drafts until reviewed. No participant names, likenesses or voices are embedded in the demo.

## Licensing and sources

Original project code is offered under Apache-2.0, the default OSI licence consistent with NASA's stated distribution terms. Dataset licences are separate; see `data/README.md`. Reproduction dependencies are installed from their own distributions and retain their own licences.

Primary scientific sources: [NOAA VIIRS metadata](https://oceanwatch.pifsc.noaa.gov/erddap/griddap/noaa_snpp_chla_monthly.html), [MUR monthly metadata](https://coastwatch.pfeg.noaa.gov/erddap/griddap/jplMURSST41mday.html), [NASA MODIS collection](https://www.earthdata.nasa.gov/data/catalog/ob-cloud-modisa-l3m-chl-2022.0), [NASA challenge resources](https://www.spaceappschallenge.org/2026/challenges/earth-system-trend-detective/?tab=resources).

Statistical references: Newey and West (1987), *A Simple, Positive Semi-definite, Heteroskedasticity and Autocorrelation Consistent Covariance Matrix*, Econometrica 55(3), 703–708, DOI 10.2307/1913610; [statsmodels HAC documentation](https://www.statsmodels.org/stable/generated/statsmodels.stats.sandwich_covariance.cov_hac.html); [SciPy Student-t documentation](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.t.html).

