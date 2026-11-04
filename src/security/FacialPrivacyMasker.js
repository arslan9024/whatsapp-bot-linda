/**
 * @file FacialPrivacyMasker.js
 * @description Generates pixelation and blur bounding boxes for human faces detected in
 * community facility photographs (gyms, pools, parks), enforcing UAE Federal Decree-Law No. 34 of 2021.
 * Category: Domain / Feature (Security)
 */

export class FacialPrivacyMasker {
  /**
   * Plans privacy blur filters for detected face bounding boxes
   * @param {Array<{ x: number, y: number, width: number, height: number }>} detectedFaces
   * @param {Object} imageDimensions - { width, height }
   * @returns {{ requiresMasking: boolean, blurFilterCount: number, ffmpegBoxFilter: string }}
   */
  planFaceMasking(detectedFaces = [], imageDimensions = { width: 1200, height: 800 }) {
    if (!detectedFaces || detectedFaces.length === 0) {
      return { requiresMasking: false, blurFilterCount: 0, ffmpegBoxFilter: '' };
    }

    const boxFilters = detectedFaces.map(box => {
      // Box blur filter over region [x, y, w, h]
      return `boxblur=15:enable='between(t,0,999)':x=${box.x}:y=${box.y}:w=${box.width}:h=${box.height}`;
    });

    return {
      requiresMasking: true,
      blurFilterCount: detectedFaces.length,
      ffmpegBoxFilter: boxFilters.join(',')
    };
  }
}

export default new FacialPrivacyMasker();

