"""Seasonal OLS with calendar-spaced Newey-West inference.

Eligibility thresholds are conservative project policy. HAC/t inference is
approximate and does not establish causation.
"""
import math
import re

import numpy as np
from scipy.stats import t as student_t

MODEL_VERSION = 'seasonal-ols-calendar-hac-bartlett-nk-t-v1.0.0'
K = 13
POLICY = {'minimumCalendarMonths': 120, 'minimumValidMonths': 120,
          'minimumCompleteness': .85, 'minimumPerCalendarMonth': 5,
          'maximumMissingRun': 6, 'minimumCoverage': .1,
          'label': 'Conservative project policy; not universal statistical guarantees'}


def _month(value):
    if not isinstance(value, str) or not re.fullmatch(r'[0-9]{4}-(0[1-9]|1[0-2])', value):
        raise ValueError('Malformed month; expected YYYY-MM')
    year, month = map(int, value.split('-'))
    if year < 1:
        raise ValueError('Year must be in 0001..9999')
    return year*12 + month-1


def _label(month):
    return f'{month//12:04d}-{month%12+1:02d}'


def _records(records):
    if not isinstance(records, (list, tuple)):
        raise ValueError('Records must be an array')
    result = {}
    for row in records:
        if not isinstance(row, dict):
            raise ValueError('Each record must be an object')
        if 'value' not in row:
            raise ValueError('Values must be finite numbers or null')
        month = _month(row.get('month'))
        if month in result:
            raise ValueError('Duplicate month')
        value, coverage = row.get('value'), row.get('coverage')
        if value is not None and (isinstance(value, bool) or not isinstance(value, (float, int)) or not math.isfinite(value)):
            raise ValueError('Values must be finite numbers or null')
        if isinstance(coverage, bool) or not isinstance(coverage, (float, int)) or not math.isfinite(coverage) or not 0 <= coverage <= 1:
            raise ValueError('Coverage must be a finite fraction in [0, 1]')
        result[month] = (value, coverage)
    return result


def _blank(variable, comparison=False):
    return {'eligible': False, 'reason': None, 'n': 0, 'start': None, 'end': None,
            'slopePerYear': None, 'trendPerDecade': None, 'ci95': None,
            'pValue': None, 'df': None, 'lag': None, 'baseline': None,
            'absoluteChangePerDecade': None, 'fitted': [], 'diagnostics': {'policy': dict(POLICY)},
            'modelVersion': MODEL_VERSION,
            'estimand': ('EEP minus NWP log-chlorophyll trend (relative growth-rate ratio)' if comparison else
                         'Seasonally adjusted log-chlorophyll trend' if variable == 'chlor_a' else
                         'Seasonally adjusted SST trend'),
            'unit': 'log ratio per year' if comparison else 'percent per decade' if variable == 'chlor_a' else 'degrees Celsius per decade',
            'slopeUnit': 'log ratio per year' if comparison else 'log(mg/m3) per year' if variable == 'chlor_a' else 'degrees Celsius per year',
            'trendPerDecadeUnit': 'percent relative growth-rate ratio per decade' if comparison else 'percent per decade' if variable == 'chlor_a' else 'degrees Celsius per decade',
            'ci95Unit': 'log ratio per year' if comparison else 'percent per decade' if variable == 'chlor_a' else 'degrees Celsius per decade'}


def _fit(data, variable, start, end, *, comparison=False, invalid_chlorophyll=0):
    out = _blank(variable, comparison)
    try:
        lo = _month(start) if start is not None else min(data) if data else None
        hi = _month(end) if end is not None else max(data) if data else None
    except ValueError as error:
        out['reason'] = str(error)
        return out
    if lo is None or hi is None or lo > hi:
        out['reason'] = 'Empty or reversed requested window'
        return out
    out.update(start=_label(lo), end=_label(hi))
    selected = sorted((month, value) for month, value in data.items() if lo <= month <= hi and value is not None)
    n = len(selected)
    span = hi-lo+1
    counts = [sum(month % 12 == m for month, _ in selected) for m in range(12)]
    previous, max_run = lo-1, 0
    for month, _ in selected:
        max_run = max(max_run, month-previous-1)
        previous = month
    max_run = max(max_run, hi-previous)
    diagnostics = out['diagnostics']
    diagnostics.update(calendarMonths=span, completeness=n/span, monthCounts=counts,
                       maxMissingRun=max_run, invalidChlorophyll=invalid_chlorophyll,
                       rank=None, conditionNumber=None)
    out['n'] = n
    failures = [(span < 120, 'Requested span is shorter than 120 calendar months'),
                (n < 120, 'Fewer than 120 valid months'),
                (n/span < .85, 'Completeness is below 0.85'),
                (min(counts) < 5, 'Fewer than five observations for a calendar month'),
                (max_run > 6, 'Missing run exceeds six calendar months')]
    for failed, reason in failures:
        if failed:
            out['reason'] = reason
            return out
    months = np.array([month for month, _ in selected])
    y = np.array([value for _, value in selected], dtype=float)
    response_offset = float(y[0])
    with np.errstate(over='ignore'):
        centered_y = y-response_offset
    if not np.all(np.isfinite(centered_y)):
        out['reason'] = 'Response range exceeds finite arithmetic'
        return out
    response_scale = float(np.max(np.abs(centered_y))) or 1.
    normalized_y = centered_y/response_scale
    time = (months-lo)/12
    center, scale = float(np.mean(time)), float(np.std(time))
    x = np.column_stack([np.ones(n), (time-center)/scale,
                         *[(months%12 == m).astype(float) for m in range(1, 12)]])
    q, r = np.linalg.qr(x, mode='reduced')
    rank = int(np.linalg.matrix_rank(r))
    # Infinity-norm conditioning uses the same criterion in both engines.
    try:
        inverse_r = np.linalg.solve(r, np.eye(K))
        condition = float(np.linalg.norm(r, ord=np.inf)*np.linalg.norm(inverse_r, ord=np.inf))
    except np.linalg.LinAlgError:
        condition = math.inf
    diagnostics.update(rank=rank, conditionNumber=condition if math.isfinite(condition) else None)
    if rank != K or condition > 1e10:
        out['reason'] = 'Rank-deficient or ill-conditioned seasonal design'
        return out
    coefficients = np.linalg.solve(r, q.T@normalized_y)
    prediction = x@coefficients
    residual = normalized_y-prediction
    # QR gives the trend's influence row without forming X'X.
    influence = (inverse_r@q.T)[1]/scale
    scores = influence*residual
    normalized_beta = float(coefficients[1]/scale)
    beta = normalized_beta*response_scale
    df = n-K
    lag = max(1, math.floor(4*(n/100)**(2/9)))
    quantile = float(student_t.ppf(.975, df))
    lookup = {int(month): i for i, month in enumerate(months)}
    exact_fit = bool(float(np.max(np.abs(residual))) <= 64*np.finfo(float).eps)
    if exact_fit and abs(normalized_beta) < 64*np.finfo(float).eps/scale:
        beta = 0.

    def inference(bandwidth):
        variance = float(scores@scores)
        for distance in range(1, bandwidth+1):
            cross = sum(float(scores[i]*scores[lookup[int(month)-distance]])
                        for i, month in enumerate(months) if int(month)-distance in lookup)
            variance += 2*(1-distance/(bandwidth+1))*cross
        variance *= n/df
        if variance < -1e-18:
            raise ArithmeticError('Negative HAC variance')
        se = 0. if exact_fit else math.sqrt(max(0., variance))*response_scale
        p = float(2*student_t.sf(abs(beta/se), df)) if se > 0 else 1. if beta == 0 else 0.
        bounds = [beta-quantile*se, beta+quantile*se]
        if not comparison:
            bounds = [100*math.expm1(10*v) for v in bounds] if variable == 'chlor_a' else [10*v for v in bounds]
        return {'lag': bandwidth, 'slopeStandardError': se, 'ci95': bounds,
                'pValue': p, 'significant': p < .05}

    try:
        primary = inference(lag)
        sensitivity = [inference(bandwidth) for bandwidth in [6,12,24]]
        for result in sensitivity:
            result['conclusionChanges'] = result['significant'] != primary['significant']
        trend = 100*math.expm1(10*beta) if variable == 'chlor_a' or comparison else 10*beta
        first_year = [value for month, value in selected if month < lo+12]
        baseline = math.exp(sum(first_year)/len(first_year)) if variable == 'chlor_a' and not comparison and first_year else None
        restored_prediction = response_offset+prediction*response_scale
        fitted = [{'month': _label(int(month)), 'value': math.exp(float(value)) if variable == 'chlor_a' and not comparison else float(value)}
                  for month, value in zip(months, restored_prediction)]
        absolute_change = baseline*math.expm1(10*beta) if baseline is not None else None
        numbers = [beta, trend, *primary['ci95'], primary['slopeStandardError'],
                   *[v for result in sensitivity for v in result['ci95']],
                   *[f['value'] for f in fitted]]
        if baseline is not None:
            numbers.extend([baseline, absolute_change])
        if not all(math.isfinite(v) for v in numbers):
            raise ArithmeticError('Non-finite model transformation')
    except (OverflowError, ArithmeticError) as error:
        out['reason'] = str(error)
        return out
    adjacent = [(float(residual[i]), float(residual[lookup[int(month)-1]])) for i, month in enumerate(months) if int(month)-1 in lookup]
    if exact_fit or len(adjacent) < 2:
        rho = None
    else:
        a, b = np.array(adjacent).T
        denominator = float(np.linalg.norm(a-a.mean())*np.linalg.norm(b-b.mean()))
        rho = float((a-a.mean())@(b-b.mean())/denominator) if denominator else None
    sigma = float(np.linalg.norm(residual)/math.sqrt(df))
    leverage = np.sum(q*q, axis=1)
    standardized_scale = None if exact_fit else float(np.sqrt(np.mean((residual/(sigma*np.sqrt(1-leverage)))**2)))
    model_diagnostics = dict(diagnostics, slopeStandardError=primary['slopeStandardError'], residualLag1=rho,
                             residualScale=sigma*response_scale, standardizedResidualScale=standardized_scale,
                             lagSensitivity=sensitivity,
                             significanceChangesWithLag=any(result['conclusionChanges'] for result in sensitivity),
                             inference='Approximate Student t inference with calendar-spaced Bartlett HAC; no causal interpretation',
                             exactFit=exact_fit)

    def finite_diagnostics(value):
        if isinstance(value, (float, int)):
            return math.isfinite(value)
        if isinstance(value, dict):
            return all(finite_diagnostics(item) for item in value.values())
        if isinstance(value, (list, tuple)):
            return all(finite_diagnostics(item) for item in value)
        return True

    if not finite_diagnostics(model_diagnostics):
        out['reason'] = 'Non-finite model diagnostic'
        return out
    out['diagnostics'] = model_diagnostics
    out.update(eligible=True, reason=None, slopePerYear=beta, trendPerDecade=trend,
               ci95=primary['ci95'], pValue=primary['pValue'], df=df, lag=lag,
               baseline=baseline,
               absoluteChangePerDecade=absolute_change,
               fitted=fitted)
    return out


def fit_trend(records, variable, *, start=None, end=None):
    out = _blank(variable)
    if variable not in ('chlor_a', 'sst'):
        out['reason'] = 'Unknown variable'
        return out
    try:
        rows = _records(records)
    except ValueError as error:
        out['reason'] = str(error)
        return out
    invalid = sum(value is not None and value <= 0 for value, _ in rows.values()) if variable == 'chlor_a' else 0
    data = {month: None if value is None or coverage < .1 or (variable == 'chlor_a' and value <= 0)
            else math.log(value) if variable == 'chlor_a' else value
            for month, (value, coverage) in rows.items()}
    return _fit(data, variable, start, end, invalid_chlorophyll=invalid)


def compare_trends(eep_records, nwp_records, *, start=None, end=None):
    out = _blank('chlor_a', True)
    try:
        eep, nwp = _records(eep_records), _records(nwp_records)
    except ValueError as error:
        out['reason'] = str(error)
        return out
    data = {}
    invalid = 0
    for month in eep.keys() | nwp.keys():
        a, ca = eep.get(month, (None, 0))
        b, cb = nwp.get(month, (None, 0))
        invalid += int(a is not None and a <= 0) + int(b is not None and b <= 0)
        data[month] = math.log(a)-math.log(b) if a is not None and b is not None and a > 0 and b > 0 and ca >= .1 and cb >= .1 else None
    return _fit(data, 'chlor_a', start, end, comparison=True, invalid_chlorophyll=invalid)
