/**
 * @file AiVideoWalkthroughGenerator.js
 * @description Generates storyboard sequences, slide durations, pan-and-zoom transitions,
 * and voiceover alignment for automated vertical property video walkthroughs.
 * Category: Intelligence
 */

export class AiVideoWalkthroughGenerator {
  /**
   * Plans video storyboard sequence from property image URLs
   * @param {Object} property
   * @param {string} property.title
   * @param {string} property.priceAed
   * @param {Array<string>} property.imageUrls
   * @returns {Object} Video rendering storyboard plan
   */
  generateStoryboard(property = {}) {
    const { title = 'Dubai Property', priceAed = 0, imageUrls = [] } = property;

    const scenes = imageUrls.slice(0, 5).map((url, idx) => {
      let label = 'Living Area';
      if (idx === 0) label = 'Grand Entrance & Architecture';
      else if (idx === 1) label = 'Master Bedroom Suite';
      else if (idx === 2) label = 'Gourmet Kitchen & Dining';
      else if (idx === 3) label = 'Panoramic Skyline Balcony';

      return {
        sceneNumber: idx + 1,
        imageUrl: url,
        label,
        durationSeconds: 3.5,
        transition: 'crossfade_zoom_in'
      };
    });

    const totalDuration = scenes.length * 3.5;

    return {
      title,
      targetAspect: '9:16', // Vertical for WhatsApp Story and Mobile View
      totalDurationSeconds: totalDuration,
      scenes,
      closingOverlay: {
        headline: title,
        priceText: `AED ${Number(priceAed).toLocaleString()}`,
        callToAction: 'Message Linda on WhatsApp for Private Viewing'
      }
    };
  }
}

export default new AiVideoWalkthroughGenerator();
