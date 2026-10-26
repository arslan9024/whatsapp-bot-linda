/**
 * Working hours: the daily window in which Linda may send messages
 * (terminal campaigns and the API queue worker).
 *
 * WORK_HOURS_START / WORK_HOURS_END accept "9", "09:30" or "24" (end only).
 * The window is [start, end) in WORK_HOURS_TIMEZONE; start > end spans midnight.
 */

const DEFAULTS = Object.freeze({ start: '09:00', end: '20:00', timezone: 'Asia/Dubai' });
const DAY_MINUTES = 24 * 60;

function parseTime(value, { allowEndOfDay = false } = {}) {
  const match = /^(\d{1,2})(?::([0-5]\d))?$/.exec(String(value ?? '').trim());
  if (!match) return null;
  const minutes = Number(match[1]) * 60 + Number(match[2] || 0);
  const max = allowEndOfDay ? DAY_MINUTES : DAY_MINUTES - 1;
  return minutes <= max ? minutes : null;
}

function validTimezone(timezone) {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
}

const format = minutes =>
  `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;

/**
 * Reads the window from the environment. Invalid values fall back to the defaults
 * (09:00–20:00 Asia/Dubai) and are listed in `warnings` so the terminal can show them.
 */
export function workingHoursConfig(env = process.env) {
  const warnings = [];
  let startMinute = parseTime(env.WORK_HOURS_START ?? DEFAULTS.start);
  let endMinute = parseTime(env.WORK_HOURS_END ?? DEFAULTS.end, { allowEndOfDay: true });
  if (startMinute === null || endMinute === null || startMinute === endMinute) {
    warnings.push(
      `Invalid WORK_HOURS_START/WORK_HOURS_END ("${env.WORK_HOURS_START}"/"${env.WORK_HOURS_END}"); using ${DEFAULTS.start}-${DEFAULTS.end}.`,
    );
    startMinute = parseTime(DEFAULTS.start);
    endMinute = parseTime(DEFAULTS.end);
  }
  let timezone = env.WORK_HOURS_TIMEZONE || DEFAULTS.timezone;
  if (!validTimezone(timezone)) {
    warnings.push(`Invalid WORK_HOURS_TIMEZONE "${timezone}"; using ${DEFAULTS.timezone}.`);
    timezone = DEFAULTS.timezone;
  }
  return { startMinute, endMinute, timezone, warnings };
}

function localTime(timezone, now) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hourCycle: 'h23',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
      .formatToParts(now)
      .map(part => [part.type, Number(part.value)]),
  );
  return { minute: parts.hour * 60 + parts.minute, second: parts.second };
}

export function isWithinWorkingHours(config, now = new Date()) {
  const { minute } = localTime(config.timezone, now);
  const { startMinute: start, endMinute: end } = config;
  return start < end ? minute >= start && minute < end : minute >= start || minute < end;
}

/** Milliseconds until the window opens; 0 when sending is allowed now. */
export function msUntilWorkingHours(config, now = new Date()) {
  if (isWithinWorkingHours(config, now)) return 0;
  const { minute, second } = localTime(config.timezone, now);
  const minutes = (config.startMinute - minute + DAY_MINUTES) % DAY_MINUTES;
  return Math.max(1000, (minutes * 60 - second) * 1000);
}

export function describeWorkingHours(config) {
  return `${format(config.startMinute)}-${format(config.endMinute)} ${config.timezone}`;
}
