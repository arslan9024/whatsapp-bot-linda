export function getDeviceFingerprint(phone: string): string {
  return `WA_CHROME_122_${phone.slice(-4)}`;
}
export default getDeviceFingerprint;
