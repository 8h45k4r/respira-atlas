#!/usr/bin/env node
/**
 * Validates the prepared static data independently of the preparation run.
 * Exits non-zero on any violation, so CI fails before a bad dataset ships.
 */
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { decodeObservations } from '../prepare-data/encode.mjs';
import { AREA_TYPES, DATA_SCHEMA_VERSION } from '../prepare-data/config.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const DATA = join(ROOT, 'public', 'data');

const failures = [];
const notes = [];
const check = (condition, message) => { if (!condition) failures.push(message); };
const read = (rel) => JSON.parse(readFileSync(join(DATA, rel), 'utf8'));

if (!existsSync(join(DATA, 'manifest.json'))) {
  console.error('No manifest.json — run `npm run data:prepare` first.');
  process.exit(1);
}

const manifest = read('manifest.json');
const indicatorIndex = read('indicators/index.json');
const coverage = read('coverage.json');
const search = read('search/areas.json');
const joinReport = read('join-report.json');

// ---------------------------------------------------------------- manifest
check(manifest.schemaVersion === DATA_SCHEMA_VERSION,
  `manifest schemaVersion ${manifest.schemaVersion} != expected ${DATA_SCHEMA_VERSION}`);
check(manifest.dataKind === 'real', 'manifest.dataKind must be "real" for a published build');
check(manifest.indicators.length >= 6,
  `only ${manifest.indicators.length} indicators (minimum 6)`);
check(Array.isArray(manifest.coverage?.nationsWithData)
  && manifest.coverage.nationsWithData.length > 0,
  'manifest must declare which nations have data');
check(manifest.coverage.benchmark.scope === 'England',
  'benchmark scope must be England — no UK benchmark may be computed from England-only data');

// ------------------------------------------------------------- geographies
const geometryByAreaType = {};
for (const [key, areaType] of Object.entries(manifest.areaTypes)) {
  const layer = read(areaType.file);
  check(layer.type === 'FeatureCollection', `${key}: not a FeatureCollection`);
  check(layer.features.length > 0, `${key}: no features`);
  check(!!layer.metadata?.boundaryVintage, `${key}: missing boundary vintage`);
  check(!!layer.metadata?.boundarySource, `${key}: missing boundary source`);
  check(!!layer.metadata?.licence?.name, `${key}: missing licence`);

  const expected = AREA_TYPES[areaType.areaTypeId]?.expectedBoundaryCount;
  check(layer.features.length === expected,
    `${key}: ${layer.features.length} features, expected ${expected}`);

  const codes = new Set();
  let multipolygons = 0;
  for (const feature of layer.features) {
    check(!!feature.properties?.code, `${key}: feature without a code`);
    check(!codes.has(feature.properties.code),
      `${key}: duplicate code ${feature.properties.code}`);
    codes.add(feature.properties.code);
    check(feature.geometry != null, `${key}: ${feature.properties.code} has no geometry`);
    if (feature.geometry?.type === 'MultiPolygon') multipolygons += 1;
  }
  geometryByAreaType[key] = codes;
  notes.push(`${key}: ${codes.size} areas, ${multipolygons} multipolygon (islands preserved)`);
}

const nationsLayer = read(manifest.nationsLayer.file);
check(nationsLayer.features.length === 4,
  `nations layer has ${nationsLayer.features.length} features, expected 4 (UK, not GB)`);
const nationCodes = nationsLayer.features.map((f) => f.properties.code).sort();
check(
  ['E92000001', 'N92000002', 'S92000003', 'W92000004'].every((c) => nationCodes.includes(c)),
  `nations layer must include all four UK nations; got ${nationCodes.join(', ')}`,
);

// -------------------------------------------------------------- indicators
check(indicatorIndex.indicators.length === manifest.indicators.length,
  'indicator index and manifest disagree on indicator count');

for (const indicator of indicatorIndex.indicators) {
  const label = `indicator ${indicator.id}`;
  check(!!indicator.name, `${label}: missing name`);
  check(!!indicator.unit, `${label}: missing unit`);
  check(!!indicator.valueType, `${label}: missing value type`);
  check(!!indicator.yearType, `${label}: missing year type`);
  check(!!indicator.definition, `${label}: missing definition`);
  check(!!indicator.licence?.name, `${label}: missing licence`);
  check(!!indicator.retrievedAt, `${label}: missing retrieval date`);
  check(!!indicator.dataSource, `${label}: missing data source`);
  check(Object.keys(indicator.geographies).length > 0,
    `${label}: no geographies — should have been excluded`);
  check(
    ['low-is-good', 'high-is-good', 'not-interpretable'].includes(indicator.direction),
    `${label}: invalid direction "${indicator.direction}"`,
  );

  for (const [key, geo] of Object.entries(indicator.geographies)) {
    const where = `${label} @ ${key}`;
    check(existsSync(join(DATA, geo.file)), `${where}: observation file missing`);
    const file = read(geo.file);
    check(file.indicatorId === indicator.id, `${where}: indicatorId mismatch`);
    check(file.schemaVersion === DATA_SCHEMA_VERSION, `${where}: schemaVersion mismatch`);
    check(!!file.sourceUrl, `${where}: no source URL recorded`);

    const rows = decodeObservations(file.data);
    check(rows.length === file.data.rowCount, `${where}: decode length mismatch`);
    check(rows.length > 0, `${where}: no observations`);

    // Every observation must join to a real boundary by stable code.
    const boundaryCodes = geometryByAreaType[key];
    const unjoined = rows.filter((r) => !boundaryCodes.has(r.areaCode));
    check(unjoined.length === 0,
      `${where}: ${unjoined.length} observation(s) do not join to a boundary ` +
        `(e.g. ${unjoined.slice(0, 3).map((r) => r.areaCode).join(', ')})`);

    // Value states must be exactly the four documented ones.
    for (const row of rows) {
      check(['present', 'missing', 'suppressed', 'not-applicable'].includes(row.state),
        `${where}: unknown state "${row.state}"`);
      if (row.state === 'present') {
        check(typeof row.value === 'number' && Number.isFinite(row.value),
          `${where}: present observation without a finite value`);
      } else {
        check(row.value === null,
          `${where}: non-present observation carries a value (state ${row.state})`);
      }
      // Intervals must bracket the value when both are provided.
      if (row.state === 'present' && row.lowerCi95 != null && row.upperCi95 != null) {
        check(row.lowerCi95 <= row.value + 1e-6 && row.value <= row.upperCi95 + 1e-6,
          `${where}: value ${row.value} outside its 95% interval ` +
            `[${row.lowerCi95}, ${row.upperCi95}] for ${row.areaCode} ${row.period}`);
      }
    }

    // Pooled and single-year periods must be separated.
    check(Array.isArray(file.periodSeries) && file.periodSeries.length > 0,
      `${where}: no period series metadata`);
    const seriesPeriods = file.periodSeries.flatMap((s) => s.periods);
    check(new Set(seriesPeriods).size === seriesPeriods.length,
      `${where}: a period appears in more than one period series`);
    const declared = new Set(file.periods);
    check(seriesPeriods.every((p) => declared.has(p)),
      `${where}: period series references an undeclared period`);
    check(
      file.periodSeries.some((s) => s.range === file.defaultPeriodSeries),
      `${where}: defaultPeriodSeries "${file.defaultPeriodSeries}" is not one of the series`,
    );
    if (file.periodSeries.length > 1) {
      notes.push(
        `${where}: mixes ${file.periodSeries.map((s) => s.range).join(' + ')} — ` +
          'separated into distinct series',
      );
    }

    // Benchmark must be England and must not be derived.
    if (geo.hasBenchmark) {
      check(file.benchmark.areaCode === 'E92000001',
        `${where}: benchmark is not England`);
      const benchmarkRows = decodeObservations(file.benchmark.data);
      check(benchmarkRows.every((r) => r.areaCode === 'E92000001'),
        `${where}: benchmark series contains non-England rows`);
    }
  }
}

// ---------------------------------------------------------------- coverage
const coverageStatuses = new Set(coverage.matrix.map((r) => r.status));
for (const status of coverageStatuses) {
  check(status in coverage.legend, `coverage matrix uses undocumented status "${status}"`);
}
const englandRowsWithData = coverage.matrix.filter(
  (r) => r.nation === 'England' && r.status === 'data',
);
check(englandRowsWithData.length > 0, 'coverage matrix has no England rows with data');
const devolvedWithData = coverage.matrix.filter(
  (r) => r.nation !== 'England' && r.status === 'data',
);
check(devolvedWithData.length === 0,
  `coverage matrix claims data for ${devolvedWithData.length} non-England row(s), ` +
    'but this release is England-only');

const coveredIndicatorIds = new Set(coverage.matrix.map((r) => r.indicatorId));
const publishedIds = new Set(manifest.indicators.map((i) => i.id));
for (const id of coveredIndicatorIds) {
  check(publishedIds.has(id),
    `coverage matrix references indicator ${id} which is not published`);
}

// ------------------------------------------------------------------ search
check(search.entries.length > 0, 'search index is empty');
for (const entry of search.entries) {
  check(!!entry.code && !!entry.name, 'search entry missing code or name');
  if (entry.kind === 'area') {
    check(
      geometryByAreaType[entry.areaTypeKey]?.has(entry.code) === true,
      `search entry ${entry.code} (${entry.areaTypeKey}) has no boundary`,
    );
  }
}

// ------------------------------------------------------------ orphan files
const observationDir = join(DATA, 'observations');
const referenced = new Set();
for (const indicator of indicatorIndex.indicators) {
  for (const geo of Object.values(indicator.geographies)) {
    referenced.add(geo.file.replace('observations/', ''));
    if (geo.subgroupFile) referenced.add(geo.subgroupFile.replace('observations/', ''));
  }
}
for (const file of readdirSync(observationDir)) {
  check(referenced.has(file), `orphan observation file not referenced by any indicator: ${file}`);
}

// ----------------------------------------------------------------- report
console.log('--- data validation ---');
for (const note of notes) console.log('  note:', note);
if (joinReport.declaredButEmpty?.length > 0) {
  console.log(
    `  note: ${joinReport.declaredButEmpty.length} declared-but-empty source combination(s) recorded`,
  );
}
console.log(
  `  checked ${manifest.indicators.length} indicators, ` +
    `${Object.keys(manifest.areaTypes).length} geographies, ` +
    `${coverage.matrix.length} coverage rows, ${search.entries.length} search entries`,
);
if (failures.length > 0) {
  console.error(`\nFAILED with ${failures.length} violation(s):`);
  for (const f of failures.slice(0, 40)) console.error('  -', f);
  if (failures.length > 40) console.error(`  … and ${failures.length - 40} more`);
  process.exit(1);
}
console.log('  OK — no violations');
