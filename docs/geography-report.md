# V3 geographic locator implementation

Implemented November 14, 2026 in the isolated `website-v3` worktree. Scope is limited to the new locator module, its tests, the local land asset, source metadata and this report. The existing chart module, scientific JSON, fixtures, methods, dependencies and Git state were not edited by this task.

## Asset and provenance

- Source: [Natural Earth vector repository v5.1.2, 1:110m land GeoJSON](https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.2/geojson/ne_110m_land.geojson).
- Retrieved November 14, 2026; 138,160 bytes; 127 Polygon features. A streamed download enforced the 2 MiB limit before writing the asset.
- SHA-256: `9e0729ee253ca7d7a5c4ae9395fb1902264c5377c52e224d13dd85010e2835d9`.
- Licence: public domain per [Natural Earth's terms](https://www.naturalearthdata.com/about/terms-of-use/), verified by the coordinating task. Attribution is optional; project source records and the user-facing caption credit Natural Earth.
- Original GeoJSON bytes are preserved. `assets/map-source.json` and `assets/MAP-SOURCES.md` record the provenance and generalized-map limitations. No satellite imagery was acquired.

## Rendering and boundaries

`src/locator.js` exports `wrapLongitude`, `unwrapRing`, `pacificProjection`, `validateLand`, `landPaths`, `loadBasemap` and `renderPacificLocator`. The loader fetches a module-relative bundled asset and throws on unsuccessful requests, JSON parse errors or invalid geometry. Validation requires nonempty polygon collections, finite coordinates, valid geographic ranges and closed rings.

The map is Pacific-centered, 60°E through 300°E, 55°S through 65°N. An equirectangular projection uses the same pixels per longitude and latitude degree, with a dynamically calculated height. It does not preserve ground distance or area. Rings are unwrapped continuously before projection. Entire polygon copies are translated by whole turns only when they intersect the viewport, then clipped in SVG; separate Greenwich edges cannot connect across the Pacific. Hole rings are aligned with their exterior.

Region rectangles use the existing readonly bounds and styles: EEP `[-120, -90, -5, 5]`, solid rust; NWP `[125, 150, 2, 10]`, dashed teal. Labels identify Asia, Australia, North America, South America, the Pacific Ocean, EEP and NWP. Map text has a 13px minimum. SVG title/description give the projection context, bounds and line styles. Land is explicitly described as geographic context rather than satellite observations.

`renderPacificLocator(container, regions, {land: null})` calls the existing explicitly labelled schematic renderer, preserving its statement that no coastlines are depicted. Container `data-basemap` reports `schematic` or `natural-earth`. The coordinating task owns application loading/caption handling, static whitelist/reproduction packaging and browser verification.

## Verification evidence

Tests were written before the new module. The first `node --test tests/locator.test.js` failed because `src/locator.js` did not exist. After implementation, the focused suite passed. Additional renderer and asset-integrity assertions then passed.

Latest commands, both exit 0:

- `node --test tests/locator.test.js`: 8 passed, 0 failed.
- `npm test`: 55 passed, 0 failed, including existing scientific parity checks and the concurrently added uncertainty tests.

Assertions cover -120°/240° equivalence; dateline 179°/-179° continuity; Greenwich rings excluded from the Pacific viewport; fixed region bounds, projected widths, equal degree scale and north-up orientation; malformed collections/rings/coordinates; source hash and byte count; valid local asset loading and request/format failures; schematic fallback; accessible map descriptions; distinct region stroke patterns; and nonmutation of source rings/region bounds.

The renderer test uses a minimal DOM recorder to inspect real output geometry and accessible text. It is not a browser or visual-layout test. Final browser screenshots, narrow-screen inspection, runtime fetch-failure verification and production packaging are intentionally left to the coordinating task's full-site acceptance pass.
