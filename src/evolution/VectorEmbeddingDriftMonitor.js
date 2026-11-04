/**
 * @file VectorEmbeddingDriftMonitor.js
 * @description Monitors vocabulary drift and cosine similarity distribution shifts in RAG retriever embeddings as new off-plan master plans enter market jargon.
 * Category: 2️⃣ Domain / Feature (Self-Evolution & Red-Teaming)
 */

export class VectorEmbeddingDriftMonitor {
  /**
   * @param {Object} [options]
   */
  constructor(options = {}) {
    this.baselineMeanSimilarity = options.baselineMeanSimilarity || 0.78;
    this.driftThreshold = options.driftThreshold || 0.12;
  }

  /**
   * Evaluates drift in observed search query similarities.
   * @param {Array<number>} observedSimilarities
   * @param {Array<string>} [unmappedQueryTokens=[]]
   * @returns {Object}
   */
  detectDrift(observedSimilarities = [], unmappedQueryTokens = []) {
    if (observedSimilarities.length === 0) {
      return { isDriftDetected: false, meanSimilarity: this.baselineMeanSimilarity, driftDelta: 0 };
    }

    const mean = observedSimilarities.reduce((a, b) => a + b, 0) / observedSimilarities.length;
    const delta = Math.abs(this.baselineMeanSimilarity - mean);
    const hasDrift = delta > this.driftThreshold || unmappedQueryTokens.length > 5;

    return {
      baselineSimilarity: this.baselineMeanSimilarity,
      observedMeanSimilarity: Number(mean.toFixed(3)),
      driftDelta: Number(delta.toFixed(3)),
      isDriftDetected: hasDrift,
      unmappedTermsCount: unmappedQueryTokens.length,
      unmappedSample: unmappedQueryTokens.slice(0, 5),
      remedyRecommendation: hasDrift
        ? 'Vector Index Retraining Required: New real estate terminology detected; trigger incremental re-indexing.'
        : 'Embedding space stable and aligned with baseline knowledge.'
    };
  }
}

export default new VectorEmbeddingDriftMonitor();
