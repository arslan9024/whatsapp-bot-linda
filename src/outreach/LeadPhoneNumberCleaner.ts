export function cleanLeadPhone(raw: string): string {
  return raw.replace(/\D/g, '');
}
export default cleanLeadPhone;
