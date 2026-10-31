/**
 * ====================================================================
 * HUMANIZED MESSAGE SENDER & NATURAL GREETING ENGINE
 * ====================================================================
 * Eliminates automated bot patterns by simulating realistic human behavior:
 *   1. Displays online presence (sendPresenceAvailable).
 *   2. Simulates human reading and reaction time.
 *   3. Displays real-time typing indicators (sendStateTyping).
 *   4. Employs a dynamic rotating pool of organic greetings.
 *
 * @since Development Phase — October 2026
 */

import { Logger } from '../core/Logger.js';

const logger = new Logger('HumanizedMessageSender');

const GREETINGS_MORNING = [
  "Good morning {name}! Hope you're having a wonderful day.",
  "Good morning {name}, wishing you a great week ahead.",
  "Hello {name}, good morning! Hope everything is going well with you.",
  "Good morning {name}! Hope you're having a pleasant morning.",
  "Hi {name}, good morning! Wishing you a productive and smooth day ahead.",
];

const GREETINGS_AFTERNOON = [
  "Good afternoon {name}! Hope your day is going smoothly.",
  "Hello {name}, good afternoon! Hope you're having a productive week.",
  "Good afternoon {name}! Hope all is well with you.",
  "Hi {name}, good afternoon! Wishing you a wonderful rest of the day.",
  "Good afternoon {name}! Hope you're having a great day today.",
];

const GREETINGS_EVENING = [
  "Good evening {name}! Hope you had a great day today.",
  "Good evening {name}! Wishing you a relaxing evening ahead.",
  "Hello {name}, good evening! Hope everything is well with you.",
  "Hi {name}, good evening! Hope you had a productive and pleasant day.",
];

/**
 * Generate a randomized, organic greeting based on current local time.
 *
 * @param {string} [ownerName]
 * @returns {string}
 */
export function getOrganicGreeting(ownerName = '') {
  const cleanName = String(ownerName || '').trim();
  const nameSalutation = cleanName && cleanName.toLowerCase() !== 'property owner' ? cleanName : '';
  const hour = new Date().getHours();

  let pool = GREETINGS_AFTERNOON;
  if (hour < 12) {
    pool = GREETINGS_MORNING;
  } else if (hour >= 17) {
    pool = GREETINGS_EVENING;
  }

  const template = pool[Math.floor(Math.random() * pool.length)];
  return template.replace(/\{name\}/g, nameSalutation).replace(/\s+/g, ' ').trim();
}

/**
 * Dispatch message with full humanized typing and presence simulation.
 *
 * @param {object} client - WhatsApp client
 * @param {string} chatId - Target JID
 * @param {string} text - Message content
 * @param {object} [options]
 * @returns {Promise<object>} Message result
 */
export async function sendHumanizedMessage(client, chatId, text, options = {}) {
  const isLid = String(chatId || '').includes('@lid');
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const sendOpts = { allowClosedCirclePrompt: true, ...options };

  if (!client || typeof client.sendMessage !== 'function') {
    throw new Error('Valid WhatsApp client with sendMessage is required');
  }

  // In test / dryRun mode, skip simulated sleeps for speed
  if (options.dryRun || options.instant) {
    return await client.sendMessage(chatId, text, sendOpts);
  }

  try {
    // 1. Show online presence
    if (typeof client.sendPresenceAvailable === 'function') {
      await client.sendPresenceAvailable().catch(() => {});
    }

    // 2. Reading pause (600ms - 1500ms)
    await sleep(600 + Math.floor(Math.random() * 900));

    // 3. Trigger typing indicator
    let chat = null;
    if (typeof client.getChatById === 'function' && !isLid) {
      try {
        chat = await client.getChatById(chatId);
        await chat?.sendStateTyping?.();
      } catch (_) {
        /* best effort */
      }
    }

    // 4. Realistic typing duration (min 1500ms, max 3500ms based on length)
    const duration = Math.min(3500, Math.max(1500, text.length * 35 + Math.floor(Math.random() * 500)));
    await sleep(duration);

    // 5. Clear typing presence & dispatch message
    if (chat?.clearState) {
      await chat.clearState().catch(() => {});
    }

    const result = await client.sendMessage(chatId, text, sendOpts);
    logger.info(`Humanized message sent to ${chatId} (${text.slice(0, 40)}...)`);
    return result;
  } catch (err) {
    logger.warn(`Humanized simulation fell back to direct send: ${err.message}`);
    return await client.sendMessage(chatId, text, sendOpts);
  }
}

export default sendHumanizedMessage;

