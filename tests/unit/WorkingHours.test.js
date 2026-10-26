import {
  describeWorkingHours,
  isWithinWorkingHours,
  msUntilWorkingHours,
  workingHoursConfig,
} from '../../src/campaigns/WorkingHours.js';

// Dubai is UTC+4 with no daylight saving, so UTC instants map to fixed local times.
const dubai = (hhmm) => new Date(`2026-10-26T${hhmm}:00+04:00`);

describe('WorkingHours', () => {
  test('defaults to 09:00-20:00 Asia/Dubai', () => {
    const config = workingHoursConfig({});
    expect(describeWorkingHours(config)).toBe('09:00-20:00 Asia/Dubai');
    expect(config.warnings).toEqual([]);
  });

  test('the operator chooses the window, e.g. 9 to 20', () => {
    const config = workingHoursConfig({ WORK_HOURS_START: '9', WORK_HOURS_END: '20' });
    expect(isWithinWorkingHours(config, dubai('08:59'))).toBe(false);
    expect(isWithinWorkingHours(config, dubai('09:00'))).toBe(true);
    expect(isWithinWorkingHours(config, dubai('19:59'))).toBe(true);
    expect(isWithinWorkingHours(config, dubai('20:00'))).toBe(false);
  });

  test('time until the window opens, in the configured timezone', () => {
    const config = workingHoursConfig({ WORK_HOURS_START: '09:30', WORK_HOURS_END: '20' });
    expect(msUntilWorkingHours(config, dubai('10:00'))).toBe(0);
    expect(msUntilWorkingHours(config, dubai('08:30'))).toBe(60 * 60 * 1000);
    expect(msUntilWorkingHours(config, dubai('21:30'))).toBe(12 * 60 * 60 * 1000);
  });

  test('a window that spans midnight', () => {
    const config = workingHoursConfig({ WORK_HOURS_START: '22', WORK_HOURS_END: '02' });
    expect(isWithinWorkingHours(config, dubai('23:00'))).toBe(true);
    expect(isWithinWorkingHours(config, dubai('01:59'))).toBe(true);
    expect(isWithinWorkingHours(config, dubai('12:00'))).toBe(false);
  });

  test('0 to 24 allows the whole day', () => {
    const config = workingHoursConfig({ WORK_HOURS_START: '0', WORK_HOURS_END: '24' });
    expect(isWithinWorkingHours(config, dubai('00:00'))).toBe(true);
    expect(isWithinWorkingHours(config, dubai('23:59'))).toBe(true);
  });

  test('invalid values fall back to the safe default and say so', () => {
    const config = workingHoursConfig({ WORK_HOURS_START: '25', WORK_HOURS_END: '20', WORK_HOURS_TIMEZONE: 'Mars/Base' });
    expect(describeWorkingHours(config)).toBe('09:00-20:00 Asia/Dubai');
    expect(config.warnings).toHaveLength(2);
    expect(workingHoursConfig({ WORK_HOURS_START: '9', WORK_HOURS_END: '9' }).warnings).toHaveLength(1);
  });
});
