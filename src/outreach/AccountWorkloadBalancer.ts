export function pickNextAccount(accounts: { phone: string; sent: number; cap: number }[]): string | null {
  const available = accounts.filter(a => a.sent < a.cap);
  if (!available.length) return null;
  available.sort((a, b) => a.sent - b.sent);
  return available[0].phone;
}
export default pickNextAccount;
