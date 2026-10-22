/**
 * Product domain types.
 *
 * The backend owns the authoritative row shapes; the client models them
 * permissively (an open index signature) so extra/legacy fields never break the
 * build while still documenting the fields the UI relies on.
 */

/** The value kind of a grid column, which picks its cell editor and export format. */
export type ColumnType = 'text' | 'number' | 'currency' | 'percent' | 'date' | 'boolean';

/** Where a column came from: a canonical field, the imported sheet, or a manual user action. */
export type ColumnSource = 'canonical' | 'imported' | 'user';

/**
 * One column of the takeoff grid.
 *
 * The canonical fields drive calculations and documents. Any spreadsheet column that does not map to
 * one of them is carried through as a passthrough column, so no imported data is dropped, and the
 * user may add, rename, retype or delete columns in the grid.
 */
export interface ColumnDefinition {
  /** Stable identifier: the canonical key, or a generated `col_<slug>`. */
  key: string;
  /** Display header. Defaults to the source column name. */
  label: string;
  type: ColumnType;
  /** Canonical field this column is bound to, or null for a passthrough column. */
  field?: string | null;
  source: ColumnSource;
  /** When true, the column also renders in client-facing PDF/Word documents. */
  includeInDocuments?: boolean;
  /** Rendered width in px, or null/absent to let the column size itself to its content. */
  width?: number | null;
  /**
   * True when the user removed the column from the grid view.
   *
   * Only canonical columns use this: the engine-bound set has to stay complete across reloads, so an
   * optional canonical column is hidden rather than dropped. A passthrough column is deleted outright.
   */
  hidden?: boolean;
}

/** Passthrough column values carried by one takeoff row, keyed by {@link ColumnDefinition.key}. */
export type CustomFieldValues = Record<string, string | number | boolean | null>;

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
  costImpactType?: string;
  originalStatus?: string;
  originalAmount?: number | string;
  system?: string;
  sizeSpec?: string;
  avgDepthFt?: number | string;
  materialCostPerUnit?: number | string;
  laborHoursPerUnit?: number | string;
  laborUnitCost?: number | string;
  laborRoleId?: string | null;
  isEquipment?: boolean;
  equipmentCost?: number | string;
  hasMissingScope?: boolean;
  missingScopeReason?: string;
  baseAmount?: number | string;
  calculatedBaseAmount?: number | string;
  originalCostImpactType?: string;
  isStandard?: boolean;
  /** Values of passthrough (imported/user) columns, keyed by {@link ColumnDefinition.key}. */
  customFields?: CustomFieldValues;
  [key: string]: unknown;
}

/** Rates / pricing configuration blob (labor roles, equipment, markups, etc.). */
export interface Rates {
  laborRoles?: LaborRole[];
  crew?: CrewMember[];
  scopeItems?: ScopeItem[];
  equipmentCatalog?: EquipmentCatalogItem[];
  miscItems?: MiscItem[];
  contingencyPct?: number;
  contingencyPercent?: number;
  contingencyType?: string;
  excavatorHourlyRate?: number;
  equipmentLumpSum?: number | string;
  equipmentType?: string;
  laborDailyRate?: number | string;
  laborHourlyRate?: number | string;
  laborMode?: string;
  laborRateBasis?: string;
  miscCost?: number | string;
  overheadPct?: number | string;
  overheadType?: string;
  profitPct?: number | string;
  profitType?: string;
  standardWorkdayHours?: number | string;
  trenchWidthFt?: number | string;
  workdayHours?: number | string;
  workdayHoursMode?: string;
  crewComposition?: Array<{ roleId?: string; count?: number | string }>;
  [key: string]: unknown;
}

/** A scope inclusion / exclusion / add-on entry. */
export interface ScopeItem {
  id?: string | number;
  title?: string;
  name?: string;
  category?: string;
  status?: string;
  amount?: number | string;
  costImpact?: number | string;
  costImpactType?: string;
  originalStatus?: string;
  originalAmount?: number | string;
  description?: string;
  originalCostImpactType?: string;
  [key: string]: unknown;
}

/** A user-saved scope preset (persisted to localStorage). */
export interface ScopePreset {
  id: string;
  name: string;
  createdAt: string;
  items: ScopeItem[];
  [key: string]: unknown;
}

/**
 * Label/value block found above the table header of a client quote spreadsheet
 * (quote date, builder, job address, contractor address, estimator, phone).
 */
export interface QuoteMetadata {
  documentTitle?: string;
  quoteDate?: string;
  builder?: string;
  projectAddress?: string;
  contractorAddress?: string;
  contactName?: string;
  contactPhone?: string;
  [key: string]: unknown;
}

/** One entry of a quote sheet's fixture list, e.g. `{ name: 'Toilets (floor-mount)', quantity: 8 }`. */
export interface QuoteFixtureRow {
  name: string;
  quantity: number;
  [key: string]: unknown;
}

/** One numbered entry of a quote sheet's terms & conditions block. */
export interface QuoteTerm {
  number: string;
  text: string;
  [key: string]: unknown;
}

/** Tables stacked below the priced table of a quote sheet. */
export interface QuoteSections {
  fixtureSchedule?: QuoteFixtureRow[];
  terms?: QuoteTerm[];
  notes?: string[];
  [key: string]: unknown;
}

/** Result of `POST /api/takeoffs/parse` (permissive: the mapping-modal payload omits some fields). */
export interface TakeoffParseResult {
  requiresMappingModal?: boolean;
  items?: TakeoffItem[];
  errors?: string[];
  checksum?: Record<string, unknown>;
  detectedLaborMode?: string;
  headers?: string[];
  mapping?: Record<string, string | number>;
  currentMapping?: Record<string, string | number>;
  /** Column schema (canonical + imported passthrough columns) produced by the parser. */
  columns?: ColumnDefinition[];
  unmappedRequired?: string[];
  matchConfidences?: Record<string, number>;
  overallConfidence?: number;
  confidence?: number;
  sheetNames?: string[];
  activeSheetName?: string;
  activeTableId?: string | null;
  headerRowIndex?: number;
  /** Row preview for the mapping modal (cell values are surfaced as text). */
  rawRows?: Array<Record<string, string>>;
  rawMatrix?: string[][];
  sampleMatrix?: string[][];
  unlabeledColumns?: number[];
  /** Cover block of a quote sheet, when one was detected. */
  quoteMeta?: QuoteMetadata;
  /** Fixture list / terms / notes stacked below the priced table. */
  quoteSections?: QuoteSections;
  /** Inclusions & exclusions read from the sheet itself (replaces the generic defaults). */
  scopeItems?: ScopeItem[];
  /** Total printed on the quote sheet, when it could be read from the priced column. */
  listedQuoteTotal?: number;
  /**
   * Whether the priced column was read as per-unit prices or as extended line amounts (a quote
   * `Cost` column often holds the amount for the whole row, which the parser converts to a unit
   * price so `quantity x materialCostPerUnit` reproduces the printed total).
   */
  pricedColumnBasis?: 'unit' | 'line_total';
  [key: string]: unknown;
}

/** A user row shown in the super-admin portal. */
export interface AdminUser {
  id: string;
  username?: string;
  email?: string;
  role?: string;
  status?: string;
  is_disabled?: boolean;
  is_test_user?: boolean;
  subscription_tier?: string;
  subscription_status?: string;
  has_unlimited_bypass?: boolean;
  trial_uses_remaining?: number;
  created_at?: string;
  first_name?: string;
  last_name?: string;
  company_name?: string;
  locked_until?: string;
  [key: string]: unknown;
}

/** Super-admin metrics payload. */
export interface AdminStats {
  totalUsers?: number;
  newSignupsWeek?: number;
  estimatedMRR?: number;
  activeSubscriptionsCount?: number;
  totalProjects?: number;
  totalEstimates?: number;
  totalProposals?: number;
  signedProposals?: number;
  [key: string]: unknown;
}

/** A promo code row shown in the super-admin portal. */
export interface PromoCode {
  id?: string | number;
  code?: string;
  grant_tier?: string;
  grant_unlimited?: boolean;
  grant_credits?: number;
  max_uses?: number;
  times_used?: number;
  created_at?: string;
  [key: string]: unknown;
}

/** An immutable admin audit log row. */
export interface AuditLog {
  id?: string | number;
  action?: string;
  admin_id?: string;
  target_user_id?: string;
  admin?: { email?: string; username?: string };
  target_user?: { email?: string; username?: string };
  details?: { reason?: string; [key: string]: unknown };
  ip_address?: string;
  created_at?: string;
  [key: string]: unknown;
}

/** A team workspace / organization. */
export interface Organization {
  id: string;
  name?: string;
  owner_id?: string;
  owner_email?: string;
  active_member_count?: number;
  max_seats?: number;
  [key: string]: unknown;
}

/** A member of an organization workspace. */
export interface OrganizationMember {
  id: string;
  user_id?: string;
  role?: string;
  status?: string;
  user_email?: string;
  invited_email?: string;
  first_name?: string;
  last_name?: string;
  invite_token?: string;
  [key: string]: unknown;
}

/** Props shared by every exported document template. */
export interface DocumentTemplateProps {
  estimate: Estimate;
  branding?: Branding | null;
  currentProject?: Project | null;
  rates?: Rates;
}

/** Column-mapping modal payload produced by the parser/normalizer. */
export interface MappingModalData {
  headers?: string[];
  rawRows?: Array<Record<string, string>>;
  mapping?: Record<string, string | number>;
  currentMapping?: Record<string, string | number>;
  /** Column schema (canonical + imported passthrough columns) behind this parse. */
  columns?: ColumnDefinition[];
  matchConfidences?: Record<string, number>;
  overallConfidence?: number;
  rawMatrix?: string[][];
  sampleMatrix?: string[][];
  headerRowIndex?: number;
  sheetNames?: string[];
  activeSheetName?: string;
  activeTableId?: string | null;
  subTables?: Array<{ id: string; label: string }>;
  /** Cover block of a quote sheet, when one was detected. */
  quoteMeta?: QuoteMetadata;
  /** Fixture list / terms / notes stacked below the priced table. */
  quoteSections?: QuoteSections;
  /** Inclusions & exclusions read from the sheet itself. */
  scopeItems?: ScopeItem[];
  [key: string]: unknown;
}

/** A File (browser) or plain descriptor accepted by the upload/parse helpers. */
export interface TakeoffFileLike {
  name?: string;
  size?: number;
  arrayBuffer?: () => Promise<ArrayBuffer>;
  text?: () => Promise<string>;
}

/** Upload/import context threaded from the upload step into the editors. */
export interface ImportContext {
  file?: TakeoffFileLike | null;
  mappingData?: MappingModalData | null;
  detectedLaborMode?: string;
  /** Column schema (canonical + imported passthrough columns) carried from the parse. */
  columns?: ColumnDefinition[];
  /** Cover block read from an imported client quote, e.g. builder and job address. */
  quoteMeta?: QuoteMetadata;
  /** Fixture list / terms / notes read from a stacked section of an imported quote. */
  quoteSections?: QuoteSections;
  /** Inclusions & exclusions read from the imported sheet. */
  scopeItems?: ScopeItem[];
  [key: string]: unknown;
}

/** The authenticated user profile (shape returned by `GET /api/auth/me`). */
export interface UserProfile {
  id?: string;
  username?: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  phone_number?: string;
  role?: string;
  subscription_tier?: string;
  subscription_status?: string;
  has_unlimited_bypass?: boolean;
  bypass_reason?: string | null;
  trial_uses_remaining?: number;
  seat_limit?: number;
  additional_seats?: number;
  organization_id?: string | null;
  created_at?: string;
  company_name?: string;
  company_logo_url?: string;
  company_address?: string;
  license_number?: string;
  brand_color?: string;
  paddle_subscription_id?: string;
  /** Paddle customer id (`ctm_...`); passed to Paddle.js as `pwCustomer` for Paddle Retain. */
  paddle_customer_id?: string;
  [key: string]: unknown;
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
  /** Ordered takeoff column schema stored with the project's latest estimate. */
  columns?: ColumnDefinition[];
  summary?: Record<string, unknown>;
  latestEstimate?: EstimateRecord | null;
  change_orders_json?: ChangeOrder[];
  warranty_items_json?: WarrantyItem[];
  /** Cover block of the quote this project was imported from (builder, addresses, estimator, phone). */
  quote_meta_json?: QuoteMetadata;
  created_at?: string;
  updated_at?: string;
  [key: string]: unknown;
}

/** A crew composition entry (role + headcount) used for blended-rate math. */
export interface CrewMember {
  role?: string;
  count?: number | string;
  [key: string]: unknown;
}

/** A labor role definition with its hourly rate. */
export interface LaborRole {
  id?: string;
  name?: string;
  label?: string;
  hourlyRate?: number | string;
  title?: string;
  dailyRate?: number | string;
  workdayHours?: number | string;
  [key: string]: unknown;
}

/** A single computed estimate line (result of the backend calculation engine). */
export interface EstimateLineItem {
  id?: string | number;
  system?: string;
  isEquipment?: boolean;
  description?: string;
  sizeSpec?: string;
  quantity?: number;
  unit?: string;
  materialCost?: number;
  laborHours?: number;
  laborCost?: number;
  directCost?: number;
  factoredPrice?: number;
  factoredBid?: number;
  payItemNo?: number;
  [key: string]: unknown;
}

/** One system/trade group within an estimate. */
export interface EstimateSystem {
  system?: string;
  items: EstimateLineItem[];
  directCost?: number;
  factoredBid?: number;
  materialCost?: number;
  [key: string]: unknown;
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
  directCost?: number;
  contingencyCost?: number;
  scopeAddonsCost?: number;
  totalEquipmentLineItemCost?: number;
  laborByRole?: LaborByRoleEntry[];
  [key: string]: unknown;
}

/** Full estimate payload passed to the exporters. */
export interface Estimate {
  totals: EstimateTotals;
  bySystem: EstimateSystem[];
  rates?: Rates;
  /** Passthrough columns the estimator flagged for client-facing documents. */
  documentColumns?: ColumnDefinition[];
  [key: string]: unknown;
}

/** Contractor branding/company details used in exported documents. */
export interface Branding {
  companyName?: string;
  companyLogoUrl?: string;
  brandColor?: string;
  companyAddress?: string;
  companyPhone?: string;
  licenseNumber?: string;
  [key: string]: unknown;
}

/** A saved rate template (rate library). */
export interface RateTemplate {
  id?: string | number;
  name?: string;
  description?: string;
  isDefault?: boolean;
  ratesJson?: Rates;
  [key: string]: unknown;
}

/** Rolled-up summary numbers stored on an estimate row (JSONB). */
export interface EstimateSummary {
  finalBidAmount?: number;
  [key: string]: unknown;
}

/** A saved estimate row as returned to the client (with the JSON columns read back on load). */
export interface EstimateRecord extends Estimate {
  items_json?: TakeoffItem[];
  rates_json?: Rates;
  summary_json?: EstimateSummary;
  /** Ordered takeoff column schema stored beside the items. */
  columns_json?: ColumnDefinition[];
  [key: string]: unknown;
}

/** A client change-order record. */
export interface ChangeOrder {
  id?: string | number;
  number?: string;
  title?: string;
  description?: string;
  amount?: number | string;
  scheduleDays?: number | string;
  status?: string;
  date?: string;
  [key: string]: unknown;
}

/** A warranty / punch-list item. */
export interface WarrantyItem {
  id?: string | number;
  dateReported?: string;
  location?: string;
  issue?: string;
  resolution?: string;
  covered?: boolean;
  status?: string;
  cost?: number | string;
  [key: string]: unknown;
}

/** Aggregated labor hours/cost for one role within an estimate. */
export interface LaborByRoleEntry {
  roleId?: string;
  roleTitle?: string;
  laborHours: number;
  laborCost?: number;
  hourlyRate?: number;
  [key: string]: unknown;
}

/** A row in the equipment rental catalog. */
export interface EquipmentCatalogItem {
  id: string;
  title?: string;
  dailyRate?: number | string;
  weeklyRate?: number | string;
  monthlyRate?: number | string;
  deliveryFee?: number | string;
  fuelSurchargePct?: number | string;
  damageWaiverPct?: number | string;
  minimumRentalDays?: number | string;
  standbyRatePct?: number | string;
  ownedDailyRate?: number | string;
  defaultOperatorIncluded?: boolean;
  equipmentOwnership?: string;
  [key: string]: unknown;
}

/** A miscellaneous cost line item. */
export interface MiscItem {
  id: string;
  title?: string;
  amount?: number | string;
  [key: string]: unknown;
}
