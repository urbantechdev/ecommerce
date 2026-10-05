export type InventorySectorId =
  | 'PRE_PRIMARY'
  | 'PRIMARY'
  | 'JUNIOR_SECONDARY'
  | 'SECONDARY'
  | 'COLLEGE_UNIVERSITY'
  | 'SERVICE_PROFESSIONAL'
  | 'ACCESSORIES';

export interface SectorDefinition {
  id: InventorySectorId;
  name: string;
  shortName: string;
  badgeColor: string;
  description: string;
  hasInstitutionField?: boolean;
  hasProfessionalDomain?: boolean;
  garments: string[];
}

export const COLLEGE_INSTITUTIONS = [
  'KMTC',
  'TVET colleges',
  'Universities',
  'Nursing colleges',
  'Teacher training colleges',
  'Hospitality colleges',
  'Aviation colleges',
  'Medical training institutions',
  'Other colleges',
] as const;

export type CollegeInstitution = (typeof COLLEGE_INSTITUTIONS)[number];

export const PROFESSIONAL_DOMAINS = [
  'Security',
  'Hospitality',
  'Medical',
  'Corporate',
  'Industrial',
] as const;

export type ProfessionalDomain = (typeof PROFESSIONAL_DOMAINS)[number];

export const PROFESSIONAL_DOMAIN_GARMENTS: Record<ProfessionalDomain, string[]> = {
  Security: [
    'Security shirts',
    'Security trousers',
    'Security sweaters',
    'Security jackets',
    'Security caps',
    'Reflective jackets',
  ],
  Hospitality: [
    'Chef coats',
    'Chef trousers',
    'Chef hats',
    'Waiter shirts',
    'Waiter trousers',
    'Waiter skirts',
    'Aprons',
    'Hospitality blazers',
  ],
  Medical: [
    'Scrubs',
    'Lab coats',
    'Nurse dresses',
    'Medical tunics',
    'Theatre uniforms',
    'Medical trousers',
    'Medical tops',
  ],
  Corporate: [
    'Corporate shirts',
    'Corporate blouses',
    'Corporate trousers',
    'Corporate skirts',
    'Corporate dresses',
    'Corporate jackets',
    'Corporate blazers',
    'Branded T-shirts',
  ],
  Industrial: [
    'Overalls',
    'Dust coats',
    'Reflective jackets',
    'Work trousers',
    'Work shirts',
    'Safety clothing',
  ],
};

export const INVENTORY_SECTORS: SectorDefinition[] = [
  {
    id: 'PRE_PRIMARY',
    name: '1. Pre-Primary / ECDE',
    shortName: 'Pre-Primary / ECDE',
    badgeColor: 'bg-amber-100 text-amber-800 border-amber-300',
    description: 'Early Childhood Development & Kindergarten Uniforms',
    garments: [
      'Polo shirts',
      'T-shirts',
      'Blouses',
      'Shorts',
      'Skirts',
      'Trousers',
      'Dresses',
      'Sweaters',
      'Pullovers',
      'Tracksuits',
      'PE shorts',
      'PE T-shirts',
      'Socks',
      'School shoes',
      'Caps',
      'Sun hats',
    ],
  },
  {
    id: 'PRIMARY',
    name: '2. Primary School',
    shortName: 'Primary School',
    badgeColor: 'bg-blue-100 text-blue-800 border-blue-300',
    description: 'Grades 1 to 6 Primary School Standard & PE Uniforms',
    garments: [
      'Short-sleeved shirts',
      'Long-sleeved shirts',
      'Blouses',
      'Trousers',
      'Shorts',
      'Skirts',
      'Pinafore dresses',
      'Tunics',
      'Sweaters',
      'Pullovers',
      'V-neck sweaters',
      'Cardigans',
      'Blazers',
      'School ties',
      'Belts',
      'Socks',
      'PE uniforms',
      'Tracksuits',
      'School shoes',
      'Badges',
      'Caps',
    ],
  },
  {
    id: 'JUNIOR_SECONDARY',
    name: '3. Junior Secondary / Junior School',
    shortName: 'Junior Secondary (JSS)',
    badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    description: 'Grades 7, 8 & 9 CBC Junior Secondary Uniforms & Kits',
    garments: [
      'Shirts',
      'Blouses',
      'Trousers',
      'Shorts',
      'Skirts',
      'Tunics',
      'Sweaters',
      'Cardigans',
      'Pullovers',
      'Blazers',
      'Ties',
      'Belts',
      'PE kits',
      'Tracksuits',
      'Sports uniforms',
      'Socks',
      'School shoes',
    ],
  },
  {
    id: 'SECONDARY',
    name: '4. Secondary Schools',
    shortName: 'Secondary School',
    badgeColor: 'bg-indigo-100 text-indigo-800 border-indigo-300',
    description: 'High School Uniforms, Sports Kits & Formal Blazers',
    garments: [
      'Shirts',
      'Blouses',
      'Trousers',
      'Shorts',
      'Skirts',
      'Pinafores',
      'Sweaters',
      'Pullovers',
      'Cardigans',
      'Blazers',
      'Waistcoats',
      'School ties',
      'Belts',
      'Socks',
      'PE shirts',
      'PE shorts',
      'Tracksuits',
      'Games kits',
      'Sports jerseys',
      'School shoes',
    ],
  },
  {
    id: 'COLLEGE_UNIVERSITY',
    name: '🎓 Colleges & Universities',
    shortName: 'Colleges & Universities',
    badgeColor: 'bg-purple-100 text-purple-800 border-purple-300',
    description: 'KMTC, TVET, Universities, Nursing & Aviation Uniforms',
    hasInstitutionField: true,
    garments: [
      'Nursing uniforms',
      'Clinical uniforms',
      'Lab coats',
      'Scrubs',
      'Medical tunics',
      'College shirts',
      'College blouses',
      'College trousers',
      'College skirts',
      'College sweaters',
      'College blazers',
      'College ties',
      'Overalls',
      'Industrial uniforms',
      'Hospitality uniforms',
    ],
  },
  {
    id: 'SERVICE_PROFESSIONAL',
    name: '👔 Service & Professional Uniforms',
    shortName: 'Service & Professional',
    badgeColor: 'bg-slate-100 text-slate-800 border-slate-300',
    description: 'Security, Hospitality, Medical, Corporate & Industrial Workwear',
    hasProfessionalDomain: true,
    garments: [
      // Aggregated default list; domain selector refines this
      'Security shirts',
      'Security trousers',
      'Security sweaters',
      'Security jackets',
      'Security caps',
      'Chef coats',
      'Chef trousers',
      'Chef hats',
      'Waiter shirts',
      'Waiter trousers',
      'Waiter skirts',
      'Aprons',
      'Hospitality blazers',
      'Scrubs',
      'Lab coats',
      'Nurse dresses',
      'Medical tunics',
      'Theatre uniforms',
      'Medical trousers',
      'Medical tops',
      'Corporate shirts',
      'Corporate blouses',
      'Corporate trousers',
      'Corporate skirts',
      'Corporate dresses',
      'Corporate jackets',
      'Corporate blazers',
      'Branded T-shirts',
      'Overalls',
      'Dust coats',
      'Reflective jackets',
      'Work trousers',
      'Work shirts',
      'Safety clothing',
    ],
  },
  {
    id: 'ACCESSORIES',
    name: '🧢 Accessories',
    shortName: 'Accessories',
    badgeColor: 'bg-rose-100 text-rose-800 border-rose-300',
    description: 'Ties, Badges, Crests, Belts, Bags, Headwear & Ribbons',
    garments: [
      'School ties',
      'Belts',
      'Socks',
      'Stockings',
      'Badges',
      'School crests',
      'Caps',
      'Hats',
      'Hair ribbons',
      'Headbands',
      'Aprons',
      'School bags',
      'Backpacks',
      'Name tags',
    ],
  },
];

export const getSectorById = (id?: string): SectorDefinition | undefined => {
  if (!id) return undefined;
  return INVENTORY_SECTORS.find((s) => s.id === id);
};

export const getAvailableGarments = (
  sectorId?: InventorySectorId,
  professionalDomain?: ProfessionalDomain
): string[] => {
  if (!sectorId) {
    // Return all unique garments
    const all = new Set<string>();
    INVENTORY_SECTORS.forEach((s) => s.garments.forEach((g) => all.add(g)));
    return Array.from(all);
  }

  if (sectorId === 'SERVICE_PROFESSIONAL' && professionalDomain) {
    return PROFESSIONAL_DOMAIN_GARMENTS[professionalDomain] || [];
  }

  const found = getSectorById(sectorId);
  return found ? found.garments : [];
};
