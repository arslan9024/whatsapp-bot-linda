/**
 * @file SmartImageWebpOptimizer.js
 * @description Calculates optimal downscaling dimensions, quality factors, and WebP
 * compression parameters to transform DSLR architectural images into sub-1MB WhatsApp media.
 * Category: Intelligence
 */

export class SmartImageWebpOptimizer {
  constructor(config = {}) {
    this.maxDimensionPx = config.maxDimensionPx || 1600; // Optimal for mobile high-DPI
    this.targetSizeBytes = config.targetSizeBytes || 850 * 1024; // ~850KB
  }

  /**
   * Calculates target resolution preserving original aspect ratio
   * @param {number} width
   * @param {number} height
   * @returns {{ targetWidth: number, targetHeight: number, scaleFactor: number }}
   */
  calculateOptimalDimensions(width, height) {
    if (!width || !height) return { targetWidth: 1200, targetHeight: 800, scaleFactor: 1.0 };

    const maxSide = Math.max(width, height);
    if (maxSide <= this.maxDimensionPx) {
      return { targetWidth: width, targetHeight: height, scaleFactor: 1.0 };
    }

    const scaleFactor = Math.round((this.maxDimensionPx / maxSide) * 100) / 100;
    return {
      targetWidth: Math.round(width * scaleFactor),
      targetHeight: Math.round(height * scaleFactor),
      scaleFactor
    };
  }

  /**
   * Generates Sharp / FFmpeg transcoding recipe
   * @param {number} inputSizeBytes
   * @param {number} width
   * @param {number} height
   * @returns {Object} Transcoding configuration
   */
  getOptimizationRecipe(inputSizeBytes, width, height) {
    const dims = this.calculateOptimalDimensions(width, height);
    // Dynamic quality: 82 for large files, 88 for smaller
    const quality = inputSizeBytes > 5 * 1024 * 1024 ? 80 : 85;

    return {
      outputFormat: 'webp',
      targetWidth: dims.targetWidth,
      targetHeight: dims.targetHeight,
      webpQuality: quality,
      stripExif: true,
      estimatedOutputBytes: Math.min(this.targetSizeBytes, Math.round(inputSizeBytes * 0.15))
    };
  }
}

export default new SmartImageWebpOptimizer();
