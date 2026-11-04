/**
 * @file VideoSubtitleCaptionBurner.js
 * @description Generates bilingual WebVTT and SubRip (.srt) subtitle cues synchronized
 * with promotional video walkthroughs for automated mobile video overlays.
 * Category: Intelligence
 */

export class VideoSubtitleCaptionBurner {
  /**
   * Formats milliseconds into standard SubRip timestamp (00:00:01,500)
   * @param {number} totalMs
   * @returns {string}
   */
  formatSrtTimestamp(totalMs) {
    const hours = String(Math.floor(totalMs / 3600000)).padStart(2, '0');
    const minutes = String(Math.floor((totalMs % 3600000) / 60000)).padStart(2, '0');
    const seconds = String(Math.floor((totalMs % 60000) / 1000)).padStart(2, '0');
    const millis = String(totalMs % 1000).padStart(3, '0');
    return `${hours}:${minutes}:${seconds},${millis}`;
  }

  /**
   * Builds an SRT subtitle file string from cue segments
   * @param {Array<{ startMs: number, endMs: number, textEn: string, textAr?: string }>} cues
   * @returns {string} Formatted SRT text
   */
  generateSrtContent(cues = []) {
    const blocks = cues.map((cue, idx) => {
      const indexNum = idx + 1;
      const start = this.formatSrtTimestamp(cue.startMs);
      const end = this.formatSrtTimestamp(cue.endMs);
      const lines = [cue.textEn];
      if (cue.textAr) lines.push(cue.textAr);

      return `${indexNum}\r\n${start} --> ${end}\r\n${lines.join('\r\n')}`;
    });

    return blocks.join('\r\n\r\n');
  }
}

export default new VideoSubtitleCaptionBurner();
