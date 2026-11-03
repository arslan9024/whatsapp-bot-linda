/**
 * EphemeralMediaSpooler.js
 * 
 * Single responsibility: Buffer and spool ephemeral WhatsApp voice notes and media to disk.
 * Category: 2️⃣ Domain / Feature (src/intelligence/)
 * Law: Single Purpose File Law (< 350 lines).
 */
import fs from 'node:fs';
import path from 'node:path';

export class EphemeralMediaSpooler {
  constructor({ spoolDir = 'scratch/spool', maxAgeMs = 172800000 } = {}) {
    this.spoolDir = path.resolve(spoolDir);
    this.maxAgeMs = maxAgeMs; // 48h
    this._ensureDir();
  }

  _ensureDir() {
    if (!fs.existsSync(this.spoolDir)) {
      fs.mkdirSync(this.spoolDir, { recursive: true });
    }
  }

  spoolMedia(messageId, buffer, mimeType = 'audio/ogg; codecs=opus') {
    if (!messageId || !buffer) throw new Error('messageId and buffer are required');
    this._ensureDir();

    const ext = mimeType.includes('audio') ? 'ogg' : mimeType.includes('image') ? 'jpg' : 'bin';
    const filename = `${messageId.replace(/[^a-zA-Z0-9_-]/g, '_')}.${ext}`;
    const filePath = path.join(this.spoolDir, filename);

    fs.writeFileSync(filePath, buffer);
    return {
      messageId,
      filePath,
      bytes: buffer.length,
      mimeType,
      spooledAt: Date.now(),
    };
  }

  pruneOldFiles(now = Date.now()) {
    if (!fs.existsSync(this.spoolDir)) return 0;
    const files = fs.readdirSync(this.spoolDir);
    let pruned = 0;

    for (const f of files) {
      const p = path.join(this.spoolDir, f);
      try {
        const stat = fs.statSync(p);
        if (now - stat.mtimeMs > this.maxAgeMs) {
          fs.unlinkSync(p);
          pruned++;
        }
      } catch {
        // ignore locked files
      }
    }
    return pruned;
  }
}

export default new EphemeralMediaSpooler();

