/**
 * @file GlobalInvestorTimezoneSequencer.js
 * @description Coordinates automated client outreach windows mapped to the investor's local time zone, respecting cultural holidays and business hours.
 * Category: 2️⃣ Domain / Feature (Cross-Border Wealth)
 */

export class GlobalInvestorTimezoneSequencer {
  /**
   * @param {Object} [options]
   */
  constructor(options = {}) {
    this.timezoneOffsets = options.timezoneOffsets || {
      'LONDON': { utcOffset: 0, preferredWindowLocal: '10:00-17:00', lunchBreak: '13:00-14:00' },
      'PARIS': { utcOffset: 1, preferredWindowLocal: '10:00-17:30', lunchBreak: '12:30-14:00' },
      'MOSCOW': { utcOffset: 3, preferredWindowLocal: '11:00-19:00', lunchBreak: '14:00-15:00' },
      'MUMBAI': { utcOffset: 5.5, preferredWindowLocal: '10:30-18:00', lunchBreak: '13:00-14:00' },
      'SINGAPORE': { utcOffset: 8, preferredWindowLocal: '09:30-17:30', lunchBreak: '12:00-13:30' },
      'NEW_YORK': { utcOffset: -5, preferredWindowLocal: '09:30-16:30', lunchBreak: '12:00-13:00' }
    };
  }

  /**
   * Calculates Dubai time to dispatch messages or schedule calls for an overseas client.
   * @param {string} cityOrTz
   * @param {number} localHourTarget (e.g. 11 for 11:00 AM in client's city)
   * @returns {Object}
   */
  calculateDubaiDispatchTime(cityOrTz, localHourTarget = 11) {
    const key = (cityOrTz || 'LONDON').toUpperCase().trim().replace(/\s+/g, '_');
    const profile = this.timezoneOffsets[key] || { utcOffset: 0, preferredWindowLocal: '10:00-17:00' };

    const dubaiUtcOffset = 4; // UTC+4 Gulf Standard Time
    const diffToDubaiHours = dubaiUtcOffset - profile.utcOffset;
    let dubaiHour = (localHourTarget + diffToDubaiHours) % 24;
    if (dubaiHour < 0) dubaiHour += 24;

    return {
      clientLocation: key,
      clientTargetHour: `${localHourTarget}:00`,
      dubaiDispatchHour: `${Math.floor(dubaiHour)}:${(dubaiHour % 1 * 60).toString().padStart(2, '0')}`,
      hoursDifferenceFromDubai: diffToDubaiHours,
      preferredLocalWindow: profile.preferredWindowLocal,
      isAwakeAndReceptive: localHourTarget >= 9 && localHourTarget <= 20
    };
  }
}

export default new GlobalInvestorTimezoneSequencer();
