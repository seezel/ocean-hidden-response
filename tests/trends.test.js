import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fitTrend, compareTrends } from '../src/trends.js';

const fixture = JSON.parse(fs.readFileSync(new URL('./fixtures/statistics-synthetic.json', import.meta.url)));
const cases = fixture.cases;

for (const name of ['positive', 'negative', 'zero', 'seasonal', 'sst', 'autocorrelated', 'missing']) {
  test(`synthetic ${name}: eligible, finite, calendar-aware inference`, () => {
    const c = cases[name];
    const before = JSON.stringify(c.records);
    const r = fitTrend(c.records, c.variable);
    assert.equal(r.eligible, true, r.reason);
    assert.equal(r.reason, null);
    assert.ok(Number.isFinite(r.slopePerYear));
    assert.ok(r.ci95[0] <= r.trendPerDecade && r.ci95[1] >= r.trendPerDecade);
    assert.ok(r.pValue >= 0 && r.pValue <= 1);
    assert.equal(r.df, r.n - 13);
    assert.equal(r.diagnostics.lagSensitivity.length, 3);
    assert.equal(before, JSON.stringify(c.records));
    if ('expectedSlope' in c) assert.ok(Math.abs(r.slopePerYear - c.expectedSlope) < 1e-10);
  });
}

test('invalid windows and records never retain inferential numbers', () => {
  const records = cases.positive.records;
  for (const [rows, variable, options] of [
    [records.slice(0, 119), 'chlor_a', {}],
    [[...records, records[0]], 'chlor_a', {}],
    [[{...records[0], month:'2020-13'}, ...records.slice(1)], 'chlor_a', {}],
    [[{...records[0], value:Infinity}, ...records.slice(1)], 'chlor_a', {}],
    [records, 'unknown', {}],
    [records, 'chlor_a', {start:'2030-01', end:'2000-01'}],
    [records.filter(r => r.month.endsWith('-01')), 'chlor_a', {}],
    [records.map((r,i) => ({...r, value:i < 8 ? null : r.value})), 'chlor_a', {}],
  ]) {
    const r = fitTrend(rows, variable, options);
    assert.equal(r.eligible, false);
    assert.ok(r.reason);
    for (const key of ['slopePerYear','trendPerDecade','ci95','pValue','df','lag','baseline','absoluteChangePerDecade']) assert.equal(r[key], null);
    assert.deepEqual(r.fitted, []);
  }
});

test('nonpositive chlorophyll and coverage below 0.1 remain calendar gaps', () => {
  const records = cases.positive.records.map(r => ({...r}));
  records[13].value = 0; records[27].value = -1; records[40].coverage = 0.099;
  records[55].coverage = 0.1;
  const r = fitTrend(records, 'chlor_a');
  assert.equal(r.eligible, true);
  assert.equal(r.n, records.length-3);
  assert.equal(r.diagnostics.invalidChlorophyll, 2);
});

test('chlorophyll baseline is geometric mean within first twelve calendar months', () => {
  const r = fitTrend(cases.positive.records, 'chlor_a');
  const expected = Math.exp(cases.positive.records.slice(0,12).reduce((s,r)=>s+Math.log(r.value),0)/12);
  assert.ok(Math.abs(r.baseline-expected) < 1e-12);
  assert.ok(Math.abs(r.absoluteChangePerDecade - expected*Math.expm1(10*r.slopePerYear)) < 1e-12);
});

test('paired comparison estimates log ratio with log/year confidence interval', () => {
  const r = compareTrends(cases.pairedEEP.records, cases.pairedNWP.records);
  assert.equal(r.eligible, true);
  assert.ok(r.ci95[0] <= r.slopePerYear && r.ci95[1] >= r.slopePerYear);
  assert.equal(r.baseline, null);
  assert.equal(r.absoluteChangePerDecade, null);
  assert.equal(r.unit, 'log ratio per year');
  assert.ok(r.estimand.includes('EEP'));
});

test('SST slope is invariant to a constant response offset and preserves tiny trends', () => {
  const constant = cases.sst.records.map(row=>({...row,value:1e250}));
  const r = fitTrend(constant,'sst');
  assert.equal(r.eligible,true,r.reason);
  assert.equal(r.slopePerYear,0);
  assert.equal(r.pValue,1);
  assert.ok(Number.isFinite(r.diagnostics.residualScale));
  const tiny = cases.sst.records.map((row,i)=>({...row,value:i*1e-13/12}));
  assert.ok(Math.abs(fitTrend(tiny,'sst').slopePerYear-1e-13)<1e-16);
  const subnormal = cases.sst.records.map((row,i)=>({...row,value:i*1e-320/12}));
  assert.ok(Math.abs(fitTrend(subnormal,'sst').slopePerYear-1e-320)<1e-322);
});

test('policy boundaries, selection windows, and unordered input use calendar months', () => {
  const rows=cases.positive.records;
  assert.equal(fitTrend(rows.slice(0,120),'chlor_a').eligible,true);
  const missing=new Set(Array.from({length:36},(_,i)=>Math.floor(i*240/36)));
  const window={start:'2000-01',end:'2019-12'};
  assert.equal(fitTrend(rows.filter((_,i)=>!missing.has(i)),'chlor_a',window).eligible,true);
  missing.add(239);
  assert.equal(fitTrend(rows.filter((_,i)=>!missing.has(i)),'chlor_a',window).eligible,false);
  const missingJanuary=rows.filter((row,i)=>i%12!==0 || i>=192);
  const limited=fitTrend(missingJanuary,'chlor_a');
  assert.equal(limited.eligible,false);
  assert.match(limited.reason,/calendar month/);
  const reverse=fitTrend(rows.slice().reverse(),'chlor_a',{start:'2001-02',end:'2015-01'});
  assert.equal(reverse.eligible,true);
  assert.equal(reverse.start,'2001-02');
  assert.equal(reverse.end,'2015-01');
  assert.equal(reverse.n,168);
  assert.ok(Math.abs(reverse.slopePerYear-.02)<1e-10);
});

test('lag sensitivity reports a changed conclusion without replacing the fixed primary lag', () => {
  const r=fitTrend(cases.autocorrelated.records,'chlor_a');
  assert.equal(r.lag,4);
  assert.ok(r.pValue<.05);
  assert.equal(r.diagnostics.significanceChangesWithLag,true);
  assert.ok(r.diagnostics.lagSensitivity.some(result=>result.conclusionChanges && result.pValue>=.05));
});

test('malformed records, unsafe transformations, and invalid paired data are unavailable', () => {
  const rows=cases.positive.records;
  for (const bad of [null,[null],[{}],[{...rows[0],coverage:NaN}],[{...rows[0],coverage:1.01}],[{...rows[0],value:undefined}],[{...rows[0],value:'0.2'}]]) {
    const result=fitTrend(bad,'chlor_a');
    assert.equal(result.eligible,false);
    assert.equal(result.slopePerYear,null);
  }
  const extreme=rows.map((row,i)=>({...row,value:i<120?1e-300:1e300}));
  const result=fitTrend(extreme,'chlor_a');
  assert.equal(result.eligible,false);
  assert.equal(result.ci95,null);
  assert.equal(compareTrends([...rows,rows[0]],rows).eligible,false);
});

test('overflowed residual diagnostic is unavailable without JSON silently replacing Infinity', () => {
  const rows=Array.from({length:240},(_,i)=>({
    month:`${2000+Math.floor(i/12)}-${String(i%12+1).padStart(2,'0')}`,
    value:i===0 ? 0 : 1.79e308*(Math.floor(i/12)%2 ? -1 : 1),coverage:1,
  }));
  const result=fitTrend(rows,'sst');
  assert.equal(result.eligible,false);
  assert.equal(result.reason,'Non-finite model diagnostic');
  for (const key of ['slopePerYear','trendPerDecade','ci95','pValue','df','lag','baseline','absoluteChangePerDecade']) assert.equal(result[key],null);
  assert.deepEqual(result.fitted,[]);
  assert.deepEqual(JSON.parse(JSON.stringify(result)),result);
});
