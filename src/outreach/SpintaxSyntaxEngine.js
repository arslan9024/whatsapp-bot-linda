/**
 * SpintaxSyntaxEngine.js
 * 
 * Single responsibility: Resolve nested spintax expressions ({Hi|Hello|Good day}) into unique variations.
 * Category: 2️⃣ Domain / Feature (src/outreach/)
 * Law: Single Purpose File Law (< 350 lines).
 */

export class SpintaxSyntaxEngine {
  spin(template = '') {
    if (!template || typeof template !== 'string') return '';
    let current = template;
    const spintaxRegex = /\{([^{}]+)\}/;

    let match;
    while ((match = spintaxRegex.exec(current)) !== null) {
      const choices = match[1].split('|');
      const randomChoice = choices[Math.floor(Math.random() * choices.length)];
      current = current.slice(0, match.index) + randomChoice + current.slice(match.index + match[0].length);
    }
    return current;
  }

  getCombinationsCount(template = '') {
    if (!template || typeof template !== 'string') return 1;
    const matches = template.match(/\{([^{}]+)\}/g);
    if (!matches) return 1;

    return matches.reduce((acc, match) => {
      const choices = match.slice(1, -1).split('|').length;
      return acc * choices;
    }, 1);
  }
}

export default new SpintaxSyntaxEngine();
