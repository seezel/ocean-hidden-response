import test from 'node:test';
import assert from 'node:assert/strict';
import { createState, reduceState, validateWindow, visibleRegions } from '../src/ui-state.js';
import { monthlySegments, adjustedTrend, regionBounds } from '../src/charts.js';

const reference = { start: '2013-01', end: '2025-12' };
const availability = { chlor_a: { min: '2012-01', max: '2025-12' }, sst: { min: '2014-01', max: '2024-12' } };
const initial = () => createState(reference, availability);

test('invalid, reversed and unavailable dates have explicit validation errors', () => {
  const bounds = availability.chlor_a;
  for (const dates of [{start:'',end:'2020-01'}, {start:'2020-13',end:'2021-01'},
    {start:'2021-01',end:'2020-01'}, {start:'2011-12',end:'2020-01'}, {start:'2014-01',end:'2026-01'}]) {
    assert.equal(typeof validateWindow(dates, bounds), 'string');
  }
  assert.equal(validateWindow({start:'2020-01',end:'2020-01'}, bounds), null);
});

test('editing either date invalidates previous results before Apply', () => {
  const state = {...initial(), results: {eep: {trendPerDecade: 99}}};
  const next = reduceState(state, {type:'dates', start:'2022-01',end:'2025-12'});
  assert.equal(next.results, null);
  assert.equal(next.phase, 'pending');
  assert.equal(next.mode, 'exploratory');
  assert.equal(state.results.eep.trendPerDecade, 99);
});

test('applying a reversed window cannot retain statistics', () => {
  let state = reduceState({...initial(),results:{eep:99}}, {type:'dates',start:'2024-01',end:'2020-01'});
  state = reduceState(state, {type:'apply'});
  assert.equal(state.phase, 'invalid');
  assert.equal(state.results, null);
  assert.match(state.error, /before/);
});

test('short valid windows allow observed data and new unavailable inference', () => {
  let state = reduceState({...initial(),results:{eep:99}}, {type:'dates',start:'2024-01',end:'2024-02'});
  state = reduceState(state, {type:'apply'});
  assert.equal(state.phase, 'ready');
  assert.equal(state.results, null);
  assert.equal(state.mode, 'exploratory');
});

test('variable changes respect its availability and invalidate every old result', () => {
  const state = reduceState({...initial(),results:{eep:99}}, {type:'variable',value:'sst'});
  assert.equal(state.variable, 'sst');
  assert.equal(state.start, '2014-01');
  assert.equal(state.end, '2024-12');
  assert.equal(state.results, null);
  assert.equal(state.phase, 'ready');
  assert.equal(state.mode, 'exploratory');
});

test('region selection changes visible records and invalidates statistics', () => {
  const state = reduceState({...initial(),results:{eep:99}}, {type:'region',value:'nwp'});
  assert.deepEqual(visibleRegions(state.region), ['nwp']);
  assert.deepEqual(visibleRegions('both'), ['eep','nwp']);
  assert.equal(state.results, null);
  assert.equal(state.variable, 'chlor_a');
});

test('Restore reference resets variable, region, dates, errors, phase and results', () => {
  let state = reduceState(initial(), {type:'variable',value:'sst'});
  state = reduceState(state,{type:'region',value:'nwp'});
  state = reduceState(state,{type:'dates',start:'',end:''});
  state = reduceState(state,{type:'apply'});
  state = reduceState(state,{type:'reset'});
  assert.deepEqual(state, initial());
  assert.equal(state.mode, 'reference');
});

test('variable and region changes cannot accidentally apply a draft date window', () => {
  let state = reduceState(initial(),{type:'dates',start:'2018-01',end:'2020-01'});
  state = reduceState(state,{type:'region',value:'eep'});
  state = reduceState(state,{type:'variable',value:'sst'});
  assert.equal(state.phase, 'pending');
  assert.equal(state.results, null);
});

test('applying reference dates restores reference status and rejects unknown controls', () => {
  let state = reduceState(initial(),{type:'dates',...reference});
  state = reduceState(state,{type:'apply'});
  assert.equal(state.mode, 'reference');
  assert.equal(state.phase, 'ready');
  assert.throws(() => reduceState(state,{type:'variable',value:'other'}), /variable/);
  assert.throws(() => reduceState(state,{type:'region',value:'other'}), /region/);
});

test('chart paths break on absent months and explicit missing values', () => {
  const segments = monthlySegments([{month:'2020-01',value:1},{month:'2020-02',value:null},
    {month:'2020-03',value:2},{month:'2020-05',value:3},{month:'2020-06',value:4}]);
  assert.deepEqual(segments.map(rows => rows.map(row=>row.month)), [['2020-01'],['2020-03'],['2020-05','2020-06']]);
});

test('chart trend removes seasonality and retains log slope without using percentage as concentration', () => {
  const fitted = Array.from({length:24}, (_,i) => ({month:`${2020+Math.floor(i/12)}-${String(i%12+1).padStart(2,'0')}`,
    value:Math.exp(1 + .12*i/12 + (i%12)/10)}));
  const rows = adjustedTrend({eligible:true,start:'2020-01',slopePerYear:.12,fitted},'chlor_a');
  assert.ok(Math.abs(rows[12].value / rows[0].value - Math.exp(.12)) < 1e-12);
  assert.ok(Math.abs(rows[0].value - Math.exp(1.55)) < 1e-12);
  assert.deepEqual(adjustedTrend({eligible:false},'chlor_a'), []);
});

test('locator accepts only complete finite bounds in array or object form', () => {
  assert.deepEqual(regionBounds({bounds:[-120,-90,-5,5]}), [-120,-90,-5,5]);
  assert.deepEqual(regionBounds({bounds:{west:125,east:150,south:2,north:10}}), [125,150,2,10]);
  assert.equal(regionBounds({bounds:[1,null,2,3]}), null);
});
