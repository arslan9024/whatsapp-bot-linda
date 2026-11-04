/**
 * @file VoicemailGreetingDetector.js
 * @description Analyzes audio transcripts and phonetic signatures to detect carrier
 * automated voicemails (Etisalat, du, Vodafone) vs human telephone answers.
 * Category: Intelligence
 */

export class VoicemailGreetingDetector {
  constructor() {
    this.voicemailPhrases = [
      'please leave a message',
      'after the beep',
      'the person you are calling',
      'currently unavailable',
      'mailbox is full',
      'record your message',
      'at the tone',
      'al-musharik laysa mutawaferan', // UAE carrier Arabic phrase
      'innahu mashghool al-aan'
    ];
  }

  /**
   * Evaluates text transcript for automated voicemail signatures
   * @param {string} transcriptText
   * @returns {{ isVoicemail: boolean, confidence: number, matchedPattern?: string }}
   */
  detectVoicemail(transcriptText = '') {
    const lower = transcriptText.toLowerCase();

    for (const phrase of this.voicemailPhrases) {
      if (lower.includes(phrase)) {
        return {
          isVoicemail: true,
          confidence: 95,
          matchedPattern: phrase
        };
      }
    }

    return {
      isVoicemail: false,
      confidence: 10
    };
  }
}

export default new VoicemailGreetingDetector();
