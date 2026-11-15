# V3 website enhancement design and implementation plan

Status: approved by the user. Implement P0, verify it, then implement safe P1 locally. No publication authorized.

## Authority and baseline

Implement the user-supplied Master Prompt V3.0, preserving V2.0 scientific constraints and the established archival identity. The isolated branch is `enhance/website-v3`, based on `origin/review/pages-release` at `c7ee1c0098f88daf35200072bee1595d56e8dd47`. Draft PR #1 remains open and unmerged. No push, merge, deployment, or NASA submission is authorized.

Baseline: 40 JavaScript tests and 26 Python tests plus seven subtests pass. All five frozen analyses reproduce and the observation input SHA-256 matches. The review branch's Pages workflow validates pull requests and gates deployment to main. The original checkout and ignored research caches are preserved.

## Proposed experience

1. Keep the historical chart primary. Replace the introductory paragraph with the research question and a short fixed-reference finding read from the frozen results: estimated chlorophyll declines in both regions, with an inconclusive direct comparison. Show the reference dates and its fixed-window status.
2. Add an optional compact reading guide and two working example buttons: regional chlorophyll comparison and SST investigation. Both use the existing state transitions and statistical functions. Restore reference remains available.
3. Add native SVG point-and-interval graphics beside the numerical results. Individual chlorophyll rates use percent per decade, SST uses degrees Celsius per decade, and the paired chlorophyll comparison has its own separately labelled relative-ratio scale. Every graphic includes zero, labels, written equivalents and unavailable states. Pending or invalid dates immediately clear old estimates. No model or reference numbers change.
4. Replace the schematic with a small, locally bundled Natural Earth 1:110m land basemap, using a Pacific-centered equirectangular projection. Preserve the exact region rectangles, distinguish them by labels and line patterns, and handle longitude wrapping without drawing bridges across the map. Credit Natural Earth and record the asset source, licence and hash. If the asset cannot be verified, retain an explicitly labelled schematic.
5. Put the selected measure's source beside the controls and a short NASA/NOAA source explanation in the reading area. Explain the predefined region design, measurement meanings, seasonality, uncertainty and causal limits. Keep technical details expandable. One NASA verification month stays separate from fitted VIIRS trends and does not establish trend agreement or eligibility.

## Architecture and boundaries

- Extend `index.html`, existing CSS and `src/app.js`; preserve the paper surface, dark masthead, serif headings, rust EEP and teal NWP.
- Add `src/uncertainty.js` for interval-display models/SVG and `src/locator.js` for projection, ring unwrapping and geographic rendering. Later, add `src/url-state.js` and `src/selection-export.js` for query/history validation and observation-only CSVs. Reuse `src/data.js` and `src/ui-state.js` rather than duplicating inference.
- The five scientific JSON files, existing statistical fixtures and core scientific methods remain byte-for-byte unchanged. Only reproduction packaging in `science/export.py` may change to include new public assets and source modules.
- Add the map and new modules explicitly to the static whitelist. No runtime mapping service, framework, CDN, accounts, backend, tracking or authenticated browser request.
- Leave publication triggers unchanged. Add workflow artifact-presence checks only if needed for new bundled assets.

Focused tests will live in `tests/uncertainty.test.js`, `tests/locator.test.js`, `tests/url-state.test.js`, `tests/selection-export.test.js` and `tests/browser/enhancement.spec.js`. Existing baseline suites remain intact.

## Test-first implementation sequence

- [x] Capture protected-file hashes and complete baseline build/browser inspection.
- [x] Add failing tests for interval units, zero-spanning bounds, separate comparison transformations and clearing on pending/invalid selection. Implement the graphics and guided examples.
- [x] Add failing tests for equivalent -120/240 degree longitude, dateline ring unwrapping, exact region bounds and basemap failure fallback. Bundle and attribute the verified map.
- [x] Implement the question, reference summary, source explanations and interpretation copy from existing records. Verify examples, controls, complete reset and accessible equivalents in the real browser.
- [x] After all P0 checks pass, add shareable `variable`, `region`, `start`, `end` query parameters. Preserve pathname/subpath, unrelated parameters and normal history. Invalid, duplicate or out-of-range owned parameters recover to reference with a visible explanation. Apply/history actions use the same calculation path; draft dates never become shared results. Add direct-load, refresh and back/forward tests.
- [x] Add a selected-observation CSV download after P0. Export the selected dates, variable, regions, original month/value/units/coverage/counts/provenance and explicit null gaps. Escape CSV and neutralize text formula injection while preserving legitimate numeric values. Do not export inferred results as observations. Disable sharing/export during pending or invalid selections; valid short observation windows remain downloadable.
- [x] Run unit, scientific reproduction/package, build and browser checks, including repository-subpath loading, 360/768/1366px layouts, 200% zoom, keyboard/focus, reduced motion, tables, loading/empty/error/retry and all new interactions. Inspect actual desktop/mobile screenshots in bounded passes.
- [x] Perform distinct engineering, scientific-claim and UX reviews. Use independent bounded agents when available; label any self-review and unavailable capability accurately. Update the audit, skill-use record, affected project documents and submission-material alignment.
- [x] Make focused local commits and provide incorporation instructions for draft PR #1. Stop before any remote write or publication.

## Acceptance

All P0 outcomes work with actual observations. Protected hashes and all five reference fits remain unchanged; old and new tests pass. No stale confidence intervals, mixed-unit axes, fabricated coastlines, misleading NASA claims or sensitive public artifacts remain. P1 is included only after P0 is verified. Any blocked presentation regeneration is reported as an exact wording inconsistency for human correction rather than represented as completed.
