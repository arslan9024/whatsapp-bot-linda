/**
 * @file AgentLanguageAffinityMatcher.js
 * @description Pairs multilingual Dubai property buyers with native-speaking human agents
 * across Arabic, Russian, French, Hindi/Urdu, Mandarin, German, and English.
 * Category: Accounts
 */

export class AgentLanguageAffinityMatcher {
  constructor() {
    this.agentLanguages = new Map();
  }

  /**
   * Registers supported languages and proficiency levels for an agent
   * @param {string} agentId
   * @param {Array<{language: string, level: string}>} spokenLanguages
   */
  registerAgentLanguages(agentId, spokenLanguages = []) {
    const langMap = new Map();
    for (const item of spokenLanguages) {
      if (typeof item === 'string') {
        langMap.set(item.toLowerCase(), 'fluent');
      } else if (item.language) {
        langMap.set(item.language.toLowerCase(), (item.level || 'fluent').toLowerCase());
      }
    }
    this.agentLanguages.set(agentId, langMap);
  }

  /**
   * Evaluates linguistic affinity between a lead's detected language and an agent
   * @param {string} detectedLanguage - e.g. 'arabic', 'russian', 'french'
   * @param {string} agentId
   * @returns {number} Score: 100 for native, 80 for fluent, 40 for conversational, 0 for none
   */
  getAffinityScore(detectedLanguage, agentId) {
    if (!detectedLanguage) return 50; // Default fallback to English/standard
    const agentLangs = this.agentLanguages.get(agentId);
    if (!agentLangs) return 0;

    const lang = detectedLanguage.toLowerCase();
    const proficiency = agentLangs.get(lang);

    if (!proficiency) {
      // If agent speaks English and client is unidentified or standard
      if (lang === 'english' && agentLangs.has('english')) return 70;
      return 0;
    }

    switch (proficiency) {
      case 'native': return 100;
      case 'fluent': return 85;
      case 'conversational': return 50;
      default: return 40;
    }
  }

  /**
   * Filters and ranks candidate agents by language proficiency
   * @param {string} detectedLanguage
   * @param {Array<string>} candidateAgentIds
   * @returns {Array<{ agentId: string, score: number }>}
   */
  rankAgentsByLanguage(detectedLanguage, candidateAgentIds) {
    const list = candidateAgentIds || Array.from(this.agentLanguages.keys());

    return list
      .map(id => ({ agentId: id, score: this.getAffinityScore(detectedLanguage, id) }))
      .sort((a, b) => b.score - a.score);
  }
}

export default new AgentLanguageAffinityMatcher();
