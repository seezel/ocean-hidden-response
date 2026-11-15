import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fitTrend, compareTrends, MODEL_VERSION } from '../src/trends.js';
import { selectRecords, validateObservations } from '../src/data.js';

const input = readFileSync(new URL('../data/observations.json', import.meta.url));
const observations = validateObservations(JSON.parse(input));
const reference = JSON.parse(readFileSync(new URL('../data/reference-results.json', import.meta.url)));
const fixtures = JSON.parse(readFileSync(new URL('./fixtures/statistics-real.json', import.meta.url)));

test('published records exactly match the frozen reference input', () => {
  assert.equal(createHash('sha256').update(input).digest('hex'), reference.inputSha256);
  assert.equal(reference.modelVersion, MODEL_VERSION);
  assert.equal(fixtures.modelVersion, MODEL_VERSION);
});

for (const scenario of fixtures.cases) {
  test(`real-data Python/JavaScript parity ${scenario.start} through ${scenario.end}`, () => {
    for (const variable of ['chlor_a', 'sst']) {
      const rows = Object.fromEntries(['eep', 'nwp'].map((region) => [region,
        selectRecords(observations, { variable, region, start: '2012-01', end: '2025-12' })]));
      const actual = { eep: fitTrend(rows.eep, variable, scenario), nwp: fitTrend(rows.nwp, variable, scenario) };
      if (variable === 'chlor_a') actual.comparison = compareTrends(rows.eep, rows.nwp, scenario);
      for (const [key, result] of Object.entries(actual)) {
        const expected = scenario.expected[variable][key];
        assert.equal(result.eligible, expected.eligible, `${variable}/${key} eligibility`);
        assert.equal(result.n, expected.n, `${variable}/${key} count`);
        for (const field of ['slopePerYear', 'trendPerDecade', 'pValue']) {
          if (expected[field] === null) assert.equal(result[field], null);
          else assert.ok(Math.abs(result[field] - expected[field]) <= 1e-6,
            `${variable}/${key}/${field}: ${result[field]} vs ${expected[field]}`);
        }
        if (expected.ci95 === null) assert.equal(result.ci95, null);
        else expected.ci95.forEach((value, index) => assert.ok(Math.abs(result.ci95[index] - value) <= 1e-6));
      }
    }
  });
}
