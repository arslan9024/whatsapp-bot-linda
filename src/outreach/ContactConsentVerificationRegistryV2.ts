const optOutStore = new Set<string>();

export function optOutPhone(phone: string): void {
  optOutStore.add(phone.replace(/\D/g, ''));
}

export function isPhoneOptedOut(phone: string): boolean {
  return optOutStore.has(phone.replace(/\D/g, ''));
}
export default { optOutPhone, isPhoneOptedOut };
