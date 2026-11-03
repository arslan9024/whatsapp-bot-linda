/**
 * TimezoneAwareScheduler.js
 * 
 * Single responsibility: Map international country calling codes (+44, +91, +7) to their active daytime windows.
 * Category: 2️⃣ Domain / Feature (src/outreach/)
 * Law: Single Purpose File Law (< 350 lines).
 */

export const COUNTRY_TIMEZONE_MAP = Object.freeze({
  '971': 'Asia/Dubai', // UAE (+4)
  '44': 'Europe/London', // UK (+0/+1)
  '91': 'Asia/Kolkata', // India (+5:30)
  '7': 'Europe/Moscow', // Russia (+3)
  '49': 'Europe/Berlin', // Germany (+1/+2)
  '1': 'America/New_York', // USA East (-5/-4)
});

export class TimezoneAwareScheduler {
  getCountryCode(phone = '') {
    const clean = phone.replace(/[^0-9]/g, '');
    for (const code of Object.keys(COUNTRY_TIMEZONE_MAP)) {
      if (clean.startsWith(code)) return code;
    }
    return '971'; // Default UAE
  }

  isDaytimeForContact(phone, now = new Date()) {
    const code = this.getCountryCode(phone);
    const tz = COUNTRY_TIMEZONE_MAP[code] || 'Asia/Dubai';

    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      hour: 'numeric',
      hour12: false,
    });
    const localHour = parseInt(formatter.format(now), 10);
    return localHour >= 9 && localHour <= 20; // 9:00 AM - 8:00 PM
  }
}

export default new TimezoneAwareScheduler();

