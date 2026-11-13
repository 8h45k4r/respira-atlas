# Disciplined atlas stands on shifting ground

The Public Health Evidence Atlas does not add data. It is a curated 35-indicator subset of OHID Fingertips, and every statistical judgement it shows (confidence intervals, England comparison flags, trend assessments) comes from the publisher. It therefore duplicates Fingertips on content and loses to it, and to ScotPHO, ONS Explore Local Statistics and LG Inform, on breadth, small-area geography, deprivation breakdowns and API access. Its genuine differentiators are about presentation:

- evidence statements that are gated by eligibility rules
- four separately encoded non-value states
- a coverage matrix checked by actually fetching the data
- vector SVG plus a JSON figure-spec export
- refusal logic that blocks misleading comparisons

None of these was found in any incumbent examined, although that rests on absence of evidence. Of its twenty statistical and communication rules, most match OHID/ONS guidance and the methods literature, and several are stricter. Five need fixing:

- **Benchmark level.** The "interval contains England" sentence always uses the 95% interval, while the publisher tests some indicators at 99.8%. The result is **135 contradictory rows** in three QOF prevalence indicators.
- **Trend recoding.** "Could not be calculated" is silently recoded as "no significant change".
- **Trend method description.** The publisher's trend is described as covering the full series. OHID documents it as using the latest five points.
- **IMD caveat.** IMD 2025 gets a caveat that calls it a recorded-prevalence measure.
- **Year-type pairing.** Story pairings ignore year type.

The bigger threat is time. The snapshot dated **18 October 2026** has already been overtaken:

- England went from **42 to 36 ICBs on 1 April 2026**.
- A PHOF update added data for 34 indicators on **3 November 2026**.
- ONS revised the 2022–2024 population denominators in July and October 2026.

Ahead lie the Surrey unitary split (1 April 2027), the planned replacement of Fingertips by "Find public health data" on GOV.UK in 2027 (no switch-off date published yet), the absorption of NHS England into DHSC, and a probable ICD-11 coding break around 2028.

## The atlas repackages Fingertips; its edge is guardrails, not data

Every number the atlas shows exists already in Fingertips. Fingertips offers choropleths, spine charts, compare-areas bars, trends and England benchmarking, and colours areas by significance "in most cases" at 99.8% ([National GP Profiles user guide v8.3](https://fingertips.phe.org.uk/documents/NGPP_userGuide_OHID20251202.pdf)). It covers hundreds of indicators, from England down to GP practice. Its Local Health tool adds MSOAs, though it dropped ward and CCG data in August 2025 ([GOV.UK](https://www.gov.uk/government/statistics/local-health-august-2025-update)). A public API serves JSON and CSV, wrapped by fingertipsR and fingertips_py ([Fingertips API guidance](https://fingertips.phe.org.uk/profile/guidance/supporting-information/api)). The atlas reuses the publisher's 95% and 99.8% intervals and flags and computes no tests of its own, so **its statistical content is identical to the source**. Only the selection, framing and gating differ.

The successor service will widen that gap. OHID says it is "creating a new public health data service for 2027" on GOV.UK ([Statistics at OHID](https://www.gov.uk/government/organisations/office-for-health-improvement-and-disparities/about/statistics)). DHSC's **£1.25m public-beta contract** with Marvell Consulting covers an API for advanced users, R and Python packages, automated publication with redactions and an audit history, and archiving of data versions ([HTN, 8 Apr 2026](https://htn.co.uk/2026/04/08/dhsc-outlines-future-of-fingertips-health-data-repository-in-1-25m-contract/); [Find a Tender 037491-2025](https://www.find-tender.service.gov.uk/Notice/037491-2025)).

Beyond Fingertips, the overlap is partial:

- **ONS Explore Local Statistics** is UK-wide and covers all themes, with roughly 100–116 indicators depending on the page. It goes down to lower-tier LAs and downloads as XLSX, CSV, CSVW and JSON-Stat ([ONS ELS](https://www.ons.gov.uk/explore-local-statistics/); [ELS QMI](https://www.ons.gov.uk/peoplepopulationandcommunity/healthandsocialcare/healthandwellbeing/methodologies/explorelocalstatisticsserviceqmi)). It overlaps with the atlas only on headline health measures.
- **LG Inform** offers more than 1,500 council benchmarking measures, with an API for subscribers ([LGA](https://www.local.gov.uk/our-support/research-and-data/lg-inform-data-benchmarking)).
- **SHAPE Place** is an estates-planning tool restricted to .gov.uk users ([SHAPE](https://shapeatlas.net/our-shape-products/shape-place/)).
- **CVDPREVENT** audits GP records with ethnicity and deprivation splits and publishes ICB data packs ([CVDPREVENT](https://www.cvdprevent.nhs.uk/quality-improvement)).

These three serve different audiences, so their duplication with the atlas is low.

| Dimension | Atlas | Strongest incumbent | Atlas position |
|---|---|---|---|
| Indicators | 35 across 11 topics | Fingertips: hundreds; LG Inform: 1,500+ | Far narrower |
| Finest geography | Upper-tier LA (153), ICB (42) | Fingertips: GP practice and MSOA; ScotPHO: intermediate zone ([GitHub](https://github.com/Public-Health-Scotland/scotpho-indicator-production)) | Behind |
| Inequality | Sex gaps only, no slope index of inequality | ScotPHO deprivation quintiles and summary measures ([PHINS 2024](https://www.scotpho.org.uk/media/2496/phins2024-session3_3-elliott.pdf)); NI gap between most and least deprived fifths ([NISRA](https://www.nisra.gov.uk/news/deprivation-linked-poorer-health-outcomes-across-northern-ireland)) | Behind |
| Comparisons | England only, publisher flag | Fingertips: selectable benchmark; ScotPHO: area vs area using both CIs ([ScotPHO methodology](https://www.scotpho.org.uk/methods-and-data/methodology/)) | Behind |
| Machine access | None; committed static dataset | Fingertips API now; FPHD API and packages from 2027 | Behind |
| Update cadence | Manual rebuild | PHW PHOF quarterly (22 Sep 2026, next 15 Dec 2026) ([PHW](https://phw.nhs.wales/services-and-teams/observatory/data-and-analysis/public-health-outcomes-framework/)) | Behind |
| Figure export | Vector SVG, PNG, CSV, JSON figure spec | Data downloads; ScotPHO "save chart" in an unconfirmed format | Ahead (by absence) |
| Missingness | Four states, including "not covered" | No primary documentation found | Likely ahead (unconfirmed) |
| Narrative text | Templated statements with clause-level eligibility gating | ONS per-LA auto-articles, with no gating ([ONS](https://www.ons.gov.uk/peoplepopulationandcommunity/healthandsocialcare/healthandwellbeing/articles/howhealthhaschangedinyourarea2015to2021/2023-06-16)) | Ahead |

The differentiators survive scrutiny, with two qualifications.

The first qualification is that evidence of uniqueness is thin. No incumbent's documentation on styling suppressed versus missing values, or on vector chart export, was retrieved. "Unique" therefore means "not found". FPHD's feature list for maps, exports and narrative is unpublished, so the 2027 launch could erode these advantages.

The second qualification is that one celebrated guard rarely fires. The atlas refuses better/worse flags for QOF recorded prevalence. The committed data shows, however, that the publisher already flags QOF asthma (253) only as higher, lower or similar. Fingertips already uses neutral polarity there, so the refusal is a backstop rather than a correction of the source.

The UK map, with three nations hatched as "not covered", is an honest presentation. Users who need cross-nation comparison are still better served by ELS, by BHF's 457-area UK statistics ([BHF](https://www.bhf.org.uk/what-we-do/our-research/heart-statistics/local-statistics)), or by the devolved tools. **No harmonised four-nations public-health profile tool exists**, and the atlas does not fill that gap either. ONS itself warns that indicators are not always comparable across nations ([ONS](https://www.ons.gov.uk/methodology/statisticsacrosstheUK/bringingtogetherstatisticsfromacrosstheUK)).

The strongest version of the atlas's case is that it is an interpretation layer, not a data platform. Read that way, its shortfalls in breadth matter less than whether its guardrails are correct, which is the next question.

## Most of twenty rules match guidance; five need correcting

### Where the atlas matches or exceeds guidance

The atlas follows Fingertips practice by repeating the publisher's England flag instead of running its own test. It reproduces published intervals, which use OHID-approved methods: Wilson score for proportions, and Byar's with Dobson adjustment for directly standardised rates, with DSRs not calculated below 10 events ([phstatsmethods](https://phstatsmethods.readthedocs.io/en/latest/)). It never averages age-standardised rates and uses the publisher's own England row. Its warning for counts below 20 mirrors ONS practice: no rate below 10 deaths, and a "u" flag for 10–19 ([ONS avoidable mortality QMI](https://www.ons.gov.uk/peoplepopulationandcommunity/healthandsocialcare/causesofdeath/methodologies/avoidablemortalityinenglandandwalesqmi)).

It refuses to treat overlap between two confidence intervals as a test, which is well supported:

- Overlap checks are conservative and lose power ([Schenker & Gentleman 2001](https://jpsm.umd.edu/publication/schenker%2C-n%2C-and-gentleman%2C-jf-%282001%29%2C-judging-significance-differences-examining)).
- Non-overlap of two 95% intervals corresponds to α ≈ 0.0056 ([Eur J Epidemiol 2011](https://link.springer.com/article/10.1007/s10654-011-9563-8)).
- Overlapping intervals can still give P = 0.03 ([Greenland et al. 2016](https://pmc.ncbi.nlm.nih.gov/articles/PMC4877414/)).

The default five-class quantile map with visible, lockable breaks matches the best evidence for epidemiological rate maps ([Brewer & Pickle 2002](https://pure.psu.edu/en/publications/evaluation-of-methods-for-classifying-epidemiological-data-on-cho/)). The scatter plot omits fitted lines and correlation coefficients because of the ecological fallacy, which is stricter than typical dashboards and consistent with the MAUP literature ([Openshaw 1984](https://journals.sagepub.com/doi/10.1068/a160017)).

The communication structure runs from the observed value, to the comparison, to the uncertainty, to further evidence, and keeps magnitude separate from evidence. That aligns with the Analysis Function's "Communicating quality, uncertainty and change" guidance ([Analysis Function](https://analysisfunction.civilservice.gov.uk/policy-store/communicating-quality-uncertainty-and-change/)) and with the "be open about quality" principle in the **OSR Code of Practice 3.0 (30 October 2025)** ([OSR](https://osr.statisticsauthority.gov.uk/refreshing-the-code-of-practice-for-statistics)). The recorded-prevalence framing is well supported: QOF-style definitions put 2019 COPD prevalence at 4.9%, against 6.7% once probable undiagnosed cases are included ([PMC10368107](https://pmc.ncbi.nlm.nih.gov/articles/PMC10368107)). Blocking ICB-versus-LA comparisons is stricter than any official rule found. It is justified because the publisher's own metadata shows ICB figures assembled from LA boundaries for near-coterminous ICBs.

### Where it breaks: the confidence-level mismatch

The most consequential flaw comes from mislabelling. The atlas presents "the interval does not include the England value" as "a description of the interval, not a formal hypothesis test" (`src/data/selectors/evidence.ts`).

A check of 129,930 committed rows shows that this is exactly the publisher's test, with England treated as a fixed point:

- Every "better" or "worse" row has England outside the area's 95% interval.
- Every "similar" row has England inside the 99.8% interval.

The atlas always runs its version at 95%. Fingertips tests some indicators at 99.8% ([Fingertips user guide](https://fingertips.phe.org.uk/documents/fingertips_user_guide.pdf)). As a result, **135 rows in QOF hypertension (219), depression (848) and asthma (90933)** show "publisher flag: similar" next to "the 95% interval does not include England".

The pipeline discards the confidence level from the source label (`classifySignificance` in `scripts/prepare-data/fingertips.mjs`), so the reader is never told which level applies. A related understatement: for indicators without polarity, the "higher" and "lower" flags drop the words "statistically significantly", although in Fingertips these are significance-based categories.

### Where it breaks: trends

Two trend rules conflict with OHID documentation:

- **Method description.** The atlas says the publisher's trend "is calculated over the full series". OHID's trend-marker method uses "the most recent five indicator values" in non-overlapping annual periods, tested at 99.8% (χ² critical value 9.5495) ([Fingertips technical guidance: trend markers](https://fingertips.phe.org.uk/static-reports/public-health-technical-guidance/Presentation/Trend_markers.html)). The PHOF supporting page describes a fallback that extends to earlier points ([PHOF further information](https://fingertips.phe.org.uk/profile/public-health-outcomes-framework/supporting-information/further-info)), so the exact current rule is unresolved. Neither source supports "the full series".
- **Recoding.** `classifyTrend` maps the source value "Could not be calculated" to `no-significant-change`. The atlas then tells users the publisher found no significant change when it found nothing at all.

For rolling three-year series, the "previous period" is the adjacent one: 2023–25 against 2022–24, which share two of their three years. Fingertips' own method excludes overlapping periods. The atlas does say that consecutive periods overlap. It still reports whether the intervals overlap, which carries no inferential meaning for dependent estimates.

### Where it breaks: two smaller defects

Two defects contradict the atlas's own stated rules:

- **IMD caveat.** Indicator 94240 (IMD 2025) is in the `not-interpretable` category, so `limitationsFor` tells users it "measures recorded prevalence". That is false: IMD is a relative ranking score.
- **Year-type pairing.** `pairAreas` and `checkComparable` match period strings but ignore `yearType`. Story 3 can therefore pair a financial-year "2023/24" (children in low income, 93700) with an academic-year "2023/24" (Year 6 obesity, 90323), despite METHODS saying financial and calendar years are kept distinct.

Suppression detection is a further weakness. It relies on a keyword regex over free-text value notes, so it fails safe (to "missing") but is heuristic.

### Fixes in priority order

| Priority | Fix | Location | Basis |
|---|---|---|---|
| 1 | Capture the publisher's comparison level (95% or 99.8%). Run the benchmark sentence at that level using the stored `lowerCi998`/`upperCi998`. Name the level in every flag sentence. Reword it as "the same check the publisher uses, treating England as fixed" | `fingertips.mjs`, `comparison.ts`, `evidence.ts` | NGPP guide; Analysis Function |
| 2 | Add a `could-not-be-calculated` trend state. Keep the publisher's polarity words ("getting better/worse") | `classifyTrend` | Defect |
| 3 | Replace "over the full series" with "based on the most recent five periods, tested at 99.8% (OHID method)" | `trendClause` | Trend-marker guidance |
| 4 | Create a separate category for IMD with its own caveat (relative score; LA value built from LSOA scores) | `evidence.ts` | Defect |
| 5 | Add `yearType` to the comparability context and to pairing. Block mismatches, or label them | `comparison.ts`, `computations.ts` | Atlas's own METHODS |
| 6 | For pooled series, compare with the period *k* steps back (k = number of pooled years), or suppress the CI-overlap sentence | `useAnalysis.ts`, `uncertaintyClause` | Trend-marker guidance |
| 7 | Restore "statistically significantly higher/lower". Explain the quintile fallback ("the publisher shows quintiles; no test available") | `significanceClause` | Fingertips user guide |
| 8 | Log the distinct value-note strings at build time and map suppression explicitly. Add a relative-CI-width instability rule alongside the <20 count rule | `classifyValue`, `evidence.ts` | ONS QMI |
| 9 | Add a "compared with England" map mode (the Fingertips default) and a funnel plot with 95% and 99.8% limits | New views | [Spiegelhalter 2005](https://zendy.io/title/10.1002/sim.1970); [PHEindicatormethods](https://dhsc-govuk.r-universe.dev/PHEindicatormethods/doc/manual.html) |
| 10 | Add a MAUP sentence to the scatter and inequality views. Label registered versus resident denominators. Show modelled prevalence next to QOF registers where the publisher has it | Provenance and caveat copy | [PCRS](https://www.pcrs-uk.org/sites/default/files/EQUIP_Mod2_Prevalence_FINAL.pdf); Openshaw 1984 |

The funnel plot deserves emphasis. It uses only published numerators and denominators, so it creates no new estimates and respects the atlas's "publisher only" rule. It is also the OHID-endorsed way to show which areas are truly distinguishable, which is the point Story 1 is trying to make in prose.

## The snapshot already lags its source on three fronts

All configuration was "confirmed against the live source on 2026-10-18", and the manifest is stamped `2026-10-18T09:09:40Z` (`scripts/prepare-data/config.mjs`, `public/data/manifest.json`). The data is committed and static, so no external change can break the live site. External changes can make the data stale, invalidate it, or stop `npm run data:prepare` from running. Three have already happened.

**The ICB layer describes organisations that no longer exist.** On 1 April 2026 an Order "establishes 6 new ICBs, abolishes 12 existing ICBs and widens the boundary of an existing ICB", leaving **36 ICBs** ([NHS England](https://www.england.nhs.uk/publication/integrated-care-boards-in-england/); [ODS change summary](https://digital.nhs.uk/services/organisation-data-service/upcoming-code-changes/icb-mergers-2026-change-summary)). ONS published April 2026 ICB boundaries with `ICB26CD` codes on 22 April 2026 ([data.gov.uk](https://www.data.gov.uk/dataset/a523957f-061b-47c2-b1db-cc42cee0ccd0/integrated-care-boards-april-2026-boundaries-en-bfe)). The NAO counts the result differently, as "42 to 25 ICBs or clusters", because clusters keep separate legal entities ([NAO, Nov 2026](https://www.nao.org.uk/wp-content/uploads/2026/11/restructuring-of-integrated-care-boards-summary.pdf)).

The atlas's 42-feature July 2022 layer correctly matches the periods it shows (2024/25 admissions, 2022–24 mortality). It mislabels them as current "Integrated care boards", however. ICB data for 2025/26 onward will arrive on new codes. What happens depends on how Fingertips publishes it. If it redefines area type 221, the code-set check will fail loudly. If it adds a new area type, the atlas will quietly stop receiving ICB updates. This could not be verified because the Fingertips host was unreachable during research.

**The data is behind the publisher.** OHID's PHOF update of **3 November 2026** added new data for 34 indicators, including suicide ([GOV.UK](https://www.gov.uk/government/statistics/public-health-outcomes-framework-november-2026-data-update)). The atlas's suicide indicator (41001) still ends at 2022–24. QOF 2025/26 annual data normally appears in the autumn and would supersede the committed 2024/25 registers.

**Denominators have been revised.** ONS's mid-2025 estimates revised mid-2022 to mid-2024 for England and Wales on 29 July 2026, lowering mid-2024 to 61,785,000 ([ONS](https://www.ons.gov.uk/peoplepopulationandcommunity/populationandmigration/populationestimates/bulletins/populationestimatesforenglandandwales/mid2025/pdf)). The UK release followed on 1 October 2026 ([ONS](https://www.ons.gov.uk/peoplepopulationandcommunity/populationandmigration/populationestimates/bulletins/annualmidyearpopulationestimates/mid2025/pdf)). OHID has back-revised whole DSR series before: it adopted Census-2021-rebased estimates in January 2025 ([Fingertips methodology](https://fingertips.phe.org.uk/documents/excess-mortality-within-england-post-pandemic-method.htm)). Once it adopts these revisions, committed 2022–24 and 2023–25 values may no longer match live Fingertips values for the same period. That undermines reproducibility, which is the atlas's core promise.

## 2027–2028 brings a new data service, new councils and a coding break

| # | Change | Date | Status | Impact on atlas | Mitigation |
|---|---|---|---|---|---|
| R1 | 42 → 36 ICBs; ONS `ICB26CD` layer ([NHS England](https://www.england.nhs.uk/publication/integrated-care-boards-in-england/)) | 1 Apr 2026 | Confirmed | ICB layer shows abolished bodies; new periods arrive on new codes | Relabel now as "ICBs (2022–Mar 2026 boundaries)". Query `/api/area_types` for a new ICB type. Add `icb26` as a separate vintage, kept non-comparable |
| R2 | PHOF update for 34 indicators ([GOV.UK](https://www.gov.uk/government/statistics/public-health-outcomes-framework-november-2026-data-update)) | 3 Nov 2026 | Confirmed | Missing newer periods (e.g. suicide) | Re-run the pipeline. Show "retrieved 18 Oct 2026" prominently. Diff the latest period per indicator |
| R3 | ONS mid-2022 to mid-2024 population revisions | 29 Jul and 1 Oct 2026 | Confirmed | Possible back-revision of DSRs and life expectancy | Diff old against new values for the same periods on refresh. Log revisions. Record the denominator vintage |
| R4 | Surrey splits into East and West Surrey unitaries ([Surrey LGR hub](https://www.surreylgrhub.gov.uk/frequently-asked-questions); [Commons Library](https://commonslibrary.parliament.uk/research-briefings/cbp-10494/)) | 1 Apr 2027 | Confirmed | 153 → about 154 UTLAs. A new boundary vintage and Fingertips area type are likely | Plan a `ctyua27` vintage. Keep `ctyua23` for history. Footnote Surrey now |
| R5 | Three further ICB boundary changes; most mergers deferred ([The MJ](https://www.themj.co.uk/icb-mergers-delayed-reorganisation-review)) | 1 Apr 2027; mergers about 1 Apr 2028 | 2027 changes confirmed (trade press); 2028 proposed | Another ICB vintage within a year | Treat vintage as a first-class dimension. Never model clusters as areas |
| R6 | Fingertips replaced by "Find public health data" on GOV.UK; Fingertips maintained until launch ([Fingertips](https://fingertips.phe.org.uk/profile/guidance/supporting-information/new-service)) | Beta 2026; launch 2027; switch-off undated | Plan confirmed; dates proposed | Pipeline is hard-wired to the legacy host, endpoints, 20 required CSV columns, `profile_id` and area-type IDs. It will fail once the legacy API goes | Put `fingertips.mjs` behind an adapter interface. Archive raw responses with dates. Join the beta and the switching webinars. Freeze the current snapshot as a citable release |
| R7 | NHS England merged into DHSC ([Civil Service World](https://www.civilserviceworld.com/news/article/dhsc-details-timeline-for-completion-of-nhs-england-merger); [Commons Library](https://commonslibrary.parliament.uk/research-briefings/cbp-11078/)) | "New DHSC" from Apr 2027, subject to the Health Bill 2026-27 | Proposed | Uncertain future for NHS regions (area type 223) and for publisher naming | Check region status before labelling regions as current after April 2027 |
| R8 | LGR decisions for Essex, Hampshire & IoW, Norfolk and Suffolk withdrawn; 14 further decisions reportedly paused ([HCWS286](https://questions-statements.parliament.uk/written-statements/detail/2026-07-16/hcws286); [Local Government Lawyer](https://www.localgovernmentlawyer.co.uk/governance/396-governance-news/101103-secretary-of-state-announces-next-raft-of-local-government-reorganisation-decisions)) | Withdrawn 7 Sep 2026; original vesting 1 Apr 2028 | Proposed, uncertain | If revived, dozens of UTLA code changes and UTLA series breaks | Monitor MHCLG. Build crosswalks instead of hard-coding 153 |
| R9 | ICD-10 → ICD-11 for death coding ([NISRA](https://www.nisra.gov.uk/statistics/births-deaths-and-marriages/icd-11-implementation)) | About Jan 2028 (NISRA, citing E&W alignment); ONS date unconfirmed | Proposed | Discontinuity in respiratory, CVD, cancer and alcohol mortality | Add a "series break" concept to trend and comparison logic |
| R10 | QOF 2026/27 contract changes ([NHS England](https://www.england.nhs.uk/long-read/changes-to-the-gp-contract-in-2026-27/)) | From 1 Apr 2026 | Confirmed | No register-definition change found for asthma, COPD, hypertension or depression | Refresh. Keep the recorded-prevalence guard |
| R11 | amCharts 5 free licence, Cloudflare Workers Static Assets, OGL v3.0 ([Cloudflare](https://developers.cloudflare.com/workers/static-assets/index); [ComponentSource](https://www.componentsource.com/product/amcharts/factsheet)) | No change found | Not applicable | Low. Pinned amCharts 5.21.2 is affected only on upgrade | Keep exact pins. Re-check amCharts' licence before upgrading. Update "© 2026" attribution years on refresh |

The FPHD migration (R6) is the highest-impact item, and its timing is the least certain. Sources even disagree on its status: HTN calls Fingertips "end-of-life", while OHID says it will be maintained until the new service launches. Several things are unknown:

- no API specification has been published
- there is no statement on whether indicator, profile or area-type IDs carry over
- there is no redirect plan
- there is no decommissioning date

Profiles are a Fingertips navigation concept, and the current `all_data/csv` endpoint requires a `profile_id`. A topic-based successor that drops profiles would therefore break every observation fetch, not just a few. The pipeline's abort guards mean failure would be loud rather than silent, which is good. Loud failure without a ready adapter still means frozen data. ONS boundary services are a lower risk: new vintages are published as new services, and the pinned old ones are rarely deleted. The pipeline's reliance on parenthesis-free service-name aliases is undocumented, however.

Internal documentation drift is a provenance risk in its own right:

- `docs/DATA.md` still describes 14 indicators from a single profile.
- `docs/LIMITATIONS.md` names INHALE as the source for everything.
- `docs/IMPLEMENTATION-PLAN.md` describes April 2023 ICB and 2024 NHSER layers that the pipeline deliberately does not use.

A reviewer checking provenance against these documents would be misled.

Several items could not be verified, because fingertips.phe.org.uk and gov.uk were unreachable during research:

- whether Fingertips has added an ICB-2026 area type
- per-indicator release dates
- the ONS ICD-11 date
- an official GOV.UK confirmation of the September 2026 LGR withdrawals

Running `GET /api/area_types` and `GET /api/areas/by_area_type?area_type_id=221` is the fastest way to resolve the ICB question.

## Conclusion

The atlas cannot compete on data. Within about a year, FPHD will offer an official API, packages and versioned archives over the same indicators. The atlas's durable value lies in its claim discipline: statements that shrink as evidence weakens, refusals that block invalid comparisons, and exports that carry their own provenance. That makes correctness of the guardrails the product. A guardrail that is subtly wrong does more damage than having no guardrail, because it lends false authority. The examples are a 95% sentence sitting beside a 99.8% flag, "no significant change" where the publisher calculated nothing, and an IMD score described as recorded prevalence. Fixes 1–5 in the table are therefore not polish. They come before any expansion of scope.

On freshness, the atlas has to stop treating geography and data source as fixed constants. ICB vintages (2022, 2026, 2027 and probably 2028), the UTLA vintage after Surrey, a coding break around 2028 and a source-API change in 2027 all point the same way:

- treat boundary vintage and series breaks as first-class dimensions
- put the source behind a replaceable adapter
- publish each data build as a dated, citable release that records which revisions it superseded

Done that way, the 2027 transition becomes an opportunity rather than a failure. The atlas can be one of the first independent consumers of FPHD, with a frozen Fingertips-era snapshot preserved for reproducibility.
