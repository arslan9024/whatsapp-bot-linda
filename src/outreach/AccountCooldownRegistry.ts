const cooldowns = new Map<string, number>();
export function setCooldown(phone: string, ms: number) { cooldowns.set(phone, Date.now() + ms); }
export function isCoolingDown(phone: string) { return (cooldowns.get(phone) || 0) > Date.now(); }
export default { setCooldown, isCoolingDown };
