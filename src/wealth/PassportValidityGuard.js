/**
 * @file PassportValidityGuard.js
 * @description Validates foreign passport expiration dates against UAE immigration 6-month validity thresholds for property transfer and residency visa stamping.
 * Category: 2️⃣ Domain / Feature (Cross-Border Wealth)
 */

export class PassportValidityGuard {
  /**
   * Evaluates passport validity against immigration thresholds.
   * @param {Object} params
   * @param {string} params.passportExpiryDate (YYYY-MM-DD)
   * @param {string} [params.currentDate]
   * @param {string} [params.intendedTravelDate]
   * @returns {Object}
   */
  checkPassportValidity({ passportExpiryDate, currentDate, intendedTravelDate }) {
    const today = currentDate ? new Date(currentDate) : new Date();
    const expiry = new Date(passportExpiryDate);
    const targetDate = intendedTravelDate ? new Date(intendedTravelDate) : today;

    const diffDays = Math.round((expiry.getTime() - targetDate.getTime()) / (1000 * 60 * 60 * 24));
    const monthsRemaining = diffDays / 30.44;

    const isValidForTravel = monthsRemaining >= 6.0;
    const isValidForVisaIssuance = monthsRemaining >= 6.0;

    return {
      passportExpiryDate,
      daysRemaining: Math.max(0, diffDays),
      monthsRemaining: Number(monthsRemaining.toFixed(1)),
      isValidForTravel,
      isValidForVisaIssuance,
      status: isValidForVisaIssuance ? 'PASSPORT_VALID' : 'CRITICAL_EXPIRY_RENEWAL_MANDATORY',
      actionAlert: !isValidForVisaIssuance
        ? `Action Required: Passport has only ${monthsRemaining.toFixed(1)} months validity. UAE GDRFA and ICP mandate a minimum of 6 full months. Client must renew passport before visa or property registration.`
        : 'Passport meets all UAE immigration and Golden Visa validity requirements.'
    };
  }
}

export default new PassportValidityGuard();
