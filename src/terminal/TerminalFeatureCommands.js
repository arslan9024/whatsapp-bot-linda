/**
 * TerminalFeatureCommands.js
 *
 * Terminal commands restored from the archived project (sentiment, intent, similar,
 * dedupe, score) plus number validation and single-message sending.
 */

import fs from 'fs';
import path from 'path';
import * as XLSX from '@e965/xlsx';
import { parsePhoneNumberFromString } from 'libphonenumber-js';
import SentimentAnalyzer from '../intelligence/SentimentAnalyzer.js';
import IntentClassifier from '../intelligence/IntentClassifier.js';
import DeduplicationService, { normalizePhone } from '../services/DeduplicationService.js';
import HealthScorer from '../accounts/HealthScorer.js';

const MAX_DEDUPE_BYTES = 10 * 1024 * 1024;
const pct = value => `${Math.round(value * 100)}%`;

let sentimentAnalyzer;
let intentClassifier;
let healthScorer;

export function analyzeText(text) {
  sentimentAnalyzer ||= new SentimentAnalyzer();
  intentClassifier ||= new IntentClassifier();
  const sentiment = sentimentAnalyzer.analyzeSentiment(text);
  const intent = intentClassifier.classify(text);
  return { sentiment, intent, mood: sentimentAnalyzer.getMoodEmoji(sentiment.sentiment) };
}

export function sentimentLines(text) {
  const { sentiment, mood } = analyzeText(text);
  return [
    `Sentiment: ${mood} ${sentiment.label || 'neutral'} | score ${sentiment.sentiment.toFixed(2)} (-1..1) | confidence ${pct(sentiment.confidence)}`,
    `  emoji ${sentiment.components?.emoji?.score?.toFixed(2) ?? '0.00'} | keywords ${sentiment.components?.keyword?.score?.toFixed(2) ?? '0.00'} | punctuation ${sentiment.components?.punctuation?.score?.toFixed(2) ?? '0.00'}`,
  ];
}

export function intentLines(text) {
  const { intent } = analyzeText(text);
  const strategy = intentClassifier.getResponseStrategy(intent.intent);
  return [
    `Intent: ${intent.intent} | confidence ${intent.confidence}%${intent.keywords?.length ? ` | keywords: ${intent.keywords.join(', ')}` : ''}`,
    intent.topAlternatives?.length
      ? `  alternatives: ${intent.topAlternatives.map(alt => `${alt.intent} ${alt.confidence}%`).join(', ')}`
      : '',
    strategy ? `  suggested reply: ${strategy.type} (${strategy.tone})${strategy.suggest ? ` → ${strategy.suggest}` : ''}` : '',
  ].filter(Boolean);
}

/** `similar <a> | <b>` - compare two names or two phone numbers. */
export function similarLines(input) {
  const [a, b] = String(input).split('|').map(part => part.trim());
  if (!a || !b) return ['Usage: similar <name or phone> | <name or phone>'];
  const service = new DeduplicationService();
  const looksLikePhone = value => value.replace(/\D/g, '').length >= 7 && !/[a-z]/i.test(value);
  if (looksLikePhone(a) && looksLikePhone(b)) {
    const score = service.comparePhones(normalizePhone(a).formatted, normalizePhone(b).formatted);
    return [`Phone match: ${pct(score)} | ${normalizePhone(a).formatted} vs ${normalizePhone(b).formatted} | ${score >= 0.9 ? 'SAME CONTACT' : 'DIFFERENT'}`];
  }
  const score = service.compareSimilarity(a.toUpperCase().trim(), b.toUpperCase().trim());
  return [`Name similarity: ${pct(score)} (Levenshtein) | ${score >= 0.85 ? 'LIKELY DUPLICATE' : score >= 0.6 ? 'POSSIBLE MATCH' : 'DIFFERENT'}`];
}

function readRows(file) {
  const resolved = path.resolve(file);
  const stat = fs.statSync(resolved);
  if (!stat.isFile() || stat.size === 0 || stat.size > MAX_DEDUPE_BYTES) {
    throw new Error('Dedupe files must be CSV, XLSX or JSON between 1 byte and 10 MB.');
  }
  if (resolved.toLowerCase().endsWith('.json')) {
    const data = JSON.parse(fs.readFileSync(resolved, 'utf8'));
    if (!Array.isArray(data)) throw new Error('JSON dedupe files must contain an array of contact objects.');
    return data;
  }
  const workbook = XLSX.read(fs.readFileSync(resolved), { type: 'buffer', cellDates: false });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!sheet) throw new Error('The file does not contain a worksheet.');
  return XLSX.utils.sheet_to_json(sheet, { defval: '', raw: false });
}

/** `dedupe <file>` - run the restored 5-stage deduplication pipeline on a contact file. */
export async function dedupeLines(file) {
  const rows = readRows(file);
  if (!rows.length) return ['No rows found. The first row must contain headers (name, phone, email...).'];
  const service = new DeduplicationService();
  const columns = service.autoDetectColumns(rows);
  if (!columns.phone && !columns.name && !columns.email) {
    return ['No name/phone/email columns detected. Use headers such as Name, Phone, Email.'];
  }
  const result = await service.deduplicate(rows, columns);
  const exact = rows.length - result.records.length;
  const lines = [
    `Dedupe: ${rows.length} rows | unique ${result.records.length} | exact duplicates ${exact} | possible duplicates ${result.potentialDuplicates.length}`,
    `  columns: ${Object.entries(columns).map(([key, value]) => `${key}=${value}`).join(', ')}`,
  ];
  result.potentialDuplicates.slice(0, 10).forEach((pair, index) => {
    lines.push(`  ${index + 1}. row ${pair.record1 + 2} ↔ row ${pair.record2 + 2} | ${pct(pair.similarity)} | ` +
      `${pair.record1Data.name || pair.record1Data.phone || '-'} ↔ ${pair.record2Data.name || pair.record2Data.phone || '-'}`);
  });
  if (result.potentialDuplicates.length > 10) lines.push(`  ...and ${result.potentialDuplicates.length - 10} more`);
  return lines;
}

/** Normalize and validate a number; optionally confirm it is on WhatsApp. */
export async function validateLines(number, client = null) {
  const normalized = normalizePhone(number);
  if (!normalized.formatted) return ['Usage: validate <number>'];
  const parsed = parsePhoneNumberFromString(normalized.formatted);
  const lines = [
    `Number: ${number} → ${normalized.formatted} | WhatsApp id: ${normalized.formatted.slice(1)}@c.us`,
    `  format: ${parsed?.isValid() ? 'VALID' : 'INVALID'}${parsed?.country ? ` | country: ${parsed.country}` : ''}${parsed?.getType?.() ? ` | type: ${parsed.getType()}` : ''}`,
  ];
  if (client?.getNumberId && parsed?.isValid()) {
    try {
      const id = await client.getNumberId(normalized.formatted.slice(1));
      lines.push(`  WhatsApp: ${id ? 'REGISTERED' : 'NOT ON WHATSAPP'}`);
    } catch (error) {
      lines.push(`  WhatsApp check unavailable: ${error.message}`);
    }
  } else if (!client) {
    lines.push('  WhatsApp check skipped: no active WhatsApp connection.');
  }
  return lines;
}

/** Health score (0-100) for one or all connection managers, via the restored HealthScorer. */
export async function scoreLines(connectionManagers, phone = null) {
  healthScorer ||= new HealthScorer();
  const managers = [...(connectionManagers || new Map())]
    .filter(([key]) => !phone || key === phone);
  if (!managers.length) return [phone ? `No connection for ${phone}.` : 'No connections to score yet.'];
  const lines = [];
  for (const [key, manager] of managers) {
    const report = await healthScorer.calculateScore({ phoneNumber: key, metrics: manager.metrics || {} });
    const connected = manager.state === 'CONNECTED';
    const overall = connected ? report.overallScore : Math.min(report.overallScore, 39);
    const rating = connected ? report.rating : 'CRITICAL (offline)';
    lines.push(`${key}: ${overall}/100 ${rating} | trend ${report.trend?.direction || 'stable'} | ` +
      `connections ${report.metrics?.totalConnections ?? 0} | errors ${report.metrics?.totalErrors ?? 0}`);
    for (const tip of (report.recommendations || []).slice(0, 2)) lines.push(`   → ${tip.suggestion}: ${tip.action}`);
    const history = (await healthScorer.getHistory(key, 10)).map(item => item.overallScore).reverse();
    const prediction = healthScorer.predictHealthTrend(history);
    if (prediction.hasPrediction) lines.push(`   next check predicted: ${prediction.predictedNextScore}/100 (${prediction.trend})`);
  }
  if (managers.length > 1) lines.push(`System health: ${healthScorer.getSystemHealth()}/100`);
  return lines;
}

/** Pick a connected client: the requested/master phone first, otherwise any connected one. */
export function pickClient(accountClients, connectionManagers, preferredPhone) {
  const isConnected = phone => accountClients?.has(phone) && connectionManagers?.get(phone)?.state === 'CONNECTED';
  if (preferredPhone && isConnected(preferredPhone)) return { phone: preferredPhone, client: accountClients.get(preferredPhone) };
  for (const phone of accountClients?.keys?.() || []) {
    if (isConnected(phone)) return { phone, client: accountClients.get(phone) };
  }
  return null;
}

/**
 * Send one text message after the caller has confirmed it.
 * With `guard`, a recipient without an existing chat uses the new-conversation budget.
 */
export async function sendSingleMessage(client, number, message, { guard = null, account = null } = {}) {
  const normalized = normalizePhone(number);
  if (!normalized.isValid) throw new Error(`Invalid number: ${number}`);
  const digits = normalized.formatted.slice(1);
  const id = client.getNumberId ? await client.getNumberId(digits) : { _serialized: `${digits}@c.us` };
  if (!id) throw new Error(`${normalized.formatted} is not on WhatsApp.`);
  if (guard) {
    const budget = await guard.reserve({ account, client, phone: digits, source: 'terminal' });
    if (!budget.allowed) {
      const error = new Error(
        `Not sent: ${budget.reason}. ${normalized.formatted} has no chat yet; next slot ${new Date(budget.retryAt).toLocaleString('en-GB')}.`,
      );
      error.code = 'NEW_CONVERSATION_LIMIT';
      error.retryAt = budget.retryAt;
      throw error;
    }
  }
  const sent = await client.sendMessage(id._serialized, message);
  return { to: normalized.formatted, id: sent?.id?._serialized || sent?.id?.id || null };
}
