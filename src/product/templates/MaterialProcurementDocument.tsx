import React from 'react';
import type { DocumentTemplateProps } from '@/types/models';
import type { DocumentColumn } from './DocumentHeaderSignoff';
import { formatCurrency, formatNumber } from '@/product/lib/calculations';
import { useTranslation } from '@/core/components/context/I18nContext';
import {
  DocumentLetterhead,
  DocumentSectionHeading,
  DocumentSystemTable,
  DocumentTotalRow,
  DocumentSignatureBlock,
  DocumentFillLine as FillLine,
  DocumentFooter,
} from './DocumentHeaderSignoff';

const KEY = 'product.templates.materialProcurement';
const ACCENT = '#1d4ed8';

/**
 * 8. Material Purchase & Supply Order Layout
 */
export default function MaterialProcurementDocument({ estimate, branding, currentProject }: DocumentTemplateProps) {
  const { totals = {}, bySystem = [] } = estimate;
  const { t } = useTranslation();
  const accent = branding?.brandColor || ACCENT;
  // Deterministic so the on-screen preview and the print copy show the same PO number.
  const today = new Date();
  const poId = [
    String(today.getFullYear()).slice(-2),
    String(today.getMonth() + 1).padStart(2, '0'),
    String(today.getDate()).padStart(2, '0'),
  ].join('') + (currentProject?.id ? `-${String(currentProject.id).slice(-4).toUpperCase()}` : '');

  const columns: DocumentColumn[] = [
    { header: t(`${KEY}.colItemDescription`), render: (it) => it.description },
    { header: t(`${KEY}.colMaterialSpec`), muted: true, render: (it) => it.sizeSpec },
    { header: t(`${KEY}.colOrderQty`), align: 'right', className: 'font-semibold text-slate-900', render: (it) => formatNumber(it.quantity, 0) },
    { header: t(`${KEY}.colUnit`), muted: true, render: (it) => it.unit },
    {
      header: t(`${KEY}.colEstUnitMat`),
      align: 'right',
      render: (it) => formatCurrency(it.quantity > 0 ? it.materialCost / it.quantity : 0),
    },
    { header: t(`${KEY}.colTotalMaterial`), align: 'right', strong: true, render: (it) => formatCurrency(it.materialCost) },
  ];

  const systemMaterial = (sys: any) =>
    sys.materialCost ?? sys.items.reduce((sum: number, it: any) => sum + (it.materialCost || 0), 0);

  return (
    <div className="text-slate-800 text-[11px] leading-relaxed tabular-nums">
      <DocumentLetterhead branding={branding} title={t(`${KEY}.title`)} project={currentProject} accent={accent} />

      <section className="mt-6 grid grid-cols-2 gap-6 break-inside-avoid">
        <div className="border border-slate-300 p-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.15em] mb-1" style={{ color: accent }}>
            {t(`${KEY}.vendorHeading`)}
          </p>
          <FillLine label={t(`${KEY}.vendorName`)} />
          <FillLine label={t(`${KEY}.vendorContact`)} />
          <FillLine label={t(`${KEY}.vendorPhoneEmail`)} />
        </div>
        <div className="border border-slate-300 p-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.15em] mb-1" style={{ color: accent }}>
            {t(`${KEY}.shipToHeading`)}
          </p>
          <FillLine label={t(`${KEY}.poNumber`)} value={t(`${KEY}.poReqPrefix`, { id: poId })} />
          <FillLine
            label={t(`${KEY}.deliverTo`)}
            value={[currentProject?.name, currentProject?.location].filter(Boolean).join(' — ')}
          />
          <FillLine label={t(`${KEY}.requiredBy`)} />
        </div>
      </section>

      <p className="mt-4 pl-3 border-l-2 text-slate-600 break-inside-avoid" style={{ borderColor: accent }}>
        <strong className="text-slate-800">{t(`${KEY}.vendorNote`)}</strong> {t(`${KEY}.vendorNoteText`)}
      </p>

      <section className="mt-8">
        <DocumentSectionHeading accent={accent}>{t(`${KEY}.orderHeading`)}</DocumentSectionHeading>
        <DocumentSystemTable
          bySystem={bySystem}
          columns={columns}
          accent={accent}
          subtotal={(sys) => formatCurrency(systemMaterial(sys))}
        />
      </section>

      <section className="mt-8 flex justify-end break-inside-avoid">
        <table className="w-full max-w-[340px] border-collapse">
          <tbody>
            <DocumentTotalRow
              label={t(`${KEY}.totalMaterialCommitment`)}
              value={formatCurrency(totals.totalMaterialCost)}
              accent={accent}
            />
          </tbody>
        </table>
      </section>

      <DocumentSignatureBlock
        accent={accent}
        heading={t(`${KEY}.authorizationHeading`)}
        showPrintedName
        parties={[{ title: t(`${KEY}.requestedBy`), subtitle: branding?.companyName }, { title: t(`${KEY}.approvedBy`) }]}
      />

      <DocumentFooter />
    </div>
  );
}
