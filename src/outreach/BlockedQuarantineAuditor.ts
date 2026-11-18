const quarantine = new Set<string>();

export function quarantineContact(phone: string): void { quarantine.add(phone); }
export function isQuarantined(phone: string): boolean { return quarantine.has(phone); }
export default { quarantineContact, isQuarantined };
