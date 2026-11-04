/**
 * @file GoldenVisaMedicalVipScheduler.js
 * @description Schedules DHA VIP Smart Salem medical fitness appointments (blood test & chest X-ray) with 30-minute turnaround for Golden Visa applicants.
 * Category: 2️⃣ Domain / Feature (Cross-Border Wealth)
 */

export class GoldenVisaMedicalVipScheduler {
  /**
   * @param {Object} [options]
   */
  constructor(options = {}) {
    this.vipCenters = options.vipCenters || [
      { id: 'CITY_WALK', name: 'Smart Salem City Walk', turnaroundMinutes: 30, feeAed: 700 },
      { id: 'DIFC_INDEX', name: 'Smart Salem Index Tower DIFC', turnaroundMinutes: 30, feeAed: 700 },
      { id: 'DLD_CUBE', name: 'DLD Cube Medical Center', turnaroundMinutes: 45, feeAed: 650 }
    ];
  }

  /**
   * Schedules a VIP medical appointment.
   * @param {Object} params
   * @param {string} params.preferredCenterId
   * @param {string} params.preferredDate (YYYY-MM-DD)
   * @param {string} params.preferredTimeSlot ('09:00', '11:00')
   * @param {Array<string>} params.applicantNames
   * @returns {Object}
   */
  scheduleVipMedical({ preferredCenterId, preferredDate, preferredTimeSlot, applicantNames = [] }) {
    const center = this.vipCenters.find(c => c.id === preferredCenterId) || this.vipCenters[0];
    const totalApplicants = Math.max(1, applicantNames.length);
    const totalFeeAed = center.feeAed * totalApplicants;

    return {
      appointmentId: `MED-VIP-${Date.now().toString(36).toUpperCase()}`,
      center: center.name,
      appointmentDate: preferredDate,
      timeSlot: preferredTimeSlot,
      applicants: applicantNames,
      totalApplicants,
      totalFeeAed,
      expectedResultsTurnaround: `${center.turnaroundMinutes} minutes via digital SMS & DHA app`,
      requiredDocuments: [
        'Original Passport',
        'UAE Visa Entry Permit copy or current tourist visa copy',
        '1 Passport-sized photograph (white background)'
      ],
      status: 'CONFIRMED'
    };
  }
}

export default new GoldenVisaMedicalVipScheduler();
