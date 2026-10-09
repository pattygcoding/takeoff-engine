/**
 * Product domain types.
 *
 * The backend owns the authoritative row shapes; the client models them
 * permissively (an open index signature) so extra/legacy fields never break the
 * build while still documenting the fields the UI relies on.
 */

/** A single takeoff line item (spreadsheet row → estimate line). */
export interface TakeoffItem {
  id?: string | number;
  title?: string;
  name?: string;
  description?: string;
  category?: string;
  trade?: string;
  status?: string;
  quantity?: number | string;
  unit?: string;
  amount?: number | string;
  costImpact?: number | string;
  costImpactType?: 'percent' | 'flat' | string;
  originalStatus?: string;
  originalAmount?: number | string;
  [key: string]: any;
}

/** Rates / pricing configuration blob (labor roles, equipment, markups, etc.). */
export type Rates = Record<string, any>;

/** A scope inclusion / exclusion / add-on entry. */
export interface ScopeItem {
  id?: string | number;
  title?: string;
  name?: string;
  category?: string;
  status?: string;
  amount?: number | string;
  costImpact?: number | string;
  costImpactType?: 'percent' | 'flat' | string;
  originalStatus?: string;
  originalAmount?: number | string;
  [key: string]: any;
}

/** A user-saved scope preset (persisted to localStorage). */
export interface ScopePreset {
  id: string;
  name: string;
  createdAt: string;
  items: ScopeItem[];
  [key: string]: any;
}

/** A saved project / estimate. */
export interface Project {
  id?: string | number;
  name?: string;
  client_name?: string;
  location?: string;
  status?: string;
  items?: TakeoffItem[];
  rates?: Rates;
  summary?: Record<string, any>;
  [key: string]: any;
}

/** A crew composition entry (role + headcount) used for blended-rate math. */
export interface CrewMember {
  role?: string;
  count?: number | string;
  [key: string]: any;
}

/** A labor role definition with its hourly rate. */
export interface LaborRole {
  id?: string;
  name?: string;
  label?: string;
  hourlyRate?: number | string;
  [key: string]: any;
}

/** A single computed estimate line (result of the backend calculation engine). */
export interface EstimateLineItem {
  system?: string;
  description?: string;
  sizeSpec?: string;
  quantity?: number;
  unit?: string;
  materialCost?: number;
  laborHours?: number;
  laborCost?: number;
  directCost?: number;
  [key: string]: any;
}

/** One system/trade group within an estimate. */
export interface EstimateSystem {
  system?: string;
  items: EstimateLineItem[];
  directCost?: number;
  [key: string]: any;
}

/** Rolled-up estimate totals. */
export interface EstimateTotals {
  totalMaterialCost?: number;
  totalLaborCost?: number;
  totalLaborHours?: number;
  equipmentLumpSum?: number;
  miscCost?: number;
  totalDirectCost?: number;
  overheadType?: string;
  overheadAmount?: number;
  overheadPct?: number;
  contingencyType?: string;
  contingencyAmount?: number;
  contingencyPct?: number;
  profitType?: string;
  profitAmount?: number;
  profitPct?: number;
  finalBidAmount?: number;
  [key: string]: any;
}

/** Full estimate payload passed to the exporters. */
export interface Estimate {
  totals: EstimateTotals;
  bySystem: EstimateSystem[];
  [key: string]: any;
}

/** Contractor branding/company details used in exported documents. */
export interface Branding {
  companyName?: string;
  companyLogoUrl?: string;
  brandColor?: string;
  companyAddress?: string;
  companyPhone?: string;
  licenseNumber?: string;
  [key: string]: any;
}

/** A saved rate template (rate library). */
export interface RateTemplate {
  id?: string | number;
  name?: string;
  description?: string;
  isDefault?: boolean;
  ratesJson?: Rates;
  [key: string]: any;
}
