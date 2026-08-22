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
import { getTranslation } from './i18n';

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
 * Builds and downloads a Word (.docx) document for the estimate.
 * @param {object} estimate - result of computeEstimate()
 * @param {boolean} proposalMode - whether to hide internal cost/markup details
 * @param {object} branding - contractor branding options (companyName, companyLogoUrl, brandColor, etc.)
 * @param {Function} [customT] - optional translation function (defaults to getTranslation)
 */
export async function exportEstimateToWord(estimate, proposalMode, branding = {}, customT = null) {
  const t = customT || getTranslation;
  const { totals, bySystem } = estimate;
  const brandColorHex = hexColorWithoutHash(branding?.brandColor || '#0284c7');
  const hasBranding = Boolean(branding?.companyName || branding?.companyLogoUrl);

  const children = [];

  // 1. Company Branding Header
  if (hasBranding) {
    const brandingHeaderChildren = [];

    // Optional Logo Image
    if (branding.companyLogoUrl) {
      try {
        const response = await fetch(branding.companyLogoUrl);
        const imageBlob = await response.blob();
        const arrayBuffer = await imageBlob.arrayBuffer();

        brandingHeaderChildren.push(
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

    // Company Text Info
    if (branding.companyName) {
      brandingHeaderChildren.push(
        new Paragraph({
          children: [
            new TextRun({
              text: branding.companyName,
              bold: true,
              size: 28,
              color: brandColorHex,
            }),
          ],
        })
      );
    }

    const subDetails = [];
    if (branding.companyAddress) subDetails.push(branding.companyAddress);
    if (branding.companyPhone) subDetails.push(t('wordExport.phone', { phone: branding.companyPhone }));
    if (branding.licenseNumber) subDetails.push(t('wordExport.license', { license: branding.licenseNumber }));

    if (subDetails.length > 0) {
      brandingHeaderChildren.push(
        new Paragraph({
          spacing: { after: 200 },
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

    children.push(...brandingHeaderChildren);
  }

  // Document Title
  children.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      children: [new TextRun(proposalMode ? t('wordExport.clientProposalTitle') : t('wordExport.internalCostBreakdownTitle'))],
    }),
    new Paragraph({
      spacing: { after: 300 },
      children: [
        new TextRun({
          text: proposalMode
            ? t('wordExport.clientProposalSubtitle')
            : t('wordExport.internalCostBreakdownSubtitle'),
          color: '64748B',
          size: 20,
        }),
      ],
    })
  );

  // Summary section
  if (proposalMode) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 100 },
        children: [new TextRun({ text: t('wordExport.totalProjectInvestment'), color: '94A3B8', size: 18, bold: true })],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 300 },
        children: [new TextRun({ text: formatCurrency(totals.finalBidAmount), bold: true, size: 44, color: brandColorHex })],
      })
    );
  } else {
    const summaryRows = [
      summaryRow(t('wordExport.totalMaterialCost'), formatCurrency(totals.totalMaterialCost)),
      summaryRow(t('wordExport.totalLaborCost'), `${formatCurrency(totals.totalLaborCost)} (${formatNumber(totals.totalLaborHours)} hrs)`),
      summaryRow(t('wordExport.equipmentMobilization'), formatCurrency(totals.equipmentLumpSum)),
      summaryRow(t('wordExport.totalDirectCost'), formatCurrency(totals.totalDirectCost)),
      summaryRow(t('wordExport.overhead', { pct: totals.overheadPct }), formatCurrency(totals.overheadAmount)),
      summaryRow(t('wordExport.contingency', { pct: totals.contingencyPct }), formatCurrency(totals.contingencyAmount)),
      summaryRow(t('wordExport.profit', { pct: totals.profitPct }), formatCurrency(totals.profitAmount)),
      summaryRow(t('wordExport.finalBidAmount'), formatCurrency(totals.finalBidAmount), true),
    ];
    children.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: summaryRows,
      }),
      new Paragraph({ spacing: { after: 300 }, children: [] })
    );
  }

  // Per-system tables
  bySystem.forEach((sys) => {
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 300, after: 150 },
        children: [new TextRun({ text: sys.system, color: brandColorHex, bold: true })],
      })
    );

    const headerCells = proposalMode
      ? [
          t('wordExport.colDescription'),
          t('wordExport.colSizeSpec'),
          t('wordExport.colQty'),
          t('wordExport.colUnit'),
          t('wordExport.colLineTotal'),
        ]
      : [
          t('wordExport.colDescription'),
          t('wordExport.colSizeSpec'),
          t('wordExport.colQty'),
          t('wordExport.colUnit'),
          t('wordExport.colMaterial'),
          t('wordExport.colLaborHrs'),
          t('wordExport.colLaborDollar'),
          t('wordExport.colDirectCost'),
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
          children: proposalMode
            ? [
                bodyCell(item.description),
                bodyCell(item.sizeSpec),
                bodyCell(formatNumber(item.quantity, 0), true),
                bodyCell(item.unit),
                bodyCell(formatCurrency(item.directCost), true),
              ]
            : [
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
          columnSpan: proposalMode ? 4 : 7,
          children: [new Paragraph({ children: [new TextRun({ text: t('wordExport.subtotal'), bold: true, size: 20 })] })],
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

  if (proposalMode) {
    children.push(
      new Paragraph({ spacing: { before: 300 }, children: [] }),
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          summaryRow(t('wordExport.subtotal'), formatCurrency(totals.totalDirectCost)),
          summaryRow(t('wordExport.totalBid'), formatCurrency(totals.finalBidAmount), true),
        ],
      })
    );
  }

  // Footer: Generated by Takeoff Engine or Contractor custom signature
  children.push(
    new Paragraph({
      spacing: { before: 400 },
      children: [
        new TextRun({
          text: hasBranding
            ? t('wordExport.footerBranded', { company: branding.companyName || t('wordExport.fallbackContractor') })
            : t('wordExport.footerDefault'),
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
  link.download = proposalMode ? 'client_proposal.docx' : 'internal_estimate.docx';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
