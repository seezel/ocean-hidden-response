import { REGION_STYLE } from './charts.js';

const UNITS = { chlor_a: '% per decade', sst: '°C per decade',
  comparison: '% change in EEP/NWP growth-rate ratio per decade' };
const unavailable = (unit, reason) => ({ available: false, estimate: null, low: null, high: null, unit, reason });

export function displayInterval(result, kind) {
  if (!Object.hasOwn(UNITS, kind)) throw new Error('Unknown interval kind');
  const unit = UNITS[kind];
  if (!result?.eligible) return unavailable(unit, result?.reason || 'Apply a valid investigation window.');
  if (!Array.isArray(result.ci95) || result.ci95.length !== 2) return unavailable(unit, 'No valid confidence interval.');
  const [low, high] = kind === 'comparison'
    ? result.ci95.map((value) => 100 * Math.expm1(10 * value)) : result.ci95;
  const estimate = result.trendPerDecade;
  if (![low, high, estimate].every(Number.isFinite) || low > high || estimate < low || estimate > high) {
    return unavailable(unit, 'No finite, ordered estimate and confidence interval.');
  }
  return { available: true, estimate, low, high, unit, reason: null };
}

export function intervalModel(rows, kind) {
  const modelRows = rows.map((row) => ({ id: row.id, label: row.label, ...displayInterval(row.result, kind) }));
  const values = modelRows.filter((row) => row.available).flatMap((row) => [row.low, row.high, row.estimate]);
  const low = Math.min(0, ...values), high = Math.max(0, ...values), padding = (high - low) * .1 || 1;
  const domain = [low - padding, high + padding];
  if (!domain.every(Number.isFinite)) return { kind, unit: UNITS[kind], domain: [-1, 1],
    rows: modelRows.map((row) => ({ ...row, ...unavailable(UNITS[kind], 'Interval exceeds the finite display range.') })) };
  return { kind, unit: UNITS[kind], rows: modelRows, domain };
}

function svgNode(name, attributes = {}, text) {
  const node = document.createElementNS('http://www.w3.org/2000/svg', name);
  for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, String(value));
  if (text !== undefined) node.textContent = text;
  return node;
}

export function renderIntervals(container, rows, kind) {
  const model = intervalModel(rows, kind);
  container.replaceChildren();
  const available = model.rows.filter((row) => row.available);
  if (!available.length) {
    const message = document.createElement('p');
    message.textContent = `Inference unavailable: ${[...new Set(model.rows.map((row) => row.reason))].join(' ')}`;
    container.append(message);
    return;
  }
  const width = Math.max(260, Math.round(container.getBoundingClientRect().width || 600));
  const scale = Math.max(1, parseFloat(getComputedStyle(document.documentElement).fontSize) / 16);
  const rowHeight = 68 * scale, margin = 18, axisY = available.length * rowHeight + 3 * scale;
  const height = axisY + 35 * scale;
  const x = (value) => margin + (value - model.domain[0]) / (model.domain[1] - model.domain[0]) * (width - margin * 2);
  const prefix = container.id || 'trend-intervals';
  const svg = svgNode('svg', { viewBox: `0 0 ${width} ${height}`, role: 'img',
    'aria-labelledby': `${prefix}-title ${prefix}-description`, 'data-unit': model.unit });
  svg.append(svgNode('title', { id: `${prefix}-title` }, `${kind === 'comparison' ? 'Paired relative trend comparison' : 'Regional trend estimates'} and approximate 95% confidence intervals`),
    svgNode('desc', { id: `${prefix}-description` }, `${available.map((row) => `${row.label}: estimate ${row.estimate.toFixed(3)}, interval ${row.low.toFixed(3)} to ${row.high.toFixed(3)} ${row.unit}.`).join(' ')} Zero is the reference line. These intervals describe estimated trends, not monthly observation spread.`),
    svgNode('line', { x1: x(0), x2: x(0), y1: 30 * scale, y2: axisY, class: 'interval-zero' }));
  available.forEach((row, index) => {
    const style = REGION_STYLE[row.id] || { color: '#242b2c', dash: '' };
    const y = index * rowHeight + 46 * scale;
    svg.append(svgNode('text', { x: margin, y: index * rowHeight + 22 * scale, class: 'interval-label' }, `${row.label}: ${row.estimate.toFixed(2)}`),
      svgNode('line', { x1: x(row.low), x2: x(row.high), y1: y, y2: y, stroke: style.color, 'stroke-width': 3, 'stroke-dasharray': style.dash }));
    for (const bound of [row.low, row.high]) svg.append(svgNode('line', { x1: x(bound), x2: x(bound), y1: y - 6, y2: y + 6, stroke: style.color, 'stroke-width': 2 }));
    svg.append(row.id === 'nwp'
      ? svgNode('rect', { x: x(row.estimate) - 4, y: y - 4, width: 8, height: 8, fill: style.color })
      : svgNode('circle', { cx: x(row.estimate), cy: y, r: 4.5, fill: style.color }));
  });
  for (const [index, value] of [model.domain[0], 0, model.domain[1]].entries()) {
    if (value !== 0 && Math.abs(x(value) - x(0)) < 45 * scale) continue;
    svg.append(svgNode('text', { x: x(value), y: axisY + 22 * scale,
      'text-anchor': index === 0 ? 'start' : index === 2 ? 'end' : 'middle' }, value === 0 ? '0' : Number(value.toPrecision(2)).toString()));
  }
  const caption = document.createElement('p');
  caption.className = 'interval-caption';
  caption.textContent = `${model.unit}. Points show estimates; bars show approximate 95% confidence intervals. The dashed line marks zero.`;
  container.append(svg, caption);
  for (const row of model.rows.filter((item) => !item.available)) {
    const message = document.createElement('p');
    message.textContent = `${row.label}: inference unavailable. ${row.reason}`;
    container.append(message);
  }
}
