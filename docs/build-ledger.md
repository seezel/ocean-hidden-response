# Build ledger

## Authority and decisions

Source: approved Codex Master Prompt V2.0 (November 12, 2026), approved implementation plan 0.1, and conversation answers. START BUILD received and clock verified November 14, 2026, 09:03 WIB. No project implementation existed before this gate.

Q65: Windows 10 Pro, PowerShell 5.1. Q66: user reports CDS and Earthdata licences, local authentication and prior requests complete; execution validation remains necessary. Q67: local only initially, cloud deferred. Q68: overall archival visual language, chart first. Demo: seven-slide deck. Antislop: during.

## Context map and reviewed preflight

The workspace was empty and not a Git repository. No incumbent imports, tests, or visual patterns exist. New interfaces are listed below. This map was reviewed against V2.0 before implementation.

| Subsystem | Responsibilities | Tests |
| --- | --- | --- |
| science | Bounded retrieval, quality/area aggregation, reference inference, licensed exports | Known grids, synthetic trends, independent statistical oracle, real metadata |
| src | Prepared-data validation, browser inference, controls, accessible charts | Schema failures, Python parity, missing months, invalid windows, stale state |
| assets and index | Original archival interface, map, narrative, responsive layout | Desktop/mobile, keyboard, loading/empty/error |
| tools | Public artifact whitelist and reproducibility packaging | No secrets/raw files, working links |

| Tasks sharing an interface | Producer / consumer | Resolution |
| --- | --- | --- |
| acquisition / aggregation | Real grids / weighted monthly records | Preserve units, missingness, quality and provenance |
| aggregation / inference | Month, region, variable, value, coverage / model | Same eligible calendar months; no imputation |
| Python / browser | Identical model contract / custom windows | Independent numerical parity required |
| inference / UI | Eligible result or explicit unavailable reason / visible numbers | Selection invalidates all prior results |
| exports / public build | Licensed processed data and scripts / static host | Whitelist only; credentials and raw downloads excluded |
| science and NASA eligibility | Chosen products / challenge resource requirement | Verify resource linkage, request approval for material source changes |

Each task's own tests agree with its intended behavior. Plan 0.1 is superseded by V2.0 where wording differs. Public deployment and submission are not authorized by START BUILD. No API migrations or existing consumers are affected.

## Milestones

- [x] 6.1 Workspace, page and initial tests
- [x] 6.2 Authentic data access, licence and NASA-resource verification
- [x] 6.3 Regional processing and quality tests
- [x] 6.4 Python reference and diagnostics
- [x] 6.5 Browser engine and numerical parity
- [x] 6.6 Accessible archival interface
- [x] 6.7 Reproduction and licensed exports
- [ ] 6.8 Optional public on-demand observations, only after core validity
- [ ] 6.9 QA, seven-slide demo and submission drafts

## Environment findings

The PATH command `python` resolves to a broken MSYS2 installation. Use native `python3` to create the project virtual environment, then `.venv\Scripts\python.exe` explicitly. No global PATH changes are needed. Science dependencies will be isolated in this workspace.

## Evidence and rulings

- Native Python virtual environment created after the start gate. Scientific requirements pinned. No global PATH or credential changes.
- CDS initially could not initialize: standard user configuration absent. Default .cdsapirc/.netrc/_netrc existence checked without reading contents. The user subsequently configured local access and requested a retry. The authenticated retry succeeded at02:55UTC, returning a177,604,652byte global file, above the prespecified96MiB feasibility budget; no regional subsetting is available. Ruling: retain preapproved Q56 VIIRS fallback based on the bounded acquisition budget; this changes the defensible period and is disclosed everywhere. Cost if wrong: a longer/better source record could be acquired in a later research revision.
- Real NOAA regional records acquired for 2012–2025: native VIIRS chlorophyll; MUR SST at every tenth spatial coordinate (0.1°). Native MUR ocean masks map land consistently to source grids. Six prespecified native SST checks passed 0.05°C tolerance, maximum observed difference 0.0132084°C. This validation does not bound all months.
- Exact January 2013 NASA MODIS Aqua R2022 granule retrieved from the public NOAA mirror after direct NASA download required unavailable local authentication. Filename/58,198,505byte size matched NASA CMR, with checksum validation when supplied. Giovanni catalogue explicitly supports that collection, and Giovanni is a challenge-listed resource. Actual regional values are displayed separately; one month does not verify trends or guarantee eligibility.
- 672 calendar records exported, 664 observed. Reference fixed to 2013-01..2025-12 before viewing outcomes; 154/156 eligible months per fit. Chlorophyll EEP -16.3097%/decade, NWP -17.7622%; direct contrast +1.7662% growth-rate ratio/decade,p=.822116, inconclusive. SST EEP -.071009°C/decade,p=.869331; NWP+.414617°C/decade,p=.000394. Full CIs and diagnostics in reference-results.json.
- Statistics task independently reviewed. Round1 Important diagnostic overflow issue fixed in both languages with observed red/green regressions. Scoped re-review: ADDRESSED, no new Important/Critical findings.
- Five real-data Python/JS parity windows pass, including insufficient inference. Published processed-data reproduction passes all five analyses and exact input hash.
- Browser connector reported no available browser; browser-use CLI absent. Used installed Chrome with isolated headless Playwright profile, no cloud browser or existing user session. Seven actual browser scenarios passed: all controls/panels/downloads, short-window invalidation, reference reset, keyboard,360/768/1366px reflow, and failed fetch/retry. Desktop/mobile screenshots inspected together; no layout edits needed.
- Impeccable detector ran once: no errors, one cream-palette warning. Ruling: retain the explicitly documented pale paper surface for prolonged reading and archival identity; measured contrast and actual screenshots support the chosen implementation. No decorative treatment was added to evade the detector.
- npm unit suite:40passed. Python suite:26passed plus7subtests. Seven real browser scenarios passed. Fresh reproduction ZIP extraction independently reran allfivefits and40Node tests. Seven-slide deck and PDFpreview rendered and inspected; source text updated after successfulCDS retry. Broad review is being finalized. Public deployment/public push/submission remain unauthorized and NOT STARTED.
- Sandbox permits working files but .git index writes require escalation. Escalated Git uses process-local safe.directory for this exact workspace because sandbox-created metadata has a different Windows owner; no global trust setting changed.

