// 7.5in printable width (8.5in Letter minus 0.5in margins) so PDF matches print & preview.
const PRINTABLE_WIDTH_PX = 720;
const MARGIN_PT = 36;
const BREAK_SELECTOR = 'tr, header, footer, section, [data-pdf-block]';

/**
 * Renders a DOM node to a multi-page US Letter PDF and downloads it.
 * Page breaks snap to the bottom of rows/sections so table rows and signature blocks are never cut in half.
 * pageLabel(page, total) optionally stamps a footer on each page.
 */
interface PdfExportOptions {
  pageLabel?: (page: number, total: number) => string;
}

export async function exportNodeToPdf(
  node: HTMLElement,
  filename: string,
  { pageLabel }: PdfExportOptions = {},
): Promise<void> {
  const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([import('jspdf'), import('html2canvas-pro')]);

  let breakPoints: number[] = [];
  let renderedHeightPx = 0;

  const canvas = await html2canvas(node, {
    scale: 2,
    useCORS: true,
    logging: false,
    backgroundColor: '#ffffff',
    windowWidth: 1024,
    onclone: (clonedDoc) => {
      const clonedNode = clonedDoc.getElementById(node.id);
      if (!clonedNode) return;
      Object.assign(clonedNode.style, {
        width: `${PRINTABLE_WIDTH_PX}px`,
        maxWidth: `${PRINTABLE_WIDTH_PX}px`,
        minWidth: `${PRINTABLE_WIDTH_PX}px`,
        padding: '0',
        margin: '0 auto',
        boxSizing: 'border-box',
        borderRadius: '0',
        border: 'none',
        boxShadow: 'none',
      });
      clonedNode.querySelectorAll('.overflow-x-auto').forEach((el) => {
        (el as HTMLElement).style.overflow = 'visible';
      });

      const top = clonedNode.getBoundingClientRect().top;
      renderedHeightPx = clonedNode.getBoundingClientRect().height;
      breakPoints = Array.from(clonedNode.querySelectorAll(BREAK_SELECTOR))
        .map((el) => el.getBoundingClientRect().bottom - top)
        .filter((y) => y > 0)
        .sort((a, b) => a - b);
    },
  });

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'letter' });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const usableWidth = pageWidth - MARGIN_PT * 2;
  const usableHeight = pageHeight - MARGIN_PT * 2;

  const pxPerPt = canvas.width / usableWidth;
  const pageHeightPx = Math.floor(usableHeight * pxPerPt);
  const domToCanvas = renderedHeightPx > 0 ? canvas.height / renderedHeightPx : 1;
  const canvasBreaks = breakPoints.map((y) => Math.round(y * domToCanvas));

  const slices: Array<[number, number]> = [];
  let start = 0;
  while (start < canvas.height) {
    const limit = start + pageHeightPx;
    let end = Math.min(limit, canvas.height);
    if (limit < canvas.height) {
      // Only snap when it keeps at least 60% of the page filled; otherwise hard-cut.
      const snapped = canvasBreaks.filter((b) => b > start + pageHeightPx * 0.6 && b <= limit).pop();
      if (snapped) end = snapped;
    }
    slices.push([start, end]);
    start = end;
  }

  slices.forEach(([sliceStart, sliceEnd], index) => {
    const sliceHeight = sliceEnd - sliceStart;
    const pageCanvas = document.createElement('canvas');
    pageCanvas.width = canvas.width;
    pageCanvas.height = sliceHeight;
    const ctx = pageCanvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
    ctx.drawImage(canvas, 0, sliceStart, canvas.width, sliceHeight, 0, 0, canvas.width, sliceHeight);

    if (index > 0) pdf.addPage();
    pdf.addImage(pageCanvas.toDataURL('image/png', 1.0), 'PNG', MARGIN_PT, MARGIN_PT, usableWidth, sliceHeight / pxPerPt, undefined, 'FAST');

    if (pageLabel) {
      pdf.setFontSize(8);
      pdf.setTextColor(148, 163, 184);
      pdf.text(pageLabel(index + 1, slices.length), pageWidth - MARGIN_PT, pageHeight - MARGIN_PT / 2, { align: 'right' });
    }
  });

  pdf.save(filename);
}

export function pdfFileName(projectName: string | null | undefined, suffix: string): string {
  const base = (projectName || 'takeoff_estimate').replace(/[^\w-]+/g, '_').replace(/_+/g, '_');
  return `${base}_${suffix}.pdf`;
}
