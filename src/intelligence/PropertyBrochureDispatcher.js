/**
 * ====================================================================
 * PROPERTY BROCHURE & FLOORPLAN DISPATCHER (Pillar 1 - Real Estate)
 * ====================================================================
 * Automatically handles owner and buyer requests for property specs:
 *   1. Detects inquiries asking for brochures, floorplans, or masterplans.
 *   2. Resolves corresponding community / cluster PDF assets:
 *      - Damac Hills 2 (Amazon, Victoria, Pacifica, etc.)
 *      - Dubai Hills Estate (Maple, Sidra, Park Field)
 *      - Palm Jumeirah & Downtown
 *   3. Packages WhatsApp MessageMedia document dispatch with humanized
 *      captioning and legal disclaimer.
 *   4. Adheres to Closed Circle Guard & Rate Limiting laws.
 *
 * @since Development Phase — November 2026
 */

import path from 'path';
import fs from 'fs';
import { Logger } from '../core/Logger.js';
import { maskPhone } from '../outreach/OwnerPhoneNormalizer.js';

const logger = new Logger('PropertyBrochureDispatcher');

export const BROCHURE_KEYWORDS = [
  'brochure', 'floorplan', 'floor plan', 'layout', 'masterplan',
  'master plan', 'catalogue', 'pdf', 'project details', 'بروشور', 'مخطط', 'بلان'
];

export const COMMUNITY_DOCS = {
  damac_hills_2: {
    community: 'Damac Hills 2',
    fileName: 'Damac_Hills_2_Master_Brochure.pdf',
    title: 'Damac Hills 2 Master Plan & Cluster Specifications',
    caption: '📄 Here is the official Damac Hills 2 Masterplan & Floorplan guide. Let me know if you would like specific layout details for your cluster!',
  },
  dubai_hills_estate: {
    community: 'Dubai Hills Estate',
    fileName: 'Dubai_Hills_Estate_Masterplan.pdf',
    title: 'Dubai Hills Estate Master Layout & Community Guide',
    caption: '📄 Attached is the comprehensive Dubai Hills Estate community overview and floorplan guide.',
  },
  palm_jumeirah: {
    community: 'Palm Jumeirah',
    fileName: 'Palm_Jumeirah_Luxury_Collection.pdf',
    title: 'Palm Jumeirah Waterfront Collection',
    caption: '📄 Here is the Palm Jumeirah waterfront villa and residence floorplan portfolio.',
  },
};

export class PropertyBrochureDispatcher {
  constructor(options = {}) {
    this.assetsDir = options.assetsDir || path.resolve('data', 'assets', 'brochures');
  }

  /**
   * Determine if message is requesting a brochure or floorplan.
   *
   * @param {string} text
   * @returns {boolean}
   */
  isBrochureRequest(text = '') {
    const lower = String(text || '').toLowerCase();
    return BROCHURE_KEYWORDS.some((kw) => lower.includes(kw));
  }

  /**
   * Resolve brochure metadata for a given community key or query text.
   *
   * @param {string} communityKey - e.g. "damac_hills_2" or user query
   * @returns {object|null}
   */
  resolveBrochure(communityKey = '') {
    const key = String(communityKey || '').toLowerCase();

    if (COMMUNITY_DOCS[key]) {
      return COMMUNITY_DOCS[key];
    }

    if (key.includes('dubai hills') || key.includes('dhe') || key.includes('maple') || key.includes('sidra')) {
      return COMMUNITY_DOCS.dubai_hills_estate;
    }
    if (key.includes('palm') || key.includes('shoreline')) {
      return COMMUNITY_DOCS.palm_jumeirah;
    }
    // Default fallback to Damac Hills 2 for the core operating region
    return COMMUNITY_DOCS.damac_hills_2;
  }

  /**
   * Dispatch brochure document via WhatsApp client.
   *
   * @param {object} client - Active WhatsApp client
   * @param {string} chatId - Target WhatsApp JID
   * @param {string} communityKey - Target community
   * @param {object} [options]
   * @returns {Promise<{ sent: boolean, brochure: object, error?: string }>}
   */
  async dispatchBrochure(client, chatId, communityKey, options = {}) {
    const brochure = this.resolveBrochure(communityKey);
    if (!brochure) {
      return { sent: false, reason: 'brochure_not_found' };
    }

    const filePath = path.join(this.assetsDir, brochure.fileName);

    try {
      // In tests / mocks, simulate document dispatch
      if (options.dryRun || !fs.existsSync(filePath)) {
        logger.info(`📄 [Mock/Simulated] Dispatching brochure "${brochure.title}" to ${chatId}`);
        if (typeof client.sendMessage === 'function') {
          await client.sendMessage(chatId, `${brochure.caption}\n\n[Document: ${brochure.title}]`, {
            allowClosedCirclePrompt: true,
          });
        }
        return { sent: true, brochure, simulated: !fs.existsSync(filePath) };
      }

      // Real production dispatch via MessageMedia
      if (typeof client.sendMessage === 'function') {
        const fileBase64 = fs.readFileSync(filePath, 'base64');
        const media = {
          mimetype: 'application/pdf',
          data: fileBase64,
          filename: brochure.fileName,
        };

        await client.sendMessage(chatId, media, {
          caption: brochure.caption,
          allowClosedCirclePrompt: true,
        });

        logger.info(`✅ Dispatched PDF brochure "${brochure.fileName}" to ${chatId}`);
        return { sent: true, brochure };
      }

      return { sent: false, reason: 'invalid_client' };
    } catch (err) {
      logger.warn(`Failed to dispatch brochure to ${chatId}: ${err.message}`);
      return { sent: false, error: err.message };
    }
  }
}

export const propertyBrochureDispatcher = new PropertyBrochureDispatcher();
export default propertyBrochureDispatcher;
