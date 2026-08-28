/**
 * Scope Inclusions, Exclusions & Counter-Offer Data Utilities (US-044)
 * Provides standard trade categories (Fixtures, Site, Admin), status definitions,
 * and scope calculation/normalization functions.
 */

export const SCOPE_STATUS = {
  INCLUDED: 'included',
  EXCLUDED: 'excluded',
  OPTIONAL_ADDON: 'optional_addon',
};

/**
 * Pre-defined standard scope templates across common civil, plumbing, mechanical, and commercial trades.
 */
export const DEFAULT_SCOPE_ITEMS = [
  // 1. Fixtures & Finishes (High-risk trade boundary)
  {
    id: 'fix_toilets',
    category: 'fixtures',
    title: 'Water Closets & Commercial Toilets',
    description: 'Furnishing porcelain fixture bowls, flush valves, and carrier mounts (Installation included, supply excluded unless specified).',
    status: SCOPE_STATUS.EXCLUDED, // Excluded / Owner Supplied by default in trade proposals
    costImpact: 0,
    isStandard: true,
  },
  {
    id: 'fix_faucets',
    category: 'fixtures',
    title: 'Lavatory & Kitchen Faucets',
    description: 'Furnishing finish sensor/manual faucets and aerators (Rough-in valves and trim labor included, fixture hardware excluded).',
    status: SCOPE_STATUS.EXCLUDED,
    costImpact: 0,
    isStandard: true,
  },
  {
    id: 'fix_sinks',
    category: 'fixtures',
    title: 'Sinks, Basins & Utility Troughs',
    description: 'Furnishing undermount, drop-in, or mop basins (Plumbing carrier & trap included, fixture basin excluded).',
    status: SCOPE_STATUS.EXCLUDED,
    costImpact: 0,
    isStandard: true,
  },
  {
    id: 'fix_water_heaters',
    category: 'fixtures',
    title: 'Commercial / Residential Water Heaters',
    description: 'Furnishing gas/electric domestic hot water tanks or tankless units, expansion tanks, and safety pans.',
    status: SCOPE_STATUS.INCLUDED,
    costImpact: 0,
    isStandard: true,
  },
  {
    id: 'fix_backflow',
    category: 'fixtures',
    title: 'Backflow Preventers & Certification',
    description: 'Furnishing RPZ / double-check assemblies, test cocks, and initial municipal backflow certification testing.',
    status: SCOPE_STATUS.INCLUDED,
    costImpact: 0,
    isStandard: true,
  },

  // 2. Site & Utilities Earthwork
  {
    id: 'site_trench_excavation',
    category: 'site',
    title: 'Trench Excavation & Geometric Earthwork',
    description: 'Machine trenching, rough grading, and spoils placement along utility alignment.',
    status: SCOPE_STATUS.INCLUDED,
    costImpact: 0,
    isStandard: true,
  },
  {
    id: 'site_rock_sawing',
    category: 'site',
    title: 'Rock Sawing & Hard Rock Excavation',
    description: 'Mechanical rock breaking, trench blasting, or pneumatic hammer work in unforeseen subsurface rock.',
    status: SCOPE_STATUS.EXCLUDED,
    costImpact: 0,
    isStandard: true,
  },
  {
    id: 'site_backfill_compaction',
    category: 'site',
    title: 'Trench Backfill & Aggregate Bedding',
    description: 'Imported granular pipe bedding, native spoils backfill, and standard mechanical lift compaction.',
    status: SCOPE_STATUS.INCLUDED,
    costImpact: 0,
    isStandard: true,
  },
  {
    id: 'site_pavement_patching',
    category: 'site',
    title: 'Asphalt & Concrete Pavement Restoration',
    description: 'Saw-cutting, asphalt binder/wear course patching, or curb/gutter restoration over utility cuts.',
    status: SCOPE_STATUS.EXCLUDED,
    costImpact: 0,
    isStandard: true,
  },
  {
    id: 'site_utility_markouts',
    category: 'site',
    title: '811 Public Utility Markouts & Soft Dig Potholing',
    description: 'Standard 811 municipal callout (Potholing / vacuum excavation of unlocatable lines is excluded).',
    status: SCOPE_STATUS.INCLUDED,
    costImpact: 0,
    isStandard: true,
  },

  // 3. Administrative, Permits & Engineering
  {
    id: 'adm_permits',
    category: 'admin',
    title: 'Municipal Building & Plumbing Permits',
    description: 'Procuring local jurisdiction trade permits (City / County filing fees paid directly by Owner or reimbursed).',
    status: SCOPE_STATUS.EXCLUDED,
    costImpact: 0,
    isStandard: true,
  },
  {
    id: 'adm_eng_stamps',
    category: 'admin',
    title: 'Professional Engineering (PE) Stamps & Calcs',
    description: 'Third-party structural, hydraulic, or civil engineering calculations and sealed drawings.',
    status: SCOPE_STATUS.EXCLUDED,
    costImpact: 0,
    isStandard: true,
  },
  {
    id: 'adm_traffic_control',
    category: 'admin',
    title: 'Traffic Control Plans & Flagging Crew',
    description: 'Certified lane closure crews, arrow boards, attenuator trucks, and DOT permit submittals.',
    status: SCOPE_STATUS.EXCLUDED,
    costImpact: 0,
    isStandard: true,
  },
  {
    id: 'adm_testing_inspection',
    category: 'admin',
    title: 'Third-Party Pressure & Compaction Testing',
    description: 'Hydrostatic pressure testing, chlorination/bacteriological water testing, and mandrel deflection testing.',
    status: SCOPE_STATUS.INCLUDED,
    costImpact: 0,
    isStandard: true,
  },
];

/**
 * Returns a cloned initial scope list
 */
export function getInitialScopeItems() {
  return JSON.parse(JSON.stringify(DEFAULT_SCOPE_ITEMS));
}

/**
 * Categorizes a scope array into included, excluded, and optional add-ons
 */
export function categorizeScope(items = []) {
  const safeItems = Array.isArray(items) ? items : [];
  return {
    included: safeItems.filter((it) => it.status === SCOPE_STATUS.INCLUDED),
    excluded: safeItems.filter((it) => it.status === SCOPE_STATUS.EXCLUDED),
    optionalAddons: safeItems.filter((it) => it.status === SCOPE_STATUS.OPTIONAL_ADDON),
  };
}

/**
 * Returns summary count and status highlights
 */
export function summarizeScope(items = []) {
  const { included, excluded, optionalAddons } = categorizeScope(items);
  return {
    totalCount: items.length,
    includedCount: included.length,
    excludedCount: excluded.length,
    addonsCount: optionalAddons.length,
    fixturesExcluded: excluded.some((it) => it.category === 'fixtures'),
  };
}
