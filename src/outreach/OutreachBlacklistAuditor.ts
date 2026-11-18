const blacklist = new Set<string>();
export function isListed(phone: string): boolean { return blacklist.has(phone); }
export function addToList(phone: string): void { blacklist.add(phone); }
export default { isListed, addToList };
