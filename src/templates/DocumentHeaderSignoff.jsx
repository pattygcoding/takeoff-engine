import React from 'react';

/**
 * Shared Branding Header for Document Layouts
 */
export function DocumentBrandingHeader({ branding, title, project }) {
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
      <div className="space-y-1">
        {branding?.companyLogoUrl && (
          <img
            src={branding.companyLogoUrl}
            alt={branding.companyName || 'Company Logo'}
            className="h-10 w-auto object-contain mb-1"
          />
        )}
        <h2 className="text-lg font-bold text-slate-900">
          {branding?.companyName || 'Takeoff Engine Estimating'}
        </h2>
        {branding?.companyAddress && <p className="text-xs text-slate-500">{branding.companyAddress}</p>}
        {branding?.companyPhone && <p className="text-xs text-slate-500">Phone: {branding.companyPhone}</p>}
      </div>

      <div className="text-left sm:text-right space-y-1">
        <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">{title}</span>
        <h3 className="text-sm font-bold text-slate-900">{project?.name || 'Utility Takeoff Estimate'}</h3>
        {project?.client_name && <p className="text-xs text-slate-500">Client: {project.client_name}</p>}
        {project?.location && <p className="text-xs text-slate-500">Site: {project.location}</p>}
        <p className="text-[11px] font-mono text-slate-400">Date: {new Date().toLocaleDateString()}</p>
      </div>
    </div>
  );
}

/**
 * Shared Sign-off / Signature Footer Block for Document Layouts
 */
export function DocumentSignOff({ branding, clientSignBlock = false }) {
  return (
    <div className="pt-6 border-t border-slate-200 space-y-4">
      {clientSignBlock ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
          <div className="space-y-8">
            <span className="text-xs font-bold text-slate-700">Submitted By (Contractor):</span>
            <div className="border-b border-slate-400 pb-1 flex justify-between text-xs text-slate-600">
              <span>Authorized Signature</span>
              <span>Date</span>
            </div>
          </div>
          <div className="space-y-8">
            <span className="text-xs font-bold text-slate-700">Accepted By (Client):</span>
            <div className="border-b border-slate-400 pb-1 flex justify-between text-xs text-slate-600">
              <span>Authorized Signature</span>
              <span>Date</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex justify-between items-center text-[11px] text-slate-400">
          <span>Prepared with Takeoff Engine</span>
          <span>Confidential Estimating Data</span>
        </div>
      )}
    </div>
  );
}
