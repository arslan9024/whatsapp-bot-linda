/**
 * Reads the owners workbook (every tab) and writes the outreach status column
 * back to the main tab, using a Google service account.
 *
 * Credentials: GOOGLE_ACCOUNT_<OUTREACH_GOOGLE_ACCOUNT>_KEYS_BASE64 (default
 * account "goraha") or its legacy file, then OUTREACH_GOOGLE_KEY_FILE, then
 * secrets/goraha-key.json(.json). The service account must be shared on the
 * sheet: Viewer to read, Editor to write the status column.
 */

import fs from 'fs';
import path from 'path';
import { google } from 'googleapis';

export const STATUS_HEADER = 'Linda Outreach';

export function outreachSheetConfig(env = process.env) {
  return {
    spreadsheetId: env.OUTREACH_SHEET_ID || '',
    mainTab: env.OUTREACH_MAIN_TAB || 'Sheet1',
    account: (env.OUTREACH_GOOGLE_ACCOUNT || 'goraha').toLowerCase(),
    keyFile: env.OUTREACH_GOOGLE_KEY_FILE || '',
  };
}

async function loadCredentials(config, root = process.cwd()) {
  // Loaded on demand: the manager is only needed when the sheet is actually read.
  const { default: GoogleServiceAccountManager } = await import('../integrations/google/GoogleServiceAccountManager.js');
  const fromManager = await new GoogleServiceAccountManager().getCredentials(config.account).catch(() => null);
  if (fromManager?.client_email) return fromManager;
  const files = [config.keyFile, 'secrets/goraha-key.json', 'secrets/goraha-key.json.json']
    .filter(Boolean).map(file => path.resolve(root, file));
  for (const file of files) {
    if (!fs.existsSync(file)) continue;
    const credentials = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (credentials?.client_email && credentials?.private_key) return credentials;
  }
  throw new Error(
    `No Google service-account key for outreach. Set GOOGLE_ACCOUNT_${config.account.toUpperCase()}_KEYS_BASE64 or OUTREACH_GOOGLE_KEY_FILE.`,
  );
}

/** Column number (1-based) → A1 letters. */
export function columnLetter(column) {
  let letters = '';
  for (let n = column; n > 0; n = Math.floor((n - 1) / 26)) letters = String.fromCharCode(65 + ((n - 1) % 26)) + letters;
  return letters;
}

const quoteTab = title => `'${String(title).replace(/'/g, "''")}'`;

export class OwnerSheetSource {
  constructor({ config = outreachSheetConfig(), sheets = null } = {}) {
    this.config = config;
    this.sheets = sheets;
    this.clientEmail = null;
  }

  async api() {
    if (this.sheets) return this.sheets;
    const credentials = await loadCredentials(this.config);
    this.clientEmail = credentials.client_email;
    const auth = new google.auth.GoogleAuth({ credentials, scopes: ['https://www.googleapis.com/auth/spreadsheets'] });
    this.sheets = google.sheets({ version: 'v4', auth });
    return this.sheets;
  }

  requireId(spreadsheetId) {
    const id = spreadsheetId || this.config.spreadsheetId;
    if (!id) throw new Error('No owners sheet configured. Set OUTREACH_SHEET_ID in .env.');
    return id;
  }

  /** @returns {Promise<{ title: string, tabs: Array<{title: string, values: any[][]}> }>} */
  async readAll(spreadsheetId) {
    const id = this.requireId(spreadsheetId);
    const sheets = await this.api();
    const meta = await sheets.spreadsheets.get({ spreadsheetId: id, fields: 'properties.title,sheets.properties.title' });
    const titles = meta.data.sheets.map(sheet => sheet.properties.title);
    const tabs = [];
    for (let index = 0; index < titles.length; index += 20) {
      const batch = titles.slice(index, index + 20);
      const response = await sheets.spreadsheets.values.batchGet({
        spreadsheetId: id, ranges: batch.map(quoteTab), valueRenderOption: 'FORMATTED_VALUE',
      });
      response.data.valueRanges.forEach((range, offset) => tabs.push({ title: batch[offset], values: range.values || [] }));
    }
    return { title: meta.data.properties.title, tabs };
  }

  /**
   * Writes `statusByRow` (1-based row → text) into the "Linda Outreach" column of the main tab.
   * Existing cell values for rows not in the map are kept.
   * @returns {Promise<{ ok: boolean, column?: string, updated?: number, error?: string }>}
   */
  async writeStatus(mainValues, statusByRow, spreadsheetId) {
    const id = this.requireId(spreadsheetId);
    const header = mainValues[0] || [];
    let index = header.findIndex(cell => String(cell ?? '').trim().toLowerCase() === STATUS_HEADER.toLowerCase());
    if (index < 0) index = mainValues.reduce((width, row) => Math.max(width, row?.length || 0), header.length);
    const column = columnLetter(index + 1);
    const rows = [...statusByRow.keys()].reduce((max, row) => Math.max(max, row), mainValues.length);
    const values = Array.from({ length: rows }, (_, row) => {
      if (row === 0) return [STATUS_HEADER];
      return [statusByRow.get(row + 1) ?? String(mainValues[row]?.[index] ?? '')];
    });
    try {
      const sheets = await this.api();
      await sheets.spreadsheets.values.update({
        spreadsheetId: id,
        range: `${quoteTab(this.config.mainTab)}!${column}1:${column}${rows}`,
        valueInputOption: 'RAW',
        requestBody: { values },
      });
      return { ok: true, column, updated: statusByRow.size };
    } catch (error) {
      const status = error?.code || error?.response?.status;
      const reason = status === 403
        ? `no edit access: share the sheet with ${this.clientEmail || 'the service account'} as Editor`
        : error.message;
      return { ok: false, column, error: reason };
    }
  }
}
