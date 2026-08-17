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
} from 'docx';
import { formatCurrency, formatNumber } from './calculations';

const THIN_BORDER = { style: BorderStyle.SINGLE, size: 2, color: 'CBD5E1' };
const CELL_BORDERS = { top: THIN_BORDER, bottom: THIN_BORDER, left: THIN_BORDER, right: THIN_BORDER };

function headerCell(text, alignRight = false) {
  return new TableCell({
    borders: CELL_BORDERS,
    shading: { fill: 'F1F5F9' },
    children: [
      new Paragraph({
        alignment: alignRight ? AlignmentType.RIGHT : AlignmentType.LEFT,
        children: [new TextRun({ text, bold: true, size: 18, color: '475569' })],
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

function summaryRow(label, value, highlight = false) {
  return new TableRow({
    children: [
      new TableCell({
        borders: CELL_BORDERS,
        shading: highlight ? { fill: 'EEF2FF' } : undefined,
        children: [new Paragraph({ children: [new TextRun({ text: label, bold: highlight, size: 20 })] })],
      }),
      new TableCell({
        borders: CELL_BORDERS,
        shading: highlight ? { fill: 'EEF2FF' } : undefined,
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
 */
export async function exportEstimateToWord(estimate, proposalMode) {
  const { totals, bySystem } = estimate;

  const children = [];

  children.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      children: [new TextRun(proposalMode ? 'Client Proposal' : 'Internal Cost Breakdown')],
    }),
    new Paragraph({
      spacing: { after: 300 },
      children: [
        new TextRun({
          text: proposalMode
            ? 'Clean, client-facing summary of the project estimate.'
            : 'Full internal cost detail including markups and labor hours.',
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
        children: [new TextRun({ text: 'TOTAL PROJECT INVESTMENT', color: '94A3B8', size: 18, bold: true })],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 300 },
        children: [new TextRun({ text: formatCurrency(totals.finalBidAmount), bold: true, size: 44 })],
      })
    );
  } else {
    const summaryRows = [
      summaryRow('Total Material Cost', formatCurrency(totals.totalMaterialCost)),
      summaryRow('Total Labor Cost', `${formatCurrency(totals.totalLaborCost)} (${formatNumber(totals.totalLaborHours)} hrs)`),
      summaryRow('Equipment / Mobilization', formatCurrency(totals.equipmentLumpSum)),
      summaryRow('Total Direct Cost', formatCurrency(totals.totalDirectCost)),
      summaryRow(`Overhead (${totals.overheadPct}%)`, formatCurrency(totals.overheadAmount)),
      summaryRow(`Contingency (${totals.contingencyPct}%)`, formatCurrency(totals.contingencyAmount)),
      summaryRow(`Profit (${totals.profitPct}%)`, formatCurrency(totals.profitAmount)),
      summaryRow('Final Bid Amount', formatCurrency(totals.finalBidAmount), true),
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
        children: [new TextRun(sys.system)],
      })
    );

    const headerCells = proposalMode
      ? ['Description', 'Size / Spec', 'Qty', 'Unit', 'Line Total']
      : ['Description', 'Size / Spec', 'Qty', 'Unit', 'Material', 'Labor Hrs', 'Labor $', 'Direct Cost'];

    const headerRow = new TableRow({
      tableHeader: true,
      children: headerCells.map((h, i) => headerCell(h, i >= headerCells.length - 1)),
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
          children: [new Paragraph({ children: [new TextRun({ text: 'Subtotal', bold: true, size: 20 })] })],
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
          summaryRow('Subtotal', formatCurrency(totals.totalDirectCost)),
          summaryRow('Total Bid', formatCurrency(totals.finalBidAmount), true),
        ],
      })
    );
  }

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
