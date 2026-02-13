/**
 * Tenancy Contract Manager
 * Manages rental property tracking and tenancy contracts
 * Stores contracts, manages metadata, tracks renewal history
 * 
 * Features:
 * - Handle rental property tracking
 * - Store contracts folder paths
 * - Extract contract metadata from PDFs
 * - Calculate expiry dates and renewal alerts
 * - Track contract renewal history
 * - Generate renewal notifications
 */

import { logger } from '../Integration/Google/utils/logger.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import PDFContractParser from '../Services/PDFContractParser.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class TenancyContractManager {
  constructor(config = {}) {
    this.contracts = new Map();  // contractId → contract object
    this.contractsByProperty = new Map();  // propertyId → Set of contractIds
    this.contractsByTenant = new Map();  // tenantPhone → Set of contractIds
    
    this.contractsDbPath = config.contractsDbPath || './code/Data/contracts-registry.json';
    this.contractsDir = config.contractsDir || './contracts';
    this.pdfParser = new PDFContractParser({ contractsDir: this.contractsDir });
  }

  /**
   * Initialize manager - load existing contracts
   */
  async initialize() {
    try {
      if (fs.existsSync(this.contractsDbPath)) {
        const data = JSON.parse(fs.readFileSync(this.contractsDbPath, 'utf8'));
        data.contracts.forEach(c => {
          this.contracts.set(c.contractId, c);
          
          // Index by property
          if (!this.contractsByProperty.has(c.property.propertyId)) {
            this.contractsByProperty.set(c.property.propertyId, new Set());
          }
          this.contractsByProperty.get(c.property.propertyId).add(c.contractId);
          
          // Index by tenant
          if (!this.contractsByTenant.has(c.tenant.phone)) {
            this.contractsByTenant.set(c.tenant.phone, new Set());
          }
          this.contractsByTenant.get(c.tenant.phone).add(c.contractId);
        });
        
        logger.info(`✅ Tenancy Contract Manager initialized with ${data.contracts.length} contracts`);
      } else {
        logger.warn(`⚠️ Contracts registry not found, starting fresh`);
      }
      return true;
    } catch (error) {
      logger.error(`❌ Failed to initialize TenancyContractManager: ${error.message}`);
      throw error;
    }
  }

  /**
   * Upload and parse a tenancy contract
   * @param {string} filePath - Path to PDF contract file
   * @param {object} metadata - Contract metadata (tenant, landlord, property info)
   * @param {object} manualData - Manual overrides for extraction
   * @returns {object} Created contract record
   */
  async uploadContract(filePath, metadata, manualData = {}) {
    try {
      // Parse PDF
      const parsedData = await this.pdfParser.parseContract(filePath, manualData);

      // Store PDF in organized location
      const storedPath = await this.pdfParser.storeContract(filePath, parsedData);

      // Calculate renewal alert date
      const renewalAlertDate = this.pdfParser.calculateRenewalAlertDate(parsedData.dates.expiryDate);

      // Create contract record
      const contractId = `contract-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      const contract = {
        contractId: contractId,
        dealId: metadata.dealId || null,
        type: 'rental',
        
        property: {
          propertyId: metadata.propertyId,
          location: parsedData.property.location || metadata.location,
          cluster: metadata.cluster || parsedData.property.cluster,
          unitNumber: parsedData.property.unitNumber
        },

        tenant: {
          phone: metadata.tenantPhone || '',
          name: parsedData.tenant.name || metadata.tenantName,
          email: parsedData.tenant.email || metadata.tenantEmail
        },

        landlord: {
          phone: metadata.landlordPhone || '',
          name: parsedData.landlord.name || metadata.landlordName,
          email: parsedData.landlord.email || metadata.landlordEmail
        },

        dates: {
          startDate: parsedData.dates.startDate,
          expiryDate: parsedData.dates.expiryDate,
          renewalAlertDate: renewalAlertDate,
          uploadedAt: new Date().toISOString()
        },

        financial: {
          monthlyRent: metadata.monthlyRent || parsedData.financial.monthlyRent,
          securityDeposit: metadata.securityDeposit || parsedData.financial.securityDeposit,
          utilities: metadata.utilities || parsedData.financial.utilities,
          currency: metadata.currency || parsedData.financial.currency || 'AED'
        },

        pdf: {
          location: storedPath,
          fileName: parsedData.fileName,
          fileSize: parsedData.fileSize,
          uploadedAt: new Date().toISOString()
        },

        status: 'active',
        alertSent: false,
        renewalHistory: [],

        extraction: parsedData.extraction
      };

      // Store contract
      this.contracts.set(contractId, contract);

      // Update indices
      if (!this.contractsByProperty.has(contract.property.propertyId)) {
        this.contractsByProperty.set(contract.property.propertyId, new Set());
      }
      this.contractsByProperty.get(contract.property.propertyId).add(contractId);

      if (!this.contractsByTenant.has(contract.tenant.phone)) {
        this.contractsByTenant.set(contract.tenant.phone, new Set());
      }
      this.contractsByTenant.get(contract.tenant.phone).add(contractId);

      await this._persistContracts();

      logger.info(`✅ Contract uploaded: ${contract.tenant.name} - ${contract.dates.expiryDate}`);
      return contract;

    } catch (error) {
      logger.error(`❌ Error uploading contract: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get contracts for a property
   * @param {string} propertyId - Property ID
   * @returns {Array} Contract objects
   */
  getContractsByProperty(propertyId) {
    const contractIds = this.contractsByProperty.get(propertyId) || new Set();
    return Array.from(contractIds).map(id => this.contracts.get(id)).filter(c => c);
  }

  /**
   * Get contracts for a tenant
   * @param {string} tenantPhone - Tenant phone number
   * @returns {Array} Contract objects
   */
  getContractsByTenant(tenantPhone) {
    const contractIds = this.contractsByTenant.get(tenantPhone) || new Set();
    return Array.from(contractIds).map(id => this.contracts.get(id)).filter(c => c);
  }

  /**
   * Get contract by ID
   * @param {string} contractId - Contract ID
   * @returns {object} Contract object or null
   */
  getContract(contractId) {
    return this.contracts.get(contractId) || null;
  }

  /**
   * Find contracts expiring within N days
   * @param {number} days - Number of days to look ahead
   * @returns {Array} Contracts expiring soon
   */
  getExpiringContracts(days = 100) {
    const today = new Date();
    const futureDate = new Date(today.getTime() + days * 24 * 60 * 60 * 1000);

    return Array.from(this.contracts.values()).filter(contract => {
      if (!contract.dates.expiryDate || contract.status !== 'active') {
        return false;
      }

      const expiry = new Date(contract.dates.expiryDate);
      return expiry >= today && expiry <= futureDate;
    });
  }

  /**
   * Find contracts with renewal alerts due TODAY
   * @returns {Array} Contracts needing alerts today
   */
  getContractsNeedingAlertToday() {
    const today = new Date().toISOString().split('T')[0];

    return Array.from(this.contracts.values()).filter(contract =>
      contract.dates.renewalAlertDate === today &&
      contract.status === 'active' &&
      !contract.alertSent
    );
  }

  /**
   * Mark alert as sent
   * @param {string} contractId - Contract ID
   */
  async markAlertSent(contractId) {
    try {
      const contract = this.contracts.get(contractId);
      if (!contract) {
        logger.warn(`Contract not found: ${contractId}`);
        return false;
      }

      contract.alertSent = true;
      contract.alertSentAt = new Date().toISOString();

      await this._persistContracts();
      logger.info(`✅ Alert marked as sent: ${contractId}`);
      return true;

    } catch (error) {
      logger.error(`❌ Error marking alert sent: ${error.message}`);
      return false;
    }
  }

  /**
   * Record contract renewal
   * @param {string} contractId - Contract ID
   * @param {object} renewalData - New contract data
   */
  async recordRenewal(contractId, renewalData) {
    try {
      const oldContract = this.contracts.get(contractId);
      if (!oldContract) {
        logger.warn(`Contract not found: ${contractId}`);
        return null;
      }

      // Create new contract record for renewal
      const newContractId = `contract-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      const renewalRecord = {
        previousContractId: contractId,
        renewalDate: new Date().toISOString(),
        oldExpiryDate: oldContract.dates.expiryDate,
        newExpiryDate: renewalData.expiryDate
      };

      // Add to renewal history
      oldContract.renewalHistory.push(renewalRecord);
      oldContract.status = 'renewed';

      // Create new contract record
      const newContract = JSON.parse(JSON.stringify(oldContract));
      newContract.contractId = newContractId;
      newContract.dates.startDate = renewalData.startDate;
      newContract.dates.expiryDate = renewalData.expiryDate;
      newContract.dates.renewalAlertDate = this.pdfParser.calculateRenewalAlertDate(renewalData.expiryDate);
      newContract.dates.uploadedAt = new Date().toISOString();
      newContract.alertSent = false;
      newContract.renewalHistory = [];
      newContract.status = 'active';

      // Update PDF location if new contract provided
      if (renewalData.pdfPath) {
        const storedPath = await this.pdfParser.storeContract(renewalData.pdfPath, newContract);
        newContract.pdf.location = storedPath;
        newContract.pdf.uploadedAt = new Date().toISOString();
      }

      // Store both contracts
      this.contracts.set(contractId, oldContract);
      this.contracts.set(newContractId, newContract);

      await this._persistContracts();

      logger.info(`✅ Contract renewal recorded: ${oldContract.tenant.name}`);
      return newContract;

    } catch (error) {
      logger.error(`❌ Error recording renewal: ${error.message}`);
      return null;
    }
  }

  /**
   * Get all active contracts
   * @returns {Array} Active contracts
   */
  getAllActiveContracts() {
    return Array.from(this.contracts.values()).filter(c => c.status === 'active');
  }

  /**
   * Get contract statistics
   * @returns {object} Statistics
   */
  getStatistics() {
    const contracts = Array.from(this.contracts.values());
    
    return {
      totalContracts: contracts.length,
      activeContracts: contracts.filter(c => c.status === 'active').length,
      renewedContracts: contracts.filter(c => c.status === 'renewed').length,
      expiredContracts: contracts.filter(c => c.status === 'expired').length,
      totalRent: contracts.reduce((sum, c) => sum + (c.financial.monthlyRent || 0), 0),
      expiringIn100Days: this.getExpiringContracts(100).length,
      alertsPending: Array.from(this.contracts.values()).filter(c =>
        c.dates.renewalAlertDate && !c.alertSent
      ).length
    };
  }

  /**
   * Persist contracts to file
   * @private
   */
  async _persistContracts() {
    try {
      const data = {
        contracts: Array.from(this.contracts.values()),
        totalContracts: this.contracts.size,
        lastUpdated: new Date().toISOString(),
        version: '1.0.0'
      };

      const dir = path.dirname(this.contractsDbPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      fs.writeFileSync(
        this.contractsDbPath,
        JSON.stringify(data, null, 2),
        'utf8'
      );

      logger.info(`✅ Contracts persisted (${this.contracts.size} total)`);
    } catch (error) {
      logger.error(`❌ Failed to persist contracts: ${error.message}`);
    }
  }
}

export default TenancyContractManager;
