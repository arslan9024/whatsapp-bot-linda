let locked = false;
export function acquireSyncLock(): boolean { if (locked) return false; locked = true; return true; }
export function releaseSyncLock(): void { locked = false; }
export default { acquireSyncLock, releaseSyncLock };
