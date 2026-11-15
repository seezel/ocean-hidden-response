# Statistical implementation and verification report

All series and numerical examples in this report are synthetic. They are software validation cases, not acquired ocean observations or claims about the EEP or NWP.

## Delivered interface and scope

- `science/analyze.py`: `fit_trend(records, variable, *, start=None, end=None)` and `compare_trends(eep_records, nwp_records, *, start=None, end=None)`.
- `science/__init__.py`: package marker.
- `src/trends.js`: independent, dependency-free ES-module implementation with `fitTrend(records, variable, options={})`, `compareTrends(eepRecords, nwpRecords, options={})`, and exported `MODEL_VERSION`.
- `tests/test_analyze.py`, `tests/trends.test.js`: analytic, statistical-oracle, parity, policy, input, and numerical regression tests.
- `tests/fixtures/statistics-synthetic.json`: explicitly labelled deterministic synthetic cases, using Python standard-library random seed 4831.

No observations were downloaded, dependencies changed, Git state changed, or commits created by this implementer. Acquisition, presentation, and integration remain with the controller.

The model identifier is `seasonal-ols-calendar-hac-bartlett-nk-t-v1.0.0`. The conventions below define that version.

## Input and eligibility

Records contain a `YYYY-MM` month, a finite numeric value or explicit null, and a finite coverage fraction in [0, 1]. Supported variables are `chlor_a` and `sst`. Malformed months, years outside 0001 through 9999, duplicate months, malformed records, nonnumeric values, nonfinite values, and invalid coverage return an unavailable result with a reason. Python accepts lists or tuples; JavaScript accepts arrays. Records are never mutated. Input ordering does not affect results.

Coverage below 0.1 is missing; coverage equal to 0.1 is retained. Missing values, zero chlorophyll, and negative chlorophyll remain missing calendar months. Invalid chlorophyll never enters a logarithm. SST zero and negative values remain valid numeric observations. Record validation applies to the supplied input before window selection, so a malformed record outside the requested window is also rejected.

Requested start and end are inclusive calendar months. When absent, bounds use the first and last supplied months, including supplied missing records. Comparison defaults use the union of both supplied month sets; inference uses only aligned valid positive observations. This avoids silently shortening the requested comparison window to its complete pairs. Explicit bounds can extend outside the supplied data, with those months counted as missing.

The following minimums are conservative project policy, not universal statistical guarantees:

| Check | Required value |
| --- | --- |
| Inclusive requested calendar span | At least 120 months |
| Valid observations | At least 120 months |
| Valid observations / requested calendar span | At least 0.85 |
| Each month of year | At least five valid observations |
| Longest missing run, including requested-window edges | At most six months |
| Seasonal design | Full rank, acceptable conditioning |

Checks run in that order and return the first failing reason. Diagnostics retain completeness, month counts, missing-run length, and sample size when available. Main inferential fields are null and `fitted` is empty whenever unavailable. Malformed or reversed windows never retain prior results.

A January-only series is explicitly tested as an unavailable confounded selection. The eligibility requirements already prevent such a singular seasonal model from reaching the numerical solve: all twelve month effects are represented repeatedly across years. A defensive QR rank/conditioning check remains in both engines. The condition criterion is the infinity-norm product `||R||∞ ||R⁻¹||∞`, with rejection above 1e10. Python also checks numerical matrix rank; JavaScript rejects QR diagonal magnitudes below `1e-12 * sqrt(n)`.

## Model and units

The response is natural log chlorophyll for `chlor_a`, and observed SST for `sst`. For valid month m,

`y_m = alpha + beta * t_m + sum(gamma_j * I[month(m)=j], j=February..December) + residual_m`.

Time is elapsed calendar months from requested start divided by twelve. Eleven month-of-year indicators represent seasonal level differences; January is omitted. There are k=13 parameters, including intercept and trend. Gaps are never replaced by compressed observation indices, interpolated values, or synthetic zeroes.

For numerical stability, time is centered on its valid-observation mean and divided by its population standard deviation. Response is centered on its first valid value and divided by its maximum absolute centered value; an identically constant response uses scale one. This transformation preserves the model and makes extremely large constant offsets and very small finite slopes tractable. Output coefficients and standard errors are transformed back to original response units.

Python uses NumPy QR and triangular solves. JavaScript independently implements modified Gram-Schmidt with two orthogonalization passes and back substitution. Neither engine obtains coefficients from an unconditioned normal-equation inversion. The trend influence row is obtained through QR and used to project the HAC covariance directly onto the slope, avoiding an unnecessary full covariance matrix in production.

For single-region chlorophyll:

- `slopePerYear` is beta in log(mg/m3) per year.
- `trendPerDecade = 100 * expm1(10 * beta)`, percent per decade.
- `ci95` transforms both log-slope confidence bounds by the same monotone percentage transformation.
- `baseline` is the geometric mean of valid observations inside the first twelve calendar months of the requested window. It is not the first twelve available observations.
- `absoluteChangePerDecade = baseline * expm1(10 * beta)`, in mg/m3. This is a baseline-anchored transformation, not an absolute linear slope.
- `fitted` contains the exponentiated, seasonally varying model predictions at valid observed months. It is not a bias-corrected arithmetic mean.

For SST, slope is degrees Celsius per year; trend and confidence interval are degrees Celsius per decade. Baseline and absolute chlorophyll transformation are null. Fitted values are in degrees Celsius.

Comparison constructs `log(EEP) - log(NWP)` at aligned eligible months, then fits that response to the same seasonal design. It directly tests the difference between regional log trends, including contemporaneous cross-region dependence through the paired difference residuals. Comparison slope and `ci95` are on the **log ratio per year** scale. Its `trendPerDecade = 100 * expm1(10 * beta)` describes the change in the relative growth-rate ratio, not a percentage-point difference or an absolute chlorophyll difference. Comparison baseline and absolute change are null; comparison fitted values are log EEP/NWP ratios. `estimand`, `unit`, `slopeUnit`, `ci95Unit`, and `trendPerDecadeUnit` identify these distinctions in each result.

## Calendar-spaced HAC and inference

The primary bandwidth is fixed as `L = max(1, floor(4 * (n/100)^(2/9)))`. The Bartlett weight at calendar distance h is `w_h = 1 - h/(L+1)`.

Let `s_m = x_m * residual_m`. The uncorrected sandwich meat is

`S = sum(s_m s_m') + sum(h=1..L, w_h * sum(m,m-h both observed, s_m s_(m-h)' + s_(m-h) s_m'))`.

The covariance is `n/(n-k) * (X'X)^(-1) S (X'X)^(-1)`, evaluated through QR influence rows in production. A pair contributes only when its original calendar-month distance equals h. Missing-calendar checks use an independent double loop over all observation pairs in the original unscaled design.

Student-t degrees of freedom are `df=n-13`. The two-sided p-value is `2 * Pr(T_df >= abs(beta/SE))`; confidence bounds are `beta ± t_(.975,df) * SE` before any unit transformation. SciPy supplies the Python t distribution. JavaScript independently implements Lanczos log-gamma, a continued-fraction regularized incomplete beta tail, and bisection for the 0.975 t quantile. It evaluates the tail directly rather than subtracting an almost-one CDF.

HAC/t inference remains approximate. A Student-t reference distribution and finite-sample correction do not make this an exact small-sample test. Neither independence nor causation is claimed.

Numerically exact fits use a residual tolerance of `64 * machine_epsilon` on the normalized response. Such fits use slope SE zero, a point interval, and p=1 for a numerically zero slope or p=0 for a nonzero slope. A numerically zero slope is recognized only within an exact fit and below `64 * machine_epsilon / time_scale` on the normalized coefficient. This explicit degenerate-data convention avoids meaningless noise from roundoff in noiseless fixtures. It is not evidence that real measurements have no uncertainty. Standardized-residual scale and residual autocorrelation are null for exact fits.

Finite inputs that produce an unrepresentable response range or nonfinite model transformations return unavailable results. Numeric checks include sensitivity intervals and baseline-anchored change as well as the primary trend. There is no fallback to a different selected model or lag.

## Diagnostics and sensitivity

`diagnostics.slopeStandardError` is on the annual slope scale. `residualScale` is `sqrt(sum(residual²)/(n-13))` in model response units. `standardizedResidualScale` is the root mean square of internally standardized residuals `residual/(residualScale*sqrt(1-leverage))`. It assesses residual scale with leverage adjustment, rather than claiming normality. `residualLag1` is Pearson correlation over residual pairs separated by exactly one calendar month.

Separate HAC calculations at lags 6, 12, and 24 return slope SE, CI, p-value, significance at 0.05, and whether the conclusion differs from the prespecified primary result. `significanceChangesWithLag` exposes any change. The primary bandwidth is never replaced by whichever produces a preferred result.

The synthetic autocorrelated case illustrates why the warning matters:

| Lag | Slope SE, annual log units | p-value | Chlorophyll CI, percent/decade |
| --- | --- | --- | --- |
| Primary 4 | 0.0026127923 | 0.0196846601 | [0.99381933, 11.94726047] |
| 6 | 0.0027932136 | 0.0290150941 | [0.63540896, 12.34595770] |
| 12 | 0.0030854819 | 0.0478904044 | [0.05750961, 12.99483110] |
| 24 | 0.0031953064 | 0.0560177647 | [-0.15878668, 13.23962342] |

Endpoint sensitivity is not silently searched or optimized. Different requested windows change the estimand; a later observational analysis should show meaningful prespecified endpoint alternatives. Dependence beyond the tested lags, nonlinear or changing trends, changing seasonal behavior, product changes, spatial aggregation, and measurement uncertainty remain substantive concerns. A residual correlation and a bandwidth check do not resolve these issues.

## Test-first evidence

Tests were authored before production implementation. The initial import-only failure was not treated as adequate red evidence. After adding minimal API stubs, `node --test tests/trends.test.js` produced **0 passed, 11 failed** with assertions such as `false !== true: not implemented` and unavailable-field assertions. Full implementation then produced **11 passed, 0 failed**.

Python tests were also authored before the engine, while the controller was installing scientific dependencies. The Python oracle/parity suite ran once dependencies became available. A later numerical regression test was observed red in both languages: fitting a constant `1e250` SST offset produced erroneous slopes around `-8.12e232` in JavaScript and `1.20e233` in Python, with Python overflow warnings. Response centering/scaling fixed that issue. An additional subnormal-slope regression was observed red before removing an unnecessary response-scale floor. Final runs preserve tiny and subnormal finite slopes and produce strictly serializable Python results.

The policy-boundary test initially removed the same calendar months repeatedly and correctly failed the per-month policy. The test data were corrected to distribute gaps across the year and to hold the requested endpoints fixed when testing exact 0.85 completeness. No production criterion was weakened.

Validation cases include positive, negative, zero, seasonal, autocorrelated, and missing-month chlorophyll; SST; too-short windows; exact 120-month eligibility; completeness exactly at and below 0.85; missing runs; per-month insufficiency; singular/confounded selections; zero/negative chlorophyll; coverage boundaries; duplicate/malformed/nonfinite records; invalid windows and variables; record nonmutation; reversed input order; paired-month alignment; large constant offsets; tiny and subnormal slopes; unsafe exponentiation; and bandwidth significance changes.

## Independent oracle and parity results

Environment: Node v24.13.0; NumPy 2.5.4; SciPy 1.18.1; statsmodels 0.15.0. Python is the controller's `.venv/Scripts/python.exe`.

Complete-month cases use independent `statsmodels.OLS` fits in the original design with `get_robustcov_results(cov_type='HAC', maxlags=L, use_correction=True, use_t=True)`. The same checks apply separately to sensitivity lags 6, 12, and 24. Paired complete-month log differences have their own statsmodels slope, p-value, and log/year CI comparison. Student-t/p/CI comparisons additionally span sample sizes 120, 132, 192, 360, and 720, covering weak, zero-generating, negative, and strong trends. Missing-month covariance is checked by explicit all-pair calendar-distance enumeration rather than treating statsmodels' compressed-row HAC as an oracle.

Across the complete-calendar fixture cases, maximum absolute primary differences from statsmodels were:

| Quantity | Maximum absolute difference |
| --- | --- |
| Annual slope | 9.81e-17 |
| Annual slope SE | 1.86e-16 |
| Transformed confidence bound | 1.92e-13 |
| Nondegenerate p-value | 5.92e-15 |

The missing-calendar case has n=225, calendar-aware SE **0.00231080653903411**. Incorrectly compressing the calendar to adjacent rows gives SE **0.00234400613749213**. The independent calendar-pair oracle matches the implemented result within 1e-8, and a regression asserts the two approaches are observably different.

Shared-fixture maximum absolute Python/JavaScript differences were annual slope **2.09e-17**, slope SE **3.47e-18**, p-value **8.33e-14**, and CI bound **1.68e-13**. Acceptance tolerances are 1e-8 absolute for slope/SE and 1e-6 for p/CI. CI array comparisons also allow 1e-10 relative tolerance to accommodate scale in larger-magnitude cases; ordinary fixture differences are far below the absolute tolerances. Both engines are independent; neither invokes the other to fit a model.

The synthetic paired counterexample confirms that different individual p-values do not establish a regional difference:

| Fit | Annual log slope | p-value |
| --- | --- | --- |
| EEP separately | 0.0152743156 | 0.0011949730 |
| NWP separately | 0.0061446875 | 0.1450870571 |
| Paired EEP minus NWP | 0.0091296281 | 0.1587643487 |

The paired CI is [-0.0035938947, 0.0218531510] log ratio/year and includes zero. Its decade relative growth-rate ratio change is 9.5593561%, with no claim of a statistically established difference.

## Verification commands and observed results

Run from the workspace root in PowerShell:

```powershell
node --test tests/trends.test.js
& '.venv/Scripts/python.exe' -m unittest tests.test_analyze -v
npm test
& '.venv/Scripts/python.exe' -m pytest -q
```

Latest complete runs before handoff: dedicated Node statistics suite **15/15 passed**; full `npm test` **20/20 passed**; full Python pytest **21 passed, 7 subtests passed**. The full Python count includes controller-owned acquisition tests. No warnings or failures remained in these green runs. Final post-report verification is recorded in the handoff message.

## Remaining concerns

No implementation blocker remains within the assigned statistical scope. The quantitative results above concern synthetic software cases only. Observational availability, source quality, acquisition coverage, and public presentation are controller-owned work and are not validated by these synthetic statistics tests. HAC uncertainty remains approximate, and the exposed lag-sensitivity flags must remain visible when interpreting real results.

## Review fix round 1: diagnostic overflow

The independent review identified a finite-input case in which `residualScale * responseScale` overflows after the earlier model-transformation guard. The exact synthetic reproducer has 240 consecutive months starting January 2000, coverage one, SST zero for the first observation, and SST values `1.79e308 * (-1 if floor(i/12) is odd else 1)` for all remaining observations. The main slope and confidence interval remain finite, but the residual-scale diagnostic becomes positive infinity. Before this fix Python could return an object rejected by `json.dumps(..., allow_nan=False)`; JavaScript serialization silently replaced the infinity with null.

Regressions were added before modifying either engine. These targeted commands both exited one with one failed test because `eligible` was incorrectly true:

```powershell
node --test --test-name-pattern='overflowed residual diagnostic' tests/trends.test.js
& '.venv/Scripts/python.exe' -m unittest tests.test_analyze.TrendTests.test_overflowed_residual_diagnostic_is_unavailable_and_serializable -v
```

Observed red assertions were `true !== false` in JavaScript and `AssertionError: True is not false` in Python. Both engines now construct model diagnostics separately, recursively validate every numeric value, including nested lag-sensitivity entries, and attach them only after validation. A nonfinite diagnostic returns `eligible: false` with reason `Non-finite model diagnostic`, null inferential fields, and no fitted values. The rejected diagnostic is never inserted into the unavailable result. Python strict JSON serialization and an unchanged JavaScript JSON roundtrip are asserted by the new regressions.

Exact green evidence after the scoped fix:

| Command | Observed result |
| --- | --- |
| `node --test tests/trends.test.js` | 16 passed, 0 failed; exit 0 |
| `.venv/Scripts/python.exe -m unittest tests.test_analyze -v` | 9 tests, OK; exit 0 |
| `npm test` | 33 passed, 0 failed; exit 0 |
| `.venv/Scripts/python.exe -m pytest -q` | 26 passed, 7 subtests passed; exit 0 |

The larger full-suite counts reflect concurrently completed controller-owned work. No warning or failure remained. This round changed only the two engines, their two test files, and this report; no Git state or dependencies were changed.
