/**
 * @file EjariTenancyRenewalGenerator.js
 * @description Generates bilingual (Arabic/English) standard Dubai unified tenancy contracts (Ejari) with custom maintenance threshold addenda.
 * Category: 2️⃣ Domain / Feature (Brokerage ERP & Legal MOU)
 */

export class EjariTenancyRenewalGenerator {
  /**
   * Generates Ejari tenancy agreement specification.
   * @param {Object} tenancy
   * @param {string} tenancy.landlordName
   * @param {string} tenancy.tenantName
   * @param {string} tenancy.propertyPremiseNumber
   * @param {number} tenancy.annualRentAed
   * @param {number} [tenancy.chequeCount=4]
   * @param {number} [tenancy.maintenanceCapAed=500] (Tenant covers minor repairs under AED 500)
   * @returns {Object}
   */
  generateTenancyContract(tenancy) {
    const chequeCount = tenancy.chequeCount || 4;
    const perChequeAed = Math.round(tenancy.annualRentAed / chequeCount);
    const securityDepositAed = Math.round(tenancy.annualRentAed * 0.05); // 5% unfurnished deposit

    return {
      documentType: 'EJARI_UNIFIED_TENANCY_CONTRACT',
      contractReference: `EJARI-AGR-${Date.now().toString(36).toUpperCase()}`,
      parties: {
        landlord: tenancy.landlordName,
        tenant: tenancy.tenantName
      },
      premiseNumber: tenancy.propertyPremiseNumber,
      financials: {
        annualRentAed: tenancy.annualRentAed,
        numberOfCheques: chequeCount,
        amountPerChequeAed: perChequeAed,
        refundableSecurityDepositAed: securityDepositAed
      },
      standardMaintenanceClause: `Tenant is responsible for minor repair work under AED ${tenancy.maintenanceCapAed || 500}. Major structural, HVAC, and MEP repairs exceeding this cap are the sole liability of Landlord.`,
      ejariRegistrationFeeAed: 220,
      bilingualExecutionRequired: true
    };
  }
}

export default new EjariTenancyRenewalGenerator();
