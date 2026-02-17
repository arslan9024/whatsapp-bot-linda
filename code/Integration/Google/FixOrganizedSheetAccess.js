/**
 * FIX ORGANIZED SHEET ACCESS - STEP 1
 * Grants serviceman11 service account Editor access to organized sheet
 */

import { google } from 'googleapis';
import { getPowerAgent } from '../../GoogleAPI/main.js';
import { logger } from './utils/logger.js';

const SERVICEMAN_EMAIL = 'serviceman11@heroic-artifact-414519.iam.gserviceaccount.com';

export class OrganizedSheetAccessFixer {
  constructor(organizedSheetId) {
    this.organizedSheetId = organizedSheetId || process.env.AKOYA_ORGANIZED_SHEET_ID;
    this.drive = null;
    this.sheets = null;
  }

  async initialize() {
    try {
      const auth = await getPowerAgent();
      if (!auth) throw new Error('Failed to authenticate');
      this.drive = google.drive({ version: 'v3', auth });
      this.sheets = google.sheets({ version: 'v4', auth });
      logger.info(' Google APIs initialized');
      return true;
    } catch (error) {
      logger.error(`Initialization failed: ${error.message}`);
      return false;
    }
  }

  async grantServiceAccountAccess() {
    try {
      logger.info(` Granting ${SERVICEMAN_EMAIL} Editor access...`);
      
      const permission = {
        type: 'user',
        role: 'editor',
        emailAddress: SERVICEMAN_EMAIL,
      };

      await this.drive.permissions.create({
        fileId: this.organizedSheetId,
        requestBody: permission,
        fields: 'id',
      });

      logger.info(` Permission granted successfully`);
      return true;
    } catch (error) {
      if (error.message.includes('Permission denied')) {
        logger.warn(`Permission may already exist`);
        return true;
      }
      logger.error(`Failed to grant permission: ${error.message}`);
      return false;
    }
  }

  async verififyAccess() {
    try {
      logger.info(` Verifying sheet access...`);
      
      const metadata = await this.sheets.spreadsheets.get({
        spreadsheetId: this.organizedSheetId,
      });
      logger.info(` Read access confirmed`);
      
      return true;
    } catch (error) {
      logger.error(`Access verification failed: ${error.message}`);
      return false;
    }
  }

  async execute() {
    if (!await this.initialize()) return false;
    if (!await this.grantServiceAccountAccess()) return false;
    if (!await this.verififyAccess()) return false;
    logger.info(` ORGANIZED SHEET ACCESS FIXED!`);
    return true;
  }
}

export default OrganizedSheetAccessFixer;
