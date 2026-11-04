/**
 * @file LlmOutputTokenStreamThrottler.js
 * @description Breaks long monolithic LLM responses into natural conversational WhatsApp chat bubbles with humanized typing intervals and reading pauses.
 * Category: 2️⃣ Domain / Feature (Multi-LLM Mesh)
 */

export class LlmOutputTokenStreamThrottler {
  /**
   * Chunks a lengthy response into conversational messages.
   * @param {string} fullText
   * @param {number} [maxCharsPerBubble=280]
   * @returns {Object}
   */
  chunkIntoHumanBubbles(fullText = '', maxCharsPerBubble = 280) {
    if (!fullText) return { bubbles: [], totalBubbles: 0, estimatedReadingTimeSeconds: 0 };

    const paragraphs = fullText.split(/\n\n+/).filter(p => p.trim().length > 0);
    const bubbles = [];

    for (const para of paragraphs) {
      if (para.length <= maxCharsPerBubble) {
        bubbles.push(para.trim());
      } else {
        // Split by sentence
        const sentences = para.match(/[^.!?]+[.!?]+/g) || [para];
        let currentBubble = '';

        for (const sent of sentences) {
          if ((currentBubble + sent).length <= maxCharsPerBubble) {
            currentBubble += ' ' + sent.trim();
          } else {
            if (currentBubble.trim()) bubbles.push(currentBubble.trim());
            currentBubble = sent.trim();
          }
        }
        if (currentBubble.trim()) bubbles.push(currentBubble.trim());
      }
    }

    // Calculate typing delays: ~35 words per minute typing cadence simulation
    const totalWords = fullText.split(/\s+/).length;
    const estimatedReadingTimeSeconds = Math.round((totalWords / 200) * 60);

    return {
      totalBubbles: bubbles.length,
      bubbles: bubbles.map((b, idx) => ({
        bubbleIndex: idx + 1,
        text: b,
        typingDelayBeforeSendMs: Math.min(3000, Math.max(800, b.length * 15))
      })),
      estimatedReadingTimeSeconds
    };
  }
}

export default new LlmOutputTokenStreamThrottler();
