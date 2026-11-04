/**
 * @file DldTrusteeAppointmentBooker.js
 * @description Coordinates closing schedules at authorized Dubai Land Department Registration Trustee offices (Al Manara, Tamleek Cube, Barsha).
 * Category: 2️⃣ Domain / Feature (Brokerage ERP & Legal MOU)
 */

export class DldTrusteeAppointmentBooker {
  /**
   * @param {Object} [options]
   */
  constructor(options = {}) {
    this.trusteeOffices = options.trusteeOffices || [
      { id: 'AL_MANARA', name: 'Al Manara Centre DLD Trustee', location: 'Sheikh Zayed Road, Al Safa', feeAed: 4000 },
      { id: 'TAMLEEK_CUBE', name: 'Tamleek Cube Real Estate Registration Trustee', location: 'DLD Head Office, Deira', feeAed: 4000 },
      { id: 'BARSHA_MALL', name: 'Al Barsha Mall Trustee Office', location: 'Al Barsha 2', feeAed: 4000 }
    ];
  }

  /**
   * Schedules a trustee transfer appointment.
   * @param {Object} booking
   * @param {string} booking.preferredOfficeId
   * @param {string} booking.transferDate (YYYY-MM-DD)
   * @param {string} booking.timeSlot ('10:00', '14:00')
   * @param {string} booking.mouReference
   * @returns {Object}
   */
  bookTrusteeTransfer(booking) {
    const office = this.trusteeOffices.find(o => o.id === booking.preferredOfficeId) || this.trusteeOffices[0];

    return {
      appointmentId: `TRUSTEE-BOOK-${Date.now().toString(36).toUpperCase()}`,
      trusteeOffice: office.name,
      location: office.location,
      scheduledDate: booking.transferDate,
      timeSlot: booking.timeSlot,
      mouReference: booking.mouReference,
      mandatoryChecklistForParties: [
        'Original Emirates ID and original Passports of Buyer and Seller (or legal POA).',
        'Valid Developer NOC (original or digital verifiable QR).',
        'Bank Manager Cheques for 100% purchase price + 4% DLD fee + AED 4,000 Trustee fee + VAT.',
        'Original Title Deed certificate.'
      ],
      trusteeFeeAed: office.feeAed,
      status: 'CONFIRMED'
    };
  }
}

export default new DldTrusteeAppointmentBooker();
