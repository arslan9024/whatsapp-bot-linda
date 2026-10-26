import { jest } from '@jest/globals';
import DeviceLinkedManager from '../../src/linking/DeviceLinkedManager.js';

describe('DeviceLinkedManager link failure reporting', () => {
  const phone = '+15550000009';

  test('failure before an attempt starts counts as attempt 1, never 0', () => {
    const log = jest.fn();
    const devices = new DeviceLinkedManager(log);
    devices.addDevice(phone);

    const delay = devices.recordLinkFailure(phone, new Error('client creation failed'));

    expect(delay).toBe(4000);
    expect(devices.getDevice(phone).linkAttempts).toBe(1);
    const message = log.mock.calls.at(-1)[0];
    expect(message).toContain('Link attempt 1/5 failed');
    expect(message).toContain('client creation failed');
    expect(message).not.toMatch(/0\/5|Retrying in/);
    expect(message).toContain(`recover ${phone}`);
  });

  test('failure after startLinkingAttempt reports the started attempt number', () => {
    const log = jest.fn();
    const devices = new DeviceLinkedManager(log);
    devices.addDevice(phone);
    devices.startLinkingAttempt(phone);
    devices.recordLinkFailure(phone);
    devices.startLinkingAttempt(phone);
    devices.recordLinkFailure(phone);

    expect(log.mock.calls.at(-1)[0]).toContain('Link attempt 2/5 failed');
    expect(devices.getDevice(phone).retryAfter).toEqual(expect.any(String));

    devices.markDeviceLinked(phone);
    expect(devices.getDevice(phone).retryAfter).toBeNull();
  });
});
