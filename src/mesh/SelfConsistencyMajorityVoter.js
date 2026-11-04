/**
 * @file SelfConsistencyMajorityVoter.js
 * @description Executes self-consistency voting across multiple parallel reasoning paths, identifying the modal majority outcome for high-stakes financial calculations.
 * Category: 2️⃣ Domain / Feature (Multi-LLM Mesh)
 */

export class SelfConsistencyMajorityVoter {
  /**
   * Identifies modal majority across candidate answers.
   * @param {Array<number|string>} candidateOutputs
   * @returns {Object}
   */
  selectMajorityVote(candidateOutputs = []) {
    if (!candidateOutputs || candidateOutputs.length === 0) {
      throw new Error('Self-consistency voter requires at least 1 candidate output.');
    }

    const frequencyMap = new Map();

    for (const val of candidateOutputs) {
      const key = typeof val === 'number' ? Math.round(val * 100) / 100 : String(val).trim();
      const count = frequencyMap.get(key) || 0;
      frequencyMap.set(key, count + 1);
    }

    let winnerKey = null;
    let maxVotes = -1;

    for (const [key, count] of frequencyMap.entries()) {
      if (count > maxVotes) {
        maxVotes = count;
        winnerKey = key;
      }
    }

    const confidenceRatio = maxVotes / candidateOutputs.length;
    const isStrongConsensus = confidenceRatio >= 0.6;

    return {
      totalSamples: candidateOutputs.length,
      majorityValue: winnerKey,
      votesReceived: maxVotes,
      confidenceRatio: Number(confidenceRatio.toFixed(2)),
      isStrongConsensus,
      decisionMode: isStrongConsensus ? 'HIGH_CONFIDENCE_MAJORITY' : 'SPLIT_DECISION_FALLBACK'
    };
  }
}

export default new SelfConsistencyMajorityVoter();
