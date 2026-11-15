import { assertReadySelection } from './url-state.js';
import { visibleRegions } from './ui-state.js';

const COLUMNS = ['month', 'region', 'variable', 'value', 'units', 'coverage', 'validCells', 'oceanCells', 'provenance', 'status', 'missingKind'];
const UNITS = { chlor_a: 'mg/m3', sst: 'degC' };
const monthNumber = month => Number(month.slice(0, 4)) * 12 + Number(month.slice(5)) - 1;
const monthLabel = month => `${String(Math.floor(month / 12)).padStart(4, '0')}-${String(month % 12 + 1).padStart(2, '0')}`;

export function selectionRows(data, state) {
  assertReadySelection(state);
  const regions = visibleRegions(state.region);
  const selected = new Map();
  for (const row of data.records) {
    if (row.variable !== state.variable || !regions.includes(row.region) || row.month < state.start || row.month > state.end) continue;
    const key = `${row.month}/${row.region}`;
    if (selected.has(key)) throw new Error('Duplicate selected observation.');
    selected.set(key, row);
  }
  const rows = [];
  for (let month = monthNumber(state.start); month <= monthNumber(state.end); month++) {
    for (const region of regions) {
      const label = monthLabel(month);
      const source = selected.get(`${label}/${region}`);
      const row = source ? { ...source } : { month: label, region, variable: state.variable, value: null,
        units: UNITS[state.variable], coverage: null, validCells: null, oceanCells: null, provenance: null };
      row.missingKind = !source ? 'calendar_gap' : row.value === null ? 'explicit_null' : '';
      row.status = row.value === null ? 'excluded_missing' : row.coverage < .1 ? 'excluded_low_coverage'
        : state.variable === 'chlor_a' && row.value <= 0 ? 'excluded_nonpositive_chlorophyll' : 'included';
      rows.push(row);
    }
  }
  return rows;
}

function csvCell(value, column) {
  if (value === null || value === undefined) return column === 'value' ? 'null' : '';
  let text = String(value);
  if (typeof value === 'string' && (/^\s*[=+@-]/.test(text) || /^[\t\r\n]/.test(text))) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function selectionCsv(data, state) {
  const rows = selectionRows(data, state);
  return [COLUMNS.join(','), ...rows.map(row => COLUMNS.map(column => csvCell(row[column], column)).join(','))].join('\r\n') + '\r\n';
}

export function selectionFilename(state) {
  assertReadySelection(state);
  return `oceans-hidden-response_${state.variable}_${state.region}_${state.start}_${state.end}.csv`;
}
