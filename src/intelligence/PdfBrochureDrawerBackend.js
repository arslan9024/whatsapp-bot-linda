/**
 * @file PdfBrochureDrawerBackend.js
 * @description Extracts metadata, page counts, and embedded brochure outlines
 * for fast PDF preview rendering inside the Web UI document drawer.
 * Category: Intelligence
 */

export class PdfBrochureDrawerBackend {
  /**
   * Analyzes PDF buffer for basic preview metadata
   * @param {Buffer} pdfBuffer
   * @param {string} fileName
   * @returns {Object} PDF preview descriptor
   */
  extractPreviewMetadata(pdfBuffer, fileName = 'brochure.pdf') {
    if (!Buffer.isBuffer(pdfBuffer) || pdfBuffer.length === 0) {
      return { valid: false, fileName, pageCount: 0 };
    }

    // Rough page count estimation by counting "/Type /Page\b"
    const latinStr = pdfBuffer.toString('latin1');
    const matches = latinStr.match(/\/Type\s*\/Page\b/g);
    const estimatedPages = matches ? matches.length : 1;

    const hasTitle = latinStr.includes('/Title');
    const hasAuthor = latinStr.includes('/Author');

    return {
      valid: true,
      fileName,
      sizeBytes: pdfBuffer.length,
      sizeMb: Math.round((pdfBuffer.length / (1024 * 1024)) * 100) / 100,
      estimatedPages,
      hasMetadata: hasTitle || hasAuthor,
      previewReady: true
    };
  }
}

export default new PdfBrochureDrawerBackend();
