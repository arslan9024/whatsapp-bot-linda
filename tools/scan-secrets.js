#!/usr/bin/env node
/**
 * Secret scanner (Node port of archive/scripts/scan-secrets.ps1).
 *
 * Scans git-tracked and untracked-but-not-ignored text files for credentials that
 * must never be pushed. Values are masked in the output. Exit code 1 when anything
 * is found, so it can be used before `git push` or in CI.
 *
 *   npm run security:scan            # working tree
 *   npm run security:scan -- --staged  # only files staged for commit
 */

import { execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';

export const SECRET_PATTERNS = [
  ['MongoDB URI with password', /mongodb(?:\+srv)?:\/\/[^:\s/"'`]+:(?!(?:pass(?:word)?|new|old|your|<|\*|\$\{|x{3})[^@]*@)[^@\s"'`]+@/i],
  ['Password assignment', /\b[A-Z_]*PASSWORD\s*[:=]\s*["']?(?!\$\{|process\.env|<|your|change|example|\*)[^"'\s,;`]{6,}/],
  ['API key assignment', /\b(?:API_?KEY|API_?SECRET)\s*[:=]\s*["'](?!your|<|example)[A-Za-z0-9_\-]{16,}["']/i],
  ['Token assignment', /\b(?:ACCESS|AUTH|SESSION|REFRESH)_?TOKEN\s*[:=]\s*["'](?!your|<|example)[A-Za-z0-9_\-.]{20,}["']/i],
  ['Private key', /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----(?!\.\.\.)/],
  ['AWS access key id', /\bAKIA[0-9A-Z]{16}\b/],
  ['AWS secret', /aws_secret_access_key\s*[:=]\s*["']?[A-Za-z0-9/+]{40}/i],
  ['Google API key', /\bAIza[0-9A-Za-z\-_]{35}\b/],
  ['JWT', /\beyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/],
  ['Bearer token', /\bBearer\s+[A-Za-z0-9_\-.]{30,}/],
  ['GitHub token', /\bgh[pousr]_[A-Za-z0-9]{36,}\b/],
];

const TEXT_EXTENSIONS = new Set(['.js', '.mjs', '.cjs', '.ts', '.json', '.env', '.yml', '.yaml', '.xml', '.config', '.md', '.txt', '.ps1', '.sh', '.bat', '.ini', '.toml']);
const SKIP_DIRS = /(^|[\\/])(node_modules|\.git|archive|tests|coverage|dist|build|\.cache|sessions|\.wwebjs_auth|\.wwebjs_cache)([\\/]|$)/;
const MAX_BYTES = 2 * 1024 * 1024;

export function mask(text) {
  return text
    .replace(/:\/\/([^:\s]+):[^@\s]+@/g, '://$1:***@')
    .replace(/([:=]\s*["']?)(?!\*|\/\/)([^"'\s,;]{4})[^"'\s,;]+/g, '$1$2***')
    .replace(/(AIza|AKIA|eyJ|gh[pousr]_|Bearer\s+)[A-Za-z0-9_\-.+/]{6,}/g, '$1***')
    .trim()
    .slice(0, 160);
}

export function scanText(text, file = '') {
  const findings = [];
  text.split(/\r?\n/).forEach((line, index) => {
    if (line.length > 2000) return;
    for (const [name, pattern] of SECRET_PATTERNS) {
      if (pattern.test(line)) findings.push({ file, line: index + 1, type: name, preview: mask(line) });
    }
  });
  return findings;
}

function listFiles(root, staged) {
  try {
    const args = staged
      ? ['diff', '--cached', '--name-only', '--diff-filter=ACM']
      : ['ls-files', '--cached', '--others', '--exclude-standard'];
    return execFileSync('git', args, { cwd: root, encoding: 'utf8' }).split(/\r?\n/).filter(Boolean);
  } catch {
    const files = [];
    const walk = dir => {
      for (const entry of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) {
        const rel = path.join(dir, entry.name);
        if (SKIP_DIRS.test(rel)) continue;
        if (entry.isDirectory()) walk(rel);
        else files.push(rel);
      }
    };
    walk('.');
    return files;
  }
}

function isScannable(file) {
  const base = path.basename(file).toLowerCase();
  if (SKIP_DIRS.test(file) || base === 'package-lock.json' || base.endsWith('.example') || base.endsWith('.sample')) return false;
  return base.startsWith('.env') || TEXT_EXTENSIONS.has(path.extname(base));
}

export function scan(root = process.cwd(), { staged = false } = {}) {
  const findings = [];
  let scanned = 0;
  for (const file of listFiles(root, staged).filter(isScannable)) {
    const full = path.join(root, file);
    let stat;
    try { stat = fs.statSync(full); } catch { continue; }
    if (!stat.isFile() || stat.size > MAX_BYTES) continue;
    scanned++;
    findings.push(...scanText(fs.readFileSync(full, 'utf8'), file.replace(/\\/g, '/')));
  }
  return { scanned, findings };
}

const isMain = process.argv[1] && /scan-secrets\.js$/.test(process.argv[1]);
if (isMain) {
  const staged = process.argv.includes('--staged');
  const { scanned, findings } = scan(process.cwd(), { staged });
  console.log(`Secret scan: ${scanned} files${staged ? ' (staged)' : ''} | findings: ${findings.length}`);
  const byType = new Map();
  for (const finding of findings) byType.set(finding.type, (byType.get(finding.type) || 0) + 1);
  for (const [type, count] of byType) console.log(`  ${type}: ${count}`);
  findings.slice(0, 50).forEach((finding, index) => {
    console.log(`  ${index + 1}. ${finding.file}:${finding.line} [${finding.type}] ${finding.preview}`);
  });
  if (findings.length > 50) console.log(`  ...and ${findings.length - 50} more`);
  if (findings.length) {
    console.log('\nMove these values to .env (ignored by git) and rotate any credential that was ever pushed.');
    process.exitCode = 1;
  } else {
    console.log('No secrets found.');
  }
}
