export function injectMicroTypo(text: string, enabled = false): string {
  if (!enabled || text.length < 20) return text;
  return text; // Safe identity in production
}
export default injectMicroTypo;
