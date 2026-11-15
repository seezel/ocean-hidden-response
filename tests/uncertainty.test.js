import test from 'node:test';
import assert from 'node:assert/strict';
import { displayInterval, intervalModel } from '../src/uncertainty.js';

const result = (estimate, ci95) => ({ eligible: true, trendPerDecade: estimate, ci95 });

test('regional chlorophyll and SST retain their own per-decade units and exact bounds', () => {
  const chlorophyll = displayInterval(result(-16, [-23, -8]), 'chlor_a');
  assert.equal(chlorophyll.estimate, -16);
  assert.deepEqual([chlorophyll.low, chlorophyll.high], [-23, -8]);
  assert.equal(chlorophyll.unit, '% per decade');
  const sst = displayInterval(result(.4, [.2, .6]), 'sst');
  assert.deepEqual([sst.low, sst.high], [.2, .6]);
  assert.equal(sst.unit, '°C per decade');
});

test('paired comparison transforms its log-per-year interval onto a separate ratio scale', () => {
  const row = displayInterval(result(10, [Math.log(.9) / 10, Math.log(1.2) / 10]), 'comparison');
  assert.ok(Math.abs(row.low + 10) < 1e-12);
  assert.ok(Math.abs(row.high - 20) < 1e-12);
  assert.equal(row.estimate, 10);
  assert.equal(row.unit, '% change in EEP/NWP growth-rate ratio per decade');
});

test('directional estimates always retain a visible zero reference', () => {
  for (const r of [result(-16, [-23, -8]), result(15, [7, 22])]) {
    const model = intervalModel([{ id: 'eep', label: 'EEP', result: r }], 'chlor_a');
    assert.ok(model.domain[0] < 0 && model.domain[1] > 0);
  }
});

test('zero-spanning and zero-width intervals remain finite', () => {
  const model = intervalModel([{ id: 'eep', label: 'EEP', result: result(0, [0, 0]) }], 'sst');
  assert.ok(model.domain.every(Number.isFinite));
  assert.ok(model.domain[0] < model.domain[1]);
  assert.equal(model.rows[0].available, true);
});

test('unavailable, pending and invalid results cannot retain old estimates', () => {
  for (const r of [null, { eligible: false, reason: 'Too short', trendPerDecade: 99, ci95: [90, 100] }]) {
    const row = displayInterval(r, 'chlor_a');
    assert.equal(row.available, false);
    assert.equal(row.estimate, null);
    assert.equal(row.low, null);
  }
});

test('malformed or overflowed intervals never create misleading SVG coordinates', () => {
  for (const r of [result(1, [2, 0]), result(Infinity, [0, 2]), result(4, [0, 2]), result(0, [-1, Infinity])]) {
    assert.equal(displayInterval(r, 'sst').available, false);
  }
  assert.equal(displayInterval(result(0, [-1000, 1000]), 'comparison').available, false);
  assert.throws(() => displayInterval(result(1, [0, 2]), 'other'), /kind/i);
});

test('display models do not mutate frozen or custom calculation results', () => {
  const r = result(-16, [-23, -8]);
  const before = JSON.stringify(r);
  intervalModel([{ id: 'eep', label: 'EEP', result: r }], 'chlor_a');
  assert.equal(JSON.stringify(r), before);
});
