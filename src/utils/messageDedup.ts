import { createHash } from 'node:crypto';

/**
 * Message deduplication hash tracker for Linda Bot (Point 66).
 */
export class MessageDeduplicator {
  private seen = new Map<string, number>();

  static hashMessage(chatId: string, body: string, bucketIsoMinute: string): string {
    return createHash('sha256').update(`${chatId}:${bucketIsoMinute}:${body}`).digest('hex');
  }

  isDuplicate(hash: string, ttlMs = 60_000): boolean {
    const now = Date.now();
    const exp = this.seen.get(hash);
    if (exp && exp > now) return true;
    this.seen.set(hash, now + ttlMs);
    return false;
  }
}
