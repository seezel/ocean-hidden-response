# Website release audit

## V3 preflight, November 14, 2026

Status: approved V3 P0 and safe P1 implemented and locally verified. Ready for human release review. Nothing pushed, merged, published or submitted. Earlier baseline observations below are retained as historical evidence.

- The original checkout is clean on `build/ocean-response` at `042d77b`, tracking its remote. Its website tree matches the current review tree; the review tree additionally contains the Pages workflow.
- Fetched current main and review heads without publishing. Main is `20fd8ebe0bea98f8c34d5e7f101c3b52f25d6979`; review is `c7ee1c0098f88daf35200072bee1595d56e8dd47`.
- [Draft PR #1](https://github.com/seezel/ocean-hidden-response/pull/1) is open, draft, unmerged and mergeable. Its Actions run `43564901350`, “Verify and publish the ocean archive,” completed successfully. That is CI evidence, not browser accessibility or deployed-site verification.
- Created `.worktrees/website-v3` on local branch `enhance/website-v3` from the review head. No existing work or research cache was removed. No native worktree tool was exposed, so the authorized Git worktree fallback was used.
- Baseline `npm test`: 40 passed. Baseline Python pytest: 26 passed plus seven subtests. `python -m science.export --verify`: all five analyses reproduced and the published input hash matched. The existing scientific model and observations have not changed.
- Baseline `python -m science.export --package` and `npm run build` succeeded. All six required public paths exist, including the CSV and reproduction ZIP. The ZIP contains 40 source/data inputs; no source acquisition was run.
- Baseline `npx --no-install playwright test --config .cache/baseline-playwright.config.mjs`: seven browser scenarios passed in 12.2 seconds. The private configuration points to the isolated server on port8001, preserving the existing preview on port8000 and the committed default configuration. Tests exercised original controls, inference invalidation, reference reset, reading panels, both downloads, keyboard focus,360/768/1366px reflow and failed-fetch/retry.
- Inspected actual desktop and mobile screenshots together. Baseline copies are preserved in ignored `artifacts/screenshots/baseline/`. The confirmed gaps above remain visible; no enhancement is claimed. Protected-hash comparison after packaging/build/browser checks:12files checked,0changed, including the five scientific JSON files, core calculation/source scripts and existing reference fixtures. The observation input remains `dd018a8015b5c5f281f2dae7112ba16bb98d44b354e3c9d80e73856c0cf9a31e`.

## Confirmed website gaps

Source inspection confirms the introductory copy lacks the explicit research question and immediate reference finding. Guidance/examples and interval graphics are absent. The locator explicitly contains no coastline. Source roles and substantive interpretation largely sit behind expandable details. Shareable state and selected-observation export are absent. Existing controls, frozen/custom calculations, inference invalidation, numerical tables and scientific caveats already work and will be extended.

The proposed design and test sequence are in `website-enhancement-design.md`.

## Source and licensing review

[Natural Earth's official terms](https://www.naturalearthdata.com/about/terms-of-use/) identify its map data as public domain. The local 1:110m land asset is now bundled with source attribution and a recorded hash in `assets/MAP-SOURCES.md` and `assets/map-source.json`.

The current [challenge description](https://www.spaceappschallenge.org/2026/challenges/earth-system-trend-detective/) calls for regional variables, historical time series, change rates and significance. The website's MUR-derived SST participates in its core analysis; NOAA VIIRS supplies chlorophyll, and MODIS supplies a separate verification record. These roles must remain explicit. A citation or single verification month alone is not an eligibility guarantee.

[NASA's current terms](https://www.spaceappschallenge.org/legal/) require appropriate reuse rights, licence documentation and source citation. The retrieved legal text does not explicitly specify an AI-disclosure policy. The participant kit and approved project instructions already require disclosure, which will be retained without reopening participation arrangements.

## Skills and capabilities

| Skill/capability | Available and applied | Evidence or boundary |
| --- | --- | --- |
| caveman | Yes | Concise conversation; normal grammatical prose in artifacts |
| impeccable | Yes | Existing archival identity preserved; scoped extension design and bounded visual-QA plan |
| antislop | Yes, during mode already selected | No new identity exercise or template decoration |
| antislop-copywriting | Yes | Plain source-based question, interpretation and source-copy design |
| antislop-human | Yes | Keyboard, focus, contrast, alternatives and zoom acceptance criteria |
| antislop-layoutmobile | Yes | Continuous reflow and 360/768/1366px verification plan |
| antislop-ui | Yes | Chart-first hierarchy and separate inferential graphics |
| antislop-code | Yes | New modules retain concise explanatory comments; no generic narrative comments added |
| context-optimization | Yes | Targeted reads, stored remote results and protected-hash snapshot; avoid duplicate dataset dumps |
| using-superpowers / brainstorming / writing-plans | Yes | Required sources reviewed and concrete design checkpoint prepared |
| using-git-worktrees / context-map | Yes | Isolated branch from actual review head; component/data-flow boundaries mapped |
| test-driven-development / verification-before-completion | Yes | Baseline commands executed; new behavior will begin with failing tests |
| Firecrawl / read-docs | Yes | Official map terms, NASA challenge/terms and source verification |
| GitHub connector | Yes, read-only | Current PR, branch list and CI state checked |
| Browser / browser-use / Playwright | Local Playwright applied | Seven baseline scenarios passed with installed Chrome and an isolated test profile; screenshots inspected. Earlier connector exposed no browser and CLI was absent |
| Statistical, engineering and UX specialist reviews | Completed | Three distinct read-only agents reviewed science claims, engineering/security and actual desktop/mobile views; findings and fixes below |
| Streamlit, React, Sites, image generation | Not applicable | Existing vanilla static architecture and geographic data/SVG evidence require none of these |

## Implemented scope and scientific boundaries

The user approved `website-enhancement-design.md`: P0 first, then safe P1. P0 passed 55 unit tests and ten browser scenarios before P1 application integration.

- `index.html`, `assets/styles.css`, `src/app.js`: immediate research question and fixed reference summary read from the frozen result objects; optional one-minute guide and two working reference examples; visible selected source and NASA/NOAA roles; honest predefined-region rationale and scientific limits.
- `src/uncertainty.js`: separate regional chlorophyll percent/decade, regional SST Celsius/decade, and paired relative-ratio displays. Points, approximate 95% bars, a zero reference, distinct region patterns/shapes, SVG descriptions and existing numerical results remain available. Draft/invalid dates clear graphics immediately; insufficient windows explain unavailable inference. The comparison alone transforms annual log bounds with `100 * expm1(10 * bound)`. No trend calculation changed.
- `src/locator.js` and three `assets/` map files: Pacific-centred geographic context from pinned Natural Earth v5.1.2 land. Longitude wrapping/seams and exact regions are tested. A failed map fetch produces an explicitly schematic fallback without blocking observations. Land is never represented as the analytical ocean mask.
- `src/url-state.js`: validated measure, region and inclusive months; defaults for absent fields; invalid, duplicate, malformed or out-of-range owned parameters restore reference with an explanation. Serialization preserves repository path, hash and unrelated query parameters. History and refresh use the same calculation path. Unapplied dates never replace applied URL state.
- `src/selection-export.js`: current-selection observation-only CSV, ordered by calendar month and region. Original values/units/coverage/counts/provenance remain; `null`, missing-kind and screening-status fields distinguish source nulls from absent calendar gaps. Escaping and text formula neutralization preserve legitimate negative numeric temperatures. Valid short windows can export observations; draft/invalid windows cannot. Clipboard refusal exposes a selected, readable link.
- `tools/build.mjs` explicitly includes all new modules and licensed map assets. Only reproduction packaging changed in `science/export.py`. The test command runs file suites sequentially for the target laptop's memory limits.

All 12 protected SHA-256 entries were compared after implementation: **zero changed**. They include all five scientific JSON files, the core Python acquisition/aggregation/preparation/analysis modules, `src/trends.js` and both existing statistical fixtures. Published observation hash remains `dd018a8015b5c5f281f2dae7112ba16bb98d44b354e3c9d80e73856c0cf9a31e`. No acquisition, scientific export freeze, model fitting rewrite, source splice, region change or provenance rewrite occurred.

## Executed verification

Commands ran from the isolated worktree. Python below means the existing root `.venv/Scripts/python.exe`, not the unrelated broken MSYS executable.

| Check | Observed result |
| --- | --- |
| `npm test` | 64 passed, zero failures, with `--test-concurrency=1` |
| Python `-m pytest -q` | 26 passed plus seven subtests |
| Python `-m science.export --verify` | All five frozen analyses reproduced; exact input hash matched |
| Python `-m science.export --package` | Regenerated current V3 archive, 58 explicitly selected source/data/doc inputs, including the four modules, map, tests and review documentation |
| `npm run build` | Explicit static whitelist copied successfully; scientific data and both downloads present |
| `npx --no-install playwright test --config .cache/baseline-playwright.config.mjs` | 16 passed, zero failures, in 30.3 seconds, installed Chrome, one worker |
| Protected-hash comparison | 12 checked, zero changed |
| `git diff --check` | No whitespace errors |

Fresh-download integrity: every one of the 58 ZIP members was compared byte-for-byte with its current source; no stale or forbidden path was found. Extraction into a new ignored directory independently passed all 64 JavaScript tests, reproduced all five frozen fits with the same input hash, regenerated its own ZIP and built its own complete static site. This resolves the engineering review's stale-archive finding. The archive is a current reproducible source/data package, not just an old ZIP with a new filename.

Browser coverage: all original controls, full reset and custom calculations; new examples; exact source labels; separate interval units and immediate clearing; genuine map and fetch-failure fallback; valid/invalid URL load, refresh and back/forward; simulated repository-subpath serving of the actual built files; selected CSV filename/content/null preservation; draft export/share disabling; clipboard refusal/manual-copy focus; empty archive/retry; failed scientific fetch/retry; keyboard/skip link and focus; 360/768/1366px no-page-overflow reflow and 44px investigation controls; reduced motion and 200%-equivalent CSS viewport plus 200% root text enlargement. All reading panels and the full CSV/ZIP downloads were exercised.

Test-first evidence: uncertainty stubs failed seven assertions before implementation; map tests failed with the module absent; URL/export stubs failed nine assertions before implementation; browser tests failed against absent guide/P1 behavior before integration. Failures found and resolved during implementation: a guide test clicked a deliberately collapsed example, corrected to open the guide; mobile zero/domain-end labels crowded, fixed by suppressing a nearby endpoint while retaining zero; horizontal table scrolling lacked a visible cue, now supplied.

One broad parallel run exhausted Windows memory and failed to spawn Node workers. A reviewer independently observed paging-file initialization failure. Sequential Node execution passed 64/64, and the package test command now uses that limit. The same overloaded browser pass had a local connection refusal and a panel timeout. Its subpath harness now serves the actual built files directly through Playwright routing rather than duplicating local HTTP fetches; the complete sequential browser run then passed 16/16. These were recorded failures, not silently counted as passes.

## Visual/accessibility evidence and review

Actual baseline and enhanced screenshots were inspected in two bounded rounds: initial desktop/mobile inspection, then one confirmation after the collected fixes and P1 controls. Enhanced captures: `artifacts/screenshots/reference-360.png`, `reference-768.png`, `reference-1366.png`; baseline copies: `artifacts/screenshots/baseline/`. Screenshots are local ignored review artifacts, not fabricated assets or committed scientific evidence. The second round confirms the corrected mobile zero tick, visible table hint, working reflow, readable source copy and geographic context. No material layout defect remains in the inspected views.

Impeccable context ran once; incumbent PRODUCT/DESIGN identity was preserved. Its detector ran once on the changed UI: two warnings, cream paper and tight display leading. Both were inspected in context. The approved paper surface and existing serif display typography remain intentional; body text uses 1.6 leading. Existing palette contrast calculations remain applicable: ink/paper 13.32:1, secondary/paper 7.08:1, teal/paper 6.51:1 and rust/paper 6.41:1. Redundant line patterns/shapes and text prevent reliance on colour alone. The map's SVG description gives geographic bounds, with equivalent adjacent text.

Distinct reviews:

- Scientific reviewer: no actionable scientific defects; 25 targeted state, uncertainty and real-data-parity tests passed. Confirmed comparison +1.7662%, interval −12.7291% to +18.6690% per decade, correctly inconclusive; reference/provenance untouched.
- Engineering/security reviewer: no actionable code/security defect in URL/history, CSV escaping/gaps/formula protection, asynchronous clipboard guard, map seams/fallback or explicit public whitelist; 36 targeted tests passed. It correctly identified the old reproduction ZIP before regeneration; the final package replaces it.
- UX reviewer: independently inspected the actual desktop/mobile captures and source. Two medium findings, mobile tick crowding and missing visible table-scroll cue, were corrected together and confirmed. This reviewer did not claim keyboard/zoom testing; those checks were performed by the coordinating browser suite.

Accessibility limits: no formal WCAG certification, screen-reader session, forced-colour audit, physical-phone test or native browser-toolbar zoom test was performed. The automated zoom check is CSS-viewport/text enlargement, explicitly not a claim about native toolbar zoom. Clipboard success remains subject to browser permissions; its denial fallback was tested. Only installed Chrome was used. Public URL and actual GitHub Pages behavior remain unverified until publication is separately authorized.

## Submission alignment and deferred work

`artifacts/submission/submission-draft.md` now describes actual V3 behavior and map attribution. Its scientific claims and AI disclosure remain intact. The current seven-slide scientific demo remains consistent, including the distinction between its annual context plot and the website's monthly series. The binary PPTX/PDF was **not regenerated for V3**. `docs/submission-alignment-v3.md` records exact slide/notes updates and required re-rendering before demonstrating the new interactions. This permitted documentation route avoids pretending the deck was refreshed. Reconfirm actual portal fields and accepted format before submission.

No P0 or approved safe P1 feature remains deferred. Formal assistive-technology/cross-browser work and optional presentation refresh are not claimed complete. Human review, any remote integration/publication, live-site verification and NASA submission are separate remaining stages.

## Git handoff and publication boundary

Work is isolated on `enhance/website-v3`, descending from review head `c7ee1c0098f88daf35200072bee1595d56e8dd47`; the original `build/ocean-response` checkout remains unchanged. No global Git trust configuration was changed. Only process-local exact-directory trust was used for local Git metadata writes.

After reviewing the local enhancement and explicitly authorizing remote integration, the participant can fast-forward the existing draft PR's head branch from this worktree:

```powershell
git fetch origin review/pages-release
git merge-base --is-ancestor origin/review/pages-release enhance/website-v3
# Continue only if the ancestor check succeeds and remote integration is approved.
git push origin enhance/website-v3:review/pages-release
```

Do not force-push if the remote advanced; reconcile and re-verify first. This updates draft PR #1 rather than mixing the original unrelated build/main histories. Review the changed files and fresh CI on that PR. No merge, deployment trigger, Pages setting change or public submission is authorized by this handoff. Obtain separate publication approval, verify the eventual actual Pages URL/subpath and all downloads/interactions, then obtain the participant's final NASA-submission decision. A local preview is not a valid submitted project link.
