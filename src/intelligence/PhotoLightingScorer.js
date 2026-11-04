/**
 * @file PhotoLightingScorer.js
 * @description Evaluates image exposure, color temperature, and luminance histograms
 * to rank listing photography and automatically pick the optimal cover/hero shot.
 * Category: Intelligence
 */

export class PhotoLightingScorer {
  /**
   * Scores an image's aesthetic lighting quality
   * @param {Object} metrics
   * @param {number} metrics.averageLuminance - 0 to 255
   * @param {number} metrics.contrastRatio - 1 to 21
   * @param {number} metrics.colorTempKelvin - e.g. 5500K (daylight), 3200K (golden hour)
   * @returns {{ aestheticScore: number, isHeroWorthy: boolean, tags: Array<string> }}
   */
  scorePhotoLighting(metrics = {}) {
    const { averageLuminance = 128, contrastRatio = 7, colorTempKelvin = 5000 } = metrics;
    const tags = [];
    let score = 50;

    // Check optimal exposure
    if (averageLuminance >= 110 && averageLuminance <= 180) {
      score += 25;
      tags.push('WELL_EXPOSED');
    } else if (averageLuminance < 80) {
      score -= 20;
      tags.push('UNDEREXPOSED');
    }

    // Check contrast
    if (contrastRatio >= 5) {
      score += 15;
      tags.push('HIGH_DYNAMIC_RANGE');
    }

    // Check golden hour warm glow
    if (colorTempKelvin >= 3000 && colorTempKelvin <= 4500) {
      score += 10;
      tags.push('GOLDEN_HOUR_WARMTH');
    }

    const finalScore = Math.max(0, Math.min(100, score));

    return {
      aestheticScore: finalScore,
      isHeroWorthy: finalScore >= 75,
      tags
    };
  }
}

export default new PhotoLightingScorer();
