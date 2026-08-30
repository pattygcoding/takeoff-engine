// Builds a Word (.docx) document summarizing the estimate, using the `docx` library.
import {
  Document,
  Packer,
  Paragraph,
  Table,
  TableRow,
  TableCell,
  TextRun,
  HeadingLevel,
  AlignmentType,
  WidthType,
  BorderStyle,
  ImageRun,
} from 'docx';
import { formatCurrency, formatNumber } from './calculations';
import { getTranslation } from '@/core/lib/shared/i18n';

const THIN_BORDER = { style: BorderStyle.SINGLE, size: 2, color: 'CBD5E1' };
const CELL_BORDERS = { top: THIN_BORDER, bottom: THIN_BORDER, left: THIN_BORDER, right: THIN_BORDER };

function hexColorWithoutHash(hex = '#0284c7') {
  return (hex || '#0284c7').replace(/^#/, '').toUpperCase();
}

function headerCell(text, alignRight = false, fillColor = 'F1F5F9', textColor = '475569') {
  return new TableCell({
    borders: CELL_BORDERS,
    shading: { fill: fillColor },
    children: [
      new Paragraph({
        alignment: alignRight ? AlignmentType.RIGHT : AlignmentType.LEFT,
        children: [new TextRun({ text, bold: true, size: 18, color: textColor })],
      }),
    ],
  });
}

function bodyCell(text, alignRight = false, bold = false) {
  return new TableCell({
    borders: CELL_BORDERS,
    children: [
      new Paragraph({
        alignment: alignRight ? AlignmentType.RIGHT : AlignmentType.LEFT,
        children: [new TextRun({ text: String(text), size: 20, bold })],
      }),
    ],
  });
}

function summaryRow(label, value, highlight = false, highlightColor = 'EEF2FF') {
  return new TableRow({
    children: [
      new TableCell({
        borders: CELL_BORDERS,
        shading: highlight ? { fill: highlightColor } : undefined,
        children: [new Paragraph({ children: [new TextRun({ text: label, bold: highlight, size: 20 })] })],
      }),
      new TableCell({
        borders: CELL_BORDERS,
        shading: highlight ? { fill: highlightColor } : undefined,
        children: [
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [new TextRun({ text: value, bold: highlight, size: 20 })],
          }),
        ],
      }),
    ],
  });
}

/**
 * Builds and downloads a Word (.docx) document for the estimate matching the selected layout format.
 * @param {object} estimate - result of computeEstimate()
 * @param {boolean} proposalMode - whether to hide internal cost/markup details
 * @param {object} branding - contractor branding options (companyName, companyLogoUrl, brandColor, etc.)
 * @param {Function} [customT] - optional translation function (defaults to getTranslation)
 * @param {string} [formatId] - current template format ID (e.g. 'material_procurement', 'standard_estimate', etc.)
 * @param {object} [currentProject] - current project metadata
 * @param {object} [rates] - active rate calculations/percentages
 */
export async function exportEstimateToWord(estimate, proposalMode, branding = {}, customT = null, formatId = 'standard_estimate', currentProject = null, rates = {}) {
  const t = customT || getTranslation;
  const { totals, bySystem } = estimate;
  const brandColorHex = hexColorWithoutHash(branding?.brandColor || '#0284c7');
  const hasBranding = Boolean(branding?.companyName || branding?.companyLogoUrl);

  const children = [];

  // 1. Company Branding & Project Header Block
  const headerChildren = [];

  if (hasBranding && branding.companyLogoUrl) {
    try {
      const response = await fetch(branding.companyLogoUrl);
      const imageBlob = await response.blob();
      const arrayBuffer = await imageBlob.arrayBuffer();

      headerChildren.push(
        new Paragraph({
          children: [
            new ImageRun({
              data: arrayBuffer,
              transformation: {
                width: 140,
                height: 48,
              },
            }),
          ],
          spacing: { after: 100 },
        })
      );
    } catch (err) {
      console.warn('Could not load company logo for Word export:', err.message);
    }
  }

  // Company Name
  headerChildren.push(
    new Paragraph({
      children: [
        new TextRun({
          text: branding?.companyName || t('product.templates.header.defaultCompanyName'),
          bold: true,
          size: 28,
          color: brandColorHex,
        }),
      ],
    })
  );

  const subDetails = [];
  if (branding?.companyAddress) subDetails.push(branding.companyAddress);
  if (branding?.companyPhone) subDetails.push(t('product.templates.header.phonePrefix', { phone: branding.companyPhone }));
  if (branding?.licenseNumber) subDetails.push(t('product.wordExport.license', { license: branding.licenseNumber }));

  if (subDetails.length > 0) {
    headerChildren.push(
      new Paragraph({
        spacing: { after: 150 },
        children: [
          new TextRun({
            text: subDetails.join('  |  '),
            size: 18,
            color: '64748B',
          }),
        ],
      })
    );
  }

  // Project Info Subheader
  const projDetails = [];
  projDetails.push(currentProject?.name || t('product.templates.header.defaultProjectName'));
  if (currentProject?.client_name) projDetails.push(t('product.templates.header.clientPrefix', { client: currentProject.client_name }));
  if (currentProject?.location) projDetails.push(t('product.templates.header.sitePrefix', { site: currentProject.location }));
  projDetails.push(t('product.templates.header.datePrefix', { date: new Date().toLocaleDateString() }));

  headerChildren.push(
    new Paragraph({
      spacing: { after: 300 },
      children: [
        new TextRun({
          text: projDetails.join('   •   '),
          size: 18,
          color: '475569',
          bold: true,
        }),
      ],
    })
  );

  children.push(...headerChildren);

  // 2. Specialized Template Layouts
  if (formatId === 'material_procurement') {
    // 8. Material Purchase & Supply Order
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        children: [new TextRun(t('product.templates.materialProcurement.title'))],
      }),
      new Paragraph({
        spacing: { after: 200 },
        children: [
          new TextRun({
            text: `${t('product.templates.materialProcurement.vendorNote')} ${t('product.templates.materialProcurement.vendorNoteText')}`,
            color: '0369A1',
            size: 18,
            italics: true,
          }),
        ],
      })
    );

    const headerRow = new TableRow({
      tableHeader: true,
      children: [
        headerCell(t('product.templates.materialProcurement.colItemDescription')),
        headerCell(t('product.templates.materialProcurement.colMaterialSpec')),
        headerCell(t('product.templates.materialProcurement.colOrderQty'), true),
        headerCell(t('product.templates.materialProcurement.colUnit')),
        headerCell(t('product.templates.materialProcurement.colEstUnitMat'), true),
        headerCell(t('product.templates.materialProcurement.colTotalMaterial'), true, '0C4A6E', 'FFFFFF'),
      ],
    });

    const items = bySystem.flatMap((s) => s.items);
    const itemRows = items.map((it) => {
      const unitMat = it.quantity > 0 ? it.materialCost / it.quantity : 0;
      return new TableRow({
        children: [
          bodyCell(it.description),
          bodyCell(it.sizeSpec),
          bodyCell(formatNumber(it.quantity, 0), true),
          bodyCell(it.unit),
          bodyCell(formatCurrency(unitMat), true),
          bodyCell(formatCurrency(it.materialCost), true, true),
        ],
      });
    });

    const totalRow = new TableRow({
      children: [
        new TableCell({
          borders: CELL_BORDERS,
          columnSpan: 5,
          shading: { fill: 'F8FAFC' },
          children: [
            new Paragraph({
              alignment: AlignmentType.RIGHT,
              children: [new TextRun({ text: t('product.templates.materialProcurement.totalMaterialCommitment'), bold: true, size: 20 })],
            }),
          ],
        }),
        new TableCell({
          borders: CELL_BORDERS,
          shading: { fill: 'F8FAFC' },
          children: [
            new Paragraph({
              alignment: AlignmentType.RIGHT,
              children: [new TextRun({ text: formatCurrency(totals.totalMaterialCost), bold: true, size: 20, color: '0369A1' })],
            }),
          ],
        }),
      ],
    });

    children.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [headerRow, ...itemRows, totalRow],
      })
    );
  } else if (formatId === 'aia_bid_schedule') {
    // 5. AIA Bid Schedule
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        children: [new TextRun(t('product.templates.aiaBidSchedule.title'))],
      }),
      new Paragraph({
        spacing: { after: 200 },
        children: [new TextRun({ text: t('product.templates.aiaBidSchedule.noteStandardSpec'), size: 18, color: '64748B' })],
      })
    );

    const headerRow = new TableRow({
      tableHeader: true,
      children: [
        headerCell(t('product.templates.aiaBidSchedule.colItemNumber')),
        headerCell(t('product.templates.aiaBidSchedule.colPayItemDesc')),
        headerCell(t('product.templates.aiaBidSchedule.colEstQty'), true),
        headerCell(t('product.templates.aiaBidSchedule.colUnit')),
        headerCell(t('product.templates.aiaBidSchedule.colUnitPrice'), true),
        headerCell(t('product.templates.aiaBidSchedule.colTotalItemBid'), true),
      ],
    });

    const items = bySystem.flatMap((s) => s.items);
    const itemRows = items.map((it, idx) => {
      const unitBid = it.quantity > 0 ? it.directCost / it.quantity : 0;
      return new TableRow({
        children: [
          bodyCell(String(idx + 1).padStart(3, '0')),
          bodyCell(`${it.system} - ${it.description} (${it.sizeSpec})`),
          bodyCell(formatNumber(it.quantity, 0), true),
          bodyCell(it.unit),
          bodyCell(formatCurrency(unitBid), true),
          bodyCell(formatCurrency(it.directCost), true, true),
        ],
      });
    });

    const totalRow = new TableRow({
      children: [
        new TableCell({
          borders: CELL_BORDERS,
          columnSpan: 5,
          shading: { fill: 'F8FAFC' },
          children: [
            new Paragraph({
              alignment: AlignmentType.RIGHT,
              children: [new TextRun({ text: t('product.templates.aiaBidSchedule.totalBaseBidSchedule'), bold: true, size: 20 })],
            }),
          ],
        }),
        new TableCell({
          borders: CELL_BORDERS,
          shading: { fill: 'F8FAFC' },
          children: [
            new Paragraph({
              alignment: AlignmentType.RIGHT,
              children: [new TextRun({ text: formatCurrency(totals.finalBidAmount), bold: true, size: 20, color: brandColorHex })],
            }),
          ],
        }),
      ],
    });

    children.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [headerRow, ...itemRows, totalRow],
      })
    );
  } else if (formatId === 'warranty_closeout_cert') {
    // 17. Closeout & Warranty Certificate
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        heading: HeadingLevel.HEADING_1,
        children: [new TextRun({ text: t('product.templates.warrantyCloseout.title'), bold: true, color: 'B45309' })],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
        children: [new TextRun({ text: t('product.templates.warrantyCloseout.certifyScopeCompleted'), size: 18, italics: true })],
      })
    );

    const rows = [
      summaryRow(t('product.templates.warrantyCloseout.contractorLabel'), branding?.companyName || t('product.templates.warrantyCloseout.defaultContractor')),
      summaryRow(t('product.templates.warrantyCloseout.clientLabel'), currentProject?.client_name || t('product.templates.warrantyCloseout.defaultClient')),
      summaryRow(t('product.templates.warrantyCloseout.warrantyPeriodLabel'), t('product.templates.warrantyCloseout.warrantyPeriodValue')),
      summaryRow(t('product.templates.warrantyCloseout.certifiedValueLabel'), formatCurrency(totals.finalBidAmount), true),
    ];

    children.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows,
      })
    );
  } else if (proposalMode || formatId === 'client_proposal' || formatId === 'executive_presentation') {
    // Standard / Executive Client Proposal Layout
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        children: [new TextRun(t('product.wordExport.clientProposalTitle'))],
      }),
      new Paragraph({
        spacing: { after: 300 },
        children: [
          new TextRun({
            text: t('product.wordExport.clientProposalSubtitle'),
            color: '64748B',
            size: 20,
          }),
        ],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 100 },
        children: [new TextRun({ text: t('product.wordExport.totalProjectInvestment'), color: '94A3B8', size: 18, bold: true })],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 300 },
        children: [new TextRun({ text: formatCurrency(totals.finalBidAmount), bold: true, size: 44, color: brandColorHex })],
      })
    );

    bySystem.forEach((sys) => {
      children.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 300, after: 150 },
          children: [new TextRun({ text: sys.system, color: brandColorHex, bold: true })],
        })
      );

      const headerRow = new TableRow({
        tableHeader: true,
        children: [
          headerCell(t('product.wordExport.colDescription')),
          headerCell(t('product.wordExport.colSizeSpec')),
          headerCell(t('product.wordExport.colQty'), true),
          headerCell(t('product.wordExport.colUnit')),
          headerCell(t('product.wordExport.colLineTotal'), true),
        ],
      });

      const itemRows = sys.items.map(
        (item) =>
          new TableRow({
            children: [
              bodyCell(item.description),
              bodyCell(item.sizeSpec),
              bodyCell(formatNumber(item.quantity, 0), true),
              bodyCell(item.unit),
              bodyCell(formatCurrency(item.directCost), true),
            ],
          })
      );

      const subtotalRow = new TableRow({
        children: [
          new TableCell({
            borders: CELL_BORDERS,
            columnSpan: 4,
            children: [new Paragraph({ children: [new TextRun({ text: t('product.wordExport.subtotal'), bold: true, size: 20 })] })],
          }),
          bodyCell(formatCurrency(sys.directCost), true, true),
        ],
      });

      children.push(
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [headerRow, ...itemRows, subtotalRow],
        })
      );
    });

    children.push(
      new Paragraph({ spacing: { before: 300 }, children: [] }),
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          summaryRow(t('product.wordExport.subtotal'), formatCurrency(totals.totalDirectCost)),
          summaryRow(t('product.wordExport.totalBid'), formatCurrency(totals.finalBidAmount), true),
        ],
      })
    );
  } else {
    // Full Detailed Internal Cost Breakdown Layout (Default)
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        children: [new TextRun(t('product.wordExport.internalCostBreakdownTitle'))],
      }),
      new Paragraph({
        spacing: { after: 300 },
        children: [
          new TextRun({
            text: t('product.wordExport.internalCostBreakdownSubtitle'),
            color: '64748B',
            size: 20,
          }),
        ],
      })
    );

    const overheadLabel = totals.overheadType === 'fixed'
      ? t('product.wordExport.overheadFixed')
      : t('product.wordExport.overhead', { pct: totals.overheadPct });

    const contingencyLabel = totals.contingencyType === 'fixed'
      ? t('product.wordExport.contingencyFixed')
      : t('product.wordExport.contingency', { pct: totals.contingencyPct });

    const profitLabel = totals.profitType === 'fixed'
      ? t('product.wordExport.profitFixed')
      : t('product.wordExport.profit', { pct: totals.profitPct });

    const summaryRows = [
      summaryRow(t('product.wordExport.totalMaterialCost'), formatCurrency(totals.totalMaterialCost)),
      summaryRow(t('product.wordExport.totalLaborCost'), `${formatCurrency(totals.totalLaborCost)} (${formatNumber(totals.totalLaborHours)} hrs)`),
      summaryRow(t('product.wordExport.equipmentMobilization'), formatCurrency(totals.equipmentLumpSum)),
      ...(totals.miscCost > 0 ? [summaryRow(t('product.wordExport.miscellaneousCosts'), formatCurrency(totals.miscCost))] : []),
      summaryRow(t('product.wordExport.totalDirectCost'), formatCurrency(totals.totalDirectCost)),
      summaryRow(overheadLabel, formatCurrency(totals.overheadAmount)),
      summaryRow(contingencyLabel, formatCurrency(totals.contingencyAmount)),
      summaryRow(profitLabel, formatCurrency(totals.profitAmount)),
      summaryRow(t('product.wordExport.finalBidAmount'), formatCurrency(totals.finalBidAmount), true),
    ];

    children.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: summaryRows,
      }),
      new Paragraph({ spacing: { after: 300 }, children: [] })
    );

    bySystem.forEach((sys) => {
      children.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 300, after: 150 },
          children: [new TextRun({ text: sys.system, color: brandColorHex, bold: true })],
        })
      );

      const headerCells = [
        t('product.wordExport.colDescription'),
        t('product.wordExport.colSizeSpec'),
        t('product.wordExport.colQty'),
        t('product.wordExport.colUnit'),
        t('product.wordExport.colMaterial'),
        t('product.wordExport.colLaborHrs'),
        t('product.wordExport.colLaborDollar'),
        t('product.wordExport.colDirectCost'),
      ];

      const headerRow = new TableRow({
        tableHeader: true,
        children: headerCells.map((h, i) =>
          headerCell(h, i >= headerCells.length - 1, 'F1F5F9', '334155')
        ),
      });

      const itemRows = sys.items.map(
        (item) =>
          new TableRow({
            children: [
              bodyCell(item.description),
              bodyCell(item.sizeSpec),
              bodyCell(formatNumber(item.quantity, 0), true),
              bodyCell(item.unit),
              bodyCell(formatCurrency(item.materialCost), true),
              bodyCell(formatNumber(item.laborHours), true),
              bodyCell(formatCurrency(item.laborCost), true),
              bodyCell(formatCurrency(item.directCost), true, true),
            ],
          })
      );

      const subtotalRow = new TableRow({
        children: [
          new TableCell({
            borders: CELL_BORDERS,
            columnSpan: 7,
            children: [new Paragraph({ children: [new TextRun({ text: t('product.wordExport.subtotal'), bold: true, size: 20 })] })],
          }),
          bodyCell(formatCurrency(sys.directCost), true, true),
        ],
      });

      children.push(
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [headerRow, ...itemRows, subtotalRow],
        })
      );
    });
  }

  // 3. Footer Sign-off Block
  children.push(
    new Paragraph({
      spacing: { before: 400 },
      children: [
        new TextRun({
          text: hasBranding
            ? t('product.wordExport.footerBranded', { company: branding.companyName || t('product.wordExport.fallbackContractor') })
            : t('product.wordExport.footerDefault'),
          size: 16,
          color: '94A3B8',
          italics: true,
        }),
      ],
    })
  );

  const doc = new Document({
    sections: [{ properties: {}, children }],
  });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${(currentProject?.name || 'takeoff_estimate').replace(/\s+/g, '_')}_${formatId}.docx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
