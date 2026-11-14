"""All fixtures in this suite are synthetic; none are ocean observations."""
import json
import math
import random
from pathlib import Path
import subprocess
import unittest

import numpy as np
import statsmodels.api as sm
from scipy.stats import t

from science.analyze import fit_trend, compare_trends

ROOT = Path(__file__).resolve().parents[1]
CASES = json.loads((ROOT/'tests/fixtures/statistics-synthetic.json').read_text())['cases']


def design(records, variable):
    selected = [r for r in records if r['value'] is not None and r['coverage'] >= .1 and (variable != 'chlor_a' or r['value'] > 0)]
    months = np.array([int(r['month'][:4])*12 + int(r['month'][5:])-1 for r in selected])
    x = np.column_stack([np.ones(len(months)), (months-months[0])/12, *[(months%12 == m).astype(float) for m in range(1,12)]])
    y = np.array([r['value'] for r in selected])
    return months, x, np.log(y) if variable == 'chlor_a' else y


class TrendTests(unittest.TestCase):
    def test_analytic_and_oracle(self):
        for name in ['positive','negative','zero','seasonal','sst','autocorrelated','missing']:
            with self.subTest(name=name):
                c = CASES[name]
                before = json.dumps(c['records'])
                r = fit_trend(c['records'], c['variable'])
                self.assertTrue(r['eligible'], r['reason'])
                self.assertEqual(before, json.dumps(c['records']))
                if 'expectedSlope' in c:
                    self.assertAlmostEqual(r['slopePerYear'], c['expectedSlope'], places=10)
                months,x,y = design(c['records'], c['variable'])
                model = sm.OLS(y,x).fit()
                lag = max(1, math.floor(4*(len(y)/100)**(2/9)))
                if name != 'missing':
                    oracle = model.get_robustcov_results(cov_type='HAC', maxlags=lag, use_correction=True, use_t=True)
                    se = oracle.bse[1]
                else:
                    # Independent pair enumeration in original, unscaled design.
                    score = x*model.resid[:,None]
                    meat = score.T@score
                    for a in range(len(y)):
                        for b in range(a):
                            distance = months[a]-months[b]
                            if 1 <= distance <= lag:
                                cross = np.outer(score[a],score[b])
                                meat += (1-distance/(lag+1))*(cross+cross.T)
                    bread = np.linalg.inv(x.T@x)
                    se = np.sqrt((bread@meat@bread)[1,1]*len(y)/(len(y)-13))
                self.assertAlmostEqual(r['slopePerYear'], model.params[1], delta=1e-8)
                self.assertAlmostEqual(r['diagnostics']['slopeStandardError'], se, delta=1e-8)
                if se > 1e-12:
                    self.assertAlmostEqual(r['pValue'], 2*t.sf(abs(model.params[1]/se),len(y)-13), delta=1e-6)
                self.assertEqual([d['lag'] for d in r['diagnostics']['lagSensitivity']], [6,12,24])
                if name != 'missing':
                    for diagnostic in r['diagnostics']['lagSensitivity']:
                        alternate = model.get_robustcov_results(cov_type='HAC',maxlags=diagnostic['lag'],use_correction=True,use_t=True)
                        self.assertAlmostEqual(diagnostic['slopeStandardError'],alternate.bse[1],delta=1e-8)
                        bounds=alternate.conf_int()[1]
                        expected=100*np.expm1(10*bounds) if c['variable']=='chlor_a' else 10*bounds
                        np.testing.assert_allclose(diagnostic['ci95'],expected,atol=1e-6,rtol=1e-10)
                json.dumps(r,allow_nan=False)

    def test_javascript_parity(self):
        script = "import fs from 'node:fs'; import {fitTrend,compareTrends} from './src/trends.js'; const c=JSON.parse(fs.readFileSync('./tests/fixtures/statistics-synthetic.json')).cases; console.log(JSON.stringify({fits:Object.fromEntries(Object.entries(c).map(([n,v])=>[n,fitTrend(v.records,v.variable)])),comparison:compareTrends(c.pairedEEP.records,c.pairedNWP.records)}));"
        js = json.loads(subprocess.check_output(['node','--input-type=module','-e',script],cwd=ROOT,text=True))
        pairs = [(fit_trend(c['records'],c['variable']),js['fits'][name]) for name,c in CASES.items()]
        pairs.append((compare_trends(CASES['pairedEEP']['records'],CASES['pairedNWP']['records']),js['comparison']))
        for py,browser in pairs:
            self.assertEqual(py['eligible'],browser['eligible'])
            for key in ['slopePerYear','trendPerDecade','pValue','baseline','absoluteChangePerDecade']:
                if py[key] is None: self.assertIsNone(browser[key])
                else: self.assertAlmostEqual(py[key],browser[key],delta=1e-8 if key=='slopePerYear' else 1e-6)
            np.testing.assert_allclose(py['ci95'],browser['ci95'],atol=1e-6,rtol=1e-10)
            self.assertAlmostEqual(py['diagnostics']['slopeStandardError'],browser['diagnostics']['slopeStandardError'],delta=1e-8)

    def test_invalid_and_policy(self):
        rows = CASES['positive']['records']
        for records,kwargs in [(rows[:119],{}), (rows+[rows[0]],{}), ([dict(rows[0],month='2020-99')]+rows[1:],{}), ([dict(rows[0],value=float('nan'))]+rows[1:],{}), (rows,{'start':'2030-01','end':'2000-01'}), ([r for r in rows if r['month'].endswith('-01')],{})]:
            r = fit_trend(records,'chlor_a',**kwargs)
            self.assertFalse(r['eligible'])
            for key in ['slopePerYear','trendPerDecade','ci95','pValue','df','lag','baseline','absoluteChangePerDecade']: self.assertIsNone(r[key])
            json.dumps(r,allow_nan=False)
        bad = [dict(r) for r in rows]
        bad[13]['value']=0; bad[27]['value']=-1; bad[40]['coverage']=.099; bad[55]['coverage']=.1
        r = fit_trend(bad,'chlor_a')
        self.assertTrue(r['eligible'])
        self.assertEqual(r['n'],len(rows)-3)
        self.assertEqual(r['diagnostics']['invalidChlorophyll'],2)

    def test_baseline_and_paired_difference(self):
        rows = CASES['positive']['records']
        r = fit_trend(rows,'chlor_a')
        baseline = math.exp(sum(math.log(v['value']) for v in rows[:12])/12)
        self.assertAlmostEqual(r['baseline'],baseline)
        self.assertAlmostEqual(r['absoluteChangePerDecade'],baseline*math.expm1(10*r['slopePerYear']))
        a,b = CASES['pairedEEP']['records'],CASES['pairedNWP']['records']
        result = compare_trends(a,b)
        self.assertTrue(result['eligible'])
        self.assertIsNone(result['baseline'])
        self.assertEqual(result['unit'],'log ratio per year')
        self.assertLess(fit_trend(a,'chlor_a')['pValue'],.05)
        self.assertGreater(fit_trend(b,'chlor_a')['pValue'],.05)
        self.assertGreater(result['pValue'],.05)
        differences=[dict(left,value=math.log(left['value'])-math.log(right['value'])) for left,right in zip(a,b)]
        _,x,y=design(differences,'sst')
        oracle=sm.OLS(y,x).fit().get_robustcov_results(cov_type='HAC',maxlags=result['lag'],use_correction=True,use_t=True)
        self.assertAlmostEqual(result['slopePerYear'],oracle.params[1],delta=1e-8)
        self.assertAlmostEqual(result['pValue'],oracle.pvalues[1],delta=1e-6)
        np.testing.assert_allclose(result['ci95'],oracle.conf_int()[1],atol=1e-6,rtol=1e-10)

    def test_response_offset_and_tiny_trend(self):
        rows = CASES['sst']['records']
        result = fit_trend([dict(row,value=1e250) for row in rows],'sst')
        self.assertTrue(result['eligible'],result['reason'])
        self.assertEqual(result['slopePerYear'],0)
        self.assertEqual(result['pValue'],1)
        json.dumps(result,allow_nan=False)
        tiny = [dict(row,value=i*1e-13/12) for i,row in enumerate(rows)]
        self.assertAlmostEqual(fit_trend(tiny,'sst')['slopePerYear'],1e-13,delta=1e-16)
        subnormal = [dict(row,value=i*1e-320/12) for i,row in enumerate(rows)]
        self.assertAlmostEqual(fit_trend(subnormal,'sst')['slopePerYear'],1e-320,delta=1e-322)

    def test_overflowed_residual_diagnostic_is_unavailable_and_serializable(self):
        rows = [{'month':f'{2000+i//12:04d}-{i%12+1:02d}',
                 'value':0 if i == 0 else 1.79e308*(-1 if (i//12)%2 else 1),
                 'coverage':1} for i in range(240)]
        result = fit_trend(rows,'sst')
        self.assertFalse(result['eligible'])
        self.assertEqual(result['reason'],'Non-finite model diagnostic')
        for key in ['slopePerYear','trendPerDecade','ci95','pValue','df','lag','baseline','absoluteChangePerDecade']:
            self.assertIsNone(result[key])
        self.assertEqual(result['fitted'],[])
        json.dumps(result,allow_nan=False)

    def test_student_t_oracle_across_degrees_of_freedom_and_tails(self):
        rng = random.Random(72046)
        samples = []
        for n,beta in [(120,0.),(132,.003),(192,.03),(360,-.015),(720,.2)]:
            rows = [{'month':f'{2000+i//12:04d}-{i%12+1:02d}',
                     'value':20+beta*i/12+2*math.sin(2*math.pi*i/12)+rng.gauss(0,.7),
                     'coverage':.8} for i in range(n)]
            samples.append(rows)
        script = "import fs from 'node:fs'; import {fitTrend} from './src/trends.js'; console.log(JSON.stringify(JSON.parse(fs.readFileSync(0,'utf8')).map(rows=>fitTrend(rows,'sst'))));"
        browser = json.loads(subprocess.check_output(['node','--input-type=module','-e',script],input=json.dumps(samples),cwd=ROOT,text=True))
        for rows,js in zip(samples,browser):
            result = fit_trend(rows,'sst')
            _,x,y = design(rows,'sst')
            oracle = sm.OLS(y,x).fit().get_robustcov_results(cov_type='HAC',maxlags=result['lag'],use_correction=True,use_t=True)
            self.assertAlmostEqual(js['pValue'],float(oracle.pvalues[1]),delta=1e-6)
            np.testing.assert_allclose(js['ci95'],oracle.conf_int()[1]*10,atol=1e-6,rtol=1e-10)
            self.assertAlmostEqual(js['slopePerYear'],result['slopePerYear'],delta=1e-8)
            self.assertAlmostEqual(js['diagnostics']['slopeStandardError'],result['diagnostics']['slopeStandardError'],delta=1e-8)
            json.dumps(result,allow_nan=False)

    def test_missing_calendar_is_not_compressed_hac(self):
        rows = CASES['missing']['records']
        result = fit_trend(rows,'chlor_a')
        _,x,y = design(rows,'chlor_a')
        compressed = sm.OLS(y,x).fit().get_robustcov_results(cov_type='HAC',maxlags=result['lag'],use_correction=True,use_t=True)
        self.assertGreater(abs(result['diagnostics']['slopeStandardError']-float(compressed.bse[1])),1e-7)

    def test_comparison_alignment_and_invalid_inputs(self):
        a = [dict(row) for row in CASES['pairedEEP']['records']]
        b = [dict(row) for row in CASES['pairedNWP']['records']]
        a[10]['value']=0; b[20]['coverage']=.09
        b.pop(30)
        before = json.dumps([a,b])
        result = compare_trends(a,b)
        self.assertTrue(result['eligible'])
        self.assertEqual(result['n'],237)
        self.assertEqual(before,json.dumps([a,b]))
        aligned=[]
        lookup={row['month']:row for row in b}
        for row in a:
            other=lookup.get(row['month'])
            if row['value']>0 and other and other['value']>0 and row['coverage']>=.1 and other['coverage']>=.1:
                aligned.append(dict(row,value=math.log(row['value'])-math.log(other['value'])))
        _,x,y = design(aligned,'sst')
        oracle = sm.OLS(y,x).fit().get_robustcov_results(cov_type='HAC',maxlags=result['lag'],use_correction=True,use_t=True)
        # This check validates the paired slope; calendar-gap covariance has its separate pair oracle.
        self.assertAlmostEqual(result['slopePerYear'],float(oracle.params[1]),delta=1e-8)
        self.assertFalse(compare_trends(a+[a[0]],b)['eligible'])


if __name__ == '__main__': unittest.main()
