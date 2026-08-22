/**
 * Barrel export for all 17 Estimating, Engineering, and Proposal Document Templates
 */
export { DocumentBrandingHeader, DocumentSignOff } from './DocumentHeaderSignoff';

// --- Standard / Free Document Formats (3) ---
export { default as StandardEstimateDocument } from './StandardEstimateDocument';
export { default as ClientProposalDocument } from './ClientProposalDocument';
export { default as ExecutiveProposalDocument } from './ExecutiveProposalDocument';

// --- Pro / Enterprise Document Formats (14) ---
export { default as ItemizedLedgerDocument } from './ItemizedLedgerDocument';
export { default as AiaBidScheduleDocument } from './AiaBidScheduleDocument';
export { default as KpiSummaryDocument } from './KpiSummaryDocument';
export { default as ScopeMatrixDocument } from './ScopeMatrixDocument';
export { default as MaterialProcurementDocument } from './MaterialProcurementDocument';
export { default as CrewProductionScheduleDocument } from './CrewProductionScheduleDocument';
export { default as SubcontractorScopeDocument } from './SubcontractorScopeDocument';
export { default as TrenchEarthworkLogDocument } from './TrenchEarthworkLogDocument';
export { default as AiaSovBillingDocument } from './AiaSovBillingDocument';
export { default as FormalContractAgreementDocument } from './FormalContractAgreementDocument';
export { default as PhaseMilestoneDrawDocument } from './PhaseMilestoneDrawDocument';
export { default as RiskContingencyMatrixDocument } from './RiskContingencyMatrixDocument';
export { default as FieldDailyReportDocument } from './FieldDailyReportDocument';
export { default as WarrantyCloseoutCertDocument } from './WarrantyCloseoutCertDocument';
