import { REGION_STYLE, regionBounds, renderLocator } from './charts.js';

const SVG = 'http://www.w3.org/2000/svg';
const EXTENT = Object.freeze({ west: 60, east: 300, south: -55, north: 65 });

export function wrapLongitude(longitude) {
  if (!Number.isFinite(longitude)) throw new TypeError('Longitude must be finite.');
  return ((longitude % 360) + 360) % 360;
}

export function unwrapRing(coordinates) {
  let previous;
  return coordinates.map(([longitude, latitude]) => {
    let continuous = wrapLongitude(longitude);
    if (previous !== undefined) continuous += 360 * Math.round((previous - continuous) / 360);
    previous = continuous;
    return [continuous, latitude];
  });
}

export function pacificProjection(width) {
  if (!Number.isFinite(width) || width < 100) throw new TypeError('Map width must be at least 100 pixels.');
  const margin = { left: 36, right: 18, top: 24, bottom: 30 };
  const scale = (width - margin.left - margin.right) / (EXTENT.east - EXTENT.west);
  const height = margin.top + margin.bottom + (EXTENT.north - EXTENT.south) * scale;
  const projectContinuous = (longitude, latitude) => [margin.left + (longitude - EXTENT.west) * scale, margin.top + (EXTENT.north - latitude) * scale];
  return {
    width, height, margin, scale, extent: EXTENT,
    project: (longitude, latitude) => projectContinuous(wrapLongitude(longitude), latitude),
    projectContinuous,
  };
}

export function validateLand(land) {
  if (land?.type !== 'FeatureCollection' || !Array.isArray(land.features) || !land.features.length) {
    throw new TypeError('Land basemap must be a nonempty GeoJSON FeatureCollection.');
  }
  for (const feature of land.features) {
    const geometry = feature?.geometry;
    if (feature?.type !== 'Feature' || !['Polygon', 'MultiPolygon'].includes(geometry?.type) || !Array.isArray(geometry.coordinates) || !geometry.coordinates.length) {
      throw new TypeError('Land geometry must contain polygons.');
    }
    const polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;
    for (const polygon of polygons) {
      if (!Array.isArray(polygon) || !polygon.length) throw new TypeError('Land polygon must contain a ring.');
      for (const ring of polygon) {
        if (!Array.isArray(ring) || ring.length < 4) throw new TypeError('Land ring must contain at least four coordinates.');
        for (const coordinate of ring) {
          if (!Array.isArray(coordinate) || coordinate.length < 2 || !coordinate.slice(0, 2).every(Number.isFinite) || Math.abs(coordinate[0]) > 180 || Math.abs(coordinate[1]) > 90) {
            throw new TypeError('Land coordinate is invalid.');
          }
        }
        if (ring[0][0] !== ring.at(-1)[0] || ring[0][1] !== ring.at(-1)[1]) throw new TypeError('Land ring must be closed.');
      }
    }
  }
  return land;
}

export async function loadBasemap() {
  const response = await fetch(new URL('../assets/ne_110m_land.geojson', import.meta.url));
  if (!response.ok) throw new Error(`Land basemap request failed (${response.status}).`);
  return validateLand(await response.json());
}

export function landPaths(land, projection) {
  validateLand(land);
  const paths = [];
  for (const feature of land.features) {
    const polygons = feature.geometry.type === 'Polygon' ? [feature.geometry.coordinates] : feature.geometry.coordinates;
    for (const polygon of polygons) {
      const rings = polygon.map(unwrapRing);
      const exterior = rings[0];
      const longitudes = exterior.map(point => point[0]), latitudes = exterior.map(point => point[1]);
      const west = Math.min(...longitudes), east = Math.max(...longitudes);
      if (Math.max(...latitudes) < EXTENT.south || Math.min(...latitudes) > EXTENT.north) continue;
      const firstCopy = Math.ceil((EXTENT.west - east) / 360), lastCopy = Math.floor((EXTENT.east - west) / 360);
      for (let copy = firstCopy; copy <= lastCopy; copy++) {
        paths.push(rings.map((ring, index) => {
          // Hole rings must use the same longitude copy as their exterior.
          const alignment = index ? 360 * Math.round((exterior[0][0] - ring[0][0]) / 360) : 0;
          return ring.map(([longitude, latitude], i) => {
            const [x, y] = projection.projectContinuous(longitude + copy * 360 + alignment, latitude);
            return `${i ? 'L' : 'M'}${x.toFixed(2)},${y.toFixed(2)}`;
          }).join(' ') + ' Z';
        }).join(' '));
      }
    }
  }
  return paths;
}

function node(name, attributes = {}, text) {
  const element = document.createElementNS(SVG, name);
  for (const [key, value] of Object.entries(attributes)) element.setAttribute(key, String(value));
  if (text !== undefined) element.textContent = text;
  return element;
}

export function renderPacificLocator(container, regions, { land = null } = {}) {
  if (land === null) {
    renderLocator(container, regions);
    container.dataset.basemap = 'schematic';
    return;
  }
  const width = Math.max(280, Math.round(container.getBoundingClientRect().width || 440));
  const projection = pacificProjection(width);
  const { height, margin, project } = projection;
  const paths = landPaths(land, projection);
  const svg = node('svg', { viewBox: `0 0 ${width} ${height}`, role: 'img', 'aria-labelledby': 'pacific-locator-title pacific-locator-description' });
  svg.append(node('title', { id: 'pacific-locator-title' }, 'Pacific analysis regions on a Natural Earth land basemap'),
    node('desc', { id: 'pacific-locator-description' }, 'Pacific-centered equirectangular map, 60 degrees east to 60 degrees west and 55 degrees south to 65 degrees north. Eastern Equatorial Pacific: 120 to 90 degrees west, 5 degrees south to 5 degrees north, solid rust outline. Northwestern Pacific: 125 to 150 degrees east, 2 to 10 degrees north, dashed teal outline. Land is geographic context, not satellite observations.'));
  const clip = node('clipPath', { id: 'pacific-land-clip' });
  clip.append(node('rect', { x: margin.left, y: margin.top, width: width - margin.left - margin.right, height: height - margin.top - margin.bottom }));
  const definitions = node('defs');
  definitions.append(clip);
  svg.append(definitions);
  const surface = node('g', { 'clip-path': 'url(#pacific-land-clip)' });
  surface.append(node('rect', { x: margin.left, y: margin.top, width: width - margin.left - margin.right, height: height - margin.top - margin.bottom, fill: '#ffffff' }));
  for (const path of paths) surface.append(node('path', { d: path, fill: '#e4e4d9', stroke: '#92998e', 'stroke-width': .7, 'fill-rule': 'evenodd' }));
  for (const longitude of [60, 120, 180, 240, 300]) {
    const x = project(longitude, 0)[0];
    surface.append(node('line', { x1: x, x2: x, y1: margin.top, y2: height - margin.bottom, stroke: '#c7cbc7', 'stroke-width': .6 }));
    svg.append(node('text', { x, y: height - 10, 'text-anchor': longitude === 60 ? 'start' : longitude === 300 ? 'end' : 'middle', 'font-size': 13 }, longitude === 180 ? '180°' : longitude > 180 ? `${360 - longitude}°W` : `${longitude}°E`));
  }
  for (const latitude of [-40, 0, 40]) {
    const y = project(180, latitude)[1];
    surface.append(node('line', { x1: margin.left, x2: width - margin.right, y1: y, y2: y, stroke: latitude === 0 ? '#747d79' : '#c7cbc7', 'stroke-width': .7 }));
    svg.append(node('text', { x: margin.left - 5, y: y + 4, 'text-anchor': 'end', 'font-size': 13 }, latitude === 0 ? '0°' : `${Math.abs(latitude)}°${latitude > 0 ? 'N' : 'S'}`));
  }
  svg.append(surface);
  for (const [text, longitude, latitude] of [['Asia', 100, 45], ['Australia', 134, -33], ['N. America', 246, 47], ['S. America', 276, -30], ['Pacific Ocean', 195, -23]]) {
    const [x, y] = project(longitude, latitude);
    svg.append(node('text', { x, y, 'text-anchor': 'middle', 'font-size': 13, fill: '#4c5556' }, text));
  }
  for (const key of ['eep', 'nwp']) {
    const bounds = regionBounds(regions[key]);
    if (!bounds) continue;
    const [west, east, south, north] = bounds, style = REGION_STYLE[key];
    const [x, y] = project(west, north), [right, bottom] = project(east, south);
    svg.append(node('rect', { x, y, width: right - x, height: bottom - y, fill: 'none', stroke: style.color, 'stroke-width': 2, 'stroke-dasharray': style.dash }),
      node('text', { x: (x + right) / 2, y: y - 7, 'text-anchor': 'middle', 'font-size': 13, style: `fill:${style.color};font-weight:600` }, style.short));
  }
  container.replaceChildren(svg);
  container.dataset.basemap = 'natural-earth';
}
