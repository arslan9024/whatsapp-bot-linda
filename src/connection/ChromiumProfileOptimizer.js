/**
 * ChromiumProfileOptimizer.js
 * 
 * Single responsibility: Provide sanitized, low-memory, and anti-detection
 * Chromium flags and memory limits for headless Puppeteer client instances.
 * 
 * Category: 2️⃣ Domain / Feature (src/connection/)
 * Law: Single Purpose File Law (< 350 lines). NEVER kills node.exe.
 */

export const DEFAULT_OPTIMIZED_FLAGS = Object.freeze([
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--disable-dev-shm-usage',
  '--disable-accelerated-2d-canvas',
  '--no-first-run',
  '--no-zygote',
  '--disable-gpu',
  '--disable-features=site-per-process,TranslateUI',
  '--disable-extensions',
  '--disable-component-extensions-with-background-pages',
  '--disable-default-apps',
  '--mute-audio',
  '--no-default-browser-check',
  '--autoplay-policy=user-gesture-required',
  '--disable-background-networking',
  '--disable-background-timer-throttling',
  '--disable-backgrounding-occluded-windows',
  '--disable-breakpad',
  '--disable-client-side-phishing-detection',
  '--disable-ipc-flooding-protection',
  '--disable-prompt-on-repost',
  '--disable-renderer-backgrounding',
  '--force-color-profile=srgb',
  '--metrics-recording-only',
  '--disable-hang-monitor',
]);

export class ChromiumProfileOptimizer {
  /**
   * @param {Object} [options]
   * @param {number} [options.maxMemoryMb=384] - V8 / Chromium JS memory ceiling per tab
   */
  constructor({ maxMemoryMb = 384 } = {}) {
    this.maxMemoryMb = maxMemoryMb;
  }

  /**
   * Generates production Puppeteer args including RAM limits and custom proxy if provided.
   * 
   * @param {Object} [params]
   * @param {string[]} [params.extraArgs=[]]
   * @param {string} [params.proxyServer]
   * @returns {string[]}
   */
  buildPuppeteerArgs({ extraArgs = [], proxyServer = null } = {}) {
    const args = [...DEFAULT_OPTIMIZED_FLAGS];

    // Memory ceiling clamp
    args.push(`--js-flags=--max-old-space-size=${this.maxMemoryMb}`);

    // Optional proxy argument
    if (proxyServer && typeof proxyServer === 'string') {
      args.push(`--proxy-server=${proxyServer}`);
    }

    // Merge any bespoke extra flags without duplicates
    for (const flag of extraArgs) {
      if (!args.includes(flag)) {
        args.push(flag);
      }
    }

    return args;
  }

  /**
   * Returns a standard desktop macOS / Windows user agent string.
   * @param {'mac'|'win'} [os='mac']
   * @returns {string}
   */
  getStableUserAgent(os = 'mac') {
    if (os === 'win') {
      return 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';
    }
    return 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';
  }
}

export default new ChromiumProfileOptimizer();

