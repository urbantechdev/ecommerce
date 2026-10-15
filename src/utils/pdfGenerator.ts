import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

export interface PdfExportOptions {
  type?: 'receipt' | 'invoice' | 'quotation' | 'general';
  rollWidth?: '58mm' | '80mm';
  title?: string;
  margin?: number;
}

/**
 * Sanitizes CSS rules containing unsupported oklch color functions for html2canvas.
 */
const handleOklchOnClone = (clonedDoc: Document) => {
  try {
    const sheets = clonedDoc.styleSheets;
    for (let i = 0; i < sheets.length; i++) {
      try {
        const rules = (sheets[i] as CSSStyleSheet).cssRules;
        if (rules) {
          for (let j = 0; j < rules.length; j++) {
            const rule = rules[j] as CSSStyleRule;
            if (rule && rule.style) {
              for (let k = 0; k < rule.style.length; k++) {
                const prop = rule.style[k];
                const val = rule.style.getPropertyValue(prop);
                if (val && val.includes('oklch')) {
                  rule.style.setProperty(prop, val.replace(/oklch\([^)]+\)/g, 'rgb(120,120,120)'));
                }
              }
            }
          }
        }
      } catch (e) {
        // Ignore cross-origin sheet errors
      }
    }

    const styleTags = clonedDoc.querySelectorAll('style');
    styleTags.forEach((tag) => {
      if (tag.textContent && tag.textContent.includes('oklch')) {
        tag.textContent = tag.textContent.replace(/oklch\([^)]+\)/g, 'rgb(120,120,120)');
      }
    });

    const allEls = clonedDoc.querySelectorAll('*');
    allEls.forEach((el) => {
      const htmlEl = el as HTMLElement;
      if (htmlEl.style && htmlEl.style.cssText && htmlEl.style.cssText.includes('oklch')) {
        htmlEl.style.cssText = htmlEl.style.cssText.replace(/oklch\([^)]+\)/g, 'rgb(120,120,120)');
      }
    });
  } catch (err) {
    console.warn('Error in onclone oklch cleanup:', err);
  }
};

/**
 * Converts a DOM element into a crisp, downloadable PDF document.
 * Supports thermal receipt rolls (58mm / 80mm continuous height)
 * and standard A4 commercial invoices & quotes.
 */
export async function downloadElementAsPdf(
  element: HTMLElement,
  filename: string,
  options: PdfExportOptions = {}
): Promise<void> {
  const { type = 'general', rollWidth = '80mm', margin = 10 } = options;

  // Clean filename extension
  const safeFilename = filename.toLowerCase().endsWith('.pdf') ? filename : `${filename}.pdf`;

  // Temporarily ensure element styles are optimal for canvas capture
  const originalWidth = element.style.width;
  const originalMaxWidth = element.style.maxWidth;

  try {
    if (type === 'receipt') {
      const targetRollMm = rollWidth === '58mm' ? 58 : 80;
      
      // Render canvas with high resolution scale
      const canvas = await html2canvas(element, {
        scale: 3, // Crisp 300+ DPI equivalent for barcode/QR readability
        useCORS: true,
        allowTaint: true,
        logging: false,
        backgroundColor: '#FFFFFF',
        windowWidth: targetRollMm * 3.78, // Approximate pixel ratio at 96 DPI
        onclone: handleOklchOnClone,
      });

      const imgData = canvas.toDataURL('image/png', 1.0);

      // Compute exact millimeter height matching content aspect ratio
      const contentRatio = canvas.height / canvas.width;
      const pdfWidthMm = targetRollMm;
      const pdfHeightMm = Math.max(pdfWidthMm * contentRatio, 40);

      // Create PDF with custom receipt roll dimensions (no giant empty A4 margins)
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [pdfWidthMm, pdfHeightMm],
      });

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidthMm, pdfHeightMm, undefined, 'FAST');
      pdf.save(safeFilename);
    } else {
      // Standard A4 Commercial Document (Invoice / Quotation)
      const a4WidthMm = 210;
      const a4HeightMm = 297;
      const printableWidthMm = a4WidthMm - margin * 2;
      const maxPageContentHeightMm = a4HeightMm - margin * 2;

      const canvas = await html2canvas(element, {
        scale: 2.5,
        useCORS: true,
        allowTaint: true,
        logging: false,
        backgroundColor: '#FFFFFF',
        onclone: handleOklchOnClone,
      });

      const imgData = canvas.toDataURL('image/png', 1.0);
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;

      const totalPdfHeightMm = (imgHeight * printableWidthMm) / imgWidth;

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      if (totalPdfHeightMm <= maxPageContentHeightMm) {
        // Fits comfortably on a single A4 page
        pdf.addImage(imgData, 'PNG', margin, margin, printableWidthMm, totalPdfHeightMm, undefined, 'FAST');
      } else {
        // Multi-page document handling
        let remainingHeight = totalPdfHeightMm;
        let position = margin;
        let page = 1;

        while (remainingHeight > 0) {
          if (page > 1) {
            pdf.addPage('a4', 'portrait');
          }

          pdf.addImage(imgData, 'PNG', margin, position, printableWidthMm, totalPdfHeightMm, undefined, 'FAST');
          remainingHeight -= maxPageContentHeightMm;
          position -= maxPageContentHeightMm;
          page++;
        }
      }

      pdf.save(safeFilename);
    }
  } catch (err) {
    console.error('[PDF Generator] Failed to render PDF:', err);
    throw new Error('Could not generate PDF document. Please try printing to PDF instead.');
  } finally {
    element.style.width = originalWidth;
    element.style.maxWidth = originalMaxWidth;
  }
}
