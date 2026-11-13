# Comparable tools landscape: Public Health Evidence Atlas vs existing UK public-health indicator tools

Research date: 13 November 2026. Method note: web search only. Direct page fetches to fingertips.phe.org.uk and htn.co.uk failed (hosts not reachable from this research sandbox), so Fingertips/HTN facts below are from search-result summaries of those pages, not from full-page reads. Claims marked "unverified (background knowledge)" are not backed by a source found in this session. The report writer should treat them as leads, not facts.

Atlas baseline (from /home/user/respira-atlas/README.md, docs/METHODS.md, docs/LIMITATIONS.md): England only; 35 indicators, 11 topics, 5 Fingertips profiles; upper-tier LA (153), ICB (42), NHS England region (7); England benchmark is the publisher's own row; publisher's CIs (95% and 99.8%) and publisher's significance flag reused, no tests computed by the atlas; four non-value states (no value published / suppressed / not covered / not applicable) kept apart in the type system; templated, eligibility-gated evidence statements; four evidence stories; briefing composer exporting vector SVG, PNG, filtered CSV, JSON figure spec; coverage matrix; keyboard-operable data table; refuses better/worse flags for QOF recorded prevalence; no composite score; no lower-tier districts, MSOA, GP practice or sub-ICB; no deprivation or ethnicity breakdowns; no slope index of inequality; no API.

## Q1. The main comparable tools and what each does

### Takeaway
The atlas overlaps heavily with OHID Fingertips, its own data source. Fingertips is being replaced by "Find public health data" (FPHD) on GOV.UK, due 2027 and in beta in 2026. Each devolved nation runs its own profile tool: ScotPHO profiles, the PHW PHOF dashboard, and the NI HSCIMS dashboard. ONS Explore Local Statistics is the main UK-wide local-area tool. LG Inform, SHAPE, CVDPREVENT and the OHID/NHSE inequality dashboards fill benchmarking, estates and audit niches.

### Cited Findings

**OHID Fingertips and its successor, Find public health data (FPHD)**
- Fingertips is being replaced. The new service, "Find public health data (FPHD)", passed its GDS alpha assessment and has moved into beta. — [Fingertips guidance: New service updates](https://fingertips.phe.org.uk/profile/guidance/supporting-information/new-service) (search-result summary)
- OHID: "The technology behind our current public health data platform, Fingertips, needs updating, so we are creating a new public health data service for 2027. The new public health data service will be available on GOV.UK." — [Statistics at OHID, GOV.UK](https://www.gov.uk/government/organisations/office-for-health-improvement-and-disparities/about/statistics)
- DHSC awarded a £1.25m public-beta contract to Marvell Consulting Ltd, reported in April 2026. The service was then described as "currently at early MVP stage", with a 12-month initial term ending March 2027 and an optional 6-month extension. — [HTN, 8 Apr 2026](https://htn.co.uk/2026/04/08/dhsc-outlines-future-of-fingertips-health-data-repository-in-1-25m-contract/); [Find a Tender notice 037491-2025](https://www.find-tender.service.gov.uk/Notice/037491-2025)
- The contract covers:
  - an API for advanced users
  - R and Python packages
  - analyst upload and management tools
  - automated publication with redactions and an audit history
  - archiving of data versions, ideally through the National Archives

  — [HTN](https://htn.co.uk/2026/04/08/dhsc-outlines-future-of-fingertips-health-data-repository-in-1-25m-contract/)
- Fingertips is described as "end-of-life". The FPHD suppliers are running user-feedback surveys on the existing tools. — [HTN](https://htn.co.uk/2026/04/08/dhsc-outlines-future-of-fingertips-health-data-repository-in-1-25m-contract/); [Fingertips new-service page](https://fingertips.phe.org.uk/profile/guidance/supporting-information/new-service)
- The current Fingertips API returns JSON or CSV. Community packages exist: fingertipsR (rOpenSci) and fingertips_py. — [Fingertips API guidance](https://fingertips.phe.org.uk/profile/guidance/supporting-information/api); [fingertipsR](https://packages.ropensci.org/fingertipsR); [fingertips-py](https://pypi.org/project/fingertips-py/)
- Fingertips profile pages (Local Health, Health Profiles) were captured by the UK Government Web Archive in April 2026. This fits with archiving ahead of migration, but no source states the reason. — [UKGWA capture of Local Health, 9 Apr 2026](https://tnaqa.mirrorweb.com/ukgwa/20260409155755mp_/https://fingertips.phe.org.uk/profile/local-health); [UKGWA capture of Health Profiles, 24 Apr 2026](https://tnaqa.mirrorweb.com/ukgwa/20260424112753mp_/https://fingertips.phe.org.uk/profile/health-profiles)
- Fingertips significance testing:
  - Significance is calculated at 99.8% confidence where applicable.
  - Trends are also tested at 99.8%.
  - The spine chart benchmark defaults to England, but users can choose another.
  - A "Compare areas" bar-chart view exists.

  — [National GP Profiles user guide v8.3, Dec 2025](https://fingertips.phe.org.uk/documents/NGPP_userGuide_OHID20251202.pdf); [Fingertips user guide](https://fingertips.phe.org.uk/documents/fingertips_user_guide.pdf)

**Local Health (OHID small-area tool, inside Fingertips)**
- The August 2025 update refreshed MSOA, lower-tier and upper-tier LA, regional and England data. Ward and CCG data were removed. — [GOV.UK Local Health August 2025 update](https://www.gov.uk/government/statistics/local-health-august-2025-update)
- The tool currently presents data for MSOAs, local authorities and England. — [GOV.UK Local Health collection](https://www.gov.uk/government/collections/local-health-public-health-data-and-mapping-tool-for-small-areas)
- Local Health data are "not designed for time trend analysis". — [Fingertips Local Health](https://fingertips.phe.org.uk/profile/local-health) (search summary)

**OHID inequality tools**
- The OHID Health Inequalities Dashboard was last updated in May 2025. It presents inequality measures for key Fingertips indicators, mostly from the Public Health Outcomes Framework (PHOF). It sits alongside the Segment Tool and the CHIME tool on the Fingertips "Inequality Tools" page. — [Fingertips Inequality Tools](https://fingertips.phe.org.uk/profile/inequality-tools)
- The Segment Tool shows how age bands or causes of death contribute to life-expectancy gaps between two areas. — [NHS England: helpful sources of data](https://www.england.nhs.uk/about/equality/equality-hub/national-healthcare-inequalities-improvement-programme/data-and-insight/helpful-sources-of-data-external-tools/)
- NHS England runs a separate Health Inequalities Improvement Dashboard covering the Core20PLUS5 clinical areas. Local deprivation data are available through it and through Fingertips. — [NHS England Statement on Information on Health Inequalities, Nov 2023](https://www.england.nhs.uk/wp-content/uploads/2023/11/PR2128-i-nhs-englands-statement-on-information-on-health-inequalities.pdf) (older source, 2023)

**NHS England: CVDPREVENT**
- CVDPREVENT is a national audit of GP records showing how many people with CVD or high-risk conditions may be undiagnosed, under-treated or over-treated. It is open access. Inequality dimensions include ethnicity and deprivation. ICB Quality Improvement Data Packs are published on its site. — [CVDPREVENT Quality Improvement](https://www.cvdprevent.nhs.uk/quality-improvement); [CVDPREVENT Healthcare Improvement Plan, March 2025 refresh](https://s3.eu-west-2.amazonaws.com/nhsbn-static/CVDPREVENT/2025/March%202025%20refresh%20CVDPREVENT%20Healthcare%20Improvement%20Plan.pdf)

**ONS Explore Local Statistics (ELS)**
- ELS replaced the ONS Subnational Indicators Explorer and dataset, which are no longer updated. — [ONS subnational indicators dataset](https://www.ons.gov.uk/peoplepopulationandcommunity/wellbeing/datasets/subnationalindicatorsdataset)
- ELS lets users "find, compare and visualise statistics about places in the United Kingdom". All data download as XLSX, CSV, CSVW or JSON-Stat. — [ONS Explore local statistics](https://www.ons.gov.uk/explore-local-statistics/)
- Indicator count: "108 local indicators" appears on one indicator page; other pages give 98 to 116, so the count changes over time. Health indicators include female healthy life expectancy and reception-age obesity. — [ELS healthy life expectancy (female)](https://www.ons.gov.uk/explore-local-statistics/indicators/healthy-life-expectancy-female); [ELS reception obesity](https://www.ons.gov.uk/explore-local-statistics/indicators/obese-children-reception)
- ELS cannot visualise combined areas for some indicators. — [ELS reception obesity](https://www.ons.gov.uk/explore-local-statistics/indicators/obese-children-reception)
- Geographies: lower-tier LAs, upper-tier LAs, Combined Authorities, English regions and countries, varying by indicator. — [ELS QMI](https://www.ons.gov.uk/peoplepopulationandcommunity/healthandsocialcare/healthandwellbeing/methodologies/explorelocalstatisticsserviceqmi)
- The data are open on GitHub (ONSdigital/explore-local-statistics-data). — [GitHub](https://github.com/ONSdigital/explore-local-statistics-data/blob/main/README.md)
- The Conversation covered the service's launch. — [The Conversation](https://theconversation.com/school-results-smoking-rates-shop-closures-new-statistics-tool-helps-you-compare-local-areas-in-the-uk-227165)

**ONS Health Index for England**
- The latest release found is "Health in England: 2015 to 2021", published 16 June 2023, with the next release "to be announced".
- It covers national, regional and local authority levels, and ICS level is mentioned. It is a composite index.
- A companion piece, "How health has changed in your area 2015 to 2021", generates an article per local authority.

— [ONS Health in England 2015–2021](https://www.ons.gov.uk/peoplepopulationandcommunity/healthandsocialcare/healthandwellbeing/bulletins/healthinengland/2015to2021); [ONS How health has changed in your area](https://www.ons.gov.uk/peoplepopulationandcommunity/healthandsocialcare/healthandwellbeing/articles/howhealthhaschangedinyourarea2015to2021/2023-06-16); [ONS blog 2023](https://blog.ons.gov.uk/2023/06/09/the-health-index-2021-taking-a-deep-dive-into-the-nations-health/)

**LG Inform (Local Government Association)**
- LG Inform is free and covers more than 1,500 measures for benchmarking. LG Inform Plus is a subscription service that adds ward-level drill-down. Subscribers get an API data feed. Metric IDs are published for API users. — [LGA: LG Inform](https://www.local.gov.uk/our-support/research-and-data/lg-inform-data-benchmarking); [LG Inform](https://lginform.local.gov.uk/); [LG Inform Plus](https://lginformplus.org/lg-inform-plus-for-other-public-sector)

**SHAPE Place (OHID/DHSC: Strategic Health Asset Planning and Evaluation)**
- SHAPE Place is preloaded with more than 100 national datasets, overlaying public health and demographic data with estate and performance data. Access is restricted to users with a .gov.uk email address, and registration is required. — [SHAPE Atlas: SHAPE Place](https://shapeatlas.net/our-shape-products/shape-place/)

**ScotPHO Online Profiles Tool (Public Health Scotland)**
- It is an R Shiny app, and its code is on GitHub. Indicator production code is also public. — [ScotPHO profiles tool GitHub](https://github.com/Public-Health-Scotland/scotpho-profiles-tool); [ScotPHO indicator production GitHub](https://github.com/Public-Health-Scotland/scotpho-indicator-production); [Posit Shiny gallery](https://shiny.posit.co/r/gallery/government-public-sector/scotpho-profiles)
- Geographies: intermediate zones (small areas), health and social care (HSC) localities, HSC partnerships, alcohol and drug partnerships, council areas, health boards and Scotland. — [ScotPHO indicator production](https://github.com/Public-Health-Scotland/scotpho-indicator-production)
- Views:
  - a profile summary with spine charts
  - individual indicator pages with trend and rank views
  - a deprivation section with quintile breakdowns and inequality summary measures
  - data download

  — [ScotPHO PHINS 2024 slides](https://www.scotpho.org.uk/media/2496/phins2024-session3_3-elliott.pdf)
- Areas are compared with Scotland using 95% CIs, and the Scotland value is treated as exact. When the comparator is another area, the CIs of both are used. — [ScotPHO methodology](https://www.scotpho.org.uk/methods-and-data/methodology/); [HWP 2015 technical report](https://www.scotpho.org.uk/media/1031/hwp-2015-technical-report-13112015.pdf)

**Public Health Wales: Public Health Outcomes Framework (PHOF) reporting tool**
- It is a dashboard of Welsh PHOF indicators from Wales down to local authority, with breakdowns by age, sex, deprivation and rurality. — [PHW PHOF](https://phw.nhs.wales/services-and-teams/observatory/data-and-analysis/public-health-outcomes-framework/)
- The current release is 22 September 2026, and the next is 15 December 2026, so it is refreshed quarterly. It is hosted on Shiny (publichealthwales.shinyapps.io/PHOF_Dashboard_Eng). — [PHW PHOF](https://phw.nhs.wales/services-and-teams/observatory/data-and-analysis/public-health-outcomes-framework/); [PHW news 2025](https://phw.nhs.wales/news/public-health-outcomes-framework-reporting-tool-updated-with-latest-data4/)
- An accessible Excel workbook with all data for all indicators is downloadable (June 2026 file). — [PHW PHOF data](https://phw.nhs.wales/data/public-health-outcomes-framework-reporting-tool-data/)

**Northern Ireland: Health and Social Care Inequalities Monitoring System (HSCIMS), Department of Health / NISRA**
- The Health Inequalities Annual Report 2026 was published 25 March 2026, with an interactive dashboard, data tables by area and by indicator, a fact sheet and an accessible PDF. — [DoH NI: Health inequalities annual report 2026](https://www.health-ni.gov.uk/news/health-inequalities-annual-report-2026); [NISRA news](https://www.nisra.gov.uk/news/deprivation-linked-poorer-health-outcomes-across-northern-ireland); [accessible PDF](https://www.health-ni.gov.uk/sites/default/files/2026-03/hscims-report-accessible-2026.pdf)
- Its inequality measure is the gap between the 20% most and 20% least deprived areas, using NIMDM 2017. Sub-regional results are given by Local Government District (LGD); for example, Belfast LGD had the lowest life expectancy (76.5 years male, 80.5 years female). — [NISRA news](https://www.nisra.gov.uk/news/deprivation-linked-poorer-health-outcomes-across-northern-ireland)

**Charity and academic tools**
- British Heart Foundation (BHF):
  - It publishes CVD prevalence and mortality by UK local authority.
  - Local reports cover 457 administrative and health areas across all four UK nations.
  - The annual compendium (2026 edition) has local tables.
  - For Scotland, Wales and NI, deprivation ranks are population-weighted averages of small-area ranks.

  — [BHF local statistics](https://www.bhf.org.uk/what-we-do/our-research/heart-statistics/local-statistics); [BHF prevalence and mortality by LA](https://www.bhf.org.uk/what-we-do/our-research/heart-and-circulatory-diseases-in-numbers/incidence-and-prevalence-incidence-by-local-authority); [BHF compendium 2026](https://www.bhf.org.uk/-/media/files/for-professionals/research/heart-statistics/bhf-statistics-compendium-2026-v3.pdf?rev=0a92704f7a83454ea2b25191c88bdcb3&hash=C428A9BBDBC1440BDAD26E44226871FD)
- Imperial College / SAHSU small-area study:
  - It produced Bayesian spatiotemporal life-expectancy estimates for 6,791 MSOAs in England, 2002–2019.
  - It used all England death registrations from the Small Area Health Statistics Unit (SAHSU).
  - It was published in Lancet Public Health in 2021.
  - It is a paper with maps, not a maintained web tool.

  — [Lancet Public Health 2021, Rashid et al.](https://www.thelancet.com/journals/lanpub/article/PIIS2468-2667(21)00205-X/fulltext)
- Asthma + Lung UK: no public area-level lung-health data atlas was found. Searches returned only local support-group listings. — [Asthma + Lung UK support in your area](https://www.asthmaandlung.org.uk/help/support-network/support-in-your-area)

### Inferences
- **Fingertips/FPHD is the most direct overlap.** The atlas's entire dataset is a curated subset of Fingertips: 35 of "many hundreds" of indicators (per the atlas's own LIMITATIONS.md). Fingertips already offers choropleths, spine charts, compare-areas bars, trends, England benchmarking and significance at 95%/99.8%. FPHD will add a modern GOV.UK front end, a new API and R/Python packages in 2027.
- **The data source is about to change.** The atlas's data pipeline targets the Fingertips API, which is end-of-life. When FPHD launches, the pipeline (`npm run data:prepare`) will likely need a new adapter. This is a material dependency risk; the API spec for FPHD is not yet public.
- **Overlap is partial for the other tools.** ELS overlaps the atlas only for a handful of headline health indicators (healthy life expectancy, obesity, smoking and so on), but it is UK-wide and has richer open downloads. ScotPHO, the PHW PHOF tool and the NI HSCIMS dashboard are the nation-specific equivalents that the atlas explicitly does not integrate.
- **The atlas's audience differs from SHAPE and LG Inform.** SHAPE (estates planning, gov-only login) and LG Inform (council benchmarking across all service areas) serve different audiences, so the overlap is low.
- **Unverified (background knowledge), confirm before use:** NHS England's QOF data is published by NHS England (formerly NHS Digital) as an annual official statistic with interactive pages at practice, sub-ICB, ICB and region level. The Health Foundation and King's Fund publish charts and data analyses but no maintained local-area atlas. The CDRC (Consumer Data Research Centre) hosts mapmaker tools, including the AHAH ("Access to Healthy Assets and Hazards") index at LSOA level. None of these was verified in this session.

### Gaps
- Full text of the Fingertips "New service updates" page and the HTN article could not be fetched, because the hosts were blocked in the sandbox. A beta URL for FPHD, its feature list for maps, CIs and exports, and the Fingertips switch-off date were not confirmed.
- No source found on the current NHS England QOF interactive tool, the Atlas of Variation status, the Health Foundation, the King's Fund or CDRC tools. These were not searched for, given the tool-call budget.
- No source confirmed whether the ONS Health Index has had a release after June 2023.

## Q2. Feature dimensions per tool: geography, indicator breadth, uncertainty, exports, accessibility, openness/API, cadence, audience

### Takeaway
On breadth, small-area geography, deprivation breakdowns and APIs, the incumbents beat the atlas: Fingertips has hundreds of indicators down to MSOA and GP practice, and ScotPHO goes down to intermediate zone. The atlas's differentiators sit in presentation discipline, export quality and explicit refusal logic, not in data scope.

### Cited Findings
Comparison matrix. "n/f" means not found in this session; a "?" marks an unverified detail.

| Tool | Nations | Geographies | Indicator breadth | Uncertainty / significance | Exports | Open / API | Cadence | Audience |
|---|---|---|---|---|---|---|---|---|
| **The atlas** | England (UK map; other nations hatched "not covered") | UTLA 153, ICB 42, NHSE region 7 | 35 indicators, 11 topics | Publisher's 95%/99.8% CIs and flags; no own tests | SVG (vector), PNG, CSV, JSON figure spec, print A4 | MIT code; no API; committed dataset | Manual rebuild | Analysts, researchers, LA teams |
| **Fingertips** (to 2027) | England | England, region, UTLA, LTLA, ICB, sub-ICB, PCN, GP practice ([NGPP guide](https://fingertips.phe.org.uk/documents/NGPP_userGuide_OHID20251202.pdf)); MSOA via Local Health | Hundreds of indicators across many profiles | 95%/99.8% CIs; significance at 99.8% where applicable; trend tests at 99.8%; benchmark selectable ([Fingertips user guide](https://fingertips.phe.org.uk/documents/fingertips_user_guide.pdf)) | CSV/JSON via API ([API guidance](https://fingertips.phe.org.uk/profile/guidance/supporting-information/api)); chart image export n/f | Public API plus fingertipsR / fingertips_py | Per-profile updates | Public-health professionals |
| **FPHD** (from 2027) | England | n/f | Planned successor to Fingertips | n/f | New API, R and Python packages, version archive ([HTN](https://htn.co.uk/2026/04/08/dhsc-outlines-future-of-fingertips-health-data-repository-in-1-25m-contract/)) | GOV.UK service | n/f | Same as Fingertips |
| **Local Health** | England | MSOA, LTLA, UTLA, region, England; wards and CCGs removed Aug 2025 ([GOV.UK](https://www.gov.uk/government/statistics/local-health-august-2025-update)) | Small-area set | n/f | n/f | Via Fingertips API | Infrequent (last Aug 2025) | LA/JSNA analysts |
| **ONS Explore Local Statistics** | UK (some nation-specific indicators kept separate) | LTLA, UTLA, Combined Authority, region, country ([QMI](https://www.ons.gov.uk/peoplepopulationandcommunity/healthandsocialcare/healthandwellbeing/methodologies/explorelocalstatisticsserviceqmi)) | About 100–116 indicators across all themes; health is a subset | CIs in downloads not confirmed | XLSX, CSV, CSVW, JSON-Stat ([ELS](https://www.ons.gov.uk/explore-local-statistics/)) | Open data on GitHub | Rolling | Public, policy |
| **ONS Health Index** | England | National, region, LA, ICS | Composite index plus sub-domains | n/f | Spreadsheet download | Open data | Last release found 16 Jun 2023 ([ONS](https://www.ons.gov.uk/peoplepopulationandcommunity/healthandsocialcare/healthandwellbeing/bulletins/healthinengland/2015to2021)) | Policy, public |
| **OHID Health Inequalities Dashboard** | England | n/f | Inequality measures for key PHOF indicators | n/f | n/f | n/f | Last update May 2025 ([Fingertips Inequality Tools](https://fingertips.phe.org.uk/profile/inequality-tools)) | Public health / NHS |
| **CVDPREVENT** | England | Practice, PCN, ICB and national (inferred from "ICB QI data packs") | CVD audit indicators with ethnicity and deprivation splits | n/f | QI data packs | Open access ([CVDPREVENT](https://www.cvdprevent.nhs.uk/quality-improvement)) | Quarterly? (not confirmed) | Primary care, ICBs |
| **LG Inform / Plus** | England (LA-centred) | LA; ward in Plus | 1,500+ measures | n/f | Reports | API for subscribers ([LGA](https://www.local.gov.uk/our-support/research-and-data/lg-inform-data-benchmarking)) | Rolling | Councils |
| **SHAPE Place** | England | Sites and areas | 100+ datasets ([SHAPE](https://shapeatlas.net/our-shape-products/shape-place/)) | n/f | n/f | Login, .gov.uk only | n/f | NHS/LA estates planners |
| **ScotPHO profiles** | Scotland | Intermediate zone, HSC locality, HSCP, alcohol and drug partnership, council area, health board ([GitHub](https://github.com/Public-Health-Scotland/scotpho-indicator-production)) | Multiple profiles | 95% CIs vs Scotland; two-sided CIs when comparing areas ([ScotPHO methodology](https://www.scotpho.org.uk/methods-and-data/methodology/)) | Data download, save chart ([PHINS 2024](https://www.scotpho.org.uk/media/2496/phins2024-session3_3-elliott.pdf)) | Open-source code | Rolling | Scottish public health |
| **PHW PHOF tool** | Wales | Wales to LA; age, sex, deprivation, rurality splits ([PHW](https://phw.nhs.wales/services-and-teams/observatory/data-and-analysis/public-health-outcomes-framework/)) | Welsh PHOF set | n/f | Accessible Excel of all data ([PHW data](https://phw.nhs.wales/data/public-health-outcomes-framework-reporting-tool-data/)) | Shiny | Quarterly (Sep 2026, Dec 2026) | Welsh public health |
| **NI HSCIMS** | Northern Ireland | NI, LGD, deprivation fifths ([NISRA](https://www.nisra.gov.uk/news/deprivation-linked-poorer-health-outcomes-across-northern-ireland)) | Health-inequality indicators | n/f | Data tables by area and indicator; accessible PDF ([DoH NI](https://www.health-ni.gov.uk/news/health-inequalities-annual-report-2026)) | Official statistics | Annual (Mar 2026) | NI policy |
| **BHF local statistics** | UK (4 nations) | 457 admin and health areas ([BHF](https://www.bhf.org.uk/what-we-do/our-research/heart-statistics/local-statistics)) | CVD prevalence and mortality | n/f | Spreadsheets and PDF | Free | Annual compendium | Public, campaigners |
| **Imperial/SAHSU MSOA life expectancy** | England | 6,791 MSOAs | Life expectancy, risk of death | Bayesian posterior uncertainty | Paper figures | Paper | One-off (2021) | Research |

### Inferences
- **Atlas shortfalls versus incumbents:**
  - It has no lower-tier LA, MSOA, GP or PCN geography. Fingertips, Local Health and ScotPHO all go finer.
  - It has no deprivation-quintile or ethnicity breakdowns. ScotPHO, PHW, NI HSCIMS, CVDPREVENT and the OHID inequality dashboard all have them.
  - It has no inequality summary measures such as the slope index of inequality. ScotPHO reports "inequality summary measures".
  - It has no user-selectable benchmark (Fingertips allows changing the benchmark), and no area-versus-area comparison using both CIs (ScotPHO does this).
  - It has no API or packages. Fingertips has these, FPHD plans them, and ELS offers CSVW and JSON-Stat.
  - It has no scheduled update cadence (PHW is quarterly).
  - It offers no Welsh-language interface. ONS has a Welsh site (cy.ons.gov.uk); the atlas and the Welsh language were not checked further.
- **Rough parity:**
  - Its CSV exports are similar to incumbents' downloads.
  - It uses the same publisher CIs and flags as Fingertips, so its statistical content is not different. Only the presentation and gating differ.
- **Ahead (export quality):**
  - True vector SVG figure export plus a reproducible JSON figure spec was not found in any incumbent tool examined.
  - Incumbents mostly offer data downloads (XLSX/CSV) and, for ScotPHO, a "save chart" option whose format was not confirmed.

### Gaps
- Export formats for Fingertips charts and maps, and whether chart/map images are vector or raster, were not confirmed (searched; not found).
- No accessibility statements were retrieved for any tool (Fingertips, ELS, ScotPHO, PHW). A WCAG comparison is therefore not evidenced.
- The CVDPREVENT update cadence and geography list were not confirmed.

## Q3. Uncertainty, suppression and statistical comparison: what to match or exceed

### Takeaway
Incumbents use 95% and 99.8% CIs and benchmark-significance colouring as standard. Fingertips also tests trends at 99.8%, and ScotPHO handles area-versus-area comparison with both intervals. The atlas matches these by reusing publisher flags, but it lacks trend significance and area-versus-area testing. It exceeds incumbents in explicitly separating suppression from missing and from non-coverage, and in refusing misleading flags.

### Cited Findings
- Fingertips:
  - significance against the benchmark at 99.8% where applicable
  - statistical process control style methods (control limits)
  - trend significance at 99.8%
  - England benchmark by default, but changeable

  — [NGPP user guide v8.3](https://fingertips.phe.org.uk/documents/NGPP_userGuide_OHID20251202.pdf); [NGPP user guide v8.1](https://fingertips.phe.org.uk/documents/NGPP_userGuide_OHID20231205.pdf); [Fingertips user guide](https://fingertips.phe.org.uk/documents/fingertips_user_guide.pdf)
- ScotPHO:
  - 95% CIs, with the Scotland value treated as an exact reference
  - when comparing with a non-national area, the CIs of both areas are used
  - CI methods follow APHO Technical Briefing 3
  - an Excel CI calculator is provided

  — [ScotPHO methodology](https://www.scotpho.org.uk/methods-and-data/methodology/)
- ScotPHO and NI HSCIMS both report deprivation gaps. NI uses the gap between the most and least deprived fifths (NIMDM 2017); ScotPHO uses quintiles plus summary measures. — [NISRA](https://www.nisra.gov.uk/news/deprivation-linked-poorer-health-outcomes-across-northern-ireland); [PHINS 2024](https://www.scotpho.org.uk/media/2496/phins2024-session3_3-elliott.pdf)
- Explore Local Statistics warns that not all indicators are comparable across nations. Nation-specific releases are added as separate indicators. — [ONS ELS methodology note via search](https://www.ons.gov.uk/methodology/statisticsacrosstheUK/bringingtogetherstatisticsfromacrosstheUK)
- The FPHD contract includes "automated data publication with redactions and audit history". Suppression and redaction will be handled at the publisher level in the new service. — [HTN](https://htn.co.uk/2026/04/08/dhsc-outlines-future-of-fingertips-health-data-repository-in-1-25m-contract/)
- The ONS Health Index is a composite score. The atlas deliberately refuses to compute one (docs/METHODS.md, "No composite score"). — [ONS Health in England](https://www.ons.gov.uk/peoplepopulationandcommunity/healthandsocialcare/healthandwellbeing/bulletins/healthinengland/2015to2021)

### Inferences
- **Match:** The atlas should keep the 99.8% plus 95% display and the publisher's benchmark flags, which align with Fingertips practice. This is parity, not differentiation.
- **Potential gaps to close:**
  - surfacing the publisher's trend significance flag, if exposed by the API (Fingertips computes trends at 99.8%)
  - a principled area-versus-area comparison using both CIs (the ScotPHO approach), rather than only versus England
  - deprivation-quintile series where Fingertips publishes them
- **Exceeds:** The incumbents examined do two things the atlas avoids:
  - They show suppressed or missing values as blanks or grey without separating "not covered".
  - They apply better/worse RAG colouring even to QOF recorded prevalence (Fingertips colours QOF prevalence by significance; unverified detail).

  The atlas's four-state missingness, its refusal to repeat flags on recorded-prevalence indicators, its "overlap is not a test" caveat and its magnitude-versus-evidence separation are stronger guardrails than found anywhere else. However, the comparison of how incumbents style suppression is not directly sourced here.

### Gaps
- No primary documentation was retrieved on how Fingertips, ELS or ScotPHO visually encode suppressed versus missing values on maps. The claim that the atlas's four-state scheme is unique therefore rests on the absence of evidence found, not on confirmed contrast.
- Whether the Fingertips API exposes trend-significance flags was not verified.

## Q4. Atlas features that appear unique, and UK-wide harmonised tools

### Takeaway
No tool examined combines all of the following:
- templated, eligibility-gated evidence statements
- explicit four-state missingness, including "not covered by this dataset"
- a per-indicator, per-geography coverage matrix verified by actual fetch
- vector SVG plus a JSON figure-spec export

These appear to be genuine differentiators, with the caveat that they are judged by absence in the sources found. On UK-wide coverage, ONS Explore Local Statistics and BHF local statistics are the closest. ELS itself warns that cross-nation comparability is incomplete, and no harmonised four-nations public-health indicator profile tool was found.

### Cited Findings
- ELS aims to provide "a UK-wide picture" for valid local comparisons, but some nation-specific releases are kept as separate indicators. Its open data include low-level geography data for all four nations. — [ONS: Bringing together statistics from across the UK](https://www.ons.gov.uk/methodology/statisticsacrosstheUK/bringingtogetherstatisticsfromacrosstheUK); [ONSdigital/explore-local-statistics-data](https://github.com/ONSdigital/explore-local-statistics-data/blob/main/population-indicators/population-indicators.csv)
- BHF covers 457 areas across all four nations for CVD prevalence and mortality. It notes method differences, for example in deprivation ranking for Scotland, Wales and NI. — [BHF local statistics](https://www.bhf.org.uk/what-we-do/our-research/heart-statistics/local-statistics); [BHF compendium 2026](https://www.bhf.org.uk/-/media/files/for-professionals/research/heart-statistics/bhf-statistics-compendium-2026-v3.pdf?rev=0a92704f7a83454ea2b25191c88bdcb3&hash=C428A9BBDBC1440BDAD26E44226871FD)
- mySociety's Composite UK IMD harmonises deprivation across the four nations. — [mySociety composite UK IMD](https://pages.mysociety.org/composite_uk_imd/analysis/methodology_and_analysis.html)
- Each devolved nation's tool uses its own geography and deprivation index:
  - Scotland: intermediate zone, HSCP, health board
  - Wales: LA, with WIMD-based deprivation implied
  - NI: LGD, NIMDM 2017

  — [ScotPHO GitHub](https://github.com/Public-Health-Scotland/scotpho-indicator-production); [PHW](https://phw.nhs.wales/services-and-teams/observatory/data-and-analysis/public-health-outcomes-framework/); [NISRA](https://www.nisra.gov.uk/news/deprivation-linked-poorer-health-outcomes-across-northern-ireland)
- The ONS "How health has changed in your area" release auto-generates a templated article per local authority. This is the closest precedent found to the atlas's templated evidence statements, but it has no eligibility gating. — [ONS How health has changed in your area](https://www.ons.gov.uk/peoplepopulationandcommunity/healthandsocialcare/healthandwellbeing/articles/howhealthhaschangedinyourarea2015to2021/2023-06-16)

### Inferences
- **Likely unique**, based on the absence of comparable features in the sources found:
  1. Clause-level eligibility gating of auto-generated statements, so that statements get shorter as the evidence gets weaker.
  2. Four-state missingness that distinguishes "not covered by this dataset" from "suppressed" and "no value published", with distinct hatch patterns.
  3. A coverage matrix verified by actually fetching data, which records source discrepancies such as the fuel-poverty indicator 93759 being declared available but returning no rows.
  4. A JSON figure specification and test-verified vector SVG exports.
  5. Explicit "what this cannot tell you" panels and a claim ladder.
  6. Separation of pooled 3-year and single-year series under the same indicator ID.
- **Partial precedents:** ONS per-LA auto-articles are templated narrative. Fingertips and ScotPHO "save chart" and download features cover part of the export use case.
- **Overstatement risk:** The atlas's README frames its UK map with three nations hatched as a coverage-honesty feature. Users who expect UK-wide data will find ELS (UK, all-theme), BHF (UK, CVD) and the devolved tools more useful for cross-nation work. The atlas's LIMITATIONS.md correctly notes that the definitions differ too much for direct comparison, which matches ONS's own caveat.
- **No four-nations profile tool exists.** No harmonised four-nations public-health indicator profile tool, a "UK Fingertips", was found. This is a real gap in the landscape, but the atlas does not fill it either.

### Gaps
- No systematic survey of academic or charity web atlases was possible within budget. The Health Foundation, King's Fund, CDRC, the House of Commons Library constituency health dashboards and the Asthma + Lung UK data portal (if one exists) were not verified.
- It was not established whether FPHD will include narrative or templated text, a figure export, or explicit suppression styling. If it does, several atlas differentiators would erode in 2027.
