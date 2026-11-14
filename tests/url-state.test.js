import test from 'node:test';
import assert from 'node:assert/strict';
import { parseUrlState, serializeUrlState } from '../src/url-state.js';
import { createState } from '../src/ui-state.js';

const reference = { start: '2013-01', end: '2025-12' };
const availability = { chlor_a: { min: '2012-01', max: '2025-12' }, sst: { min: '2014-01', max: '2025-12' } };
const initial = () => createState(reference, availability);

test('missing query fields use reference defaults and valid query restores only selection', () => {
  assert.deepEqual(parseUrlState('https://example.test/project/?tracking=x#chart', reference, availability), { state: initial(), message: null });
  const { state, message } = parseUrlState('https://example.test/?variable=sst&region=nwp&start=2020-02', reference, availability);
  assert.deepEqual(state, { ...initial(), variable: 'sst', region: 'nwp', start: '2020-02', mode: 'exploratory' });
  assert.equal(message, null);
});

test('invalid and duplicate recognized parameters recover the complete reference selection', () => {
  for (const query of ['variable=oxygen', 'region=EEP', 'start=2020-1', 'start=0000-01', 'end=2025-13',
    'start=2022-01&end=2021-01', 'start=2011-12', 'end=2026-01', 'variable=sst',
    'region=eep&region=eep', 'variable=sst&variable=chlor_a', 'start=2020-01&start=2020-02', 'end=2020-01&end=2021-01', 'start=']) {
    const result = parseUrlState(`https://example.test/?${query}`, reference, availability);
    assert.deepEqual(result.state, initial(), query);
    assert.equal(typeof result.message, 'string', query);
    assert.ok(result.message.length > 0);
  }
});

test('canonical serialization preserves path, hash and unknown repeated parameters', () => {
  const state = { ...initial(), variable: 'sst', region: 'eep', start: '2020-01', end: '2021-12' };
  const result = serializeUrlState('https://example.test/repo/nested/?tag=a&start=bad&tag=b#figure', state);
  assert.equal(result, 'https://example.test/repo/nested/?tag=a&tag=b&variable=sst&region=eep&start=2020-01&end=2021-12#figure');
  assert.deepEqual(parseUrlState(result, reference, availability).state, { ...state, mode: 'exploratory' });
});

test('only a ready validated selection can be serialized', () => {
  for (const override of [{phase:'pending'}, {phase:'invalid'}, {variable:'oxygen'}, {region:'x'},
    {start:'2020-1'}, {start:'0000-01'}, {start:'2022-01',end:'2020-01'}, {end:'2026-01'}, {error:'invalid'}]) {
    assert.throws(() => serializeUrlState('https://example.test/', {...initial(), ...override}));
  }
});
