import test from 'node:test';
import assert from 'node:assert/strict';
import { validateObservations, selectRecords } from '../src/data.js';

const record = { month: '2020-01', region: 'eep', variable: 'chlor_a', value: 0.2,
  units: 'mg/m3', coverage: 0.8, provenance: 'source-1' };
const dataset = (records) => ({ schemaVersion: 1, records });

test('valid records preserve real zero temperatures and missing observations', () => {
  const records = [record, { ...record, month: '2020-02', value: null },
    { ...record, variable: 'sst', units: 'degC', value: 0 }];
  assert.equal(validateObservations(dataset(records)).records.length, 3);
});

test('duplicate month-region-variable records cannot silently replace measurements', () => {
  assert.throws(() => validateObservations(dataset([record, { ...record }])), /duplicate/i);
});

test('invalid months and units fail before reaching charts', () => {
  assert.throws(() => validateObservations(dataset([{ ...record, month: '2020-13' }])), /month/i);
  assert.throws(() => validateObservations(dataset([{ ...record, units: 'kelvin' }])), /units/i);
});

test('missing data stays null and Infinity is never accepted', () => {
  assert.throws(() => validateObservations(dataset([{ ...record, value: Infinity }])), /value/i);
  assert.throws(() => validateObservations(dataset([{ ...record, coverage: 1.1 }])), /coverage/i);
});

test('selection uses exact month bounds without mutating the source', () => {
  const original = dataset([{ ...record, month: '2020-03' }, record,
    { ...record, month: '2020-02' }, { ...record, region: 'nwp' }]);
  const snapshot = JSON.stringify(original);
  assert.deepEqual(selectRecords(original, { variable: 'chlor_a', region: 'eep',
    start: '2020-02', end: '2020-03' }).map((row) => row.month), ['2020-02', '2020-03']);
  assert.equal(JSON.stringify(original), snapshot);
  assert.throws(() => selectRecords(original, { variable: 'chlor_a', region: 'eep',
    start: '2020-03', end: '2020-01' }), /start/i);
});
