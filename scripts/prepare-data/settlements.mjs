import { fetchJson } from './lib/fetch.mjs';
import { ARCGIS_HOST } from './config.mjs';

/**
 * Settlement index for place search.
 *
 * ONS Built Up Areas (December 2022) covers Great Britain only — there is no
 * Northern Ireland settlement layer in this release, and that gap is recorded in
 * the index metadata rather than being filled with guesses.
 *
 * A settlement is NOT an administrative area. Each entry records the
 * administrative (and NHS) area whose boundary actually contains its centroid,
 * so the interface can say which area it is about to show instead of treating a
 * town and its council as the same thing.
 */
export const BUA_SERVICE = 'BUA_2022_GB';
export const BUA_SOURCE = {
  name: 'Built Up Areas (December 2022), Great Britain',
  url: `${ARCGIS_HOST}/${BUA_SERVICE}/FeatureServer/0`,
  licence: 'Open Government Licence v3.0',
  coverage: 'Great Britain. Northern Ireland settlements are not included.',
};

export async function fetchSettlements() {
  // The service caps a response at its own maxRecordCount (1000 here) regardless
  // of what is requested, so paging is driven by the server's own
  // `exceededTransferLimit` flag rather than by comparing against a page size we
  // chose — that comparison silently stops after the first page.
  const pageSize = 1000;
  const entries = [];
  for (let offset = 0; ; offset += pageSize) {
    const page = await fetchJson(
      `${ARCGIS_HOST}/${BUA_SERVICE}/FeatureServer/0/query?` +
        new URLSearchParams({
          where: '1=1',
          outFields: 'BUA22CD,BUA22NM,LONG,LAT',
          returnGeometry: 'false',
          resultOffset: String(offset),
          resultRecordCount: String(pageSize),
          f: 'json',
        }),
    );
    const features = page.features ?? [];
    for (const feature of features) {
      const a = feature.attributes;
      if (!a?.BUA22CD || !a?.BUA22NM) continue;
      if (!Number.isFinite(a.LONG) || !Number.isFinite(a.LAT)) continue;
      entries.push({ code: a.BUA22CD, name: a.BUA22NM, lon: a.LONG, lat: a.LAT });
    }
    if (features.length === 0) break;
    if (page.exceededTransferLimit !== true && features.length < pageSize) break;
  }
  return entries;
}

function bbox(geometry) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  const scan = (ring) => {
    for (const [x, y] of ring) {
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  };
  if (geometry.type === 'Polygon') geometry.coordinates.forEach(scan);
  else if (geometry.type === 'MultiPolygon') {
    geometry.coordinates.forEach((poly) => poly.forEach(scan));
  }
  return [minX, minY, maxX, maxY];
}

/** Ray casting against one ring. */
function inRing(x, y, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

/** A point is inside a polygon when it is in the outer ring and in no hole. */
function inPolygon(x, y, rings) {
  if (rings.length === 0 || !inRing(x, y, rings[0])) return false;
  for (let i = 1; i < rings.length; i += 1) {
    if (inRing(x, y, rings[i])) return false;
  }
  return true;
}

function contains(geometry, x, y) {
  if (geometry.type === 'Polygon') return inPolygon(x, y, geometry.coordinates);
  if (geometry.type === 'MultiPolygon') {
    return geometry.coordinates.some((poly) => inPolygon(x, y, poly));
  }
  return false;
}

/**
 * Assigns each settlement to the area containing its centroid.
 *
 * Boundaries here are generalised for display, so a centroid near a coast or a
 * border can fall outside every polygon. Those settlements are reported rather
 * than snapped to a nearest guess — an unresolved settlement is left out of the
 * index instead of being attached to an area it may not belong to.
 */
export function assignContainment(settlements, features) {
  const indexed = features.map((feature) => ({
    code: feature.properties.code,
    name: feature.properties.name,
    geometry: feature.geometry,
    box: bbox(feature.geometry),
  }));

  const resolved = new Map();
  const unresolved = [];

  for (const settlement of settlements) {
    const { lon, lat } = settlement;
    let match = null;
    for (const candidate of indexed) {
      const [minX, minY, maxX, maxY] = candidate.box;
      if (lon < minX || lon > maxX || lat < minY || lat > maxY) continue;
      if (contains(candidate.geometry, lon, lat)) { match = candidate; break; }
    }
    if (match) resolved.set(settlement.code, { code: match.code, name: match.name });
    else unresolved.push(settlement.code);
  }

  return { resolved, unresolved };
}
