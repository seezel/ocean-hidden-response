# Data provenance and reuse

`observations.json` and the downloadable CSV contain licensed processed monthly regional values, not synthetic demonstrations. There are 672 calendar records and 664 observed values. Null values represent absent source months. Never replace them with zero.

`reference-results.json` contains the five verified reference fits and the exact input SHA-256. `provenance.json` identifies each producer, product, processing choice, licence statement and limitation. `spatial-validation.json` records the six native-grid SST comparisons. `nasa-verification.json` contains the separately processed NASA MODIS January 2013 record and the acquired granule SHA-256.

## Sources and attribution

1. **NOAA Suomi-NPP VIIRS monthly chlorophyll-a.** NOAA/NESDIS/STAR Ocean Color Team, ERDDAP `noaa_snpp_chla_monthly`. Provider statement: these data may be redistributed and used without restriction. Source processing version is unspecified in the provider metadata; no stronger consistency claim is made. Units: mg m⁻³. Source: https://oceanwatch.pifsc.noaa.gov/erddap/griddap/noaa_snpp_chla_monthly.html .
2. **NASA JPL MUR fv04.1-derived monthly SST.** Daily foundation-temperature analysis produced by NASA JPL under MEaSUREs/GHRSST, composited monthly by NOAA ERD. Source DOI 10.5067/GHGMR-4FJ04. The NOAA mirror permits free use and redistribution without warranty. Units: degrees Celsius. Source: https://coastwatch.pfeg.noaa.gov/erddap/griddap/jplMURSST41mday.html .
3. **NASA MODIS Aqua L3 mapped monthly chlorophyll, R2022.0 collection.** NASA GSFC Ocean Biology Processing Group, DOI 10.5067/AQUA/MODIS/L3M/CHL/2022. January 2013 granule: `AQUA_MODIS.20130101_20130131.L3m.MO.CHL.chlor_a.4km.nc`, NASA CMR G3509017444-OB_CLOUD. NASA Earth science observations are openly shared without restriction, with source attribution. The file was obtained through NOAA's public `erdMH1chlamday_R2022SQ` mirror and checked against NASA granule metadata. Collection: https://www.earthdata.nasa.gov/data/catalog/ob-cloud-modisa-l3m-chl-2022.0 .

These observations are third-party source data and derived records; the project Apache-2.0 code licence does not replace their policies. No Copernicus observations are redistributed because none entered the analysis. The unused preferred source and its failed local feasibility check are disclosed separately.

## Processing

Chlorophyll uses positive valid values, source quality/range masking, a source-native MUR ocean mask mapped to the chlorophyll grid, and cosine-latitude area weights in log space. The result is a regional geometric mean, not an arithmetic mean and not total biomass.

SST uses an open-sea mask, positive observation count, Celsius units and an area-weighted arithmetic mean on a 0.1° sample of the 0.01° native grid. The maximum native/sample difference among the six predefined checks is about 0.01321°C. The 0.05°C acceptance tolerance applies to those checks only. SST valid-cell counts describe sampled cells. Chlorophyll counts describe native source-grid cells.

The reference period is January 2013–December 2025. The shorter NOAA fallback changes the study interval from the preferred circa-2003 Copernicus objective. The direct chlorophyll comparison uses matched eligible calendar months. No incompatible source series are joined and no missing months are interpolated.

The NASA MODIS record is a separate actual data-use and provenance check supported by a Giovanni catalogue entry linked from the challenge Resources tab. It is not spliced into the VIIRS record and does not establish trend agreement from one month. Provenance evidence is not a guarantee of a judging decision.

Raw source downloads remain in ignored `data/raw/` and are not shipped with the static website or source reproduction archive. Reacquisition commands and dependency pins are provided in the main README.

