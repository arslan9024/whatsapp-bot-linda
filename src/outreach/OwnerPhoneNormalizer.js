/**
 * Normalizes owner phone cells from the owners sheet into E.164 digits (no "+").
 *
 * Mirrors the sheet's own WhatsApp-link formula (strip separators, 00 → drop,
 * 0 + 9 digits → 971, bare 9 digits → 971; 0 + 8 digits is a UAE landline) and adds the "971|5xxxxxxxx" pipe
 * format, then validates with libphonenumber. Landlines are rejected.
 */

import { parsePhoneNumberFromString } from 'libphonenumber-js/max';

const PIPE = /^\+?(\d{1,4})\s*\|\s*(.*)$/;

export const DO_NOT_CONTACT =
  /no\s*wh?a?ts?app|wrong|not valid|incorrect|not correct|not in (use|service)|out of service|blocked|need new owner|disconnected|not working/i;

function candidateDigits(raw) {
  const text = String(raw ?? '').trim();
  if (!text) return '';
  const pipe = PIPE.exec(text);
  if (pipe) {
    const code = pipe[1];
    const national = pipe[2].replace(/\D/g, '').replace(/^0+/, '');
    if (national.length < 6) return '';
    if (national.startsWith(code) && national.length > 10) return national;
    return code + national;
  }
  let digits = text.replace(/\D/g, '');
  if (!digits || /^0+$/.test(digits)) return '';
  if (digits.startsWith('00')) digits = digits.slice(2);
  else if (digits.startsWith('0')) digits = digits.length === 10 || digits.length === 9 ? `971${digits.slice(1)}` : digits.slice(1);
  else if (digits.length === 9) digits = `971${digits}`;
  return digits;
}

/**
 * @returns {{ ok: true, digits: string, country: string|undefined, type: string|undefined }
 *         | { ok: false, reason: 'empty'|'invalid'|'landline' }}
 */
export function normalizeOwnerPhone(raw) {
  const digits = candidateDigits(raw);
  if (!digits) return { ok: false, reason: 'empty' };
  if (digits.length < 8 || digits.length > 15) return { ok: false, reason: 'invalid' };
  const parsed = parsePhoneNumberFromString(`+${digits}`);
  if (!parsed?.isValid()) return { ok: false, reason: 'invalid' };
  const type = parsed.getType();
  if (type === 'FIXED_LINE') return { ok: false, reason: 'landline' };
  return { ok: true, digits: parsed.number.slice(1), country: parsed.country, type };
}

/** Digits-only form used as the identity key everywhere in outreach and the budget. */
export function phoneKey(value) {
  return String(value ?? '').split('@')[0].replace(/\D/g, '');
}

export function maskPhone(digits) {
  const value = phoneKey(digits);
  return value.length > 4 ? `${'•'.repeat(Math.min(6, value.length - 4))}${value.slice(-4)}` : value;
}
