# Interface implementation and verification

Implemented only the assigned files: `index.html`, `assets/styles.css`, `src/app.js`, `src/charts.js`, `src/ui-state.js`, `tests/ui-state.test.js`, and this report. No dependencies, downloaded assets, Git operations, raster concepts, or production fallback observations were introduced.

The interface follows the approved archival direction: paper surface, restrained ink masthead, Georgia reading titles, ruled tables, and a primary historical chart. Rust EEP and teal NWP lines also have distinct patterns. Energy 1 / Rhythm 2 / Motion 1; motion is restricted to functional pressed feedback. Source metadata is constructed through DOM text nodes, and source links accept only HTTP(S).

## Implemented behavior

- Native SVG observation chart with explicit missing-data gaps, readable responsive axes, accessible title/description and human-readable numerical summary. No individual SVG points are tab stops.
- The trend curve removes calendar-month effects by averaging the 12 fitted month intercepts equally, retaining the model slope. It uses concentration or temperature, never percentage as an observation-axis value.
- Measure, region, bounded month inputs, Apply dates, and complete Restore reference controls. A date edit immediately clears prior inference and chart results. Invalid windows give a recovery message. Valid short windows show observations and the engine's explicit inference-unavailable reason.
- Matching reference dates use the frozen reference results; custom windows recompute with the existing JavaScript engine. A model-version mismatch or incomplete reference calculation blocks inference with an explicit message.
- Regional rates, correctly scaled confidence intervals, valid-month counts, p-values, inconclusive wording, lag sensitivity and chlorophyll baseline-anchored concentration context. SST remains in degrees Celsius.
- Direct chlorophyll comparison transforms its log-ratio/year confidence bounds with `100 * expm1(10 * bound)` for the displayed relative percentage/decade interval. Its original log-ratio/year interval is also identified separately. The comparison always uses both fixed regions, explicitly stated when chart selection shows one.
- Expandable equivalent monthly observation table, including calendar gaps, coverage and inference inclusion. Its rows are created only when opened. Tables scroll within their region on narrow screens.
- Supporting schematic Pacific locator using exact data-package bounds, with no invented coastline. Methods, quality, product/version provenance, package limitations, NASA verification status, and actual download paths.
- Loading, empty-package, recoverable loading error and Retry states. No sample observations can appear in production.

## Observed test evidence

Test-first red: `node --test tests/ui-state.test.js` initially failed with `ERR_MODULE_NOT_FOUND` for the intentionally absent `src/ui-state.js`. After implementation, all nine state cases passed. Three chart/locator cases were added before the chart module; the same command then failed for the absent `src/charts.js`. After implementing it, all twelve interface cases passed.

The twelve cases cover invalid/reversed/out-of-range dates; immediate removal of previous results; rejected-window behavior; valid short windows; variable-specific availability; region selection; every reference control/state reset; draft windows surviving variable and region changes without accidental application; reference status and unknown controls; missing-month line segmentation; log-slope versus concentration chart scaling with seasonal adjustment; and finite exact locator bounds.

Post-implementation checks: `node --check src/app.js` and `node --check src/charts.js` passed. Full `node --test tests/*.test.js` passed **33/33**, with zero failures, skips or cancellations. This includes the existing data/statistics suites. Test observations are isolated synthetic fixtures; the production application fetches only the real exported archive.

Computed WCAG relative-luminance contrast in Node: ink on paper 13.32:1; secondary ink on paper 7.08:1; teal on paper 6.51:1; rust on paper 6.41:1; ink on white 14.41:1; secondary ink on white 7.66:1; teal on white 7.04:1; rust on white 6.93:1. White button text on ink is 14.41:1. Control boundaries on white are 4.24:1. Pale rules are decorative separators, not input or focus indicators.

## Verification boundaries and handoff

No browser or desktop/mobile click-through was performed by this implementer. Main owns that verification after exporting authentic observations, reference results, provenance and downloads. Required browser checks remain 360 / 768 / 1366px layouts, page overflow, 200% text zoom, keyboard focus and every control/detail/download, short/invalid windows, full reset, both variables/regions, truthful blocked NASA status, and loading/error/Retry. CSS includes 44px controls, visible focus, reduced-motion handling and responsive chart widths, but these remain implementation properties until main verifies the rendered pages.

The data package must use region bounds as `[west, east, south, north]` or an object with those four names, and the documented reference/provenance schemas. The client displays the recorded reference input SHA-256; it does not independently verify that hash in-browser. Exact data-product processing comes from provenance rather than an invented interface description.

The final actual exports were inspected after main generated them: region arrays and source identifiers match the interface contract, reference model and result keys match, and the NASA verification source identifier resolves to the actual MODIS source title/version/link. The real verification record reports `verified`, January 2013 averages, collection 2022.0 and granule R2022.0. The application selects inconclusive regional-comparison wording from the actual zero-spanning interval; no regional-difference conclusion is predetermined.

A final read-only Node assertion pass against the real package confirmed 672 calendar records, 664 observed values, matching model versions, and finite correctly sized chart trends for all four regional variable series. The regional comparison's displayed relative 95% interval transforms to -12.7291% to +18.6690% per decade and spans zero. The full 33-test suite and both syntax checks passed again after the final metadata adjustments.

The installed Impeccable launcher was not executed because the assignment restricts writes to owned files and forbids downloads. Existing PRODUCT.md, DESIGN.md, the task brief, the installed craft floor and relevant antislop guidance supplied the approved context. The build ledger records the user's antislop-during selection; no design/mode interview or extra approval was introduced.
