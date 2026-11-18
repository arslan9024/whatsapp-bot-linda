export function classifyIntent(text: string): string {
  if (/viewing|visit|see the villa/i.test(text)) return 'VIEWING_REQUEST';
  return 'GENERAL';
}
export default classifyIntent;
