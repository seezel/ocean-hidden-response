import { createState, validateWindow } from './ui-state.js';

const KEYS = ['variable', 'region', 'start', 'end'];
const MONTH = /^(?!0000)\d{4}-(0[1-9]|1[0-2])$/;

export function assertReadySelection(state) {
  if (!state || state.phase !== 'ready' || state.error) throw new Error('Apply a valid selection first.');
  if (!['chlor_a', 'sst'].includes(state.variable) || !['both', 'eep', 'nwp'].includes(state.region)) {
    throw new Error('Unknown variable or region.');
  }
  if (!MONTH.test(state.start) || !MONTH.test(state.end)) throw new Error('Use months in YYYY-MM format.');
  const error = validateWindow(state, state.availability?.[state.variable]);
  if (error) throw new Error(error);
}

export function parseUrlState(input, reference, availability) {
  const fallback = createState(reference, availability);
  try {
    const url = new URL(input);
    const state = { ...fallback };
    for (const key of KEYS) {
      const values = url.searchParams.getAll(key);
      if (values.length > 1) throw new Error('Duplicate selection parameter.');
      if (values.length) state[key] = values[0];
    }
    assertReadySelection(state);
    state.mode = state.start === reference.start && state.end === reference.end ? 'reference' : 'exploratory';
    return { state, message: null };
  } catch {
    return { state: fallback, message: 'This link has an invalid selection. The reference selection has been restored.' };
  }
}

export function serializeUrlState(input, state) {
  assertReadySelection(state);
  const url = new URL(input);
  for (const key of KEYS) url.searchParams.delete(key);
  for (const key of KEYS) url.searchParams.append(key, state[key]);
  return url.href;
}
