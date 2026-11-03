/**
 * GoogleDriveCollateralResolver.js
 * 
 * Single responsibility: Map community names to Google Drive folder IDs and PDF collateral paths.
 * Category: 2️⃣ Domain / Feature (src/integrations/)
 * Law: Single Purpose File Law (< 350 lines).
 */

export const DEFAULT_DRIVE_VAULT = Object.freeze({
  DAMAC_HILLS_2: { folderId: 'folder_dh2_vault_01', brochureFileName: 'damac_hills_2_master_brochure.pdf' },
  PALM_JUMEIRAH: { folderId: 'folder_palm_vault_02', brochureFileName: 'palm_jumeirah_investor_pack.pdf' },
  DOWNTOWN_DUBAI: { folderId: 'folder_downtown_03', brochureFileName: 'downtown_dubai_catalog.pdf' },
  JVC: { folderId: 'folder_jvc_04', brochureFileName: 'jvc_high_yield_brochure.pdf' },
});

export class GoogleDriveCollateralResolver {
  constructor({ vault = DEFAULT_DRIVE_VAULT } = {}) {
    this.vault = { ...vault };
  }

  resolveBrochurePath(communityName = '') {
    const key = communityName.toUpperCase().replace(/[^A-Z0-9]/g, '_').replace(/_+/g, '_').trim();
    return this.vault[key] || { folderId: 'folder_general_vault', brochureFileName: 'dubai_prime_opportunities.pdf' };
  }
}

export default new GoogleDriveCollateralResolver();

