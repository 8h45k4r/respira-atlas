# Atlas statistical and communication rules vs OHID/ONS guidance and the methods literature

Scope: the "Public Health Evidence Atlas" in `/home/user/respira-atlas`. Rules come from `README.md`, `docs/METHODS.md`, `docs/STORIES.md`, `docs/LIMITATIONS.md` and `docs/DATA.md`. I checked them against `src/data/selectors/{comparison,evidence,classification}.ts`, `src/features/stories/computations.ts`, `src/features/atlas/useAnalysis.ts` and `scripts/prepare-data/fingertips.mjs`, and against the committed data in `public/data/`.

Method caveat: `fingertips.phe.org.uk` and `cran.r-project.org` could not be fetched from this session (DNS blocked by the network allowlist). Fingertips and PHEindicatormethods guidance is cited from search-engine extracts of those pages, not full-text reads. Where an exact quote matters, check it against the live page.

Verdict scale: **consistent**, **stricter than guidance**, **looser than guidance**, **contradicts guidance**, or **defect** (the code does not do what the docs say).

---

## Q1. Benchmark comparison: how Fingertips compares areas with England, and whether the atlas matches it (CI overlap, 95% vs 99.8%, Byar/Wilson/Dobson, quintiles)

### Takeaway
The atlas repeats the publisher's own England comparison flag and computes no test of its own. That matches Fingertips practice. My check of the committed data shows the publisher flag is exactly "does the area's CI contain the England point value?" at the publisher's chosen level. So the atlas's own sentence about whether the interval contains England is the same test, not "merely descriptive". It is always run at 95%, however, while the publisher uses 99.8% for some indicators, and the confidence level behind the flag is never shown. The result is 135 area-period rows where the two sentences point different ways. The atlas's refusal to treat CI overlap *between two estimates* as a test is well supported by the literature.

### Cited Findings
- **What the atlas does:** `compareToBenchmark` stores `sourceSignificance: area.significance`, which is the publisher flag, and separately `intervalContainsBenchmark = lowerCi95 <= England value <= upperCi95`. That second value is documented as "a descriptive observation about the interval, NOT as a hypothesis test" (`src/data/selectors/comparison.ts`). The evidence text says "That interval does not include the England value. Treat this as a description of the interval, not as a formal hypothesis test" (`src/data/selectors/evidence.ts`, `uncertaintyClause`). METHODS: "Significance against England uses the publisher's own flag. This product computes no significance test of its own" (`docs/METHODS.md`).
- **The flag is parsed from the CSV column `Compared to England value or percentiles`** into better / worse / similar / higher / lower / not-compared. The confidence-level part of the source label is discarded, and quintile labels ("Lowest", "Highest" and so on) become `not-compared` (`scripts/prepare-data/fingertips.mjs`, `classifySignificance`).
- **Empirical check (my analysis of `public/data/observations/*.json`):** I took 129,930 aggregate rows that have a flag, a 95% CI and an England value for the same period, sex and age. Every "better/worse" row has an England value outside the area's 95% CI. Every "similar" row has the England value inside the 99.8% CI. 135 rows are "similar" although the England value lies outside the 95% CI. All 135 are in QOF prevalence indicators 219 (hypertension), 848 (depression) and 90933 (asthma), for which the publisher evidently compares at 99.8%. About 17,300 "better/worse" rows have England inside the 99.8% CI, so most indicators are flagged at 95%. Conclusion: the publisher flag is the "benchmark point inside the area CI" rule, at 95% or 99.8% depending on the indicator. — analysis of repo data, no external source.
- **Fingertips colour-codes by statistical comparison with a chosen comparator, England by default, "in most cases 99.8% confidence".** Where significance cannot be determined, areas are left uncoloured or shown as quintiles of ranked values. — [National GP Profiles User Guide v8.3, Dec 2025](https://fingertips.phe.org.uk/documents/NGPP_userGuide_OHID20251202.pdf); [Fingertips user guide](https://fingertips.phe.org.uk/documents/fingertips_user_guide.pdf) ("Where statistical testing is not performed, indicator values are often presented as quintiles").
- **Fingertips technical guidance on CIs:** "While it is safe to assume that confidence intervals which do not overlap indicate a statistically significant difference, it is not always the case that overlapping confidence intervals mean that there is no significant difference." The same page says intervals should be shown only when they are correct, for example not when numerators are non-independent. — [Fingertips Public Health Technical Guidance: Overview of confidence intervals](https://fingertips.phe.org.uk/static-reports/public-health-technical-guidance/Basic_statistics/Confidence_intervals.html) (search extract).
- **OHID-approved CI methods:** Wilson score for proportions. Byar's method for rates with numerator ≥10, and an exact Poisson method below that. Byar's with Dobson adjustment for directly standardised rates (DSRs), with DSRs "not calculated" when the total count is <10. — [phstatsmethods documentation (Python port of the OHID methods)](https://phstatsmethods.readthedocs.io/en/latest/). PHEindicatormethods can output 95% and 99.8% limits together, e.g. `calculate_dsr(..., stdpop = esp2013, confidence = c(0.95, 0.998))`. — [PHEindicatormethods manual (r-universe)](https://dhsc-govuk.r-universe.dev/PHEindicatormethods/doc/manual.html); [NEWS](https://dhsc-govuk.r-universe.dev/PHEindicatormethods/NEWS).
- **Atlas metadata agrees on methods:** indicator 253 records "Wilson Score method" and indicator 93963 records "Dobson & Byar's methods" with "2013 European Standard Population" (`public/data/indicators/index.json`). The atlas reproduces published CIs and derives none (`docs/METHODS.md`), which is consistent.
- **Overlap literature:** Schenker & Gentleman (2001) show that checking overlap is conservative and loses power, and should not replace a formal test. — [Schenker & Gentleman, *Am Stat* 55(3):182–186](https://jpsm.umd.edu/publication/schenker%2C-n%2C-and-gentleman%2C-jf-%282001%29%2C-judging-significance-differences-examining). With equal standard errors and independent estimates, non-overlap of two 95% CIs corresponds to α ≈ 0.0056, and about 83–84% intervals are needed for α = 0.05. — [Eur J Epidemiol 2011 letter](https://link.springer.com/article/10.1007/s10654-011-9563-8). In Greenland et al., two overlapping 95% CIs, (1.04, 4.96) and (4.16, 19.84), still give P = 0.03 for the difference. — [Greenland et al. 2016, *Eur J Epidemiol*](https://pmc.ncbi.nlm.nih.gov/articles/PMC4877414/). Austin & Hux (2002, *J Vasc Surg*) make the same point for clinical research. I did not retrieve it this session, so it is not quoted here.

### Inferences
- **Using the publisher's flag rather than a home-made test: consistent** with Fingertips and with OSR "be open about quality" expectations.
- **"Overlap ≠ test" for two estimates (`intervalsOverlap`, trend clause): consistent with the literature.** The atlas also refuses to treat *non*-overlap as evidence of a difference, which makes it **stricter than** Fingertips guidance. For two *independent* estimates that is overly cautious but harmless. For adjacent rolling pooled periods (see Q2) it is correct, because those estimates are not independent.
- **"Interval contains the England value" labelled "not a formal hypothesis test": mislabelled.** It is not CI overlap. It is the single-interval comparison Fingertips itself uses, which treats England as a fixed point. It is a Wald-type test at the stated level. The wording is overcautious, and it hides the real problem: the atlas always uses the **95%** interval while the publisher uses **99.8%** for some indicators. For QOF hypertension, depression and asthma prevalence, a reader can get "flag: similar" next to "the 95% interval does not include England".
- **Improvement 1.** Capture the comparator confidence level, either from the source label (e.g. "Better 95%") or from indicator metadata. Show it in the significance clause ("…at the 99.8% level"). Run the interval-contains-benchmark sentence at that same level, using the 99.8% limits the pipeline already stores in `lowerCi998`/`upperCi998`. Reword it as "this is the same check the publisher uses; England's own uncertainty is ignored because England is treated as fixed".
- **Improvement 2.** For `higher`/`lower` flags, `significanceClause` drops the words "statistically significantly". In Fingertips these are significance-based categories for indicators with no better/worse polarity (data check: QOF 253 carries only `higher`/`lower`/`similar`). The wording understates the evidence. Make it "statistically significantly higher than England (publisher's flag)".
- **Improvement 3.** Fingertips' fallback for untested indicators is quintiles. The atlas maps quintile labels to `not-compared`, which is safe, but it should say "the publisher shows quintiles here; no significance test is available".

### Gaps
- I could not read the exact string format of the Fingertips CSV column (whether it includes "95%" or "99.8%") because the host was blocked. The level was inferred from the data instead.
- I did not retrieve the Austin & Hux (2002) full text.

---

## Q2. Trends: OHID "recent trend" method, minimum number of points, two-point changes, and rolling pooled periods

### Takeaway
The atlas never computes a trend. It calls a two-point change "a difference between two periods, not an established trend" and quotes the publisher's "Recent trend". That matches Fingertips' method, which needs at least 5 non-overlapping points and tests at 99.8%. Three implementation details fall short:
- The atlas says the publisher trend is "calculated over the full series". Fingertips documents it as using the **most recent five** points, so the statement **contradicts the guidance**.
- The source value "Could not be calculated" is recoded to "no significant change" (**defect**).
- For rolling 3-year series, the "previous period" is the adjacent, overlapping period. Fingertips' own trend method excludes overlapping periods.

### Cited Findings
- **Atlas rules:** "A change between two periods is described as a difference between two points, never as an established trend. Where the publisher supplies its own trend assessment over the full series, it is quoted as theirs" (`docs/METHODS.md`). The code says: "The publisher's own trend assessment for this area is "…", which is calculated over the full series rather than from these two points" (`src/data/selectors/evidence.ts`, `trendClause`).
- **Fingertips recent trend method:** markers are "derived using the most recent five indicator values in the time series as shown on the Trends display". A χ² statistic is compared with 9.5495 (p < 0.2%, i.e. 99.8%). Eligibility requires ≥5 points, non-overlapping periods and annual data (no monthly or quarterly series). A marker is shown only if the five-point trend is significant and the direction is the same across the sensitivity trends. — [Fingertips Public Health Technical Guidance: Trend markers](https://fingertips.phe.org.uk/static-reports/public-health-technical-guidance/Presentation/Trend_markers.html) (search extract). The PHOF "Further information" page describes a variant fallback that adds earlier points when the latest five show no significant trend. — [PHOF further information](https://fingertips.phe.org.uk/profile/public-health-outcomes-framework/supporting-information/further-info). These two descriptions conflict, and the conflict is noted here rather than resolved.
- **The Fingertips user guide says trends are tested at 99.8% confidence.** — [Fingertips user guide](https://fingertips.phe.org.uk/documents/UserGuide.pdf) (search extract).
- **Pipeline recoding:** in `classifyTrend` (`scripts/prepare-data/fingertips.mjs`), `if (s === '' || s === 'could not be calculated' || s === 'no significant change') return s === '' ? 'not-available' : 'no-significant-change';`. So "Could not be calculated" becomes `no-significant-change`, and the evidence clause then prints it as the publisher's assessment of "no significant change". The function also collapses "Increasing and getting better" to `increasing` and "Decreasing and getting worse" to `decreasing`, which is lossy but not wrong.
- **Data check:** publisher trend values in the committed data sit only on latest-period rows (2,338 of 2,338 non-empty values), which fits a "recent" trend. Distribution: 1,158 `no-significant-change`, which includes any recoded "could not be calculated"; 350 increasing; 567 increasing-worse; 67 decreasing; 196 decreasing-better. — analysis of `public/data/observations`.
- **Previous-period selection:** `previousPeriod = series.periods[seriesIndex - 1]` (`src/features/atlas/useAnalysis.ts`). For a rolling 3-year series this compares, say, 2023–25 with 2022–24, which share two of three years. The atlas does add "Consecutive periods overlap, so successive values are not independent observations" (`uncertaintyClause`), and states whether the CIs overlap.
- **Rolling and pooled kept separate:** the pipeline splits series by `Time period range` (e.g. `3y` vs `1y`). The validator checks that pooled and single-year periods are disjoint, and the comparability gate blocks pooled-vs-single comparisons (`scripts/prepare-data/index.mjs`, `docs/DATA.md`, `checkComparable` in `comparison.ts`). That fits Fingertips' requirement for non-overlapping periods in trend testing and its practice of publishing the two series separately.

### Inferences
- **"Two points ≠ trend", and quoting rather than computing trends: consistent with** Fingertips (≥5 points). It is also stricter than many dashboards.
- **"Calculated over the full series" contradicts the documented method** (latest five points). Change the text to "based on the most recent five periods, tested at the 99.8% level (OHID method)".
- **"Could not be calculated" → "no significant change" is a defect** that overstates what is known. Add a `could-not-be-calculated` state and render "the publisher could not calculate a trend (for example, fewer than five comparable periods)".
- **Adjacent rolling-period comparison is looser than the spirit of the guidance.** For pooled series, compare with the period *k* steps back (k = pooled years), which does not overlap. Otherwise suppress the CI-overlap sentence, because overlap of non-independent estimates carries no inferential meaning.
- Keep the polarity words ("getting better/worse") the publisher supplies, rather than dropping them for two of the four combinations.

### Gaps
- I could not confirm from the full text which of the two Fingertips descriptions (strict five points, or extending back) currently applies.

---

## Q3. Age standardisation, small numbers, disclosure control, and the four non-value states

### Takeaway
The atlas uses the publisher's DSRs and England row, never averages rates, and warns when the count is below 20. All of that is consistent with ONS and OHID practice. The four-state taxonomy (0 / missing / suppressed / not covered / not applicable) is good practice. Suppression detection, however, relies on a keyword regex over the free-text "Value note", so it is heuristic.

### Cited Findings
- **Atlas:** "Age-standardised rates are never averaged to produce a national figure. The England benchmark is the publisher's own England row" (`docs/METHODS.md`). A crude rate triggers a "not adjusted for age structure" clause (`evidence.ts`, `furtherEvidenceFor`).
- **ONS:** "It is our practice not to calculate rates based on fewer than 10 deaths and rates based on 10 to 19 deaths are marked with a 'u' to warn users that their reliability is low"; age standardisation uses the 2013 European Standard Population. — [ONS Avoidable mortality QMI](https://www.ons.gov.uk/peoplepopulationandcommunity/healthandsocialcare/causesofdeath/methodologies/avoidablemortalityinenglandandwalesqmi).
- **OHID methods:** DSRs are not calculated when the total count is <10. — [phstatsmethods](https://phstatsmethods.readthedocs.io/en/latest/). PHEindicatormethods' funnel-point helper removes DSRs with fewer than 10 events. — [PHEindicatormethods 2.1.1 reference](https://www.rdocumentation.org/packages/PHEindicatormethods/versions/2.1.1).
- **Atlas small-count rule:** `observation.count < 20 && indicator.countIsMeaningful` triggers "the estimate is unstable and small changes should not be over-read". `countIsMeaningful` comes from Fingertips metadata `ShouldCountBeDisplayed` (`evidence.ts`; `scripts/prepare-data/index.mjs`).
- **Suppression classification:** a row is `suppressed` only if the value is blank or "-" and the Value note matches `/suppress|disclos|too small|not published|withheld/`. Otherwise it is `missing` (`fingertips.mjs`, `classifyValue`).
- **Publisher disclosure metadata is passed through,** e.g. 93963: "For ICBs that are almost, but not precisely, coterminous with local authorities, the local authority boundaries have been used to avoid small slivers…" (`public/data/indicators/index.json`).

### Inferences
- **No averaging of DSRs, use of the publisher's England row and ESP 2013 metadata: consistent.**
- **The <20 instability warning is consistent with ONS's 10–19 "u" flag.** ONS also treats <10 as "do not calculate". The publisher normally applies that, so values under 10 should already be suppressed.
- **Four-state model: consistent** with GSS "be open about quality" and with good map practice (missing is not zero). The regex is a risk: a suppressed row with an unusual note becomes "missing", which is a softer but still non-zero state, so it fails safe. Log the distinct Value-note strings at build time and map them explicitly.
- Improvement: the instability warning ignores the size of the denominator and the CI width. A relative-CI-width rule (the story code already computes `summarisePrecision`) would cover proportions where the count is not displayed.

### Gaps
- I could not verify each Fingertips indicator's own suppression threshold (commonly <3, <5 or <10 depending on the dataset). The atlas relies on publisher suppression and does not apply its own, which is appropriate.

---

## Q4. Choropleth classification, MAUP, ecological fallacy and small-number instability

### Takeaway
The atlas defaults to five-class quantiles, displays the breaks, offers optional locked breaks and has no red/green ramp. That matches the best evidence for epidemiological rate maps (Brewer & Pickle 2002). The weakness is the known one with quantile maps of unsmoothed small-area rates: classes exaggerate differences between areas that cannot be distinguished statistically. The atlas mitigates this in prose but not cartographically. Fingertips' own default map colours by comparison with England.

### Cited Findings
- **Atlas:** default five-class quantile using type-7 interpolation, computed only from present values. Equal interval is offered. Classes are reduced when there are fewer distinct values. Breaks can be locked across periods. Ties are collapsed. "Selection changes the outline only" (`src/data/selectors/classification.ts`, `docs/METHODS.md`).
- **Brewer & Pickle (2002)** tested classification methods for epidemiological rate maps in series. Quantile and minimum-boundary-error methods performed best for general map-reading tasks; natural breaks (Jenks) did not outperform them. — [Brewer & Pickle, *Annals AAG* 92(4):662–681](https://pure.psu.edu/en/publications/evaluation-of-methods-for-classifying-epidemiological-data-on-cho/).
- **Fingertips maps** colour by significance against the comparator (99.8% in most cases) or by quintiles where significance is unavailable. — [NGPP User Guide v8.3](https://fingertips.phe.org.uk/documents/NGPP_userGuide_OHID20251202.pdf).
- **Small-number instability and smoothing:** raw small-area rates are noisy. Empirical Bayes (Poisson–Gamma) shrinks extreme rates from small populations towards a global or local mean, at the cost of potentially obscuring real gradients. — [Southampton GAH unit 4.3](https://generic.wordpress.soton.ac.uk/gah/unit-4/4-3-small-number-problems-and-smoothing/); [Richardson, CDC disease-mapping presentation](https://www.cdc.gov/nceh/tracking/conf04/pdfs/thu/ses3A/s_richardson.pdf). (These are teaching sources; the peer-reviewed originals, Clayton & Kaldor 1987 and BYM 1991, were not retrieved.)
- **Funnel plots** compare units against precision-dependent control limits and "avoid spurious ranking of institutions into 'league tables'". — [Spiegelhalter 2005, *Stat Med* 24:1185–1202](https://zendy.io/title/10.1002/sim.1970). OHID's PHEindicatormethods implements funnel limits at 95% and 99.8% following the Fingertips technical guidance. — [PHEindicatormethods manual](https://dhsc-govuk.r-universe.dev/PHEindicatormethods/doc/manual.html).
- **MAUP and ecological fallacy:** summary rates depend on the scale and shape of the zones (Openshaw & Taylor 1979; Openshaw 1984, "Ecological fallacies and the analysis of areal census data"). — [MAUP overview](https://en.wikipedia.org/wiki/Modifiable_areal_unit_problem); [Openshaw 1984, *Environ Plan A*](https://journals.sagepub.com/doi/10.1068/a160017). Robinson (1950) is the classic source on ecological correlation (citation only; not retrieved).

### Inferences
- **Quantile default with displayed breaks and locked breaks: consistent** with the literature. Displaying breaks, method and unit on every export goes beyond common practice.
- **No smoothing: consistent** with the atlas's "no adjustment beyond the publisher" rule. Smoothing would create unpublished estimates, so this is a defensible choice.
- **Improvement 4.** Add a "compared with England (publisher flag)" map mode, which is the Fingertips default, beside the quantile ramp. Story 1 already makes the case that the size of a difference and the evidence for it are separate quantities. A significance-coloured map shows that cartographically.
- **Improvement 5.** Add a funnel plot (value against denominator or count, with 95% and 99.8% limits around England) in place of, or beside, the ranking view. It is the OHID-endorsed way to show which areas are distinguishable, and it reinforces "rankings are not league tables". It uses published numerators and denominators, so no new estimation is involved.
- MAUP is acknowledged only implicitly, through "ICB vs LA not comparable" and the area-level limitation. Add an explicit MAUP sentence to the scatter and inequality views, especially for IMD (an LSOA-derived score aggregated to upper-tier LAs).

### Gaps
- I found no official OHID or GSS document that prescribes a classification method for choropleths, so the recommendation rests on the literature.

---

## Q5. Exposure/outcome scatter, pairing and inequality breakdowns

### Takeaway
No fitted line, no correlation coefficient, an embedded ecological-fallacy warning, and pairing only on an identical period string. All of that is consistent with the ecological-inference literature and stricter than typical dashboards. Two gaps remain:
- Pairing matches the period string but never checks the year type, so Story 3 can pair a financial-year measure with an academic-year one.
- The "not-interpretable" caveat template calls IMD 2025 a "recorded-prevalence measure".

### Cited Findings
- **Scatter:** the warning reads "Both axes are area-level measures… This is the ecological fallacy, and it is the reason no trend line or correlation coefficient is drawn" (`src/features/comparison/ScatterFigure.tsx`). `pairAreas` takes the latest period *string* both series share and returns null if there is none (`src/features/stories/computations.ts`).
- **Year types in the data:** children in relative low income (93700) is `Financial`. Year 6 obesity (90323) is `Academic`. Adult obesity and physical inactivity are `November-November` (`public/data/indicators/index.json`). An identical label such as "2023/24" therefore covers different months. Neither `checkComparable` nor `pairAreas` checks `yearType`, even though METHODS says "Financial and calendar years are kept distinct and labelled".
- **`not-interpretable` indicators:** 253, 90933, 219, 848 (all QOF prevalence) **and 94240 Deprivation score (IMD 2025)**. For any `not-interpretable` indicator, `limitationsFor` emits "`<name>` measures recorded prevalence. A higher figure may reflect better case-finding…", and `significanceClause` likewise calls it "a recorded-prevalence measure" (`src/data/selectors/evidence.ts`). For IMD this text is false.
- **Inequality:** reported as the gap between published subgroups (mostly sex) within one area and period, with no slope index of inequality (SII) or other summary (`docs/LIMITATIONS.md`; `summariseGroupGap` in `computations.ts`). OHID's inequality tooling uses SII and deprivation deciles and assigns deprivation categories with its own method. — [Fingertips Inequality Tools](https://fingertips.phe.org.uk/profile/inequality-tools); [OHID Guidance: Assigning Deprivation Categories](https://fingertips.phe.org.uk/documents/OHID%20Guidance%20-%20Assigning%20Deprivation%20Categories.pdf).
- **Literature on ecological inference:** see Q4 (Openshaw 1984; Robinson 1950).

### Inferences
- **Scatter with no line and no r: consistent with, and stricter than,** common practice. It is defensible given the ecological-fallacy literature. A rank-based description of the scatter ("areas in the top fifth of X are also…") could be offered with the same caveat, but that is optional.
- **Year-type pairing: looser than the atlas's own stated rule.** Add `yearType` to `ComparableContext` and `pairAreas`. Either block mismatches or label them ("financial year 2023/24 paired with academic year 2023/24; periods overlap but are not identical").
- **IMD caveat: defect.** Introduce a separate category (e.g. `direction: 'context'` or `'descriptive-score'`) so that recorded-prevalence wording applies only to QOF registers. IMD also needs its own caveat: it is a relative ranking score, not a rate, and LA-level scores are population-weighted LSOA averages.
- **Sex-gap inequality only: consistent** with "use what the publisher supplies", but much thinner than OHID inequality practice. The atlas's limitations already state this. Fingertips publishes some indicators by deprivation decile, which could be added later without the atlas computing anything new.

### Gaps
- I did not find a GSS or OHID statement on pairing measures with different year types.

---

## Q6. Communicating uncertainty, and recorded vs true prevalence (ONS / OSR / GSS / Winton)

### Takeaway
The atlas's evidence-statement template (observed → comparison → uncertainty → further evidence), its separation of magnitude from evidence, its mandatory limitations and its refusal of better/worse readings for registers all match the GSS "Communicating quality, uncertainty and change" principles and the OSR Code of Practice 3.0. The QOF-prevalence framing is well supported by the epidemiological literature.

### Cited Findings
- **GSS guidance** (current: *Communicating quality, uncertainty and change*, which superseded *Communicating uncertainty*): put vital quality messages "up front" and tailor communication to the audience. — [Analysis Function: communicating quality, uncertainty and change](https://analysisfunction.civilservice.gov.uk/policy-store/communicating-quality-uncertainty-and-change/); [communicating uncertainty and change guidance](https://analysisfunction.civilservice.gov.uk/policy-store/communicating-uncertainty-and-change-guidance-for-official-statistics-producers). *Writing about data* (April 2025) asks analysts to be transparent about strengths, limitations and uncertainty. — [Writing about data](https://analysisfunction.civilservice.gov.uk/policy-store/writing-about-data).
- **OSR Code of Practice for Statistics, Edition 3.0** was released 30 October 2025 and is built on Trustworthiness, Quality and Value. Its principles include "Be open about quality". — [OSR: refreshing the Code](https://osr.statisticsauthority.gov.uk/refreshing-the-code-of-practice-for-statistics); [Code 3.0 PDF](https://code.statisticsauthority.gov.uk/wp-content/uploads/2025/10/Code-of-Practice-for-Statistics-3.0.pdf); [quick reference guide](https://osr.statisticsauthority.gov.uk/wp-content/uploads/2025/11/Code_3_quick_reference_guide.pdf). OSR's 2025 review of presenting uncertainty urges Heads of Profession to check how uncertainty is presented. — [OSR approaches to presenting uncertainty](https://osr.statisticsauthority.gov.uk/publication/approaches-to-presenting-uncertainty-in-the-statistical-system/pages/3).
- **Recorded vs true prevalence:** in England 2000–2019, QOF-style definitions underestimate COPD. The 2019 prevalence was 4.9% with validated events and 6.7% once potentially undiagnosed cases were included. — [Prevalence of COPD in England 2000–2019, PMC10368107](https://pmc.ncbi.nlm.nih.gov/articles/PMC10368107). Asthma is under-recorded on registers. — [Asthma + Lung UK briefing 2025](https://www.asthmaandlung.org.uk/sites/default/files/2025-12/Life%20with%20a%20Lung%20Condition%202025%20briefing.pdf). PCRS advises comparing registers with modelled expected prevalence. — [PCRS EQUIP module 2](https://www.pcrs-uk.org/sites/default/files/EQUIP_Mod2_Prevalence_FINAL.pdf). QOF participation is voluntary and the data are practice aggregates. — [Pan London Respiratory Dashboard spec](https://imperialcollegehealthpartners.com/wp-content/uploads/2022/03/220318-Respiratory-Dashboard-Metric-Specification-V1.pdf).
- **Atlas:** "Recorded prevalence is not disease prevalence… Lower recorded prevalence is never called better" (`docs/METHODS.md`). The data check shows the publisher already flags QOF 253 only as higher, lower or similar, so the "refuse better/worse" branch is a guard that seldom fires.

### Inferences
- **Uncertainty communication: consistent with GSS and OSR,** and arguably ahead of typical official dashboards on magnitude versus evidence and on statements that shrink as data weaken.
- **Recorded-prevalence framing: consistent** with the literature and with Fingertips' own neutral polarity for QOF.
- **Improvement 6.** Where Fingertips publishes modelled or estimated prevalence (e.g. COPD estimated prevalence, or the "reported vs estimated" ratio), show it beside the QOF register as the ascertainment context. Label it clearly as a model output.
- **Improvement 7.** State the confidence level in every flag sentence (see Q1). GSS guidance stresses being explicit about what an interval or test means.
- **Improvement 8.** Winton Centre and Spiegelhalter-style practice favours plain-language framing of uncertainty and avoids "significant" jargon for lay audiences. I did not retrieve a Winton source this session, so this point is left uncited.

### Gaps
- I did not retrieve a Winton Centre or Spiegelhalter source on uncertainty language.
- I did not read the full Code 3.0 text for clause-level requirements.

---

## Q7. ICB vs local-authority comparability, denominators and boundary vintages

### Takeaway
The atlas blocks ICB-vs-LA comparisons and matches boundary vintages on the full set of area codes. That is stricter than any official rule I found, and it is defensible: the publisher's own metadata shows ICB figures built from approximated LA or LSOA boundaries. The main risk is time. The ICB layer is the July 2022 vintage, and NHS reorganisation will change it.

### Cited Findings
- **Atlas:** `checkComparable` refuses any mismatch in geography type, boundary vintage, period, pooling or subgroup (`src/data/selectors/comparison.ts`). Administrative and NHS trees are separate with "no edge between them". Layers are chosen by full code-set match, so ICB July 2022 (E54000052/53, not E54000063/64) and NHS regions July 2022 (`docs/DATA.md`).
- **Publisher metadata** (93963 disclosure control) says LA boundaries were used for near-coterminous ICBs to avoid small slivers (`public/data/indicators/index.json`). ICB figures are therefore aggregates of building blocks, not independent populations.
- **Fingertips** lets the comparator be England or the parent area. Its default benchmark is England. — [NGPP User Guide v8.3](https://fingertips.phe.org.uk/documents/NGPP_userGuide_OHID20251202.pdf).
- **MAUP:** rates depend on the zoning system. — [Openshaw 1984](https://journals.sagepub.com/doi/10.1068/a160017).

### Inferences
- **The ICB-vs-LA block is stricter than guidance and well justified.** Both are valid against England. Two different zonings of England give different rates, which is MAUP, and ICB and LA denominators differ (GP-registered vs resident populations for some indicators, e.g. QOF list sizes vs ONS mid-year estimates).
- **Vintage-exact joins: consistent with best practice.** The code-set check catches the E54000052/53 → 063/064 recoding trap.
- **Risk to monitor.** The July 2022 ICB boundaries will go stale as NHS ICBs merge or reconfigure. The pipeline's feature-count abort will not catch a reconfiguration that keeps the count the same, but the code-set check will. Keep that check mandatory.
- **Improvement 9.** Label the denominator type (resident vs registered population) in the provenance block whenever an ICB indicator's denominator is GP-registered.

### Gaps
- I found no specific OHID or GSS guidance document on comparing ICB with LA estimates. The verdict rests on publisher metadata and the MAUP literature.
- I did not verify the current status, as of November 2026, of ICB mergers or boundary changes after April 2026.

---

## Summary verdict table (for the report writer)

| # | Atlas rule (where) | Verdict | Key source |
|---|---|---|---|
| 1 | Uses publisher England flag only; no own test (`comparison.ts`, METHODS) | Consistent | NGPP user guide; Fingertips user guide |
| 2 | CI overlap between two estimates not treated as a test (`intervalsOverlap`, `trendClause`) | Consistent with literature; stricter than Fingertips on non-overlap | Schenker & Gentleman 2001; Fingertips CI guidance |
| 3 | "Interval contains England" called "not a formal hypothesis test", always at 95% (`evidence.ts`) | Mislabelled. It is the publisher's test; the level mismatches for 99.8% indicators (135 conflicting rows in QOF 219/848/90933) | Data check; NGPP user guide |
| 4 | Flag level (95/99.8) not shown; "higher/lower" not called significant | Looser than guidance (incomplete) | NGPP user guide |
| 5 | Two-point change ≠ trend; publisher trend quoted | Consistent (Fingertips requires ≥5 points) | Fingertips trend-markers guidance |
| 6 | Publisher trend described as "over the full series" | Contradicts guidance (latest 5 points, 99.8%) | Fingertips trend-markers guidance |
| 7 | "Could not be calculated" → "no significant change" (`fingertips.mjs`) | Defect | — |
| 8 | Adjacent rolling 3-year periods compared, CI overlap stated | Looser than guidance (non-overlapping periods needed) | Fingertips trend-markers guidance |
| 9 | Pooled vs single-year series separated and gated | Consistent | Fingertips trend-markers guidance |
| 10 | Publisher DSR/ESP2013; never average rates; England row as benchmark | Consistent | ONS avoidable-mortality QMI; phstatsmethods |
| 11 | Count <20 instability warning | Consistent (ONS "u" flag 10–19) | ONS QMI |
| 12 | Four non-value states; suppression detected by note regex | Consistent in principle; heuristic implementation | GSS quality guidance |
| 13 | Five-class quantile, breaks shown, lockable | Consistent | Brewer & Pickle 2002 |
| 14 | No smoothing, no significance map mode, no funnel plot | Defensible; misses OHID's own significance map and funnel conventions | NGPP guide; Spiegelhalter 2005; PHEindicatormethods |
| 15 | Scatter with no line or r, ecological warning, same-period pairing | Consistent and stricter; year type not checked (looser than own rule) | Openshaw 1984 |
| 16 | `not-interpretable` caveat text applied to IMD 2025 | Defect (calls IMD "recorded prevalence") | — |
| 17 | QOF recorded prevalence ≠ true prevalence | Consistent | PMC10368107; A+LUK 2025 |
| 18 | Uncertainty communication structure | Consistent with GSS and OSR Code 3.0 | Analysis Function; OSR |
| 19 | ICB vs LA blocked; vintage-exact joins | Stricter than guidance; justified | Publisher metadata; Openshaw |
| 20 | Sex-gap-only inequality, no SII | Consistent with "publisher only"; thinner than OHID inequality practice | Fingertips Inequality Tools |

**Documentation drift noted while reading.** `docs/DATA.md` describes "14 indicators" from the respiratory profile only (ID 29). `README.md` and `docs/LIMITATIONS.md` describe 35 indicators from 5 profiles, and LIMITATIONS still names "OHID Fingertips INHALE" as the source for everything. The committed `public/data/indicators/index.json` contains 35 indicators across profiles 29, 50, 105, 125 and 135. DATA.md should be brought up to date.
