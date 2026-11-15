import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { wrapLongitude, unwrapRing, pacificProjection, landPaths, validateLand, loadBasemap, renderPacificLocator } from '../src/locator.js';
import { regionBounds } from '../src/charts.js';

const polygon = coordinates => ({ type: 'FeatureCollection', features: [{ type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [coordinates] } }] });
const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} != ${expected}`);

test('equivalent western and eastern longitudes project identically', () => {
  assert.equal(wrapLongitude(-120), 240);
  assert.equal(wrapLongitude(360), 0);
  assert.deepEqual(pacificProjection(440).project(-120, 0), pacificProjection(440).project(240, 0));
  assert.throws(() => wrapLongitude(NaN), /longitude/i);
});

test('dateline ring stays continuous without mutating source coordinates', () => {
  const ring = [[179, 1], [-179, 1], [-179, -1], [179, -1], [179, 1]];
  const original = structuredClone(ring);
  assert.deepEqual(unwrapRing(ring), [[179, 1], [181, 1], [181, -1], [179, -1], [179, 1]]);
  assert.deepEqual(ring, original);
});

test('a Greenwich meridian ring cannot produce a fake Pacific bridge', () => {
  const ring = [[-5, 10], [5, 10], [5, -10], [-5, -10], [-5, 10]];
  const continuous = unwrapRing(ring);
  assert.equal(Math.max(...continuous.map(p => p[0])) - Math.min(...continuous.map(p => p[0])), 10);
  assert.deepEqual(landPaths(polygon(ring), pacificProjection(440)), []);
});

test('projection preserves fixed bounds, equal degree scale and north-up orientation', () => {
  const regions = { eep: { bounds: [-120, -90, -5, 5] }, nwp: { bounds: [125, 150, 2, 10] } };
  const snapshot = structuredClone(regions);
  const projection = pacificProjection(360);
  for (const [key, span, latitudeSpan] of [['eep', 30, 10], ['nwp', 25, 8]]) {
    const [west, east, south, north] = regionBounds(regions[key]);
    const a = projection.project(west, north), b = projection.project(east, south);
    close(b[0] - a[0], projection.scale * span);
    close(b[1] - a[1], projection.scale * latitudeSpan);
    assert.ok(a[1] < b[1]);
  }
  assert.deepEqual(regions, snapshot);
  close(projection.project(180, 0)[0], (projection.project(60, 0)[0] + projection.project(300, 0)[0]) / 2);
});

test('invalid land collections, geometries, rings and coordinates are rejected', () => {
  for (const invalid of [null, {}, { type: 'FeatureCollection', features: [] }, polygon([[0, 0], [1, 1]]), polygon([[0, 0], [1, 1], [1, 0], [0, NaN]]), polygon([[0, 91], [1, 1], [1, 0], [0, 91]]), polygon([[0, 0], [1, 1], [1, 0], [2, 0]])]) {
    assert.throws(() => validateLand(invalid), /land|geometry|ring|coordinate/i);
  }
});

test('bundled land is genuine polygon geometry within the download cap', async () => {
  const bytes = await readFile(new URL('../assets/ne_110m_land.geojson', import.meta.url));
  const source = JSON.parse(await readFile(new URL('../assets/map-source.json', import.meta.url), 'utf8'));
  assert.ok(bytes.length < 2 * 1024 * 1024);
  assert.equal(bytes.length, source.bytes);
  assert.equal(createHash('sha256').update(bytes).digest('hex'), source.sha256);
  const land = validateLand(JSON.parse(bytes));
  assert.ok(land.features.length >= 100);
  assert.ok(landPaths(land, pacificProjection(360)).length > 20);
});

test('basemap loads from a module-relative local asset and reports fetch and format failures', async t => {
  const valid = polygon([[125, 1], [126, 1], [126, 0], [125, 1]]);
  const fetchMock = t.mock.method(globalThis, 'fetch', async url => {
    assert.equal(new URL(url).pathname.endsWith('/assets/ne_110m_land.geojson'), true);
    return { ok: true, json: async () => valid };
  });
  assert.equal(await loadBasemap(), valid);
  fetchMock.mock.mockImplementation(async () => ({ ok: false, status: 404 }));
  await assert.rejects(loadBasemap(), /basemap|404/i);
  fetchMock.mock.mockImplementation(async () => ({ ok: true, json: async () => ({ type: 'FeatureCollection', features: [] }) }));
  await assert.rejects(loadBasemap(), /land/i);
});

test('renderer preserves the explicit schematic fallback and accessible geographic bounds', t => {
  const previousDocument = globalThis.document;
  t.after(() => {
    if (previousDocument === undefined) delete globalThis.document;
    else globalThis.document = previousDocument;
  });
  globalThis.document = { createElementNS: (_namespace, name) => ({
    name, attributes: {}, children: [], textContent: '',
    setAttribute(key, value) { this.attributes[key] = value; },
    append(...children) { this.children.push(...children); },
  }) };
  const container = {
    dataset: {}, children: [], getBoundingClientRect: () => ({ width: 300 }),
    replaceChildren(...children) { this.children = children; },
  };
  const regions = { eep: { bounds: [-120, -90, -5, 5] }, nwp: { bounds: [125, 150, 2, 10] } };
  const original = structuredClone(regions);
  renderPacificLocator(container, regions);
  assert.equal(container.dataset.basemap, 'schematic');
  assert.match(container.children[0].children.find(child => child.name === 'title').textContent, /schematic/i);
  assert.match(container.children[0].children.find(child => child.name === 'desc').textContent, /No coastlines/);
  renderPacificLocator(container, regions, { land: polygon([[125, 1], [126, 1], [126, 0], [125, 1]]) });
  const svg = container.children[0];
  assert.equal(container.dataset.basemap, 'natural-earth');
  assert.equal(svg.attributes.role, 'img');
  assert.match(svg.children.find(child => child.name === 'desc').textContent, /120 to 90 degrees west.*125 to 150 degrees east/);
  const boxes = svg.children.filter(child => child.name === 'rect');
  assert.equal(boxes.length, 2);
  assert.equal(boxes[0].attributes.stroke, '#963e30');
  assert.equal(boxes[0].attributes['stroke-dasharray'], '');
  assert.equal(boxes[1].attributes.stroke, '#1a6266');
  assert.equal(boxes[1].attributes['stroke-dasharray'], '12 5');
  const scale = pacificProjection(300).scale;
  close(Number(boxes[0].attributes.width), 30 * scale);
  close(Number(boxes[1].attributes.width), 25 * scale);
  assert.deepEqual(regions, original);
});
