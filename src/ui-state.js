const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;

export function validateWindow({ start, end }, bounds) {
  if (!MONTH.test(start) || !MONTH.test(end)) return 'Enter both months in YYYY-MM format.';
  if (start > end) return 'Start month must come before or equal the end month.';
  if (!bounds || start < bounds.min || end > bounds.max) {
    return bounds ? `Choose months between ${bounds.min} and ${bounds.max}.` : 'No observations are available for this variable.';
  }
  return null;
}

export function createState(reference, availability) {
  return { variable: 'chlor_a', region: 'both', start: reference.start, end: reference.end,
    reference: { ...reference }, availability, mode: 'reference', phase: 'ready', results: null, error: null };
}

export function visibleRegions(region) {
  return region === 'both' ? ['eep', 'nwp'] : [region];
}

export function reduceState(state, action) {
  if (action.type === 'reset') return createState(state.reference, state.availability);
  let next = { ...state, results: null, error: null };
  if (action.type === 'dates') {
    Object.assign(next, { start: action.start, end: action.end, phase: 'pending' });
  } else if (action.type === 'apply') {
    next.error = validateWindow(next, next.availability[next.variable]);
    next.phase = next.error ? 'invalid' : 'ready';
  } else if (action.type === 'variable') {
    if (!['chlor_a', 'sst'].includes(action.value)) throw new Error('Unknown variable.');
    next.variable = action.value;
    const bounds = next.availability[next.variable];
    if (bounds) {
      next.start = next.start < bounds.min ? bounds.min : next.start;
      next.end = next.end > bounds.max ? bounds.max : next.end;
    }
    if (next.phase !== 'pending') {
      next.error = validateWindow(next, bounds);
      next.phase = next.error ? 'invalid' : 'ready';
    }
  } else if (action.type === 'region') {
    if (!['both', 'eep', 'nwp'].includes(action.value)) throw new Error('Unknown region.');
    next.region = action.value;
    if (next.phase !== 'pending') {
      next.error = validateWindow(next, next.availability[next.variable]);
      next.phase = next.error ? 'invalid' : 'ready';
    }
  } else {
    throw new Error('Unknown investigation action.');
  }
  next.mode = next.start === next.reference.start && next.end === next.reference.end ? 'reference' : 'exploratory';
  return next;
}
