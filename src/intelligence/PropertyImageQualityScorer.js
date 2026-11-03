/**
 * PropertyImageQualityScorer.js
 * 
 * Single responsibility: Rank property image assets by resolution, aspect ratio, and compression clarity.
 * Category: 2️⃣ Domain / Feature (src/intelligence/)
 * Law: Single Purpose File Law (< 350 lines).
 */

export class PropertyImageQualityScorer {
  scoreImageMeta({ width = 0, height = 0, sizeBytes = 0, format = 'jpg' } = {}) {
    let score = 50;

    // 1. Resolution score
    const totalPixels = width * height;
    if (totalPixels >= 1920 * 1080) score += 30; // 1080p+
    else if (totalPixels >= 1280 * 720) score += 20;
    else if (totalPixels < 640 * 480) score -= 25;

    // 2. Aspect Ratio (landscape 16:9 or 4:3 preferred for real estate)
    if (width > 0 && height > 0) {
      const ratio = width / height;
      if (ratio >= 1.3 && ratio <= 1.8) score += 15;
    }

    // 3. File size adequacy
    if (sizeBytes >= 200000 && sizeBytes <= 5000000) score += 10;
    else if (sizeBytes < 50000) score -= 20; // Highly compressed thumbnail

    return {
      score: Math.max(0, Math.min(100, score)),
      isHighRes: score >= 75,
      aspectRatio: height > 0 ? Number((width / height).toFixed(2)) : null,
    };
  }

  selectTopImages(images = [], limit = 3) {
    if (!Array.isArray(images)) return [];
    return [...images]
      .map(img => ({ ...img, quality: this.scoreImageMeta(img) }))
      .sort((a, b) => b.quality.score - a.quality.score)
      .slice(0, limit);
  }
}

export default new PropertyImageQualityScorer();

