import React from 'react';
import { formatCurrency, formatNumber } from '@/product/lib/calculations';
import { DocumentBrandingHeader, DocumentSignOff } from './DocumentHeaderSignoff';
import { useTranslation } from '@/core/components/context/I18nContext';

/**
 * 11. Trench & Earthwork Engineering Log Layout
 */
export default function TrenchEarthworkLogDocument({ estimate, branding, currentProject }) {
  const { bySystem } = estimate;
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <DocumentBrandingHeader branding={branding} title={t('product.templates.trenchEarthwork.title')} project={currentProject} />

      <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-2xl grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div>
          <span className="text-[10px] uppercase font-bold text-amber-700">{t('product.templates.trenchEarthwork.trenchWidthAssumption')}</span>
          <p className="font-bold text-slate-900">{t('product.templates.trenchEarthwork.trenchWidthValue')}</p>
        </div>
        <div>
          <span className="text-[10px] uppercase font-bold text-amber-700">{t('product.templates.trenchEarthwork.averageCoverDepth')}</span>
          <p className="font-bold text-slate-900">{t('product.templates.trenchEarthwork.averageCoverDepthValue')}</p>
        </div>
        <div>
          <span className="text-[10px] uppercase font-bold text-amber-700">{t('product.templates.trenchEarthwork.nativeSwellFactor')}</span>
          <p className="font-bold text-slate-900">{t('product.templates.trenchEarthwork.nativeSwellFactorValue')}</p>
        </div>
        <div>
          <span className="text-[10px] uppercase font-bold text-amber-700">{t('product.templates.trenchEarthwork.trenchSafety')}</span>
          <p className="font-bold text-slate-900">{t('product.templates.trenchEarthwork.trenchSafetyValue')}</p>
        </div>
      </div>

      <div className="border border-slate-200 rounded-xl overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-amber-950 text-white">
            <tr>
              <th className="p-2.5">{t('product.templates.trenchEarthwork.colTrenchLine')}</th>
              <th className="p-2.5 text-right">{t('product.templates.trenchEarthwork.colLength')}</th>
              <th className="p-2.5 text-right">{t('product.templates.trenchEarthwork.colTrenchVol')}</th>
              <th className="p-2.5 text-right">{t('product.templates.trenchEarthwork.colBeddingStone')}</th>
              <th className="p-2.5 text-right">{t('product.templates.trenchEarthwork.colBackfillHaul')}</th>
              <th className="p-2.5 text-right">{t('product.templates.trenchEarthwork.colDirectCost')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 font-mono">
            {bySystem.flatMap((s) => s.items).map((it, idx) => {
              const lf = it.unit?.toLowerCase().includes('lf') || it.unit?.toLowerCase().includes('ft') ? it.quantity : it.quantity * 10;
              const cy = (lf * 3.0 * 6.0) / 27;
              const stone = cy * 0.35 * 1.4;
              return (
                <tr key={idx} className="hover:bg-slate-50">
                  <td className="p-2.5 font-sans font-medium text-slate-900">{it.description} ({it.sizeSpec})</td>
                  <td className="p-2.5 text-right">{formatNumber(lf, 0)}</td>
                  <td className="p-2.5 text-right text-amber-900 font-bold">{t('product.templates.trenchEarthwork.cyUnit', { count: formatNumber(cy, 1) })}</td>
                  <td className="p-2.5 text-right">{t('product.templates.trenchEarthwork.tnUnit', { count: formatNumber(stone, 1) })}</td>
                  <td className="p-2.5 text-right">{t('product.templates.trenchEarthwork.cyUnit', { count: formatNumber(cy * 0.65, 1) })}</td>
                  <td className="p-2.5 text-right font-bold text-slate-900">{formatCurrency(it.directCost)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <DocumentSignOff branding={branding} />
    </div>
  );
}
