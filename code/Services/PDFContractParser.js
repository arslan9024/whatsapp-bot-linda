/**
 * PDF Contract Parser
 * Parses PDF tenancy contracts to extract key dates and information
 * Handles standard contract formats
 * Features fallback for manual date entry
 * 
 * Features:
 * - Parse PDF tenancy contracts
 * - Extract key dates (start, expiry, renewal)
 * - Extract parties (tenant, landlord)
 * - Extract property details
 * - Fallback: manual date entry for complex PDFs
 */

import { logger } from '../Integration/Google/utils/logger.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class PDFContractParser {
  constructor(config = {}) {
    this.contractsDir = config.contractsDir || './contracts';
    this.extractionConfig = config.extractionConfig || {};
    
    // Date patterns to search for in contract text
    this.datePatterns = {
      // Common date formats: DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY
      standard: /(\d{1,2})[\/-\.](\d{1,2})[\/-\.](\d{4})/g,
      // Text dates: 15th January 2025, 15 January 2025
      textDate: /(\d{1,2})(?:st|nd|rd|th)?\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})/gi,
      // ISO format: 2025-01-15
      iso: /(\d{4})-(\d{2})-(\d{2})/g
    };

    // Keywords to identify important dates
    this.keywordPatterns = {
      startDate: /lease\s+start|start\s+date|commencement|from\s+date/i,
      endDate: /lease\s+end|end\s+date|expiry|expiration|until|to\s+date|valid\s+until/i,
      renewalDate: /renewal|renew|extension/i,
      mailDate: /mail|sent|date|issued/i
    };

    // Keywords to identify parties
    this.partyPatterns = {
      tenant: /tenant|lessee|renter/i,
      landlord: /landlord|lessor|owner/i,
      property: /property|unit|villa|apartment|flat|apt/i
    };
  }

  /**
   * Parse PDF file and extract contract information
   * @param {string} filePath - Path to PDF file
   * @param {object} manualData - Optional manual data to override extracted data
   * @returns {object} Extracted contract data
   */
  async parseContract(filePath, manualData = {}) {
    try {
      // Check if file exists
      if (!fs.existsSync(filePath)) {
        throw new Error(`Contract file not found: ${filePath}`);
      }

      let extractedText = '';
      
      // Try to extract text from PDF
      try {
        extractedText = await this._extractPDFText(filePath);
      } catch (error) {
        logger.warn(`⚠️ PDF text extraction failed, using manual data: ${error.message}`);
        extractedText = '';
      }

      // Attempt to extract information from PDF text
      const autoExtracted = this._extractFromText(extractedText);

      // Merge with manual data (manual overrides auto)
      const contractData = {
        filePath: filePath,
        fileName: path.basename(filePath),
        fileSize: fs.statSync(filePath).size,
        uploadedAt: new Date().toISOString(),
        
        // Dates
        dates: {
          startDate: manualData.startDate || autoExtracted.startDate,
          expiryDate: manualData.expiryDate || autoExtracted.expiryDate,
          renewalDate: manualData.renewalDate || autoExtracted.renewalDate
        },

        // Parties
        tenant: {
          name: manualData.tenantName || autoExtracted.tenantName,
          phone: manualData.tenantPhone,
          email: manualData.tenantEmail
        },

        landlord: {
          name: manualData.landlordName || autoExtracted.landlordName,
          phone: manualData.landlordPhone,
          email: manualData.landlordEmail
        },

        // Property
        property: {
          name: manualData.propertyName || autoExtracted.propertyName,
          location: manualData.propertyLocation,
          cluster: manualData.propertyCluster,
          unitNumber: manualData.unitNumber || autoExtracted.unitNumber
        },

        // Financial details
        financial: {
          monthlyRent: manualData.monthlyRent,
          securityDeposit: manualData.securityDeposit,
          utilities: manualData.utilities || 'not specified',
          currency: manualData.currency || 'AED'
        },

        // Extraction info
        extraction: {
          method: extractedText ? 'PDF_TEXT' : 'MANUAL',
          confidence: constructedData ? this._calculateConfidence(autoExtracted) : 0,
          autoExtracted: autoExtracted,
          manualOverrides: Object.keys(manualData).length
        }
      };

      logger.info(`✅ Contract parsed: ${contractData.tenant.name} - ${contractData.dates.expiryDate || 'No expiry date'}`);
      return contractData;

    } catch (error) {
      logger.error(`❌ Error parsing contract: ${error.message}`);
      throw error;
    }
  }

  /**
   * Calculate renewal alert date (100 days before expiry)
   * @param {string} expiryDate - Expiry date in YYYY-MM-DD format
   * @returns {string} Renewal alert date
   */
  calculateRenewalAlertDate(expiryDate) {
    try {
      const expiry = new Date(expiryDate);
      const alertDate = new Date(expiry.getTime() - 100 * 24 * 60 * 60 * 1000);
      return alertDate.toISOString().split('T')[0];
    } catch (error) {
      logger.warn(`⚠️ Could not calculate renewal alert date: ${error.message}`);
      return null;
    }
  }

  /**
   * Store contract in organized directory
   * @param {string} filePath - Source file path
   * @param {object} contractData - Contract metadata
   * @returns {string} Stored file path
   */
  async storeContract(filePath, contractData) {
    try {
      const cluster = contractData.property.cluster || 'general';
      const tenantName = (contractData.tenant.name || 'unknown').replace(/\s+/g, '-');
      const year = contractData.dates.startDate?.split('-')[0] || new Date().getFullYear();

      const storageDir = path.join(
        this.contractsDir,
        cluster,
        `${tenantName}-${year}`
      );

      // Create directory if it doesn't exist
      if (!fs.existsSync(storageDir)) {
        fs.mkdirSync(storageDir, { recursive: true });
      }

      const storedPath = path.join(storageDir, 'contract.pdf');

      // Copy file to storage location
      fs.copyFileSync(filePath, storedPath);

      logger.info(`✅ Contract stored: ${storedPath}`);
      return storedPath;

    } catch (error) {
      logger.error(`❌ Error storing contract: ${error.message}`);
      throw error;
    }
  }

  /**
   * Extract text from PDF file
   * @private
   */
  async _extractPDFText(filePath) {
    try {
      // Try to use pdf-parse if available
      try {
        const pdfjsLib = await import('pdfjs-dist');
        const pdfData = fs.readFileSync(filePath);
        const doc = await pdfjsLib.getDocument(pdfData).promise;

        let text = '';
        for (let pageNum = 1; pageNum <= Math.min(doc.numPages, 5); pageNum++) {
          const page = await doc.getPage(pageNum);
          const textContent = await page.getTextContent();
          text += textContent.items.map(item => item.str).join(' ') + '\n';
        }

        return text;
      } catch (libError) {
        // If PDF library not available, try basic text extraction
        logger.warn(`PDF.js not available, attempting fallback extraction`);
        return this._fallbackPDFExtraction(filePath);
      }
    } catch (error) {
      logger.warn(`⚠️ PDF text extraction failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Fallback PDF extraction (very basic)
   * @private
   */
  _fallbackPDFExtraction(filePath) {
    try {
      // Read raw file and try to find ASCII text
      const buffer = fs.readFileSync(filePath);
      let text = buffer.toString('binary');
      
      // Remove binary data, keep only readable ASCII
      text = text.replace(/[\x00-\x08\x0E-\x1F\x7F]/g, ' ');
      
      return text;
    } catch (error) {
      logger.warn(`Fallback extraction also failed`);
      return '';
    }
  }

  /**
   * Extract key information from PDF text
   * @private
   */
  _extractFromText(text) {
    const extracted = {
      startDate: null,
      expiryDate: null,
      renewalDate: null,
      tenantName: null,
      landlordName: null,
      propertyName: null,
      unitNumber: null
    };

    if (!text) return extracted;

    const textLower = text.toLowerCase();

    // Extract dates
    const allDates = this._findAllDates(text);
    
    if (allDates.length >= 2) {
      // Assume first date is start, second is expiry
      extracted.startDate = allDates[0];
      extracted.expiryDate = allDates[1];
    }

    // Extract tenant name (look for "Tenant:" followed by name)
    const tenantMatch = text.match(/tenant[:\s]+([A-Z][A-Za-z\s]+)/i);
    if (tenantMatch) {
      extracted.tenantName = tenantMatch[1].trim();
    }

    // Extract landlord name
    const landlordMatch = text.match(/landlord[:\s]+([A-Z][A-Za-z\s]+)/i);
    if (landlordMatch) {
      extracted.landlordName = landlordMatch[1].trim();
    }

    // Extract property/unit
    const unitMatch = text.match(/(?:unit|villa|apartment|flat|apt)[:\s]+([A-Za-z0-9\-]+)/i);
    if (unitMatch) {
      extracted.unitNumber = unitMatch[1].trim();
    }

    return extracted;
  }

  /**
   * Find all dates in text
   * @private
   */
  _findAllDates(text) {
    const dates = [];
    const foundDates = new Set();

    // Try multiple date formats
    const patterns = [
      { pattern: /(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})/g, format: 'DD/MM/YYYY' },
      { pattern: /(\d{4})-(\d{2})-(\d{2})/g, format: 'YYYY-MM-DD' },
      { pattern: /(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{4})/gi, format: 'DD Mon YYYY' }
    ];

    patterns.forEach(({ pattern, format }) => {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        try {
          let dateStr;
          
          if (format === 'DD/MM/YYYY') {
            const [, day, month, year] = match;
            dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          } else if (format === 'YYYY-MM-DD') {
            dateStr = `${match[1]}-${match[2]}-${match[3]}`;
          } else if (format === 'DD Mon YYYY') {
            const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            const monthIndex = monthNames.findIndex(m => m.toLowerCase() === match[2].toLowerCase()) + 1;
            dateStr = `${match[3]}-${String(monthIndex).padStart(2, '0')}-${String(match[1]).padStart(2, '0')}`;
          }

          // Validate date
          const date = new Date(dateStr);
          if (!isNaN(date.getTime()) && !foundDates.has(dateStr)) {
            dates.push(dateStr);
            foundDates.add(dateStr);
          }
        } catch (e) {
          // Skip invalid dates
        }
      }
    });

    // Sort dates chronologically
    return dates.sort((a, b) => new Date(a) - new Date(b));
  }

  /**
   * Calculate confidence score for extracted data
   * @private
   */
  _calculateConfidence(extracted) {
    let score = 0;
    let checks = 0;

    if (extracted.startDate) score += 25, checks += 25;
    if (extracted.expiryDate) score += 25, checks += 25;
    if (extracted.tenantName) score += 25, checks += 25;
    if (extracted.landlordName) score += 25, checks += 25;

    return checks > 0 ? score / checks : 0;
  }
}

export default PDFContractParser;
