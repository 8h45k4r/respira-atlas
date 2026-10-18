import { fetchJson, PrepareError } from './lib/fetch.mjs';
import { ARCGIS_HOST } from './config.mjs';

/**
 * ArcGIS feature services on this host reject percent-encoded parentheses with
 * {"code":400,"message":"Invalid URL"} — the parenthesis-free service aliases are used.
 */
function queryUrl(service, params) {
  const search = new URLSearchParams({ f: 'geojson', outSR: '4326', ...params });
  return `${ARCGIS_HOST}/${service}/FeatureServer/0/query?${search}`;
}

export async function fetchFeatureCount(service) {
  const json = await fetchJson(
    `${ARCGIS_HOST}/${service}/FeatureServer/0/query?` +
      new URLSearchParams({ where: '1=1', returnCountOnly: 'true', f: 'json' }),
  );
  if (typeof json.count !== 'number') {
    throw new PrepareError('Could not read feature count', { service, json });
  }
  return json.count;
}

/**
 * Downloads a boundary layer as GeoJSON, paging through the server's record limit.
 * Verifies the observed feature count against the count we recorded when the
 * layer was chosen, so a boundary revision upstream fails the build loudly
 * instead of silently changing the map.
 */
export async function fetchBoundaryLayer({ service, codeField, nameField, expectedCount }) {
  const actualCount = await fetchFeatureCount(service);
  if (expectedCount != null && actualCount !== expectedCount) {
    throw new PrepareError(
      `Boundary layer feature count changed: expected ${expectedCount}, got ${actualCount}. ` +
        'The layer has been revised upstream — review the vintage before updating the expected count.',
      { service },
    );
  }

  const pageSize = 150;
  const features = [];
  for (let offset = 0; offset < actualCount; offset += pageSize) {
    const page = await fetchJson(
      queryUrl(service, {
        where: '1=1',
        outFields: [codeField, nameField].join(','),
        resultOffset: String(offset),
        resultRecordCount: String(pageSize),
        geometryPrecision: '5',
      }),
    );
    if (!page.features) {
      throw new PrepareError('GeoJSON page had no features array', { service, offset, page });
    }
    features.push(...page.features);
  }

  if (features.length !== actualCount) {
    throw new PrepareError(
      `Paged download incomplete: ${features.length} of ${actualCount}`,
      { service },
    );
  }

  return {
    service,
    count: actualCount,
    features: features.map((f) => {
      const code = f.properties?.[codeField];
      const name = f.properties?.[nameField];
      if (!code) throw new PrepareError('Feature missing code field', { service, codeField });
      return {
        type: 'Feature',
        id: code,
        properties: { code, name: name ?? code },
        geometry: f.geometry,
      };
    }),
  };
}

function ringArea(ring) {
  let sum = 0;
  for (let i = 0, n = ring.length; i < n; i += 1) {
    const [x1, y1] = ring[i];
    const [x2, y2] = ring[(i + 1) % n];
    sum += x1 * y2 - x2 * y1;
  }
  return Math.abs(sum / 2);
}

/**
 * Ramer–Douglas–Peucker, applied per ring.
 *
 * Simplification runs ring-by-ring and never drops a polygon from a
 * MultiPolygon, so offshore islands survive. A ring that collapses below four
 * points keeps its original geometry rather than being discarded.
 */
function simplifyRing(ring, tolerance) {
  if (ring.length <= 4) return ring;
  const keep = new Uint8Array(ring.length);
  keep[0] = 1;
  keep[ring.length - 1] = 1;
  const stack = [[0, ring.length - 1]];
  while (stack.length > 0) {
    const [first, last] = stack.pop();
    let maxDistance = 0;
    let index = -1;
    const [x1, y1] = ring[first];
    const [x2, y2] = ring[last];
    const dx = x2 - x1;
    const dy = y2 - y1;
    const lengthSquared = dx * dx + dy * dy;
    for (let i = first + 1; i < last; i += 1) {
      const [px, py] = ring[i];
      let distance;
      if (lengthSquared === 0) {
        distance = Math.hypot(px - x1, py - y1);
      } else {
        const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / lengthSquared));
        distance = Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
      }
      if (distance > maxDistance) { maxDistance = distance; index = i; }
    }
    if (maxDistance > tolerance && index > 0) {
      keep[index] = 1;
      stack.push([first, index], [index, last]);
    }
  }
  const out = [];
  for (let i = 0; i < ring.length; i += 1) if (keep[i]) out.push(ring[i]);
  if (out.length < 4) return ring;
  if (out[0][0] !== out[out.length - 1][0] || out[0][1] !== out[out.length - 1][1]) {
    out.push(out[0]);
  }
  return out;
}

export function simplifyGeometry(geometry, tolerance) {
  if (!geometry) return geometry;
  if (geometry.type === 'Polygon') {
    return { type: 'Polygon', coordinates: geometry.coordinates.map((r) => simplifyRing(r, tolerance)) };
  }
  if (geometry.type === 'MultiPolygon') {
    return {
      type: 'MultiPolygon',
      coordinates: geometry.coordinates.map((poly) => poly.map((r) => simplifyRing(r, tolerance))),
    };
  }
  return geometry;
}

export function countCoordinates(geometry) {
  if (!geometry) return 0;
  if (geometry.type === 'Polygon') {
    return geometry.coordinates.reduce((n, r) => n + r.length, 0);
  }
  if (geometry.type === 'MultiPolygon') {
    return geometry.coordinates.reduce(
      (n, poly) => n + poly.reduce((m, r) => m + r.length, 0), 0,
    );
  }
  return 0;
}

export function countParts(geometry) {
  if (!geometry) return 0;
  if (geometry.type === 'Polygon') return 1;
  if (geometry.type === 'MultiPolygon') return geometry.coordinates.length;
  return 0;
}

export { ringArea };
