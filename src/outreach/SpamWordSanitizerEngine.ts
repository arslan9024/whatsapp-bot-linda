const BANNED = ['guaranteed return', 'free money', 'lottery', '100% profit'];

export function sanitizeSpamWords(text: string): string {
  let clean = text;
  for (const w of BANNED) {
    clean = clean.replace(new RegExp(w, 'gi'), 'attractive yield');
  }
  return clean;
}
export default sanitizeSpamWords;
