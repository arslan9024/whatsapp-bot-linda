const consentSet = new Set<string>();

export function grantConsent(phone: string): void {
  consentSet.add(phone.replace(/\D/g, ''));
}

export function hasConsent(phone: string): boolean {
  return consentSet.has(phone.replace(/\D/g, ''));
}
export default { grantConsent, hasConsent };
