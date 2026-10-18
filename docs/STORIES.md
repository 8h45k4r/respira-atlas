# Evidence stories

Four stories, each taking a question these data can genuinely speak to and
working it end to end.

## The rule they are built on

**The framing is authored. The numbers never are.**

A story declares the indicators and geographies it needs. At render time it
receives the loaded observations and computes every figure it quotes. There is
no step at which a number is written into prose by hand, and no cached result
to fall back on.

The consequence is that a story cannot drift away from the data it describes.
When the dataset is refreshed, the stories re-compute. If a refresh removes an
indicator a story depends on, or changes the shape it relies on, the story
reports itself **unavailable with a reason** instead of rendering around a hole.

That guard is real, not theoretical: the life-expectancy story checks that the
measure still has no combined series, and withdraws itself if one ever appears.

## The four stories

### 1. A wide range, and mostly no difference
*When a map shows a big spread between places, how much of it is real?*

Child mortality (1 to 17 years) by upper-tier local authority. Computes the
range across areas, then the publisher's own comparison flags against England,
then the relative width of the published intervals.

**Teaches:** the size of a difference and the evidence for it are separate
quantities. A choropleth is built to show variation, so it always shows some.

### 2. What a blank space on the map means
*An area has no colour. Is that good news, bad news, or no news?*

Works through suppression (with the publisher's own wording), out-of-coverage
nations, and a genuine published zero, then reconciles the counts.

**Teaches:** missing, suppressed, out-of-coverage and zero are four different
states that look identical on a careless map.

### 3. Two measures, the same places
*Two area-level measures move together. What does that tell us?*

Children in relative low income against Year 6 obesity, paired only where both
are published in a shared period. No trend line and no correlation coefficient
is drawn, because either would invite the reading the chart cannot support.

**Teaches:** an association between areas is not an association between people.

### 4. When there is no single number
*What happens when a measure has no combined figure at all?*

Life expectancy at birth, published separately by sex with no combined series.
Computes the England gap between the published groups and contrasts the
precision of this measure with the rest of the atlas.

**Teaches:** a population definition is an analytical choice, not a default.

## How a story is put together

```
StorySpec
  id, title, question, standfirst, teaches   authored
  requires: [{ indicatorId, areaTypeKey }]   declared
  build(context) -> StoryContent             computed
```

`build` receives loaded datasets and returns steps, each with a heading, a
computed body, an optional figure and a caveat. It returns
`{ unavailable: true, reason }` when the data no longer support the story.

Computations live in `src/features/stories/computations.ts` as pure functions
and are unit-tested: `summariseRange`, `summariseSignificance`,
`summariseAvailability`, `summarisePrecision`, `summariseExtremeOverlap`,
`pairAreas`, `summariseGroupGap`. A narrative is exactly where a quietly wrong
number does the most damage, so they are tested like the rest of the analytical
layer.

Notable behaviours those tests pin down:

- `summariseRange` returns a **null ratio** against a zero minimum rather than
  reporting infinity.
- `summariseAvailability` counts a published zero as **present**, never missing.
- `pairAreas` returns **null** when two measures share no period, rather than
  pairing across periods.

## Figures

Story figures use the same renderers as the workspace, so a figure in a story
and the same figure in the atlas are the same object. Each exports to genuine
vector SVG carrying its own indicator, geography, period, source, licence and
limitation notes.

## What they deliberately do not do

- They make no policy recommendation.
- They name no area as performing well or badly.
- They assert no cause, and each ends with an explicit list of what it does not
  establish.
