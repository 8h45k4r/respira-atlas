/**
 * Project team.
 *
 * Institutional affiliations are listed to identify people, not to claim that
 * any institution endorses, funds or reviews this atlas. The distinction is
 * stated on the page itself as well as here, because a named affiliation on a
 * public health site is otherwise read as institutional backing.
 */

export interface TeamMember {
  readonly id: string;
  readonly name: string;
  readonly postNominals?: string;
  readonly role: string;
  readonly roleDetail: string;
  readonly photo: string;
  readonly photoCredit: string;
  readonly email?: string;
  readonly links?: readonly { label: string; url: string }[];
  /** Paragraphs, in order. */
  readonly biography: readonly string[];
  readonly expertise: readonly string[];
}

export const TEAM: readonly TeamMember[] = [
  {
    id: 'om-kurmi',
    name: 'Om Kurmi',
    postNominals: 'PhD',
    role: 'Principal Investigator',
    roleDetail: 'Respiratory and environmental health epidemiology',
    photo: 'team/om-kurmi.jpg',
    photoCredit: 'Photograph courtesy of Nepal Institute for Research and Innovation.',
    biography: [
      'Dr Kurmi received his undergraduate degree from Tribhuwan University, Nepal and PhD in ' +
        'Public Health from the University of Aberdeen, UK. He completed his post-doctoral ' +
        'training at the University of Birmingham, UK, in the Institute of Occupational Medicine.',
      'He worked as a Senior Scientist in Respiratory Epidemiology at the Clinical Trial Service ' +
        'Unit and Epidemiological Studies Unit, Nuffield Department of Population Health, the ' +
        'University of Oxford, UK. He worked as an Assistant Professor in Respiratory ' +
        'Epidemiology in the Division of Respirology, Department of Medicine, McMaster ' +
        'University, Hamilton, Canada. Currently, he is working as an Associate Professor in ' +
        'Epidemiology and Evidence-based Healthcare Research at Coventry University.',
      'He is the chair of the Respiratory Epidemiology Group (6.01) of the European Respiratory ' +
        'Society and the Fellows of the Royal Society of Public Health. He has worked in several ' +
        'large prospective cohorts across all geographical regions, including in biobank studies.',
      'His primary research expertise is Respiratory Epidemiology and Environmental Health ' +
        'Epidemiology, and he has been teaching observational research methods and ' +
        'problem-based learning to undergraduate and postgraduate students. He has set up a ' +
        'family cohort in two regions of Nepal to understand the major determinants of health, ' +
        'particularly lung health in children.',
    ],
    expertise: [
      'Respiratory epidemiology',
      'Environmental health epidemiology',
      'Prospective cohort studies',
      'Observational research methods',
      'Occupational exposure',
      'Childhood lung health',
    ],
  },
  {
    id: 'bhaskar-bhatt',
    name: 'Bhaskar Bhatt',
    role: 'Technical Lead and AI Researcher',
    roleDetail: 'Data engineering, research tooling and verification standards',
    photo: 'team/bhaskar-bhatt.jpg',
    photoCredit: 'Photograph courtesy of AI Policy Tracker.',
    email: 'bhaskar@aipolicytracker.org',
    links: [
      { label: 'AI Policy Tracker', url: 'https://aipolicytracker.org' },
    ],
    biography: [
      'Bhaskar Bhatt is an AI governance, risk and compliance practitioner and a certified ' +
        'ISO/IEC 42001 Lead Auditor, based in Kathmandu, Nepal. He builds research and ' +
        'compliance tooling for governments, donors and research teams.',
      'He is the founder and maintainer of AI Policy Tracker, an open database of global AI ' +
        'regulation covering 212 jurisdictions and 187 instruments, published as open data with ' +
        'a documented verification policy in which every record names its reviewer and the date ' +
        'it was last checked. He was an inaugural member of Nepal’s National AI Strategy team ' +
        'at the e-Government Board, and is a research group member at the Center for AI and ' +
        'Digital Policy.',
      'On this atlas he is responsible for the data pipeline, the analytical layer and the ' +
        'verification standards: resolving indicators from source metadata, validating every ' +
        'area-code join and boundary vintage, keeping the four availability states distinct, ' +
        'and ensuring exported figures are reproducible from their published specification.',
    ],
    expertise: [
      'Research data engineering',
      'Open data and provenance',
      'Verification methodology',
      'Static analytical applications',
      'AI governance and assurance',
    ],
  },
];

/**
 * Shown wherever affiliations appear. This atlas is an independent working
 * tool: the institutions named above are where its contributors work or have
 * worked, and none of them has reviewed, endorsed or funded it.
 */
export const AFFILIATION_NOTICE =
  'Institutional affiliations identify team members and their background. They do not ' +
  'indicate that any institution — including the NHS, the Office for Health Improvement ' +
  'and Disparities, the Office for National Statistics, Coventry University or any other ' +
  'named organisation — has reviewed, endorsed, funded or approved this atlas, or the ' +
  'analyses produced with it.';
