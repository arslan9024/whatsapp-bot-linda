/**
 * @file EmiratesIdFastTrackScheduler.js
 * @description Coordinates VIP fast-track biometric capture appointments at Federal Authority for Identity and Citizenship (ICP) centers for Golden Visa holders.
 * Category: 2️⃣ Domain / Feature (Cross-Border Wealth)
 */

export class EmiratesIdFastTrackScheduler {
  /**
   * @param {Object} [options]
   */
  constructor(options = {}) {
    this.icpCenters = options.icpCenters || [
      { id: 'AL_BARSHA', name: 'ICP Customer Happiness Center - Al Barsha', isVipCenter: true },
      { id: 'AL_RASHIDIYA', name: 'ICP Customer Happiness Center - Al Rashidiya', isVipCenter: true },
      { id: 'DLD_CUBE', name: 'DLD Cube ICP Biometrics Center', isVipCenter: true }
    ];
  }

  /**
   * Schedules fast-track Emirates ID biometrics appointment.
   * @param {Object} params
   * @param {string} params.preferredCenterId
   * @param {string} params.preferredDate (YYYY-MM-DD)
   * @param {Array<{ applicantName: string, passportNumber: string }>} params.applicants
   * @returns {Object}
   */
  scheduleFastTrackBiometrics({ preferredCenterId, preferredDate, applicants = [] }) {
    const center = this.icpCenters.find(c => c.id === preferredCenterId) || this.icpCenters[0];
    const totalApplicants = Math.max(1, applicants.length);

    return {
      bookingReference: `ICP-VIP-${Date.now().toString(36).toUpperCase()}`,
      center: center.name,
      appointmentDate: preferredDate,
      totalApplicants,
      applicants,
      queueType: 'VIP_FAST_TRACK',
      estimatedWaitTimeMinutes: 10,
      instructions: [
        'Present original passport and printed ICP application form.',
        'Fingerprint scans and facial biometric photograph taken on site.',
        'Physical Emirates ID card delivered to registered UAE address within 48-72 hours via Empost.'
      ]
    };
  }
}

export default new EmiratesIdFastTrackScheduler();
