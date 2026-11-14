# V4 review-only pre-push audit, November 15, 2026

The participant authorized a new remote review branch and draft PR to main, with no merge, deployment, Pages changes or NASA submission. V4 descends from local V3 `5ea108e` and review head `c7ee1c0098f88daf35200072bee1595d56e8dd47`. Main remains `20fd8ebe0bea98f8c34d5e7f101c3b52f25d6979`. The existing PR #1 is open, draft and unchanged.

## Controlled pytest retry

The original run stopped after 64 JavaScript tests passed and pytest reported 21 passed, seven subtests passed and five setup errors (exit 1). Full original command output was recovered from the local session record into ignored `.cache/original-pytest-trace.txt`. All five tracebacks were inspected: the three temporary-download tests in `test_acquire.py` and two temporary-NetCDF tests in `test_prepare.py` fail inside pytest's `tmp_path` setup, through `getbasetemp`, numbered-directory discovery and `os.scandir` of the shared `pytest-of-…` directory, with WinError 5. They do not reach application/test bodies. Two cache warnings also occurred in that original run. No shared directory, Windows permission or unrelated process was changed.

The authorized complete retry used the existing root virtual environment and a previously nonexistent `.cache/pytest-v4-20261115-063739-340` directory. Git confirmed that path is ignored before invocation. Result: 26 passed and seven subtests passed in 12.56 seconds, exit 0, with no setup errors or warnings. The output remains in ignored `.cache/pytest-retry.log`. A diagnostic traceback parser initially counted only three headings because its separator regex required three underscores; two headings use one underscore. Inspecting all five headings resolved that helper error, and the corrected diagnostic passed. No project test or application change was made to repair the setup failure.

## Fresh checks

- `npm test`: 64 passed, exit 0 in the original pre-push sequence; no source changed since that execution.
- Python `-m pytest -q --basetemp=<unique ignored local directory>`: 26 passed, seven subtests passed, exit 0.
- Python `-m science.export --verify`: all five frozen analyses reproduced; published input SHA-256 matched, exit 0.
- Python `-m science.export --package`: 76 entries generated, exit 0.
- `npm run build`: success, exit 0.
- `node tools/run-v4-browser-tests.mjs`: 26 passed, exit 0, normal runner termination. Includes repository-subpath assets, controls, uncertainty, selected exports, clipboard failure, missing map, empty/error recovery, keyboard, responsive layout and forced-colors scenarios. The only reported warning concerned NO_COLOR/FORCE_COLOR.
- Fourteen explicitly compared protected files match V3 byte-for-byte: five scientific JSON files; acquire, aggregate, analyze and prepare Python modules; JavaScript trends; both statistics fixtures; and `test_analyze.py`/`test_aggregate.py`. SHA records remain in ignored `.cache/protected-v4.json`. Separately, AST comparison confirms `science/export.py` is unchanged outside its packaging function.
- All 76 ZIP members match current source bytes, ZIP CRC check passes, and all 28 declared static files match source with no additional public files. Sensitive-path exclusions were checked. These checks must be repeated after audit documentation is packaged.
- The only workflow is the unchanged `pages.yml`. PRs target main; pushes target main. Configure Pages, artifact upload and deployment require main and a non-PR event. No manual dispatch is authorized. Local browser results are separate from CI because this workflow does not run Playwright.

## Public file review and limits

Only intended source, tests, branding assets and documentation are selected for Git. Prototype screenshots, failed-run logs, pytest temporary files and caches remain local and unstaged. Existing documentation contains local environment paths; these are reproducibility context, not credentials. The brand SVG/raster files are original artwork; Natural Earth is public-domain context with attribution. System fonts are used, with no bundled font requiring redistribution. No third-party photography, remote runtime API, tracker or font CDN was added. `assets/BRAND-SOURCES.md` records authorship and limitations.

Remote review is not release acceptance. Native browser zoom, real touch/on-screen keyboard, screen-reader review, non-Chromium browsers, every-control manual click-through, a complete antislop design delivery gate and deployed social-crawler behavior remain unverified. Prior design records identify incomplete logo variants/icon inventory. These limitations stay visible for human review; no complete accessibility certification or full design-gate pass is claimed.

## Mandatory skill application

All nine installed SKILL.md files were reloaded before this controlled retry, matching the user-supplied skill content: `$caveman`, `$impeccable:impeccable`, `$antislop`, `$antislop-copywriting`, `$antislop-human`, `$antislop-layoutmobile`, `$antislop-ui`, `$antislop-code`, `$context-optimization`. The previous explicit during-mode selection persists. Their contributions are concise chat, existing visual-context review, honest scoped acceptance, factual audit/PR copy, keyboard/contrast limitations, responsive/subpath verification, state/scientific-graphic checks, preserved meaningful comments and scoped output with ignored trace evidence. No skill was unavailable. Impeccable context was executed during preflight; no visual edits or new design pass occurred in this retry. Required skills are reused at verification/public-review checkpoints without claiming a complete design audit.

The new draft PR must include the original project, V3 and V4 because main has not received the project. The original V3 fallback and PR #1 remain intact. CI outcome will be reported after the authorized new branch push and draft PR creation, rather than predicted here.
