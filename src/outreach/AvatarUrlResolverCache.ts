const cache = new Map<string, string>();

export function getAvatar(phone: string): string | null { return cache.get(phone) || null; }
export function setAvatar(phone: string, url: string): void { cache.set(phone, url); }
export default { getAvatar, setAvatar };
