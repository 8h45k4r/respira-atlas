# Data freshness and invalidation risks for the Public Health Evidence Atlas (as of 13 November 2026)

Method note: research was done on 13 Nov 2026 with web search only. Direct page fetches to fingertips.phe.org.uk, www.gov.uk and thenhsalliance.org failed (the hosts are not on this session's network allowlist), so primary-page claims below come from search-result extracts of those pages. They have not been re-read in full. Where a claim rests on a secondary or low-quality source, the note says so. "Confirmed" means enacted or in force. "Proposed/announced" means planned but not in force.

## What exactly does the atlas depend on, and when was it retrieved?

### Takeaway
The committed dataset was generated on 2026-10-18T09:09:40Z. It is pinned to the legacy Fingertips API at `https://fingertips.phe.org.uk/api`, to 5 Fingertips profiles, to 3 Fingertips area types (502, 221, 223), and to 3 pinned ONS ArcGIS services plus a nations layer and a BUA layer. Each of these pins has a dated change on the horizon.

### Cited Findings
- All config values were "confirmed against the live source on 2026-10-18", and the manifest `generatedAt` is `2026-10-18T09:09:40.295Z`. Every indicator carries that retrieval timestamp. — [scripts/prepare-data/config.mjs](/home/user/respira-atlas/scripts/prepare-data/config.mjs); [public/data/manifest.json](/home/user/respira-atlas/public/data/manifest.json)
- API base is `https://fingertips.phe.org.uk/api`. Endpoints used: `/profiles`, `/area_types`, `/available_data?indicator_id=`, `/indicator_metadata/by_indicator_id?...&include_definition=yes`, `/areas/by_area_type?area_type_id=`, `/all_data/csv/by_indicator_id?indicator_ids=&child_area_type_id=&parent_area_type_id=15&profile_id=`. 20 CSV columns are required, and a missing column aborts the run. — [scripts/prepare-data/fingertips.mjs](/home/user/respira-atlas/scripts/prepare-data/fingertips.mjs)
- Profiles: 29 Respiratory disease (INHALE), 50 Adult mental health and wellbeing, 105 Child and Maternal Health, 125 Mortality Profile, 135 Cardiovascular Disease. Profile 18 (Smoking) is declared but unused in INDICATORS. — [manifest.json `sourceProfiles`](/home/user/respira-atlas/public/data/manifest.json); [config.mjs](/home/user/respira-atlas/scripts/prepare-data/config.mjs)
- Area types:
  - 502 "Upper tier local authorities (post 4/23)" joins to `Counties_and_Unitary_Authorities_May_2023_UK_BUC` (218 UK features; 153 England areas).
  - 221 "ICBs, former STPs" joins to `Integrated_Care_Boards_July_2022_EN_BFC_2022` (42).
  - 223 "NHS regions" joins to `NHS_England_Regions_July_2022_EN_BGC_2022` (7).
  - Nations come from `Countries_December_2025_Boundaries_UK_BUC` (4). Settlements come from `BUA_2022_GB` (8,545).
  - The England benchmark is E92000001 (area type 15).
  - The ArcGIS host is `services1.arcgis.com/ESMARspQHYMw9BZ9`.
  - Source: [config.mjs](/home/user/respira-atlas/scripts/prepare-data/config.mjs); [settlements.mjs](/home/user/respira-atlas/scripts/prepare-data/settlements.mjs)
- The ICB and NHS-region layers were chosen as July 2022 vintages on purpose. The April 2023 ICB layer recodes E54000052/53 to E54000063/64. The Jan 2024 NHSER layer recodes E40000007/10 to E40000013/14. Fingertips 221/223 publish against the July 2022 codes. — [docs/DATA.md](/home/user/respira-atlas/docs/DATA.md)
- 35 indicators. Latest committed periods:
  - Mortality and life expectancy at UTLA: mostly 2023-25.
  - Mortality and life expectancy at ICB/region: 2022-24.
  - QOF prevalence (253, 90933, 219, 848): 2024/25.
  - Emergency admissions: 2024/25.
  - Smoking APS (92443): 2025.
  - PM2.5 (93867): 2024.
  - IMD (94240): IMD 2025.
  - Alcohol-specific mortality: 2024.
  - Self-harm admissions: 2022/23 (ICB) and 2023/24 (UTLA).
  - Fuel poverty 93759 is excluded because the API declares it at 8 area types but returns zero rows.
  - Source: [manifest.json `latestPeriodByGeography`](/home/user/respira-atlas/public/data/manifest.json); [docs/DATA.md](/home/user/respira-atlas/docs/DATA.md)
- amCharts 5 is pinned at 5.21.2 under the free licence, with the attribution link kept. Deployment is Cloudflare Workers Static Assets (`wrangler` 4.151.1, `compatibility_date` 2026-10-18, `not_found_handling: single-page-application`). — [docs/LICENSING.md](/home/user/respira-atlas/docs/LICENSING.md); [package.json](/home/user/respira-atlas/package.json); [wrangler.jsonc](/home/user/respira-atlas/wrangler.jsonc)
- Pipeline safeguards:
  - It aborts on a changed boundary feature count, missing definitions, a header-only CSV, or a missing profile.
  - Validation re-checks every join by code.
  - There is no runtime API call: the data is committed and static.
  - Source: [docs/DATA.md](/home/user/respira-atlas/docs/DATA.md); [docs/LIMITATIONS.md](/home/user/respira-atlas/docs/LIMITATIONS.md)
- Doc inconsistency: docs/IMPLEMENTATION-PLAN.md still says ICB layer `Integrated_Care_Boards_April_2023_EN_BGC`, join fields `ICB23CD`/`NHSER24CD`, and "NHS England region (2024) → ICB (April 2023)". config.mjs and DATA.md use the July 2022 vintages. Also, DATA.md lists 14 indicators and profile 29 only, while README and the manifest have 35 indicators across 5 profiles. — [docs/IMPLEMENTATION-PLAN.md](/home/user/respira-atlas/docs/IMPLEMENTATION-PLAN.md) lines 43–59; [docs/DATA.md](/home/user/respira-atlas/docs/DATA.md)

### Inferences
- Because the data is static, no external change breaks the live site directly. The risks are of three kinds:
  - (a) Staleness: newer releases exist but are not shown.
  - (b) Invalidation: boundaries and organisations shown no longer exist, or the published series were revised.
  - (c) Breakage of `npm run data:prepare`: an API move, schema drift, or a count change trips the abort guards.
- The "dated" stamp is 18 Oct 2026. Anything OHID published after that date (for example the PHOF update of 3 Nov 2026, see below) is already missing.

### Gaps
- I did not re-run the pipeline or call the live API. Current API behaviour has not been verified.

## Fingertips: redesign, retirement, migration, API and domain changes; OHID/DHSC/NHSE restructuring

### Takeaway
**Confirmed:** OHID is building a replacement called "Find public health data". It has passed its GDS alpha assessment and is in beta. OHID targets a 2027 launch on GOV.UK. Fingertips, including its API, is maintained until then. No switch-off date for fingertips.phe.org.uk or its `/api` has been published. This is the single biggest medium-term risk: the whole pipeline is hard-wired to the legacy host, endpoints, CSV columns, profile IDs and area-type IDs.

### Cited Findings
- **Confirmed (OHID statistics page, via search extract):** "The technology behind our current public health data platform, Fingertips, needs updating, so we are creating a new public health data service for 2027." The new service will sit on GOV.UK. — [GOV.UK: Statistics at OHID](https://www.gov.uk/government/organisations/office-for-health-improvement-and-disparities/about/statistics)
- **Confirmed (Fingertips "New service updates" page, via search extract):**
  - The new service passed the GDS alpha assessment and "has now moved into the beta phase of development".
  - Its name is "Find public health data".
  - Webinars on switching from Fingertips were planned from September.
  - The profile feedback mailbox "will now no longer be monitored" so the team can focus on the transition.
  - Health statistics will continue to be published on Fingertips, which will be maintained until the new service launches.
  - The latest update seen was around Aug/Sep 2026.
  - Source: [Fingertips guidance – New service updates](https://fingertips.phe.org.uk/profile/guidance/supporting-information/new-service)
- **Confirmed (procurement):**
  - DHSC awarded Marvell Consulting a £1.25m contract to take "Find Public Health Data" to public beta, replacing the "end-of-life Fingertips service".
  - The scope includes an API for advanced users plus R and Python packages.
  - The service was described as being at an early MVP stage in April 2026.
  - Sources: [HTN, 8 Apr 2026](https://htn.co.uk/2026/04/08/dhsc-outlines-future-of-fingertips-health-data-repository-in-1-25m-contract/); [Find a Tender notice 2025/S 000-037491 (DHSC: OHID MHISS Fingertips)](https://www.find-tender.service.gov.uk/Notice/037491-2025/PDF)
  - Conflict: HTN calls Fingertips "end-of-life", while the Fingertips site says it will be maintained until launch.
- **Confirmed:** the legacy API is still documented (JSON/CSV; the fingertipsR and fingertips_py clients). — [Fingertips guidance – API](https://fingertips.phe.org.uk/profile/guidance/supporting-information/api); [fingertipsR docs](https://docs.ropensci.org/fingertipsR/)
- **Confirmed (data still flowing):** OHID published a Public Health Outcomes Framework data update on 3 Nov 2026 with new data for 34 indicators, including suicide. That is after the atlas snapshot of 18 Oct 2026. — [GOV.UK: PHOF November 2026 data update](https://www.gov.uk/government/statistics/public-health-outcomes-framework-november-2026-data-update)
- **Confirmed (NHS England abolition):**
  - Announced 13 March 2025, with NHSE functions to be merged into DHSC subject to legislation.
  - DHSC told staff in January 2026 that the "new DHSC" would begin operating in April 2027 after enabling legislation.
  - The abolition was confirmed in the May 2026 King's Speech.
  - Sources: [Civil Service World](https://www.civilserviceworld.com/news/article/dhsc-details-timeline-for-completion-of-nhs-england-merger); [Institute for Government, "One year on"](https://www.instituteforgovernment.org.uk/comment/one-year-abolish-nhs-england)
- **Proposed/in progress (legislation):** the House of Commons Library tracks a "Health Bill 2026-27" (Bill 009 2026-27). — [Commons Library CBP-11078](https://commonslibrary.parliament.uk/research-briefings/cbp-11078/)
  - A low-quality secondary source instead names an "NHS Modernisation Bill" that passed the Commons on 8 Sep 2026 and was in the Lords in October 2026. — [theukcatpeople.co.uk](https://www.theukcatpeople.co.uk/post/nhs-england-abolished-2025-medicine-a-complete-guide)
  - These two accounts conflict. Treat the Commons Library as authoritative.
- **OHID organisation:** the most recent OHID restructure I found dates from about 2024. DHSC cut OHID staff, scrapped the OHID director-general post and split teams across three DG groups. — [LGC](https://www.lgcplus.com/services/health-and-care/national-agency-decimated-in-dhsc-restructure-09-02-2024/); [Wikipedia: OHID](https://en.wikipedia.org/wiki/Office_for_Health_Improvement_and_Disparities)

### Inferences
- The new service lives on GOV.UK, so the `phe.org.uk` domain and the `/api/...` URL scheme are very likely to change, probably in 2027. The new API is a separate build, so endpoint names, the CSV column set (the 20 REQUIRED_COLUMNS), the profile/area-type ID schemes and the `include_definition`/`profile_id` quirks may not survive. When the legacy API goes away, `data:prepare` will fail loudly because of its guards. The committed data stays valid but frozen.
- Profiles are a Fingertips navigation concept. A topic-based successor may not keep profile IDs 29, 50, 105, 125 or 135. Because `all_data/csv` *requires* `profile_id`, losing profile IDs would break every observation fetch.
- Moving NHSE into DHSC (target April 2027) does not on its own change Fingertips. It does create uncertainty over the future of NHS England regions as a statistical geography (area type 223).
- The atlas's attribution string "Office for Health Improvement and Disparities" and the publisher URL `fingertips.phe.org.uk/profile/inhale` will need updating at migration.

### Gaps
- I found no published decommission date for fingertips.phe.org.uk or its API. I also found no public spec of the new API, no statement on whether profile IDs or indicator IDs will carry over, and no URL redirect plan.
- I found no 2025–26 announcement absorbing OHID further into DHSC beyond the existing arrangement. The specific "profile retirements or merges" for the Respiratory disease, Adult mental health, CMH, Mortality and CVD profiles could not be checked, because the Fingertips site itself could not be fetched.

## Geography: local government reorganisation, ONS boundary vintages, ICB mergers, NHS regions

### Takeaway
**ICBs (confirmed):** on 1 April 2026, 12 ICBs were abolished, 6 were created and Hampshire & Isle of Wight was widened, taking England from 42 to 36 ICBs. The atlas's 42-ICB July 2022 layer therefore no longer describes current NHS organisations.

**Further ICB mergers (proposed then deferred):** planned for April 2027, most were deferred on 6 Oct 2026 to at least April 2028. Three boundary changes remain for April 2027.

**UTLAs:** Surrey is confirmed to split into East Surrey and West Surrey unitaries on 1 April 2027, which is the first change to the 153-UTLA set since April 2023. Other LGR areas are in flux. Decisions for Essex, Hampshire & IoW, Norfolk and Suffolk were withdrawn on 7 Sep 2026, and the 14 decisions of 16 July 2026 were reportedly paused. The earliest further vesting is around April 2028.

### Cited Findings
- **Confirmed ICB changes, 1 Apr 2026:**
  - New ICBs: West and North London (from NCL and NWL); Essex (replacing Mid & South Essex); Norfolk and Suffolk (from Norfolk & Waveney and Suffolk & NE Essex); Central East (from C&P, BLMK, Herts & West Essex); Surrey and Sussex; Thames Valley (from Bucks/Oxon/Berks West, i.e. BOB).
  - Frimley was abolished and split across three ICBs.
  - Hampshire & IoW had a boundary change only.
  - Sources: [NHS Alliance – ICB boundary changes in effect from 1 April 2026](https://thenhsalliance.org/resources/icb-mergers-lessons-for-future-success/icb-boundary-changes-in-effect-from-1-april-2026); [NHS England – Integrated care in your area](https://www.england.nhs.uk/integratedcare/integrated-care-in-your-area/); [NHS England Digital ODS – ICB mergers Phase 1 April 2026](https://digital.nhs.uk/services/organisation-data-service/upcoming-code-changes/icb-mergers-2026-change-summary)
- **Confirmed count:**
  - NHS England states that the 2026 Order "establishes 6 new ICBs, abolishes 12 existing ICBs and widens the boundary of an existing ICB with effect from 1 April 2026", and publishes a map of "the 36 ICBs" with clustering arrangements. — [NHS England – Integrated care boards in England](https://www.england.nhs.uk/publication/integrated-care-boards-in-england/); [NHS England ICB map April 2026 (PDF)](https://www.england.nhs.uk/wp-content/uploads/2026/04/nhs-england-icb-map-april-2026.pdf)
  - The NAO instead counts "42 to 25 ICBs or clusters". Clusters keep separate legal entities and unchanged boundaries. — [NAO, restructuring of ICBs summary (Nov 2026)](https://www.nao.org.uk/wp-content/uploads/2026/11/restructuring-of-integrated-care-boards-summary.pdf)
- **Confirmed (ONS boundaries):**
  - ONS published Integrated Care Boards (April 2026) boundaries (BFE/BFC/BGC/BSC) with field `ICB26CD`, created 22 Apr 2026. Example new code: E54000066 Essex.
  - A Sub-ICB Locations (April 2026) layer (`SICBL26CD`) was published alongside.
  - Sources: [data.gov.uk – ICB April 2026 BFE](https://www.data.gov.uk/dataset/a523957f-061b-47c2-b1db-cc42cee0ccd0/integrated-care-boards-april-2026-boundaries-en-bfe); [CKAN – ICB April 2026 BGC](https://ckan.publishing.service.gov.uk/dataset/integrated-care-boards-april-2026-boundaries-en-bgc)
- **Data publishers re-basing:** CVDPREVENT has published a notice about changes to ICB geographies. — [CVDPREVENT – Changes to ICB geographies](https://www.cvdprevent.nhs.uk/news/changes-to-integrated-care-board-icb-geographies)
- **Proposed then deferred:** on 6 Oct 2026, NHS England told ICBs that most cluster mergers planned for April 2027 will not go ahead. Clusters stay as they are until at least April 2028. Footprint decisions are extended to September 2027, with full implementation on 1 April 2028, because of the LGR pause. Three boundary changes remain for April 2027, including part of Buckinghamshire moving from Central East to Thames Valley ICB. — [The MJ](https://www.themj.co.uk/icb-mergers-delayed-reorganisation-review); [Healthcare Management UK](https://www.healthcare-management.uk/breaking-news-icb-mergers-delayed-local-government-reorganisation-review)
- **Background:** the original plan was for ICBs to cut running costs and align with strategic-authority footprints. — [Written statement 9 Sep 2025, HCWS915](https://questions-statements.parliament.uk/written-statements/detail/2025-09-09/hcws915); [NHS England – Implementing ICB mergers and boundary changes April 2026 and 2027](https://www.england.nhs.uk/long-read/implementing-integrated-care-board-mergers-and-boundary-changes-to-take-effect-in-april-2026-and-2027/)
- **Confirmed (Surrey):** the 12 existing councils will be dissolved on 31 Mar 2027. East Surrey and West Surrey unitary councils take over on 1 Apr 2027 (vesting day). Shadow elections were held 7 May 2026. — [Surrey LGR hub](https://www.surreylgrhub.gov.uk/frequently-asked-questions); [Spelthorne BC](https://www.spelthorne.gov.uk/page/1747/local-government-surrey-changing); [Commons Library CBP-10494](https://commonslibrary.parliament.uk/research-briefings/cbp-10494/)
- **Announced (other LGR areas):**
  - Decisions for Essex/Southend/Thurrock, Hampshire/IoW/Portsmouth/Southampton, Norfolk and Suffolk were announced 25 Mar 2026.
  - On 16 Jul 2026, decisions followed for 14 more areas: Derbyshire, Devon, East Sussex & Brighton, Gloucestershire, Hertfordshire, Kent, Lancashire, Leicestershire, Lincolnshire, Nottinghamshire, Oxfordshire, Staffordshire, Warwickshire, Worcestershire.
  - The planned timetable was first elections May 2027 and vesting 1 April 2028.
  - Sources: [Written statement HCWS286, 16 Jul 2026](https://questions-statements.parliament.uk/written-statements/detail/2026-07-16/hcws286); [Hansard 16 Jul 2026](https://hansard.parliament.uk/commons/2026-07-16/debates/26071631000030/LocalGovernmentReorganisation); [Commons Library maps CBP-10608](https://commonslibrary.parliament.uk/research-briefings/cbp-10608/)
- **Reversal (Sep 2026):** on 7 Sep 2026 the government withdrew the LGR decisions for Essex, Suffolk, Norfolk and Hampshire & IoW. Withdrawal does not stop new decisions. Reportedly, councils covered by the 16 July decisions were told to stop implementing them, though those decisions were not formally withdrawn. — [Local Government Lawyer](https://www.localgovernmentlawyer.co.uk/governance/396-governance-news/101103-secretary-of-state-announces-next-raft-of-local-government-reorganisation-decisions); secondary/blog: [Truth About Local Government](https://www.truthaboutlocalgovernment.com/post/england-s-local-government-reorganisation-reset-what-has-happened-what-is-still-going-ahead-and-wh); [Wikipedia – Upcoming structural changes](https://en.wikipedia.org/wiki/2027%E2%80%932028_planned_structural_changes_to_local_government_in_England)
  - The "stop implementing" claim rests on lower-quality sources. Verify it on GOV.UK.
- **ONS vintages:** CTYUA December 2024 and December 2025 boundary layers exist (BFC/BFE/BGC/BSC/BUC). LAD December 2025 also exists. — [Geoportal CTYUA Dec 2024 BUC](https://geoportal.statistics.gov.uk/maps/ons::counties-and-unitary-authorities-december-2024-boundaries-uk-buc-2); [LAD Dec 2025 BFE](https://open-geography-portalx-ons.hub.arcgis.com/datasets/ons::local-authority-districts-december-2025-boundaries-uk-bfe)

### Inferences
- **UTLA:** until 31 Mar 2027, the 153 England UTLAs on CTYUA May 2023 codes remain the current set. The Dec 2024 and Dec 2025 layers should carry the same England codes, since there was no structural change in England between Apr 2023 and Apr 2027; this was not verified feature-by-feature. From 1 Apr 2027, Surrey CC (E10000030) is replaced by two new E06 unitaries. That gives roughly 154 England UTLAs, and needs a new CTYUA vintage (around CTYUA Apr 2027 or Dec 2027) and a new Fingertips area type, probably "post 4/27".
  - Fingertips will likely keep publishing historical series on area type 502 for a while. Data for 2027 onward will appear on new codes, at which point the "ctyua23" join breaks for Surrey only.
  - If any of the paused areas go ahead in April 2028, a much bigger code change would follow. For example, Essex, Hampshire, Norfolk and Suffolk alone would replace 4 counties plus several existing unitaries.
- **ICB:**
  - The committed ICB series (2024/25 admissions, 2022-24 mortality) is correctly on the 42 pre-2026 ICBs for those periods, but the atlas presents them as current "Integrated care boards".
  - The first ICB-level releases for 2025/26 or 2026/27 periods, published from about mid-2026 to 2027, will likely be on the 36 April-2026 ICBs: ICB26CD codes, ~36 features, and either a new Fingertips area type or a redefinition of 221.
  - If Fingertips redefines area type 221 in place, validation will flag unmatched codes and `/areas/by_area_type` will no longer return 42. If it adds a new area type, the atlas silently stops receiving new ICB periods (staleness rather than breakage).
  - Further change is expected in April 2027 (3 boundary changes) and around April 2028 (mergers).
- **NHS regions:** the NHSE-into-DHSC merger raises the question of whether the 7 NHS England regions (area type 223) survive as a statistical geography after April 2027. No evidence of their abolition was found.

### Gaps
- I could not confirm whether Fingertips has already added an April-2026 ICB area type, or whether 221 has been redefined, because fingertips.phe.org.uk was unreachable. Run `GET /api/area_types` and `GET /api/areas/by_area_type?area_type_id=221` to check.
- I could not confirm the full list of 36 ICB26CD codes, the identity of the three remaining April 2027 boundary changes, or an authoritative GOV.UK statement on the September 2026 LGR withdrawals.
- No source found on NHS region boundary or code changes for 2026–27.

## Indicator-level release calendars and methodology changes

### Takeaway
Several key series have already been revised or refreshed since the 18 Oct 2026 snapshot, or soon will be:
- PHOF update on 3 Nov 2026.
- ONS mid-2025 population estimates, which revised mid-2022 to mid-2024 (E&W on 29 Jul 2026, UK on 1 Oct 2026). These feed every DSR and crude rate.
- QOF 2025/26 annual data, normally published in autumn.
- A planned ICD-11 switch for mortality coding, expected around January 2028 according to NISRA, which says it is aligned with England & Wales. ONS has not confirmed a date.

### Cited Findings
- **Confirmed:**
  - ONS mid-2025 population estimates for England and Wales were published 29 Jul 2026 and revised mid-2022, mid-2023 and mid-2024. Mid-2024 E&W was lowered to 61,785,000.
  - The UK mid-2025 release on 1 Oct 2026 revised UK mid-2022 to mid-2024 with updated international migration. UK mid-2024 became 69,256,300.
  - Sources: [ONS mid-2025 E&W bulletin (PDF)](https://www.ons.gov.uk/peoplepopulationandcommunity/populationandmigration/populationestimates/bulletins/populationestimatesforenglandandwales/mid2025/pdf); [ONS mid-2025 UK bulletin (PDF)](https://www.ons.gov.uk/peoplepopulationandcommunity/populationandmigration/populationestimates/bulletins/annualmidyearpopulationestimates/mid2025/pdf); [ONS quarterly population update Aug 2026](https://www.ons.gov.uk/peoplepopulationandcommunity/populationandmigration/populationestimates/articles/quarterlyupdateonpopulationandmigrationstatistics/august2026)
- **Confirmed (precedent):** OHID adopted the Census-2021-rebased mid-year estimates for 2013–2022 in January 2025, then revised 2023, and recalculated whole DSR time series. This shows that Fingertips back-revises entire series when denominators change. — [Fingertips excess mortality methodology](https://fingertips.phe.org.uk/documents/excess-mortality-within-england-post-pandemic-method.htm)
- **Confirmed (refresh cadence):** the PHOF November 2026 update (3 Nov 2026) added new data for 34 indicators, including suicide rate. The atlas's suicide indicator 41001 latest period is 2022-24. — [GOV.UK PHOF Nov 2026](https://www.gov.uk/government/statistics/public-health-outcomes-framework-november-2026-data-update); [manifest.json](/home/user/respira-atlas/public/data/manifest.json)
- **Confirmed (QOF):** QOF 2026/27 changes were imposed by NHS England after GPC England rejected the offer. They add obesity indicators OB004/OB005 (+18 points), reallocate CHD/Stroke BP indicators into CD001/CD002, and retire some CHD/STIA indicators. No changes to the asthma, COPD, hypertension or depression *register* (prevalence) definitions were found. — [NHS England – Changes to the GP contract in 2026/27](https://www.england.nhs.uk/long-read/changes-to-the-gp-contract-in-2026-27/); [QOF guidance 2026/27 July update (PDF)](https://www.england.nhs.uk/wp-content/uploads/2026/03/prn02356-quality-outcomes-framework-guidance-2026-27-july-update.pdf); [Pulse](https://www.pulsetoday.co.uk/news/clinical-areas/paediatrics/gp-contract-to-include-qof-refinements-and-additional-points-worth-25m/)
- **Proposed (ICD-11):** NISRA expects to switch death coding to ICD-11 around January 2028, "in line with England and Wales and Scotland". An ONS FOI (FOI-2026-2605) says ONS is "preparing for the transition" but gives no date in the extract. — [NISRA ICD-11 implementation](https://www.nisra.gov.uk/statistics/births-deaths-and-marriages/icd-11-implementation); [ONS FOI-2026-2605](https://www.ons.gov.uk/aboutus/transparencyandgovernance/freedomofinformationfoi/impactoficd10fcodechangesononsmortalitystatistics)
- **Confirmed (cause-of-death reporting changes already in the series):** ONS publishes on death certification reform (medical examiner system from 9 Sep 2024), which can affect cause-of-death recording. — [ONS death certification reform 2025](https://www.ons.gov.uk/peoplepopulationandcommunity/birthsdeathsandmarriages/deaths/articles/deathcertificationreformenglandandwales/2025/pdf)

### Inferences
- **Mortality and life expectancy indicators** (90366, 93823, 93721, 93963, 40701, 93724, 1204, 40401, 93956, 40501, 93959, 41001, 92196, 90801, 91380):
  - The next scheduled refresh adds 2024-26 / 2025 data, typically from around Q4 2026 to Q1 2027 based on the usual ONS deaths release timing (not verified).
  - It may also back-revise 2022-24 and 2023-25 values once OHID adopts the July/Oct 2026 population revisions.
  - Committed values may then differ from the live Fingertips values, even for the same period, which makes the atlas's numbers non-reproducible against the source.
- **ICD-11 (around 2028 or later):** this would cause a coding discontinuity in respiratory, COPD, CVD and cancer mortality series. The atlas's trend logic (2-point rule, pooled vs single-year split) would need a "series break" concept.
- **QOF prevalence** (253, 90933, 219, 848): 2025/26 annual data (normally published by NHS England around September–October) is likely already available or imminent and would replace 2024/25. No register definition change was found for these four.
- **Smoking APS** (92443): 2025 is the latest. The 2026 APS-based release would typically arrive around late 2027.
- **PM2.5** (93867): latest is 2024. The 2025 concentration update normally arrives with the annual PHOF refresh. The indicator is already a "new method" series, so a further method change is possible but unconfirmed.
- **Fuel poverty** (93759): remains excluded. DESNZ sub-regional fuel poverty is normally published in spring each year. The API discrepancy may have been fixed upstream. Re-test on the next run.
- **IMD 2025** (94240): stable until the next IMD (multi-year cycle).

### Gaps
- I did not obtain OHID's Fingertips release calendar for specific next-update dates per indicator. The GOV.UK statistics release calendar and the Fingertips "data updates" page were unreachable. Dates above marked as "typical" are inferences, not citations.
- I did not confirm whether OHID has adopted the mid-2025-revised denominators, whether the European Standard Population 2013 is being changed (no evidence found of any change), or the ONS ICD-11 date.

## Third-party dependencies: ONS Open Geography Portal API, amCharts 5, Cloudflare, OGL

### Takeaway
I found no announced breaking change to amCharts 5 free-licence terms, the OGL v3.0, or Cloudflare Workers Static Assets `not_found_handling`. Cloudflare's direction of travel continues to favour Workers Static Assets over Pages, which the atlas already uses. The main third-party risk is ONS layer naming: new vintages are new services, and old services are pinned by name, so the risk is staleness rather than breakage.

### Cited Findings
- **amCharts:** the free licence has full functionality but requires amCharts attribution on all charts, with no support included. Reseller listings were updated April–June 2026 and mention no change to terms. No 2026 terms change was found. — [ComponentSource amCharts licensing fact sheet](https://www.componentsource.com/product/amcharts/factsheet)
  - These are secondary or reseller pages. amCharts' own licence page was not fetched.
- **Cloudflare:**
  - The docs describe `not_found_handling: "single-page-application"`, which returns index.html with HTTP 200 for unmatched paths.
  - A Pages-to-Workers migration guide exists.
  - The static-site docs show compatibility dates up to 2026-08-13.
  - No deprecation of the setting was found.
  - Sources: [Cloudflare Static Assets](https://developers.cloudflare.com/workers/static-assets/index); [Migrate from Pages](https://developers.cloudflare.com/workers/static-assets/migrate-from-pages/); [Static asset limits increased (changelog 2025-09-02)](https://developers.cloudflare.com/changelog/post/2025-09-02-increased-static-asset-limits/index.md)
  - An `assets_navigation_prefers_asset_serving` compatibility flag appeared in preview docs, but its status is unconfirmed. — [Cloudflare SSG docs](https://developers.cloudflare.com/workers/static-assets/routing/static-site-generation/)
- **ONS Open Geography Portal:**
  - Each dataset is exposed through ArcGIS REST, WFS and downloads. The CTYUA December 2024 and December 2025 series and ICB April 2026 series are published.
  - Sources: [Geoportal](https://geoportal.statistics.gov.uk/); [CKAN ICB April 2026 BGC](https://ckan.publishing.service.gov.uk/dataset/integrated-care-boards-april-2026-boundaries-en-bgc)
  - No announced change to the `services1.arcgis.com/ESMARspQHYMw9BZ9` host or query API was found.
- **OGL v3.0:** no change found. The atlas's attribution says "© Crown copyright and database right 2026", which is year-specific. — [config.mjs BOUNDARY_LICENCE](/home/user/respira-atlas/scripts/prepare-data/config.mjs)

### Inferences
- The pinned ONS services (May 2023 CTYUA, July 2022 ICB/NHSER, Dec 2025 nations, BUA 2022) will probably stay online, because ONS rarely deletes old vintages. However, ONS has historically re-published or renamed services (for example the `_2022` suffix aliases), and the parenthesis-free aliases the pipeline relies on are an undocumented convenience. Neither of these was verified as an announced risk.
- amCharts 5.21.2 is pinned exactly, so licence or API drift only matters when upgrading. The licence terms that apply are those in force for that version.
- Attribution years ("2026") will look dated from January 2027 if the data is refreshed without updating them.

### Gaps
- I could not read amCharts' own licence page or the Cloudflare changelog in full. I found no ONS geoportal service-deprecation notice, which is neither confirmation nor refutation.

## Consolidated risk register (dated; confirmed vs proposed)

### Takeaway
Highest-impact, nearest-dated items:
1. ICB geography is already out of date (36 ICBs since 1 Apr 2026). This is confirmed.
2. Committed data is already behind the source: the PHOF update of 3 Nov 2026 and the ONS population revisions of Jul and Oct 2026. Both are confirmed.
3. Surrey splits on 1 Apr 2027. This is confirmed.
4. Fingertips is to be replaced by "Find public health data" on GOV.UK, targeted for 2027. This is confirmed as a plan with no switch-off date.
5. NHSE moves into DHSC, with the new DHSC operating from April 2027. This is subject to the bill.
6. Further LGR and ICB mergers are possible around April 2028. These are proposed and currently paused.
7. ICD-11 is expected around January 2028 or later. This is proposed.

### Cited Findings
Each row's evidence is cited in the sections above. Status: C = confirmed or in force; P = proposed or announced but not in force.

| # | What changes | When | Status | Likely impact on atlas | Evidence | Suggested mitigation |
|---|---|---|---|---|---|---|
| R1 | 42 ICBs become 36: 12 abolished, 6 created, H&IoW widened; ONS ICB April 2026 layer (`ICB26CD`) published | 1 Apr 2026; layer 22 Apr 2026 | C | "ICBs" layer (`icb22`, 42) shows abolished organisations. Future ICB-level periods will be on new codes; a join failure or silent staleness depends on how Fingertips publishes them | [NHS England](https://www.england.nhs.uk/publication/integrated-care-boards-in-england/); [ODS](https://digital.nhs.uk/services/organisation-data-service/upcoming-code-changes/icb-mergers-2026-change-summary); [data.gov.uk ICB Apr 2026](https://www.data.gov.uk/dataset/a523957f-061b-47c2-b1db-cc42cee0ccd0/integrated-care-boards-april-2026-boundaries-en-bfe) | Relabel to "ICBs (2022–Mar 2026 boundaries)". Check `/api/area_types` for a new ICB type. Add `icb26` as a separate vintage, with no cross-vintage comparison (the atlas already blocks this). Update the IMPLEMENTATION-PLAN doc, which still says April 2023 |
| R2 | 3 further ICB boundary changes (including part of Bucks moving to Thames Valley); most cluster mergers deferred | 1 Apr 2027 (changes); decisions to Sep 2027; mergers ~1 Apr 2028 | C (2027 changes, per trade press) / P (2028) | Another ICB vintage within about 12 months; clusters ≠ legal ICBs | [The MJ](https://www.themj.co.uk/icb-mergers-delayed-reorganisation-review); [NHS England long-read](https://www.england.nhs.uk/long-read/implementing-integrated-care-board-mergers-and-boundary-changes-to-take-effect-in-april-2026-and-2027/) | Keep `expectedBoundaryCount` guards. Treat ICB vintage as a first-class dimension. Do not model clusters as areas |
| R3 | Surrey CC and 11 districts replaced by East Surrey and West Surrey UAs | 1 Apr 2027 (shadow councils elected 7 May 2026) | C | 153 → ~154 UTLAs. New CTYUA vintage and new Fingertips UTLA area type expected (inference). `ctyua23` (May 2023) cannot show 2027+ Surrey data | [Surrey LGR hub](https://www.surreylgrhub.gov.uk/frequently-asked-questions); [Commons Library CBP-10494](https://commonslibrary.parliament.uk/research-briefings/cbp-10494/) | Plan a `ctyua27` vintage. Keep `ctyua23` for historical periods. Footnote Surrey in UI copy now |
| R4 | LGR decisions for Essex, Hampshire & IoW, Norfolk, Suffolk (25 Mar 2026) withdrawn; 14 areas decided 16 Jul 2026 reportedly paused | Withdrawn 7 Sep 2026; original vesting 1 Apr 2028 | P (uncertain) | If it goes ahead: dozens of UTLA code changes from 2028 and a break in UTLA time series. If it does not, no change | [HCWS286](https://questions-statements.parliament.uk/written-statements/detail/2026-07-16/hcws286); [Local Government Lawyer](https://www.localgovernmentlawyer.co.uk/governance/396-governance-news/101103-secretary-of-state-announces-next-raft-of-local-government-reorganisation-decisions) | Monitor MHCLG statements. Design for best-fit or aggregation crosswalks (old district codes to new UAs) rather than hard-coded 153 |
| R5 | Fingertips replaced by "Find public health data" on GOV.UK, with a new API and R/Python packages; Fingertips maintained until launch; feedback mailbox closed | Beta 2026; launch targeted 2027; Fingertips switch-off undated | C (plan) / P (dates) | `data:prepare` will fail once the legacy `fingertips.phe.org.uk/api` goes. Endpoints, the 20 CSV columns, `profile_id` semantics and profile/area-type IDs may all change. Attribution and URLs date | [GOV.UK OHID statistics](https://www.gov.uk/government/organisations/office-for-health-improvement-and-disparities/about/statistics); [Fingertips new service](https://fingertips.phe.org.uk/profile/guidance/supporting-information/new-service); [HTN](https://htn.co.uk/2026/04/08/dhsc-outlines-future-of-fingertips-health-data-repository-in-1-25m-contract/) | Isolate the source adapter (`fingertips.mjs`) behind an interface. Archive raw CSV responses with retrieval dates. Join the OHID switching webinars and beta. Keep the committed snapshot as a frozen, citable release |
| R6 | NHS England abolished and functions merged into DHSC | Announced 13 Mar 2025; "new DHSC" from Apr 2027, subject to Health Bill 2026-27 | P (legislation in progress) | Possible changes to NHS England regions (area type 223) and to publisher naming. Low direct data impact near-term | [Civil Service World](https://www.civilserviceworld.com/news/article/dhsc-details-timeline-for-completion-of-nhs-england-merger); [Commons Library CBP-11078](https://commonslibrary.parliament.uk/research-briefings/cbp-11078/) | Watch for regional-geography changes. Avoid labelling "NHS England regions" as current organisations after Apr 2027 without checking |
| R7 | Snapshot older than source: PHOF update added data for 34 indicators | 3 Nov 2026 (snapshot 18 Oct 2026) | C | Some indicators (for example suicide 41001) may have newer periods or revisions than the atlas shows | [GOV.UK PHOF Nov 2026](https://www.gov.uk/government/statistics/public-health-outcomes-framework-november-2026-data-update) | Re-run `data:prepare`. Show "data retrieved 18 Oct 2026" prominently. Diff the latest periods per indicator |
| R8 | ONS mid-2025 MYE revised mid-2022 to mid-2024 denominators | E&W 29 Jul 2026; UK 1 Oct 2026 | C | When OHID adopts the revisions, DSRs, crude rates and life expectancy for 2022-24 and 2023-25 may be back-revised, so committed values may not reproduce against the source | [ONS mid-2025 E&W](https://www.ons.gov.uk/peoplepopulationandcommunity/populationandmigration/populationestimates/bulletins/populationestimatesforenglandandwales/mid2025/pdf); [ONS mid-2025 UK](https://www.ons.gov.uk/peoplepopulationandcommunity/populationandmigration/populationestimates/bulletins/annualmidyearpopulationestimates/mid2025/pdf); [Fingertips rebasing precedent](https://fingertips.phe.org.uk/documents/excess-mortality-within-england-post-pandemic-method.htm) | Record the denominator vintage in metadata where Fingertips states it. On refresh, diff old against new values for the same periods and log revisions |
| R9 | ICD-10 → ICD-11 for mortality coding | NISRA cites ~Jan 2028 "in line with E&W"; ONS date unconfirmed | P | Discontinuity in respiratory, COPD, CVD, cancer and alcohol mortality trends | [NISRA](https://www.nisra.gov.uk/statistics/births-deaths-and-marriages/icd-11-implementation); [ONS FOI-2026-2605](https://www.ons.gov.uk/aboutus/transparencyandgovernance/freedomofinformationfoi/impactoficd10fcodechangesononsmortalitystatistics) | Add a "series break" flag to the trend logic. Never join pre- and post-ICD-11 periods on one line |
| R10 | QOF 2026/27 contract changes (obesity, CVD/BP indicator restructure); 2025/26 annual QOF data | 2026/27 year (from 1 Apr 2026); annual data usually published in autumn | C | Prevalence registers for asthma, COPD, hypertension and depression unchanged as far as found. Committed 2024/25 QOF values superseded by 2025/26 once published | [NHS England GP contract 2026/27](https://www.england.nhs.uk/long-read/changes-to-the-gp-contract-in-2026-27/) | Refresh. Keep the "recorded prevalence ≠ disease prevalence" guard |
| R11 | ONS geography vintages roll on (CTYUA Dec 2024 and Dec 2025 exist; LAD Dec 2025) | Ongoing annual | C | Pinned May 2023 layer is three vintages old but code-identical for England until Apr 2027 (inference) | [Geoportal CTYUA Dec 2024](https://geoportal.statistics.gov.uk/maps/ons::counties-and-unitary-authorities-december-2024-boundaries-uk-buc-2) | Optionally move to the latest code-identical vintage. Keep code-set equality checks |
| R12 | amCharts 5 free-licence terms; Cloudflare Workers Static Assets; OGL v3.0 | No change found as of Nov 2026 | n/a | Low | [ComponentSource](https://www.componentsource.com/product/amcharts/factsheet); [Cloudflare docs](https://developers.cloudflare.com/workers/static-assets/index) | Keep exact version pins. Re-check amCharts' licence page before any upgrade. Update "© … 2026" attribution years on refresh |

### Inferences
- **Priority order for the maintainers:**
  1. R1/R7/R8: relabel the ICB layer and refresh the data now.
  2. R3: plan the Surrey 2027 vintage.
  3. R5: decouple the Fingertips adapter before 2027.
  4. R4/R9: monitor.
- **Internal documentation drift is itself a risk:** IMPLEMENTATION-PLAN.md describes April 2023 ICB and 2024 NHSER layers, and DATA.md describes 14 indicators and 1 profile. A reader checking provenance would be misled.

### Gaps
- Exact Fingertips next-update dates per indicator.
- Whether Fingertips has introduced an ICB-2026 area type.
- The Fingertips legacy API switch-off date.
- ONS's ICD-11 date.
- An official GOV.UK confirmation of the 7 Sep 2026 LGR withdrawals.

All of these were blocked or not found. fingertips.phe.org.uk and www.gov.uk need to be allowed in the session's network settings to verify them directly.
