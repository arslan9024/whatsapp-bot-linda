/**
 * MobileTouchViewportSimulator.js
 * 
 * Single responsibility: Provide sanitized mobile/tablet touch viewports and device scale factors.
 * Category: 2️⃣ Domain / Feature (src/connection/)
 * Law: Single Purpose File Law (< 350 lines).
 */

export const TOUCH_DEVICE_PROFILES = Object.freeze([
  {
    name: 'iPad Pro 11',
    viewport: { width: 834, height: 1194, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
    userAgent: 'Mozilla/5.0 (iPad; CPU OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1',
  },
  {
    name: 'Pixel Tablet',
    viewport: { width: 800, height: 1280, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
    userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel Tablet) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  },
]);

export class MobileTouchViewportSimulator {
  getProfile(index = 0) {
    return TOUCH_DEVICE_PROFILES[index % TOUCH_DEVICE_PROFILES.length];
  }

  getPuppeteerViewportArgs(profileIndex = 0) {
    const prof = this.getProfile(profileIndex);
    return {
      viewport: prof.viewport,
      userAgent: prof.userAgent,
    };
  }
}

export default new MobileTouchViewportSimulator();
