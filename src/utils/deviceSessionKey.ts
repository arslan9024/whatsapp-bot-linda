/**
 * Multi-device WhatsApp session isolation key builder (Point 56).
 */
export function buildDeviceSessionKey(deviceId: string): string {
  return `linda-session-${deviceId.trim().replace(/[^a-zA-Z0-9_-]/g, '_')}`;
}
