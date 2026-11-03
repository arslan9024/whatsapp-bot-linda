/**
 * @file MobileViewportLayoutAdapter.js
 * @description Provides responsive layout breakpoint categorization (Mobile, Tablet, Desktop)
 * and view density configurations for operations dashboards on mobile/iPad devices.
 * Category: Domain / Feature (Connection)
 */

export class MobileViewportLayoutAdapter {
  constructor() {
    this.breakpoints = {
      mobileMax: 640,
      tabletMax: 1024
    };
  }

  /**
   * Categorizes a viewport width into layout device profile
   * @param {number} widthPx
   * @returns {{ device: 'MOBILE'|'TABLET'|'DESKTOP', isTouchOptimized: boolean, density: 'compact'|'comfortable' }}
   */
  resolveLayoutProfile(widthPx = 1200) {
    if (widthPx <= this.breakpoints.mobileMax) {
      return {
        device: 'MOBILE',
        isTouchOptimized: true,
        density: 'compact'
      };
    }

    if (widthPx <= this.breakpoints.tabletMax) {
      return {
        device: 'TABLET',
        isTouchOptimized: true,
        density: 'comfortable'
      };
    }

    return {
      device: 'DESKTOP',
      isTouchOptimized: false,
      density: 'comfortable'
    };
  }
}

export default new MobileViewportLayoutAdapter();
