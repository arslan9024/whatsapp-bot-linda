/**
 * @file CorporateKycDossierCompiler.js
 * @description Compiles corporate buyer compliance dossiers (Trade License, MOA, Certificate of Incumbency, UBO declarations) required by DLD for corporate property acquisitions.
 * Category: 2️⃣ Domain / Feature (Brokerage ERP & Legal MOU)
 */

export class CorporateKycDossierCompiler {
  /**
   * Compiles and validates corporate KYC package.
   * @param {Object} corpData
   * @param {string} corpData.companyName
   * @param {string} corpData.jurisdiction ('DIFC', 'ADGM', 'DED_MAINLAND', 'FOREIGN_OFFSHORE')
   * @param {Array<string>} corpData.uploadedDocuments
   * @param {Array<{ uboName: string, ownershipPercentage: number }>} corpData.ultimateBeneficialOwners
   * @returns {Object}
   */
  compileCorporateDossier(corpData) {
    const isForeign = corpData.jurisdiction === 'FOREIGN_OFFSHORE';

    const mandatoryDocuments = [
      'certificate-of-incorporation',
      'memorandum-articles-of-association',
      'certificate-of-incumbency-good-standing',
      'board-resolution-authorizing-property-purchase',
      'ubo-passport-copies'
    ];

    if (isForeign) {
      mandatoryDocuments.push('mofa-uae-embassy-attestation-legalization');
    }

    const missingDocs = mandatoryDocuments.filter(d => !(corpData.uploadedDocuments || []).includes(d));
    const totalUboShare = (corpData.ultimateBeneficialOwners || []).reduce((acc, curr) => acc + curr.ownershipPercentage, 0);

    const isComplete = missingDocs.length === 0 && totalUboShare >= 99;

    return {
      companyName: corpData.companyName,
      jurisdiction: corpData.jurisdiction,
      isForeignOffshore: isForeign,
      isComplete,
      missingDocuments: missingDocs,
      uboAccountedPercentage: totalUboShare,
      status: isComplete ? 'READY_FOR_DLD_CORPORATE_APPROVAL' : 'DOCUMENTS_PENDING_ATTESTATION',
      dldNotice: isForeign
        ? 'Foreign offshore companies require registered DIFC/ADGM SPV restructuring or full UAE Ministry of Foreign Affairs (MOFA) attestation before DLD title deed registration.'
        : 'UAE mainland/freezone entity cleared for direct title deed vesting.'
    };
  }
}

export default new CorporateKycDossierCompiler();
