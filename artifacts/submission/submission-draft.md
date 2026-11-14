# NASA Project form draft

Prepared for human review. No project has been published or submitted. Confirm the live portal's fields and length limits before copying this text. The chosen demonstration is a seven-slide deck, subject to that portal's requirements.

## High-Level Summary

The Ocean's Hidden Response helps people examine historical surface chlorophyll-a and sea surface temperature in two Pacific regions. Its static website combines genuine monthly observations with seasonally adjusted trend estimates, uncertainty and a direct test of the regional chlorophyll trend difference. Visitors can choose dates, inspect missing observations and reproduce the calculations. The reference analysis finds chlorophyll declines in both regions, while the direct difference remains inconclusive under the model. The tool uses NASA JPL MUR-derived temperature and a separate NASA MODIS Aqua source-verification record supported by the challenge-listed Giovanni portal, alongside NOAA VIIRS chlorophyll. It presents model limitations and exploratory-window cautions alongside the results.

## Project Demo

Seven-slide English presentation: `demo.pptx`. It contains no participant names, voices, photographs or likenesses. Verify that the current Project form accepts this format. Do not replace the demo with screenshots-only claims of scientific completion.

## Final Project Link

Pending separate user authorization and verified public deployment. Do not submit a localhost URL or invent a hosted link. A source repository link also remains pending publication approval.

## Project Details

**Problem and audience.** Satellite ocean records are difficult to interpret without clear region definitions, appropriate statistical models and source provenance. This application supports scientifically curious visitors, students, researchers and policymakers who want to inspect regional surface changes without confusing a visual slope with reliable evidence.

**What visitors do.** Choose chlorophyll-a or temperature, one or both fixed Pacific regions, and inclusive start/end months. The chart shows the observations and gaps. Eligible windows show trend estimates and confidence intervals. Short or incomplete windows keep observations visible and explain why significance is unavailable. A reference reset restores the verified analysis. Expandable panels describe quality, methods and exact products, with CSV and executable reproduction downloads.

**Regions and record.** EEP is 120°W–90°W, 5°S–5°N. NWP is 125°E–150°E, 2°N–10°N. The reference window is January 2013–December 2025, with 154 matched valid months out of 156 calendar months. The packaged historical record covers 2012–2025. The authenticated Copernicus C3S v6.0 request succeeded after local configuration was updated, but its January 2013 global file is 177,604,652 bytes, above the prespecified 96 MiB feasibility cap. The documented interface offers no regional subsetting. We retained the already approved NOAA VIIRS fallback and disclosed the shorter record.

**Methods.** Regional chlorophyll is a cosine-latitude area-weighted geometric mean of positive source-quality-controlled concentrations. SST is an area-weighted arithmetic mean of open-sea cells with valid observations. Its computational spatial sample was checked against six native-resolution region/month cases, with maximum difference approximately 0.01321°C. Monthly regression includes calendar-month effects and a time trend, with calendar-aware Newey-West uncertainty and explicitly approximate Student-t inference. The direct comparison models the aligned difference of regional log chlorophyll. It does not compare separate p-values. Alternative lag settings and selection limitations remain visible.

**Reference findings.** EEP chlorophyll changes by approximately −16.31% per decade and NWP by −17.76% per decade under this model. Their direct relative growth-rate contrast is approximately +1.77% per decade, with p=0.822 and an interval spanning zero on the model scale. Evidence for a regional difference is inconclusive. EEP SST has an estimated −0.071°C per decade trend with p=0.869. NWP SST has an estimated +0.415°C per decade trend with p<0.001. These estimates depend on the selected period, source products and model. They do not establish causal effects of SST, ENSO or climate change.

**Engineering and reproducibility.** The browser uses semantic HTML, CSS and modular vanilla JavaScript. A local offline Python pipeline retrieves bounded source grids, applies masks and aggregation, fits the reference model and exports licensed processed records. JavaScript calculations match Python on synthetic and real windows within documented tolerances. Independent statistical checks use statsmodels and a separate calendar-gap covariance calculation. The static artifact excludes credentials and raw caches. Authenticated acquisition never runs in a visitor's browser.

**Limits and future work.** The VIIRS record is shorter than the originally preferred historical record, provider processing-version metadata are incomplete, satellite chlorophyll is an optical surface estimate, and SST sampling error is only checked in six predefined cases. HAC inference is approximate. Custom windows are exploratory. A single NASA MODIS month verifies data use and provenance, not trend agreement. Optional live retrieval is not advertised or implemented in this version.

## Use of AI or NASA Data

**NASA observations actually used.** NASA JPL MUR fv04.1 supplies the underlying daily foundation-temperature analysis for NOAA's monthly SST composite. NASA MODIS Aqua R2022 monthly chlorophyll supplies the separately processed January 2013 verification record shown for both regions. That exact product appears in Giovanni, which the challenge Resources tab lists. The downloaded NASA granule's filename and size match NASA CMR; provenance records its SHA-256 and processing version. The MODIS record stays separate from the NOAA VIIRS fitted time series.

**AI assistance.** OpenAI Codex assisted with software implementation, acquisition and processing scripts, statistical tests, browser checks, interface construction, documentation and draft presentation/submission materials. Human participants must review the work and remain responsible for the final scientific claims, licences and submission. Codex and proprietary authoring tools are not represented as open-source software. Original project source is prepared under Apache-2.0; dependency and dataset licences remain separate.

## References

- Challenge and resources: https://www.spaceappschallenge.org/2026/challenges/earth-system-trend-detective/?tab=resources
- Yogyakarta event: https://www.spaceappschallenge.org/2026/local-events/yogyakarta/
- NASA participant terms: https://www.spaceappschallenge.org/legal/
- NOAA VIIRS monthly source: https://oceanwatch.pifsc.noaa.gov/erddap/griddap/noaa_snpp_chla_monthly.html
- NASA JPL MUR monthly mirror: https://coastwatch.pfeg.noaa.gov/erddap/griddap/jplMURSST41mday.html
- NASA MUR source DOI: https://doi.org/10.5067/GHGMR-4FJ04
- NASA MODIS Aqua collection: https://www.earthdata.nasa.gov/data/catalog/ob-cloud-modisa-l3m-chl-2022.0
- MODIS DOI: https://doi.org/10.5067/AQUA/MODIS/L3M/CHL/2022
- NASA granule metadata: https://cmr.earthdata.nasa.gov/search/concepts/G3509017444-OB_CLOUD.umm_json
- Giovanni exact field: https://giovanni.gsfc.nasa.gov/giovanni/daac-bin/catalogServices.pl?q=dataFieldId%3AMODISA_L3m_CHL_Mo_4km_R2022_0_chlor_a&version=2.2&wt=json&rows=1
- NASA source mirror: https://coastwatch.pfeg.noaa.gov/erddap/files/erdMH1chlamday_R2022SQ/
- Unused preferred C3S source and guide: https://cds.climate.copernicus.eu/datasets/satellite-ocean-colour and https://dast.copernicus-climate.eu/documents/satellite-ocean-colour/v6.0/WP2-FDDP-2022-04_C3S2-Lot3_PUGS-of-v6.0-OceanColour-product_v1.1_FINAL.pdf
- Newey and West (1987), Econometrica 55(3),703–708: https://doi.org/10.2307/1913610
- Numerical tools: https://numpy.org/ , https://scipy.org/ , https://www.statsmodels.org/ , https://unidata.github.io/netcdf4-python/
- Browser verification: https://playwright.dev/
- Visual inspiration: https://archive.org/ . Original layout and identity; no Internet Archive brand assets used.

Check current portal requirements and the five local criteria: Impact, Creativity, Validity, Relevance and Presentation. No numerical judging weights or award claims are assumed.
