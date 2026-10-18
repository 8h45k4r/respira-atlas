import { isPresent } from '@/data/schemas/observation';
import { formatValue, formatWithUnit, unitLabel } from '@/data/selectors/format';
import {
  summariseRange, summariseSignificance, summariseAvailability,
  summarisePrecision, summariseExtremeOverlap, pairAreas, summariseGroupGap,
  formatShare, formatRatio,
} from './computations';
import type { StorySpec, StoryContent, StoryStep, StoryUnavailable } from './types';

/**
 * Evidence stories.
 *
 * Each story authors a question, a frame and the caveats. Not one of them
 * authors a number: every figure in the prose is computed from the observations
 * at render time, and a story whose computation cannot be satisfied reports
 * that it is unavailable rather than falling back on a remembered result.
 *
 * Each exists to make one methodological point that a map alone makes badly.
 */

const unavailable = (reason: string): StoryUnavailable => ({ unavailable: true, reason });

/**
 * Areas within the covered nation.
 *
 * The boundary layer is UK-wide while the data are England-only, so the total
 * number of polygons is the wrong denominator for "how many areas have a
 * figure" — it would quietly count Scotland, Wales and Northern Ireland as
 * missing English data.
 */
function englandAreas(data: { registry: { all: () => { nation: string }[] } }): number {
  return data.registry.all().filter((area) => area.nation === 'England').length;
}

/* ------------------------------------------------------------------------ */
/* 1. A wide range that is mostly not a difference                           */
/* ------------------------------------------------------------------------ */

const variationVsEvidence: StorySpec = {
  id: 'variation-vs-evidence',
  title: 'A wide range, and mostly no difference',
  question: 'When a map shows a big spread between places, how much of it is real?',
  standfirst:
    'Choropleth maps are built to show variation, so they always show some. This ' +
    'story takes a measure with a striking range and asks how much of that range ' +
    'the publisher is actually willing to call a difference.',
  teaches: 'The size of a difference and the evidence for it are separate quantities.',
  requires: [{ indicatorId: 90801, areaTypeKey: 'ctyua23', as: 'childMortality' }],

  build(context): StoryContent | StoryUnavailable {
    const data = context.datasets.childMortality;
    if (!data) return unavailable('The child mortality data could not be loaded.');

    const range = summariseRange(data.current);
    const significance = summariseSignificance(data.current);
    const precision = summarisePrecision(data.current);
    const overlap = summariseExtremeOverlap(data.current);

    if (!range || significance.compared === 0) {
      return unavailable(
        'This release no longer carries enough compared observations for this story.',
      );
    }

    const { indicator } = data;
    const name = (code: string) => context.areaName(code);
    const steps: StoryStep[] = [];

    steps.push({
      heading: 'What the map shows',
      body:
        `Across ${range.count} ${data.areaType.label.toLowerCase()} with a published ` +
        `figure for ${data.periodLabel}, ${indicator.shortName.toLowerCase()} ranges from ` +
        `${formatWithUnit(range.lowest.value, indicator)} in ${name(range.lowest.areaCode)} ` +
        `to ${formatWithUnit(range.highest.value, indicator)} in ${name(range.highest.areaCode)}` +
        (range.ratio !== null
          ? `, a ${formatRatio(range.ratio)} difference between the extremes.`
          : '.') +
        ` The median is ${formatWithUnit(range.median, indicator)}.`,
      figure: {
        kind: 'map',
        dataset: 'childMortality',
        caption: `${indicator.name}, ${data.areaType.label}, ${data.periodLabel}.`,
      },
      note:
        'Read on its own, that range invites a search for what the highest areas are ' +
        'doing wrong. The next step is why that reading does not survive contact with ' +
        'the uncertainty.',
    });

    steps.push({
      heading: 'How much of it the publisher calls a difference',
      body:
        `The publisher compares each area with England and supplies its own flag. Of the ` +
        `${significance.compared} areas it compared, ${significance.indistinguishable} — ` +
        `${significance.indistinguishableShare !== null
          ? formatShare(significance.indistinguishableShare)
          : 'most'} of them — are recorded as not statistically different from England. ` +
        `Only ${significance.differentFromBenchmark} ` +
        `${significance.differentFromBenchmark === 1 ? 'area is' : 'areas are'} flagged as ` +
        `different: ${significance.counts.worse} worse and ${significance.counts.better} better.`,
      note:
        'These are the publisher’s flags, reproduced as supplied. This atlas computes no ' +
        'significance test of its own.',
    });

    if (precision.medianRelativeWidth !== null && precision.widest) {
      steps.push({
        heading: 'Why so few differences survive',
        body:
          `The estimates are imprecise. The median 95% confidence interval spans ` +
          `${precision.medianRelativeWidth.toFixed(0)}% of the estimate itself, and for ` +
          `${name(precision.widest.areaCode)} it spans ` +
          `${precision.widest.relativeWidth.toFixed(0)}%. These are counts of rare events in ` +
          `populations of a few hundred thousand, so a handful of deaths moves the rate a ` +
          `long way.`,
        figure: {
          kind: 'dot-whisker',
          dataset: 'childMortality',
          areaCodes: [range.lowest.areaCode, range.highest.areaCode],
          caption:
            `The two extremes of the distribution, with their published 95% intervals.`,
        },
        note:
          overlap.extremesOverlap === true
            ? 'The intervals for the highest and lowest areas overlap. That is a description ' +
              'of the intervals, not a significance test — but it does mean the data are ' +
              'consistent with no real difference even between the two ends of the map.'
            : overlap.extremesOverlap === false
              ? 'The intervals for the highest and lowest areas do not overlap. Non-overlap is ' +
                'not proof of a difference, but the ends of this distribution are better ' +
                'separated than the middle, where almost all areas sit.'
              : 'No intervals are published for the extremes, so their precision cannot be assessed.',
      });
    }

    return {
      setup: {
        measure: `${indicator.name} (${unitLabel(indicator)})`,
        population: `${data.sex}, ${indicator.geographies[data.areaType.key]?.aggregateAge ?? 'as published'}`,
        place:
          `${range.count} of ${englandAreas(data)} English ` +
          `${data.areaType.label.toLowerCase()} with a published figure`,
        period: data.periodLabel,
        source: indicator.dataSource ?? 'Not stated',
      },
      steps,
      cannotConclude: [
        'That the areas flagged as different are performing worse. The flag describes the ' +
          'figure, not the service.',
        'That the ranking means anything in the middle of the distribution, where the ' +
          'publisher could not separate areas from England at all.',
        'Anything about why the figure differs. This is a descriptive rate with no ' +
          'adjustment beyond what the publisher applied.',
      ],
      furtherQuestions: [
        'Does the same pattern appear in the earlier periods of this series, or is this one unusual?',
        'Do the areas flagged as different stay flagged across periods, or do they move in and out?',
        'What do the underlying counts look like, and how many events separate the extremes?',
      ],
      liveView: {
        mode: 'explore',
        topic: indicator.topic,
        indicatorId: indicator.id,
        areaTypeKey: data.areaType.key,
        period: data.period,
      },
    };
  },
};

/* ------------------------------------------------------------------------ */
/* 2. Reading the blank spaces                                               */
/* ------------------------------------------------------------------------ */

const readingAbsence: StorySpec = {
  id: 'reading-absence',
  title: 'What a blank space on the map means',
  question: 'An area has no colour. Is that good news, bad news, or no news?',
  standfirst:
    'Absence on a choropleth has at least four different causes, and they mean ' +
    'completely different things. This story works through the ones present in this ' +
    'release, using the measure that has the most of them.',
  teaches: 'Missing, suppressed, out-of-coverage and zero are four different states.',
  requires: [
    { indicatorId: 90801, areaTypeKey: 'ctyua23', as: 'childMortality' },
    { indicatorId: 92443, areaTypeKey: 'ctyua23', as: 'smoking' },
  ],

  build(context): StoryContent | StoryUnavailable {
    const data = context.datasets.childMortality;
    const smoking = context.datasets.smoking;
    if (!data || !smoking) return unavailable('The data for this story could not be loaded.');

    const availability = summariseAvailability(data.current);
    const smokingAvailability = summariseAvailability(smoking.current);
    const outsideCoverage = data.registry
      .all()
      .filter((areaRecord) => areaRecord.nation !== 'England').length;

    const steps: StoryStep[] = [];
    const { indicator } = data;

    steps.push({
      heading: 'Suppressed is not low',
      body:
        `For ${indicator.shortName.toLowerCase()} in ${data.periodLabel}, ` +
        `${availability.suppressed} of ${availability.total} areas have no published ` +
        `figure because the publisher withheld it` +
        (availability.suppressionNote
          ? `: “${availability.suppressionNote}”.`
          : ' under disclosure control.') +
        ` Suppression happens where the counts are smallest. An area withheld for small ` +
        `numbers is not an area with a low rate — it is an area the publisher will not ` +
        `put a number on.`,
      figure: {
        kind: 'map',
        dataset: 'childMortality',
        caption:
          `Suppressed areas are hatched, not shaded. They sit outside the colour scale ` +
          `entirely so they cannot be read as a low value.`,
      },
    });

    steps.push({
      heading: 'Not covered is not zero',
      body:
        `${outsideCoverage} of the ${data.registry.size} areas on this map are in Scotland, ` +
        `Wales or Northern Ireland. Every indicator in this release comes from an ` +
        `England-only source, so none of them has a figure for any of those areas — not a ` +
        `low figure, no figure. They stay on the map because the United Kingdom does not ` +
        `stop at the English border, and they are drawn in a distinct style that is not ` +
        `part of the value scale.`,
      note:
        'For the same reason no UK-wide benchmark is computed anywhere in this atlas. ' +
        'Averaging England-only values and calling the result a UK figure would be wrong.',
    });

    if (smokingAvailability.zeroValues > 0) {
      const zeroArea = smoking.current.find((o) => isPresent(o) && o.value === 0);
      steps.push({
        heading: 'And zero is a real value',
        body:
          `${smoking.indicator.shortName} in ${smoking.periodLabel} has ` +
          `${smokingAvailability.zeroValues} area with a published value of exactly zero` +
          (zeroArea ? `: ${context.areaName(zeroArea.areaCode)}.` : '.') +
          ` That is a measurement, not a gap, and it is coloured on the scale like any ` +
          `other value. A survey estimate of zero in a very small resident population is ` +
          `also a reminder to look at the interval before reading anything into it.`,
        note:
          'This is why the data table states availability in its own column: a blank cell ' +
          'always has a stated reason beside it, and can never be read as a zero.',
      });
    }

    steps.push({
      heading: 'What that leaves',
      body:
        `Of the ${data.registry.size} areas drawn on this map, ${availability.total} are in ` +
        `England and have an observation of some kind: ${availability.present} carry a ` +
        `published figure, ${availability.suppressed} are suppressed and ` +
        `${availability.missing} have no value published. The remaining ${outsideCoverage} ` +
        `are outside the dataset's coverage entirely. Only the first group belongs in a ` +
        `comparison — and that is ${availability.present} of ${data.registry.size}, not ` +
        `a map that is nearly complete.`,
    });

    return {
      setup: {
        measure: `${indicator.name}; ${smoking.indicator.name}`,
        population: `${data.sex}, as published`,
        place: `${data.registry.size} ${data.areaType.label.toLowerCase()}, UK map with England-only data`,
        period: `${data.periodLabel}; ${smoking.periodLabel}`,
        source: indicator.dataSource ?? 'Not stated',
      },
      steps,
      cannotConclude: [
        'That a suppressed area is doing well or badly. Suppression carries no information ' +
          'about the direction of the figure.',
        'That the devolved nations have no data on these measures. They are not in this ' +
          'source; other publishers cover them, with their own definitions.',
      ],
      furtherQuestions: [
        'Which areas are suppressed repeatedly across periods, and what does that say about ' +
          'how usable this measure is for them?',
        'Is a larger geography — a region, or a pooled period — available where the local ' +
          'figure is suppressed?',
      ],
      liveView: {
        mode: 'explore',
        topic: indicator.topic,
        indicatorId: indicator.id,
        areaTypeKey: data.areaType.key,
        period: data.period,
      },
    };
  },
};

/* ------------------------------------------------------------------------ */
/* 3. Two measures across the same places                                    */
/* ------------------------------------------------------------------------ */

const twoMeasures: StorySpec = {
  id: 'two-measures',
  title: 'Two measures, the same places',
  question:
    'Two area-level measures move together. What does that tell us, and what does it not?',
  standfirst:
    'Plotting two indicators against each other is the quickest way to suggest a cause ' +
    'and the easiest way to be wrong about one. This story does the plot and then is ' +
    'precise about what it can support.',
  teaches: 'An association between areas is not an association between people.',
  requires: [
    { indicatorId: 93700, areaTypeKey: 'ctyua23', as: 'childPoverty' },
    { indicatorId: 90323, areaTypeKey: 'ctyua23', as: 'childObesity' },
  ],

  build(context): StoryContent | StoryUnavailable {
    const x = context.datasets.childPoverty;
    const y = context.datasets.childObesity;
    if (!x || !y) return unavailable('The data for this story could not be loaded.');

    const paired = pairAreas(
      x.observations.observations,
      y.observations.observations,
      x.observations.periods,
      y.observations.periods,
    );
    if (!paired || paired.pairs.length < 10) {
      return unavailable(
        'These two measures no longer share a period with enough areas in common, so the ' +
          'comparison is not drawn.',
      );
    }

    const xRange = summariseRange(
      x.observations.observations.filter((o) => o.period === paired.period),
    );
    const yRange = summariseRange(
      y.observations.observations.filter((o) => o.period === paired.period),
    );

    const steps: StoryStep[] = [];

    steps.push({
      heading: 'The two measures',
      body:
        `${x.indicator.shortName} ranges from ` +
        `${xRange ? formatWithUnit(xRange.lowest.value, x.indicator) : 'its lowest'} to ` +
        `${xRange ? formatWithUnit(xRange.highest.value, x.indicator) : 'its highest'} ` +
        `across ${x.areaType.label.toLowerCase()} in ${paired.period}. ` +
        `${y.indicator.shortName} ranges from ` +
        `${yRange ? formatWithUnit(yRange.lowest.value, y.indicator) : 'its lowest'} to ` +
        `${yRange ? formatWithUnit(yRange.highest.value, y.indicator) : 'its highest'} ` +
        `over the same areas and period.`,
    });

    steps.push({
      heading: 'Plotted against each other',
      body:
        `${paired.pairs.length} areas have a published value for both measures in ` +
        `${paired.period}` +
        (paired.onlyX + paired.onlyY > 0
          ? `; ${paired.onlyX + paired.onlyY} have one but not the other and are not plotted.`
          : '.') +
        ` Both axes are the same period and the same geography, which is the minimum ` +
        `needed before the two can appear on one chart at all.`,
      figure: {
        kind: 'scatter',
        xDataset: 'childPoverty',
        yDataset: 'childObesity',
        period: paired.period,
        caption:
          `${y.indicator.shortName} against ${x.indicator.shortName}, ` +
          `${x.areaType.label}, ${paired.period}.`,
      },
      note:
        'No trend line and no correlation coefficient is drawn. Either would invite the ' +
        'reading this chart cannot support.',
    });

    steps.push({
      heading: 'What the chart is, and is not, evidence of',
      body:
        `Each point is an area, not a child. If areas with more children in low-income ` +
        `families also record more obesity at year 6, that is a statement about areas. It ` +
        `does not establish that the children in low-income families are the children ` +
        `recorded as obese — that inference requires individual-level data, and drawing ` +
        `it from area averages is the ecological fallacy.`,
      note:
        'Both measures are also collected differently: one is an administrative estimate ' +
        'of family income, the other a measured height and weight in schools, with its own ' +
        'participation rate.',
    });

    return {
      setup: {
        measure: `${y.indicator.name} against ${x.indicator.name}`,
        population: 'Children, as defined by each measure',
        place: `${paired.pairs.length} ${x.areaType.label.toLowerCase()}, England`,
        period: paired.period,
        source: `${x.indicator.dataSource ?? 'Not stated'}; ${y.indicator.dataSource ?? 'Not stated'}`,
      },
      steps,
      cannotConclude: [
        'That one measure causes the other. Nothing in this chart separates cause from ' +
          'confounding or from reverse direction.',
        'That an individual child in a low-income family is more likely to be obese. The ' +
          'chart contains no individual-level information at all.',
        'That intervening on one would shift the other. That requires evidence of effect, ' +
          'which this atlas does not contain.',
      ],
      furtherQuestions: [
        'Does the relationship hold within regions, or is it driven by differences between them?',
        'What does the individual-level literature say, and does it point the same way?',
        'How complete is the measurement programme in the areas at each end of the chart?',
      ],
      liveView: {
        mode: 'explore',
        topic: y.indicator.topic,
        indicatorId: y.indicator.id,
        scatterIndicatorId: x.indicator.id,
        areaTypeKey: y.areaType.key,
        period: paired.period,
      },
    };
  },
};

/* ------------------------------------------------------------------------ */
/* 4. When there is no single number                                         */
/* ------------------------------------------------------------------------ */

const noSingleNumber: StorySpec = {
  id: 'no-single-number',
  title: 'When there is no single number',
  question: 'What happens when a measure has no combined figure at all?',
  standfirst:
    'Most indicators publish one headline figure for everyone. Life expectancy does ' +
    'not, and the reason is not an oversight. This story is about what a product owes ' +
    'the reader when the data refuse to be summarised.',
  teaches: 'A population definition is an analytical choice, not a default.',
  requires: [{ indicatorId: 90366, areaTypeKey: 'ctyua23', as: 'lifeExpectancy' }],

  build(context): StoryContent | StoryUnavailable {
    const data = context.datasets.lifeExpectancy;
    if (!data) return unavailable('The life expectancy data could not be loaded.');

    const sexes = data.observations.primarySexes;
    if (!data.observations.requiresSexChoice || sexes.length < 2) {
      return unavailable(
        'This measure now publishes a combined series, so the story no longer applies.',
      );
    }

    const england = data.observations.benchmark.observations.filter(
      (o) => o.period === data.period,
    );
    const gap = summariseGroupGap(england);
    const precision = summarisePrecision(data.current);

    const steps: StoryStep[] = [];
    const { indicator } = data;

    steps.push({
      heading: 'There is no combined figure to show',
      body:
        `${indicator.shortName} is published separately for ${sexes.join(' and ')}, with no ` +
        `combined series. The atlas therefore cannot open on a single map of it: before ` +
        `anything can be drawn, the reader has to choose a population, and the interface ` +
        `says so rather than quietly picking one.`,
      note:
        'Combining the two would not be a presentational simplification. It would be a ' +
        'different and less meaningful quantity, dependent on the sex composition of each area.',
    });

    if (gap) {
      steps.push({
        heading: 'How far apart the groups are',
        body:
          `For England in ${data.periodLabel}, ${indicator.shortName.toLowerCase()} is ` +
          `${formatWithUnit(gap.highest.value, indicator)} for ${gap.highest.group} and ` +
          `${formatWithUnit(gap.lowest.value, indicator)} for ${gap.lowest.group}, a gap of ` +
          `${formatValue(gap.gap, indicator)} ${unitLabel(indicator)}.` +
          (gap.intervalsOverlap === false
            ? ' The published intervals for the two groups do not overlap.'
            : gap.intervalsOverlap === true
              ? ' The published intervals for the two groups overlap.'
              : ''),
        figure: {
          kind: 'groups',
          dataset: 'lifeExpectancy',
          areaCode: 'E92000001',
          caption: `${indicator.name} by recorded sex, England, ${data.periodLabel}.`,
        },
        note:
          'These are the publisher’s recorded sex categories. They are not gender identity, ' +
          'and the atlas does not relabel them as though they were.',
      });
    }

    if (precision.medianRelativeWidth !== null) {
      steps.push({
        heading: 'A precise measure, unusually',
        body:
          `Across ${precision.withInterval} areas, the median 95% interval for this measure ` +
          `spans ${precision.medianRelativeWidth.toFixed(1)}% of the estimate. That is far ` +
          `tighter than most measures in this atlas, because life expectancy is built from ` +
          `every death in an area rather than from a rare subset. Precision varies enormously ` +
          `between indicators, and it is the first thing to check before comparing places.`,
        figure: {
          kind: 'map',
          dataset: 'lifeExpectancy',
          caption: `${indicator.name}, ${data.sex}, ${data.areaType.label}, ${data.periodLabel}.`,
        },
      });
    }

    return {
      setup: {
        measure: `${indicator.name} (${unitLabel(indicator)})`,
        population: `Published separately for ${sexes.join(' and ')}; currently showing ${data.sex}`,
        place: `${englandAreas(data)} English ${data.areaType.label.toLowerCase()}`,
        period: data.periodLabel,
        source: indicator.dataSource ?? 'Not stated',
      },
      steps,
      cannotConclude: [
        'That the gap between the groups is explained by sex. These groups differ in ' +
          'occupation, behaviour, income and much else; the label names the split, not the cause.',
        'That a combined figure would be a reasonable summary. It would depend on the sex ' +
          'composition of each area as much as on anyone’s survival.',
      ],
      furtherQuestions: [
        'Has the gap between the groups narrowed or widened across the periods in this series?',
        'Does the size of the gap itself vary between areas, and does it track deprivation?',
        'Which other measures in this atlas are published without a combined figure, and why?',
      ],
      liveView: {
        mode: 'explore',
        topic: indicator.topic,
        indicatorId: indicator.id,
        areaTypeKey: data.areaType.key,
        period: data.period,
        sex: data.sex,
      },
    };
  },
};

export const STORIES: readonly StorySpec[] = [
  variationVsEvidence,
  readingAbsence,
  twoMeasures,
  noSingleNumber,
];
