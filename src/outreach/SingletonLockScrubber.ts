import fs from 'fs';
import path from 'path';

export function scrubSingletonLocks(sessions: string[]): number {
  let cleared = 0;
  for (const s of sessions) {
    const p = path.resolve(s, 'SingletonLock');
    try {
      if (fs.existsSync(p)) {
        fs.unlinkSync(p);
        cleared++;
      }
    } catch {}
  }
  return cleared;
}
export default scrubSingletonLocks;
