/**
 * MicroTypoSimulator.js
 * 
 * Single responsibility: Probabilistically simulate realistic micro-typos followed by immediate backspace correction.
 * Category: 2️⃣ Domain / Feature (src/anti-ban/)
 * Law: Single Purpose File Law (< 350 lines).
 */

const KEYBOARD_NEIGHBORS = Object.freeze({
  a: 'qwsz',
  b: 'vghn',
  c: 'xdfv',
  d: 'ersfxc',
  e: 'wsdr',
  f: 'drtgvc',
  g: 'ftyhbv',
  h: 'ygjnb',
  i: 'ujko',
  j: 'huknm',
  k: 'ijlm',
  l: 'kop',
  m: 'njk',
  n: 'bhjm',
  o: 'iklp',
  p: 'ol',
  q: 'wa',
  r: 'edft',
  s: 'awedxz',
  t: 'rfgy',
  u: 'yhji',
  v: 'cfgb',
  w: 'qase',
  x: 'zsdc',
  y: 'tghu',
  z: 'asx',
});

export class MicroTypoSimulator {
  constructor({ typoProbability = 0.02 } = {}) {
    this.typoProbability = typoProbability;
  }

  generateTypoSequence(word = '') {
    if (!word || word.length < 4 || Math.random() > this.typoProbability) {
      return null; // No typo injected
    }

    const targetIdx = Math.floor(Math.random() * (word.length - 2)) + 1;
    const char = word[targetIdx].toLowerCase();
    const neighbors = KEYBOARD_NEIGHBORS[char];

    if (!neighbors) return null;

    const typoChar = neighbors[Math.floor(Math.random() * neighbors.length)];
    const mistypedWord = word.slice(0, targetIdx) + typoChar + word.slice(targetIdx + 1);

    return {
      originalWord: word,
      mistypedWord,
      correctedWord: word,
      pauseBeforeFixMs: Math.floor(Math.random() * 400) + 200, // 200-600ms reaction
    };
  }
}

export default new MicroTypoSimulator();
