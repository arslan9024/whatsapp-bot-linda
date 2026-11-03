/**
 * WebVersionPinner.js
 * 
 * Single responsibility: Provide verified WhatsApp Web revisions with automatic fallback.
 * Category: 2️⃣ Domain / Feature (src/connection/)
 * Law: Single Purpose File Law (< 350 lines).
 */

export const VERIFIED_WEB_VERSIONS = Object.freeze([
  '2.3000.1018949806-alpha',
  '2.3000.1018234850',
  '2.3000.1017845210',
]);

export class WebVersionPinner {
  constructor({ versions = VERIFIED_WEB_VERSIONS } = {}) {
    this.versions = [...versions];
    this.currentIndex = 0;
  }

  getCurrentVersion() {
    return this.versions[this.currentIndex] || this.versions[0];
  }

  rotateToFallback() {
    this.currentIndex = (this.currentIndex + 1) % this.versions.length;
    return this.getCurrentVersion();
  }

  getPuppeteerWebVersionArgs() {
    const version = this.getCurrentVersion();
    return {
      webVersion: version,
      webVersionCache: {
        type: 'remote',
        remotePath: `https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/${version}.html`,
      },
    };
  }
}

export default new WebVersionPinner();
