/**
 * Pure helper functions for the WhatsApp Command Bridge
 * (phone normalisation, formatting, console capture, reply chunking).
 */

import services from '../../core/ServiceRegistry.js';
import { OUTPUT_CHUNK_SIZE } from './bridgeConstants.js';

export function normalizePhone(value) {
  if (!value) {
    return '';
  }
  return String(value)
    .replace('@c.us', '')
    .replace('@s.whatsapp.net', '')
    .replace(/[^\d+]/g, '')
    .replace(/^\+/, '');
}

export function formatUptime(ms = 0) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(total / 86400);
  const h = Math.floor((total % 86400) / 3600);
  const m = Math.floor((total % 3600) / 60);
  if (d > 0) {
    return `${d}d ${h}h`;
  }
  if (h > 0) {
    return `${h}h ${m}m`;
  }
  return `${m}m`;
}

export function calculateHealthScore(device) {
  if (!device) {
    return 0;
  }
  let score = 0;
  if (device.isOnline) {
    score += 40;
  }
  if (device.status === 'linked') {
    score += 30;
  }
  if (device.lastHeartbeat) {
    const age = Date.now() - new Date(device.lastHeartbeat).getTime();
    // A fresh heartbeat is worth 30; a stale one still indicates prior liveness.
    score += age <= 60_000 ? 30 : 10;
  }
  return Math.min(100, score);
}

export function isPrimaryMasterLinked(accountConfigManager, deviceLinkedManager) {
  const acm = accountConfigManager || services.get('accountConfigManager');
  const dm = deviceLinkedManager || services.get('deviceLinkedManager');
  if (!acm || !dm) {
    return false;
  }
  const device = dm.getDevice(acm.getMasterPhoneNumber());
  return Boolean(device && device.status === 'linked');
}

/** Run `fn`, capturing console.log output (ANSI stripped) instead of printing it. */
export async function captureConsoleOutput(fn) {
  const originalLog = console.log;
  const originalClear = console.clear;
  const lines = [];
  console.log = (...args) => {
    const text = args.map((a) => String(a)).join(' ');
    // eslint-disable-next-line no-control-regex
    lines.push(text.replace(/\x1B\[[0-9;]*m/g, ''));
  };
  console.clear = () => {};
  try {
    await fn();
    return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
  } finally {
    console.log = originalLog;
    console.clear = originalClear;
  }
}

/** Split long text into numbered WhatsApp-sized chunks. */
export function chunkOutput(output, chunkSize = OUTPUT_CHUNK_SIZE) {
  if (output.length <= chunkSize) {
    return [output];
  }
  const chunks = [];
  for (let i = 0; i < output.length; i += chunkSize) {
    chunks.push(output.slice(i, i + chunkSize));
  }
  return chunks.map((chunk, i) => `(${i + 1}/${chunks.length}) ${chunk}`);
}
