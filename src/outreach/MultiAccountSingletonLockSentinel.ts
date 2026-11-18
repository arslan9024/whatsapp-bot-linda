import fs from 'fs';
import path from 'path';

export function scrubSingletonLockFiles(sessionDirs: string[]): { cleared: number; paths: string[] } {
  let cleared = 0;
  const paths: string[] = [];
  for (const dir of sessionDirs) {
    const lock = path.resolve(dir, 'SingletonLock');
    try {
      if (fs.existsSync(lock)) {
        fs.unlinkSync(lock);
        cleared++;
        paths.push(lock);
      }
    } catch {}
  }
  return { cleared, paths };
}
export default scrubSingletonLockFiles;
