import path from 'path';
import { existsSync, readdirSync, readFileSync, statSync } from 'fs';

// Local Storage keys WhatsApp Web writes only after a device is logged in.
const AUTH_MARKERS = ['last-wid-md', 'last-wid'];
const cache = new Map();

export const sanitizeClientId = id => String(id).replace(/^\+/, '').replace(/[^a-zA-Z0-9_-]/g, '_');

/**
 * Detects a completed WhatsApp Web login stored in a LocalAuth profile.
 * @returns {boolean|null} true = login saved, false = no login, null = unreadable
 */
export function hasSavedLogin(sessionsDir, clientId) {
  try {
    if (!clientId) return false;
    const id = sanitizeClientId(clientId);
    const dir = path.join(sessionsDir, `session-${id}`, 'Default', 'Local Storage', 'leveldb');
    if (!existsSync(dir)) return false;
    const files = readdirSync(dir).filter(name => /\.(log|ldb)$/.test(name));
    const signature = files.map(name => {
      const stat = statSync(path.join(dir, name));
      return `${name}:${stat.size}:${stat.mtimeMs}`;
    }).join('|');
    const key = path.join(sessionsDir, id);
    if (cache.get(key)?.signature === signature) return cache.get(key).result;
    let result = false;
    for (const name of files) {
      try {
        const content = readFileSync(path.join(dir, name)).toString('latin1');
        if (AUTH_MARKERS.some(marker => content.includes(marker))) {
          result = true;
          break;
        }
      } catch {
        result = null;
      }
    }
    cache.set(key, { signature, result });
    return result;
  } catch {
    return null;
  }
}

/**
 * Chooses the LocalAuth profile to restore: a profile holding a real login wins,
 * then the persisted profile, then any existing profile, then the first candidate.
 */
export function chooseProfile({ persisted, candidates, hasArtifacts, hasLogin }) {
  const ids = [...new Set([persisted, ...candidates].filter(Boolean).map(sanitizeClientId))];
  return ids.find(id => hasArtifacts(id) && hasLogin(id) === true) ||
    (persisted && sanitizeClientId(persisted)) ||
    ids.find(id => hasArtifacts(id)) || ids[0];
}

export async function waitForSavedLogin(check, { timeoutMs = 60000, intervalMs = 3000 } = {}) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (check() === true) return true;
    await new Promise(resolve => setTimeout(resolve, intervalMs).unref?.());
  }
  return check() === true;
}
