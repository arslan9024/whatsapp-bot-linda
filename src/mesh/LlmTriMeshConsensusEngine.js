/**
 * @file LlmTriMeshConsensusEngine.js
 * @description Coordinates a 3-way consensus mesh across frontier models (Claude 3.5, GPT-4o, Gemini 1.5), cross-validating financial and legal claims.
 * Category: 2️⃣ Domain / Feature (Multi-LLM Mesh)
 */

export class LlmTriMeshConsensusEngine {
  /**
   * Arbitrates consensus across multi-model responses.
   * @param {Array<{ model: string, numericValue: number, textResponse: string }>} modelOutputs
   * @param {number} [tolerancePct=5.0]
   * @returns {Object}
   */
  evaluateConsensus(modelOutputs = [], tolerancePct = 5.0) {
    if (!modelOutputs || modelOutputs.length === 0) {
      throw new Error('Consensus engine requires at least 1 model response.');
    }

    if (modelOutputs.length === 1) {
      return {
        consensusReached: true,
        finalValue: modelOutputs[0].numericValue,
        chosenResponse: modelOutputs[0].textResponse,
        participatingModels: [modelOutputs[0].model],
        variancePct: 0
      };
    }

    // Sort numeric outputs to find median
    const sorted = [...modelOutputs].sort((a, b) => a.numericValue - b.numericValue);
    const medianIndex = Math.floor(sorted.length / 2);
    const medianItem = sorted[medianIndex];

    const values = sorted.map(s => s.numericValue);
    const minVal = Math.min(...values);
    const maxVal = Math.max(...values);
    const variancePct = minVal > 0 ? ((maxVal - minVal) / minVal) * 100 : 0;
    const isConsensusReached = variancePct <= tolerancePct;

    return {
      consensusReached: isConsensusReached,
      finalValue: medianItem.numericValue,
      chosenResponse: medianItem.textResponse,
      participatingModels: modelOutputs.map(m => m.model),
      variancePct: Number(variancePct.toFixed(2)),
      arbitrationMethod: 'MEDIAN_NUMERICAL_STABILIZER',
      advisory: isConsensusReached
        ? 'High Model Alignment: Tri-mesh outputs converge within acceptable tolerance.'
        : `Divergence Alert: Models show ${variancePct.toFixed(1)}% variance. Median estimate enforced for client safety.`
    };
  }
}

export default new LlmTriMeshConsensusEngine();
