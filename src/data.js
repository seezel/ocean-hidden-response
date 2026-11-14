const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;
const UNITS = { chlor_a: 'mg/m3', sst: 'degC' };

export function validateObservations(data) {
  if (data?.schemaVersion !== 1 || !Array.isArray(data.records)) {
    throw new Error('Unsupported observation file. Reload the verified data package.');
  }
  const keys = new Set();
  const products = new Map();
  for (const row of data.records) {
    if (!MONTH.test(row.month)) throw new Error('Invalid observation month.');
    if (!['eep', 'nwp'].includes(row.region)) throw new Error('Unknown observation region.');
    if (!Object.hasOwn(UNITS, row.variable)) throw new Error('Unknown observation variable.');
    if (row.units !== UNITS[row.variable]) throw new Error('Unexpected observation units.');
    if (row.value !== null && (!Number.isFinite(row.value) || (row.variable === 'chlor_a' && row.value <= 0))) {
      throw new Error('Invalid observation value.');
    }
    if (!Number.isFinite(row.coverage) || row.coverage < 0 || row.coverage > 1) {
      throw new Error('Invalid observation coverage.');
    }
    if (typeof row.provenance !== 'string' || !row.provenance) throw new Error('Missing data provenance.');
    const key = `${row.month}/${row.region}/${row.variable}`;
    if (keys.has(key)) throw new Error('Duplicate observation month, region and variable.');
    keys.add(key);
    const existing = products.get(row.variable);
    if (existing && existing !== row.provenance) throw new Error('Incompatible products in one observation series.');
    products.set(row.variable, row.provenance);
  }
  return data;
}

export function selectRecords(data, { variable, region, start, end }) {
  if (!MONTH.test(start) || !MONTH.test(end) || start > end) {
    throw new Error('Start month must come before or equal the end month.');
  }
  return data.records.filter((row) => row.variable === variable && row.region === region
    && row.month >= start && row.month <= end).sort((a, b) => a.month.localeCompare(b.month));
}

export async function loadData(base = './data/', signal) {
  const files = ['observations.json', 'reference-results.json', 'provenance.json'];
  const [observations, reference, provenance] = await Promise.all(files.map(async (name) => {
    const response = await fetch(new URL(name, new URL(base, document.baseURI)), { signal });
    if (!response.ok) throw new Error(`Cannot load ${name} (HTTP ${response.status}).`);
    return response.json();
  }));
  return { observations: validateObservations(observations), reference, provenance };
}
