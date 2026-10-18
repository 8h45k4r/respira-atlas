#!/usr/bin/env node
/**
 * Data preparation pipeline.
 *
 * This is a build-time script, not a deployed backend. It resolves real
 * indicators from Fingertips, downloads documented ONS boundaries, validates
 * every area-code join, and writes versioned static assets to public/data.
 *
 * It fails loudly rather than emitting partial or guessed data.
 */
import { mkdir, writeFile, rm, readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  AREA_TYPES, NATIONS_LAYER, INDICATORS, DOMAIN_LABELS, TOPICS,
  RESPIRATORY_PROFILE_ID, ENGLAND_AREA_CODE, ENGLAND_AREA_TYPE_ID,
  BOUNDARY_LICENCE, FINGERTIPS_LICENCE, DATA_SCHEMA_VERSION, FINGERTIPS_BASE,
} from './config.mjs';
import {
  fetchProfiles, fetchAvailableAreaTypes, fetchIndicatorMetadata, fetchAreas,
  fetchObservations, normaliseObservation,
} from './fingertips.mjs';
import {
  fetchBoundaryLayer, simplifyGeometry, countCoordinates, countParts,
} from './boundaries.mjs';
import { PrepareError } from './lib/fetch.mjs';
import { encodeObservations } from './encode.mjs';
import { fetchSettlements, assignContainment, BUA_SOURCE } from './settlements.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUT = join(ROOT, 'public', 'data');
const RETRIEVED_AT = new Date().toISOString();

const log = (...a) => console.log('[prepare]', ...a);
const warn = (...a) => console.warn('[prepare][warn]', ...a);

/** ONS generalisation level, read from the service name's suffix. */
function describeGeneralisation(service) {
  const match = /_(BFC|BFE|BGC|BUC|BSC)(_\d{4})?$/.exec(service);
  const level = match?.[1];
  const labels = {
    BFC: 'BFC (full resolution, clipped) — generalised in this pipeline',
    BFE: 'BFE (full resolution, extent of realm)',
    BGC: 'BGC (generalised, clipped)',
    BUC: 'BUC (ultra generalised, clipped)',
    BSC: 'BSC (super generalised, clipped)',
  };
  return labels[level] ?? `unknown generalisation (${service})`;
}

function stripHtml(html) {
  if (!html) return null;
  return String(html)
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim() || null;
}

async function writeJson(relativePath, value) {
  const path = join(OUT, relativePath);
  await mkdir(dirname(path), { recursive: true });
  const body = JSON.stringify(value);
  await writeFile(path, body);
  return { path: relativePath, bytes: Buffer.byteLength(body) };
}

/** Nation inferred from the ONS code prefix — structural, not a name guess. */
function nationFromCode(code) {
  if (/^E/.test(code)) return 'England';
  if (/^W/.test(code)) return 'Wales';
  if (/^S/.test(code)) return 'Scotland';
  if (/^N/.test(code)) return 'Northern Ireland';
  return 'Unknown';
}

async function main() {
  const startedAt = Date.now();
  await rm(OUT, { recursive: true, force: true });
  await mkdir(OUT, { recursive: true });

  // ---------------------------------------------------------------- profiles
  log('Resolving profile…');
  const profiles = await fetchProfiles();
  const profile = profiles.find((p) => p.Id === RESPIRATORY_PROFILE_ID);
  if (!profile) {
    throw new PrepareError(
      `Profile ${RESPIRATORY_PROFILE_ID} no longer exists in /api/profiles`, {},
    );
  }
  log(`Profile ${profile.Id} "${profile.Name}" (${profile.Key})`);

  // -------------------------------------------------------------- boundaries
  log('Downloading boundaries…');
  const geographyFiles = [];
  const areaIndexByType = {};

  const nations = await fetchBoundaryLayer({
    service: NATIONS_LAYER.arcgisService,
    codeField: NATIONS_LAYER.codeField,
    nameField: NATIONS_LAYER.nameField,
    expectedCount: NATIONS_LAYER.expectedBoundaryCount,
  });
  {
    const features = nations.features.map((f) => ({
      ...f,
      properties: { ...f.properties, nation: f.properties.name },
      geometry: simplifyGeometry(f.geometry, 0.004),
    }));
    const file = await writeJson('geography/nations.json', {
      type: 'FeatureCollection',
      metadata: {
        key: NATIONS_LAYER.key,
        label: NATIONS_LAYER.label,
        boundaryVintage: NATIONS_LAYER.boundaryVintage,
        boundarySource: `${NATIONS_LAYER.arcgisService} (ONS Open Geography Portal)`,
        generalisation: 'BUC (ultra generalised, clipped)',
        licence: BOUNDARY_LICENCE,
        retrievedAt: RETRIEVED_AT,
        featureCount: features.length,
      },
      features,
    });
    geographyFiles.push({ ...file, key: NATIONS_LAYER.key, featureCount: features.length });
    log(`  nations: ${features.length} features, ${(file.bytes / 1024).toFixed(0)} kB`);
  }

  for (const areaType of Object.values(AREA_TYPES)) {
    const layer = await fetchBoundaryLayer({
      service: areaType.arcgisService,
      codeField: areaType.codeField,
      nameField: areaType.nameField,
      expectedCount: areaType.expectedBoundaryCount,
    });

    // Tolerance is per-layer: coarse national overview, finer for small areas.
    // Full-resolution (BFC) sources need a coarser tolerance than pre-generalised ones.
    const tolerance = areaType.arcgisService.includes('_BFC') ? 0.004
      : areaType.level === 'nhs-region' ? 0.003
      : 0.0015;
    let partsBefore = 0;
    let partsAfter = 0;
    let coordsBefore = 0;
    let coordsAfter = 0;

    const features = layer.features.map((f) => {
      partsBefore += countParts(f.geometry);
      coordsBefore += countCoordinates(f.geometry);
      const geometry = simplifyGeometry(f.geometry, tolerance);
      partsAfter += countParts(geometry);
      coordsAfter += countCoordinates(geometry);
      return {
        ...f,
        properties: {
          ...f.properties,
          nation: nationFromCode(f.properties.code),
        },
        geometry,
      };
    });

    // Islands and other multipolygon parts must survive simplification.
    if (partsAfter !== partsBefore) {
      throw new PrepareError(
        `Simplification dropped geometry parts for ${areaType.key}: ` +
          `${partsBefore} -> ${partsAfter}. Islands would be lost.`,
        { areaType: areaType.key },
      );
    }

    const file = await writeJson(`geography/${areaType.key}.json`, {
      type: 'FeatureCollection',
      metadata: {
        key: areaType.key,
        areaTypeId: areaType.id,
        label: areaType.label,
        mode: areaType.mode,
        level: areaType.level,
        boundaryVintage: areaType.boundaryVintage,
        boundarySource: `${areaType.arcgisService} (ONS Open Geography Portal)`,
        boundaryScope: areaType.boundaryScope,
        generalisation: describeGeneralisation(areaType.arcgisService),
        simplificationToleranceDegrees: tolerance,
        licence: BOUNDARY_LICENCE,
        retrievedAt: RETRIEVED_AT,
        featureCount: features.length,
      },
      features,
    });
    geographyFiles.push({ ...file, key: areaType.key, featureCount: features.length });
    log(
      `  ${areaType.key}: ${features.length} features, ${(file.bytes / 1024).toFixed(0)} kB ` +
        `(coords ${coordsBefore}→${coordsAfter}, parts preserved: ${partsAfter})`,
    );

    // Fingertips area register for this area type — the join authority.
    const areas = await fetchAreas(areaType.id);
    areaIndexByType[areaType.id] = new Map(areas.map((a) => [a.Code, a]));
    log(`  ${areaType.key}: Fingertips lists ${areas.length} areas`);
  }

  // ------------------------------------------------------- coverage discovery
  log('Discovering per-indicator geography availability…');
  const supportedAreaTypeIds = Object.values(AREA_TYPES).map((a) => a.id);
  const discovered = [];
  for (const spec of INDICATORS) {
    const available = await fetchAvailableAreaTypes(spec.iid);
    const supported = supportedAreaTypeIds.filter((id) => available.includes(id));
    discovered.push({ ...spec, availableAreaTypeIds: available, supportedAreaTypeIds: supported });
    log(
      `  ${spec.iid}: available at [${available.join(', ')}] → supported here [${
        supported.join(', ') || 'none'
      }]`,
    );
  }

  const usable = discovered.filter((d) => d.supportedAreaTypeIds.length > 0);
  const unusable = discovered.filter((d) => d.supportedAreaTypeIds.length === 0);
  for (const d of unusable) {
    warn(
      `Indicator ${d.iid} is not published at any supported geography ` +
        `(available: ${d.availableAreaTypeIds.join(', ') || 'none'}) — excluded.`,
    );
  }
  if (usable.length < 6) {
    throw new PrepareError(
      `Only ${usable.length} indicators are usable; the release requires at least 6.`, {},
    );
  }

  // -------------------------------------------------------------- metadata
  log('Downloading indicator metadata…');
  const metadata = await fetchIndicatorMetadata(usable.map((d) => d.iid));

  // ------------------------------------------------------------ observations
  log('Downloading observations…');
  const indicators = [];
  const observationFiles = [];
  const coverageMatrix = [];
  const joinReport = { unmatchedCodes: [], boundariesWithoutData: [], declaredButEmpty: [] };

  for (const spec of usable) {
    const meta = metadata[String(spec.iid)];
    const d = meta.Descriptive;

    const indicatorRecord = {
      id: spec.iid,
      name: d.Name,
      shortName: d.SimpleName || d.Name,
      topic: spec.topic,
      topicLabel: TOPICS[spec.topic].label,
      domain: spec.domain,
      domainLabel: DOMAIN_LABELS[spec.domain] ?? spec.domain,
      definition: stripHtml(d.Definition) ?? stripHtml(d.SimpleDefinition),
      simpleDefinition: stripHtml(d.SimpleDefinition),
      rationale: stripHtml(d.Rationale),
      methodology: stripHtml(d.IndMethod),
      standardPopulation: stripHtml(d.StandardPop),
      confidenceIntervalMethod: stripHtml(d.CIMethod) ?? meta.ConfidenceIntervalMethod?.Name ?? null,
      numeratorDefinition: stripHtml(d.CountDefinition),
      numeratorSource: stripHtml(d.CountSource),
      denominatorDefinition: stripHtml(d.DenomDefinition),
      denominatorSource: stripHtml(d.DenomSource),
      disclosureControl: stripHtml(d.DiscControl),
      caveats: stripHtml(d.Caveats),
      copyright: stripHtml(d.Copyright),
      dataSource: d.DataSource ?? null,
      sourceLink: d.IndSourceLink ?? null,
      unit: meta.Unit?.Label ?? null,
      unitMultiplier: meta.Unit?.Value ?? null,
      valueType: meta.ValueType?.Name ?? null,
      yearType: meta.YearType?.Name ?? null,
      direction: spec.direction,
      countIsMeaningful: meta.ShouldCountBeDisplayed === true,
      dataQualityNote:
        meta.DataQualityNote && meta.DataQualityNote.Text !== 'None'
          ? meta.DataQualityNote.Text
          : null,
      lastUploadedAt: meta.DataChange?.LastUploadedAt ?? null,
      availableAreaTypeIds: spec.availableAreaTypeIds,
      supportedAreaTypeIds: spec.supportedAreaTypeIds,
      coverage: { nations: ['England'], note: 'Fingertips INHALE is an England-only source.' },
      licence: FINGERTIPS_LICENCE,
      retrievedAt: RETRIEVED_AT,
      geographies: {},
    };

    for (const areaTypeId of spec.supportedAreaTypeIds) {
      const areaType = AREA_TYPES[areaTypeId];
      const { url, records } = await fetchObservations({
        indicatorId: spec.iid,
        childAreaTypeId: areaTypeId,
        profileId: spec.profileId,
      });

      // `/api/available_data` is a declaration of registration, not a guarantee that
      // observations exist. Some indicators are declared at a geography but return an
      // empty result set. The declaration is therefore verified empirically here, and a
      // declared-but-empty combination is recorded as a source discrepancy rather than
      // being trusted, guessed at, or silently dropped.
      if (records.length === 0) {
        joinReport.declaredButEmpty.push({
          indicatorId: spec.iid,
          indicatorName: d.Name,
          areaTypeId,
          areaTypeKey: areaType.key,
          declaredBy: 'GET /api/available_data',
          verifiedWith: url,
          note:
            'available_data lists this geography, but the observations endpoint returns ' +
            'a header-only response. Treated as no data available.',
        });
        warn(
          `Indicator ${spec.iid} @ ${areaType.key}: declared available but returned no rows — ` +
            'recorded as a source discrepancy and excluded.',
        );
        continue;
      }

      // Split England benchmark rows from area rows.
      const benchmarkRows = [];
      const areaRows = [];
      const unmatched = new Set();
      const register = areaIndexByType[areaTypeId];

      for (const record of records) {
        const observation = normaliseObservation(record);
        if (!observation.areaCode) continue;
        // Only the aggregate (Persons / all-ages) series feeds the map; the
        // subgroup breakdowns are kept separately for the inequality chart.
        if (observation.areaCode === ENGLAND_AREA_CODE) {
          benchmarkRows.push(observation);
          continue;
        }
        if (!register.has(observation.areaCode)) {
          unmatched.add(observation.areaCode);
          continue;
        }
        areaRows.push(observation);
      }

      if (unmatched.size > 0) {
        joinReport.unmatchedCodes.push({
          indicatorId: spec.iid,
          areaTypeId,
          codes: [...unmatched].sort(),
        });
        warn(
          `Indicator ${spec.iid} @ ${areaType.key}: ${unmatched.size} area code(s) not in the ` +
            `Fingertips register for this area type — dropped: ${[...unmatched].slice(0, 5).join(', ')}`,
        );
      }

      // Distinct dimensions present, so the UI only offers what exists.
      const periods = [...new Set(areaRows.map((o) => o.period))];
      const periodOrder = new Map(areaRows.map((o) => [o.period, o.periodSortable]));
      periods.sort((a, b) => String(periodOrder.get(a)).localeCompare(String(periodOrder.get(b))));
      const sexes = [...new Set(areaRows.map((o) => o.sex))].filter(Boolean).sort();
      const ages = [...new Set(areaRows.map((o) => o.age))].filter(Boolean).sort();
      const categoryTypes = [
        ...new Set(areaRows.map((o) => o.categoryType).filter(Boolean)),
      ].sort();

      const areasWithAnyValue = new Set(
        areaRows.filter((o) => o.state === 'present').map((o) => o.areaCode),
      );

      const boundaryCodes = [...register.keys()];
      const noData = boundaryCodes.filter((c) => !areasWithAnyValue.has(c));
      if (noData.length > 0) {
        joinReport.boundariesWithoutData.push({
          indicatorId: spec.iid, areaTypeId, count: noData.length,
        });
      }

      /*
       * The primary file holds the population series the map needs by default;
       * everything else is fetched on demand.
       *
       * Most indicators publish a combined "Persons" series, so that is the
       * default and the sex breakdown is a subgroup. But some are published
       * only by sex and have no combined figure at all — life expectancy is the
       * standard example, and reporting it combined would be wrong rather than
       * merely unconventional. For those, every sex goes in the primary file,
       * because the reader has to choose one before any figure means anything
       * and the interface must be able to offer that choice immediately.
       */
      const hasPersons = sexes.includes('Persons');
      const requiresSexChoice = !hasPersons && sexes.length > 1;
      const defaultSex = hasPersons ? 'Persons' : null;

      const isPrimary = (o) => {
        if (o.categoryType !== null) return false;
        if (hasPersons) return o.sex === 'Persons';
        // No combined figure published: keep every sex in the primary file.
        return true;
      };
      const aggregateRows = areaRows.filter(isPrimary);
      const subgroupRows = areaRows.filter((o) => !isPrimary(o));

      if (aggregateRows.length === 0) {
        throw new PrepareError(
          `No primary series for indicator ${spec.iid} @ ${areaType.key}. ` +
            `Sexes present: ${sexes.join(', ') || 'none'}; ` +
            `category types: ${categoryTypes.join(', ') || 'none'}.`,
          { url },
        );
      }

      const primarySexes = [...new Set(aggregateRows.map((o) => o.sex))].filter(Boolean).sort();
      const primaryAges = [...new Set(aggregateRows.map((o) => o.age))].filter(Boolean).sort();

      const aggregatePeriods = [...new Set(aggregateRows.map((o) => o.period))];
      aggregatePeriods.sort((a, b) =>
        String(periodOrder.get(a)).localeCompare(String(periodOrder.get(b))));

      // Several indicators publish a rolling multi-year pooled series and a
      // single-year series under one indicator ID, interleaved in the same
      // response (e.g. 93963 carries both "2001 - 03" and "2001"). Pooled periods
      // are not independent annual observations, so the two are separated into
      // distinct series here and never combined into one line downstream.
      const rangeByPeriod = new Map();
      for (const row of aggregateRows) {
        if (row.periodRange) rangeByPeriod.set(row.period, row.periodRange);
      }
      const rangeKeys = [...new Set([...rangeByPeriod.values()])];
      const periodSeries = rangeKeys
        .map((range) => {
          const seriesPeriods = aggregatePeriods.filter(
            (period) => rangeByPeriod.get(period) === range,
          );
          const years = Number((/^(\d+)y$/.exec(range) ?? [])[1] ?? 1);
          return {
            range,
            years: Number.isFinite(years) ? years : 1,
            pooled: Number.isFinite(years) && years > 1,
            label:
              Number.isFinite(years) && years > 1
                ? `${years}-year pooled`
                : 'Single year',
            description:
              Number.isFinite(years) && years > 1
                ? `Rolling ${years}-year pooled periods. Consecutive periods overlap and ` +
                  'are not independent annual observations.'
                : 'Single-year periods.',
            periods: seriesPeriods,
            latestPeriod: seriesPeriods[seriesPeriods.length - 1] ?? null,
            periodCount: seriesPeriods.length,
          };
        })
        .filter((series) => series.periodCount > 0)
        // Longest pooling first: the publisher pools to stabilise small-area rates,
        // so the pooled series is the safer default where one exists.
        .sort((a, b) => b.years - a.years);

      if (periodSeries.length === 0) {
        throw new PrepareError(
          `No period range metadata for indicator ${spec.iid} @ ${areaType.key}; ` +
            'cannot establish whether periods are pooled.',
          { url },
        );
      }
      const defaultPeriodSeries = periodSeries[0].range;

      const fileName = `observations/${spec.iid}-${areaType.key}.json`;
      const file = await writeJson(fileName, {
        schemaVersion: DATA_SCHEMA_VERSION,
        indicatorId: spec.iid,
        areaTypeId,
        areaTypeKey: areaType.key,
        sourceUrl: url,
        retrievedAt: RETRIEVED_AT,
        periods: aggregatePeriods,
        periodRangeByPeriod: Object.fromEntries(rangeByPeriod),
        periodSeries,
        defaultPeriodSeries,
        sex: defaultSex ?? primarySexes[0],
        age: primaryAges[0],
        defaultSex,
        requiresSexChoice,
        primarySexes,
        primaryAges,
        benchmark: {
          areaCode: ENGLAND_AREA_CODE,
          areaName: 'England',
          areaTypeId: ENGLAND_AREA_TYPE_ID,
          label: 'England',
          data: encodeObservations(benchmarkRows.filter(isPrimary)),
        },
        data: encodeObservations(aggregateRows),
      });
      observationFiles.push({ ...file, indicatorId: spec.iid, areaTypeKey: areaType.key });

      let subgroupFile = null;
      if (subgroupRows.length > 0) {
        const subgroupName = `observations/${spec.iid}-${areaType.key}-subgroups.json`;
        subgroupFile = await writeJson(subgroupName, {
          schemaVersion: DATA_SCHEMA_VERSION,
          indicatorId: spec.iid,
          areaTypeId,
          areaTypeKey: areaType.key,
          sourceUrl: url,
          retrievedAt: RETRIEVED_AT,
          data: encodeObservations(subgroupRows),
          benchmark: { areaCode: ENGLAND_AREA_CODE, label: 'England',
            data: encodeObservations(benchmarkRows.filter((o) => !isPrimary(o))) },
        });
        observationFiles.push({ ...subgroupFile, indicatorId: spec.iid,
          areaTypeKey: areaType.key, kind: 'subgroups' });
      }

      indicatorRecord.geographies[areaType.key] = {
        areaTypeId,
        areaTypeKey: areaType.key,
        mode: areaType.mode,
        label: areaType.label,
        boundaryVintage: areaType.boundaryVintage,
        file: fileName,
        subgroupFile: subgroupFile ? subgroupFile.path : null,
        periods: aggregatePeriods,
        periodSeries: periodSeries.map((series) => ({
          range: series.range, years: series.years, pooled: series.pooled,
          label: series.label, periodCount: series.periodCount,
          latestPeriod: series.latestPeriod,
        })),
        defaultPeriodSeries,
        mixesPooledAndSingleYear: periodSeries.length > 1,
        latestPeriod:
          (periodSeries.find((x) => x.range === defaultPeriodSeries) ?? periodSeries[0])
            .latestPeriod,
        aggregateSex: defaultSex ?? primarySexes[0],
        aggregateAge: primaryAges[0],
        defaultSex,
        requiresSexChoice,
        primarySexes,
        primaryAges,
        sexes,
        ages,
        categoryTypes,
        subgroupRowCount: subgroupRows.length,
        areaCount: register.size,
        areasWithValue: areasWithAnyValue.size,
        observationCount: aggregateRows.length,
        totalRowCount: areaRows.length,
        hasBenchmark: benchmarkRows.length > 0,
        hasConfidenceIntervals: aggregateRows.some(
          (o) => o.lowerCi95 != null && o.upperCi95 != null,
        ),
        hasSignificanceFlags: aggregateRows.some((o) => o.significance !== 'not-compared'),
        hasTrendFlags: aggregateRows.some((o) => o.trend !== 'not-available'),
        suppressedCount: aggregateRows.filter((o) => o.state === 'suppressed').length,
        missingCount: aggregateRows.filter((o) => o.state === 'missing').length,
      };

      log(
        `  ${spec.iid} @ ${areaType.key}: ${aggregateRows.length} primary obs ` +
          `[${primarySexes.join('/')}]${requiresSexChoice ? ' (no combined figure)' : ''} ` +
          `(+${subgroupRows.length} subgroup), ${aggregatePeriods.length} periods, ` +
          `CI:${indicatorRecord.geographies[areaType.key].hasConfidenceIntervals} ` +
          `sig:${indicatorRecord.geographies[areaType.key].hasSignificanceFlags}`,
      );
    }

    if (Object.keys(indicatorRecord.geographies).length === 0) {
      unusable.push({
        iid: spec.iid,
        availableAreaTypeIds: spec.availableAreaTypeIds,
        verifiedEmpty: true,
      });
      warn(
        `Indicator ${spec.iid} ("${d.Name}") yielded no observations at any supported ` +
          'geography despite being declared available — excluded from the release.',
      );
      continue;
    }

    // Coverage matrix: indicator × nation × geography × period.
    for (const areaType of Object.values(AREA_TYPES)) {
      const geo = indicatorRecord.geographies[areaType.key];
      for (const nation of ['England', 'Scotland', 'Wales', 'Northern Ireland']) {
        let status;
        if (nation !== 'England') {
          status = areaType.boundaryScope === 'UK'
            ? 'boundary-only'      // we can draw it, but this dataset does not cover it
            : 'not-applicable';    // the geography itself does not exist there
        } else if (!geo) {
          status = 'no-data';      // indicator not published at this geography
        } else {
          status = 'data';
        }
        coverageMatrix.push({
          indicatorId: spec.iid,
          indicatorName: d.Name,
          topic: spec.topic,
          nation,
          areaTypeKey: areaType.key,
          areaTypeLabel: areaType.label,
          mode: areaType.mode,
          status,
          periods: status === 'data' ? geo.periods : [],
          latestPeriod: status === 'data' ? geo.latestPeriod : null,
        });
      }
    }

    indicators.push(indicatorRecord);
  }

  // --------------------------------------------------------------- search
  log('Building search index…');
  const searchEntries = [];
  for (const areaType of Object.values(AREA_TYPES)) {
    const register = areaIndexByType[areaType.id];
    for (const [code, area] of register) {
      searchEntries.push({
        kind: 'area',
        code,
        name: area.Name,
        nation: nationFromCode(code),
        areaTypeKey: areaType.key,
        areaTypeId: areaType.id,
        areaTypeLabel: areaType.label,
        mode: areaType.mode,
      });
    }
  }
  for (const f of nations.features) {
    searchEntries.push({
      kind: 'nation',
      code: f.properties.code,
      name: f.properties.name,
      nation: f.properties.name,
      areaTypeKey: 'nations',
      areaTypeId: null,
      areaTypeLabel: 'UK nations',
      mode: 'both',
    });
  }
  // Settlements: searchable place names that resolve to a containing area.
  const settlements = await fetchSettlements();
  log(`  ${settlements.length} built-up areas retrieved`);

  const adminLayer = JSON.parse(
    await readFile(join(OUT, 'geography', AREA_TYPES[502].key + '.json'), 'utf8'),
  );
  const nhsLayer = JSON.parse(
    await readFile(join(OUT, 'geography', AREA_TYPES[221].key + '.json'), 'utf8'),
  );
  const admin = assignContainment(settlements, adminLayer.features);
  const nhs = assignContainment(settlements, nhsLayer.features);
  log(
    `  settlement containment: ${admin.resolved.size} resolved to an administrative area, ` +
      `${admin.unresolved.length} unresolved; ${nhs.resolved.size} resolved to an ICB`,
  );

  // Settlements ship in their own file. The full index is ~5 MB, which would be
  // a large download on first paint for a feature only used once someone types
  // in the search box, so the client fetches it lazily. Fields are kept short
  // for the same reason; nation and labels are derivable on the client.
  const settlementEntries = [];
  for (const settlement of settlements) {
    const adminArea = admin.resolved.get(settlement.code);
    const nhsArea = nhs.resolved.get(settlement.code);
    // A settlement whose centroid falls in no polygon is left out rather than
    // snapped to a nearest guess.
    if (adminArea) {
      settlementEntries.push({
        n: settlement.name,
        c: settlement.code,
        m: 'administrative',
        k: AREA_TYPES[502].key,
        bc: adminArea.code,
        bn: adminArea.name,
      });
    }
    if (nhsArea) {
      settlementEntries.push({
        n: settlement.name,
        c: settlement.code,
        m: 'nhs',
        k: AREA_TYPES[221].key,
        bc: nhsArea.code,
        bn: nhsArea.name,
      });
    }
  }

  const settlementFile = await writeJson('search/settlements.json', {
    retrievedAt: RETRIEVED_AT,
    source: BUA_SOURCE,
    settlementCount: settlements.length,
    unresolvedCount: admin.unresolved.length,
    entryCount: settlementEntries.length,
    entries: settlementEntries,
  });

  const searchFile = await writeJson('search/areas.json', {
    retrievedAt: RETRIEVED_AT,
    entryCount: searchEntries.length,
    settlementSource: {
      name: BUA_SOURCE.name,
      url: BUA_SOURCE.url,
      licence: BUA_SOURCE.licence,
    },
    settlementFile: 'search/settlements.json',
    entries: searchEntries,
  });
  log(
    `  ${searchEntries.length} area entries (${(searchFile.bytes / 1024).toFixed(0)} kB) + ` +
      `${settlementEntries.length} settlement entries ` +
      `(${(settlementFile.bytes / 1024 / 1024).toFixed(2)} MB, lazy-loaded)`,
  );

  // -------------------------------------------------------------- manifest
  const manifest = {
    schemaVersion: DATA_SCHEMA_VERSION,
    generatedAt: RETRIEVED_AT,
    dataKind: 'real',
    /*
     * Every source profile actually drawn on, derived from the indicators that
     * survived verification. The release used to come from one profile and the
     * manifest named it; now that it spans several, naming only the first would
     * misdescribe the dataset on the front page.
     */
    profile: { id: profile.Id, name: profile.Name, key: profile.Key },
    sourceProfiles: [...new Set(usable.map((d) => d.profileId))]
      .sort((a, b) => a - b)
      .map((id) => {
        const match = profiles.find((candidate) => candidate.Id === id);
        return { id, name: match?.Name ?? `Profile ${id}`, key: match?.Key ?? String(id) };
      }),
    coverage: {
      nationsWithData: ['England'],
      nationsVisibleWithoutData: ['Scotland', 'Wales', 'Northern Ireland'],
      benchmark: { areaCode: ENGLAND_AREA_CODE, label: 'England', scope: 'England' },
      statement:
        `Every indicator in this release comes from OHID Fingertips, across ` +
        `${[...new Set(usable.map((d) => d.profileId))].length} published profiles. ` +
        'Fingertips publishes England only, so Scotland, Wales and Northern Ireland remain ' +
        'navigable but are shown as not covered by this dataset, and no UK-wide benchmark is ' +
        'computed anywhere.',
    },
    geographyModes: {
      administrative: {
        label: 'Administrative geography',
        description:
          "UK nations and England's mixed upper-tier local government structure " +
          '(counties, metropolitan districts, London boroughs and unitary authorities as siblings).',
        levels: Object.values(AREA_TYPES)
          .filter((a) => a.mode === 'administrative')
          .map((a) => a.key),
      },
      nhs: {
        label: 'NHS geography',
        description:
          'NHS England regions and integrated care boards. England only. This tree is ' +
          'independent of the administrative tree: an ICB is not a child of a local authority ' +
          'and a local authority is not a child of an ICB.',
        levels: Object.values(AREA_TYPES).filter((a) => a.mode === 'nhs').map((a) => a.key),
      },
    },
    areaTypes: Object.fromEntries(
      Object.values(AREA_TYPES).map((a) => [
        a.key,
        {
          key: a.key, areaTypeId: a.id, mode: a.mode, level: a.level, label: a.label,
          shortLabel: a.shortLabel, boundaryVintage: a.boundaryVintage,
          boundaryScope: a.boundaryScope, dataScope: a.dataScope,
          boundarySource: a.arcgisService, file: `geography/${a.key}.json`,
        },
      ]),
    ),
    nationsLayer: { key: NATIONS_LAYER.key, file: 'geography/nations.json',
      boundaryVintage: NATIONS_LAYER.boundaryVintage },
    indicators: indicators.map((i) => ({
      id: i.id, name: i.name, shortName: i.shortName,
      topic: i.topic, topicLabel: i.topicLabel,
      domain: i.domain,
      domainLabel: i.domainLabel, unit: i.unit, valueType: i.valueType,
      yearType: i.yearType, direction: i.direction,
      geographies: Object.keys(i.geographies),
      latestPeriodByGeography: Object.fromEntries(
        Object.entries(i.geographies).map(([k, g]) => [k, g.latestPeriod]),
      ),
    })),
    topics: Object.fromEntries(
      Object.values(TOPICS).map((topic) => [
        topic.key,
        {
          ...topic,
          // Only topics that actually ended up with a published indicator are
          // offered; a topic whose candidates all failed verification would
          // otherwise appear in the interface as an empty promise.
          indicatorCount: indicators.filter((i) => i.topic === topic.key).length,
        },
      ]).filter(([, topic]) => topic.indicatorCount > 0),
    ),
    domains: DOMAIN_LABELS,
    excludedIndicators: unusable.map((d) => ({
      id: d.iid,
      reason: d.verifiedEmpty
        ? 'Declared available by /api/available_data, but the observations endpoint returns ' +
          'no rows at any supported geography. Verified empirically at prepare time.'
        : 'Not published at any geography supported by this release.',
      availableAreaTypeIds: d.availableAreaTypeIds,
      verifiedEmpty: d.verifiedEmpty === true,
    })),
    licences: { observations: FINGERTIPS_LICENCE, boundaries: BOUNDARY_LICENCE },
    sources: {
      fingertips: { api: FINGERTIPS_BASE, profileUrl: 'https://fingertips.phe.org.uk/profile/inhale' },
      ons: { portal: BOUNDARY_LICENCE.publisherUrl },
    },
    files: {
      indicators: 'indicators/index.json',
      coverage: 'coverage.json',
      search: 'search/areas.json',
      joinReport: 'join-report.json',
    },
    assetSizes: {
      geography: geographyFiles,
      observations: observationFiles,
      search: searchFile,
    },
  };

  await writeJson('indicators/index.json', { schemaVersion: DATA_SCHEMA_VERSION, indicators });
  await writeJson('coverage.json', {
    schemaVersion: DATA_SCHEMA_VERSION,
    generatedAt: RETRIEVED_AT,
    legend: {
      data: 'Indicator data available and comparable at this geography.',
      'no-data': 'This geography exists, but the indicator is not published for it.',
      'boundary-only': 'Boundary available for navigation; this dataset does not cover this nation.',
      'not-applicable': 'This geography type does not exist in this nation.',
      suppressed: 'Value withheld by the publisher under disclosure control.',
    },
    matrix: coverageMatrix,
  });
  await writeJson('join-report.json', {
    schemaVersion: DATA_SCHEMA_VERSION,
    generatedAt: RETRIEVED_AT,
    ...joinReport,
  });
  await writeJson('manifest.json', manifest);

  const totalBytes =
    [...geographyFiles, ...observationFiles, searchFile].reduce((n, f) => n + f.bytes, 0);
  log(
    `Done in ${((Date.now() - startedAt) / 1000).toFixed(1)}s — ` +
      `${indicators.length} indicators, ${observationFiles.length} observation files, ` +
      `${(totalBytes / 1024 / 1024).toFixed(2)} MB total`,
  );
  if (joinReport.unmatchedCodes.length > 0) {
    warn(`${joinReport.unmatchedCodes.length} indicator/geography pair(s) had unmatched codes — see join-report.json`);
  }
}

main().catch((error) => {
  console.error('\n[prepare] FAILED');
  console.error(error.message);
  if (error.context) console.error('context:', JSON.stringify(error.context, null, 2));
  process.exitCode = 1;
});
