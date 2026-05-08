#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

function countDirs(dir) {
  if (!fs.existsSync(dir)) return 0;
  return fs.readdirSync(dir, { withFileTypes: true }).filter((d) => d.isDirectory()).length;
}

function countFiles(dir) {
  if (!fs.existsSync(dir)) return 0;
  return fs.readdirSync(dir, { withFileTypes: true }).filter((d) => d.isFile()).length;
}

function main() {
  const root = process.cwd();
  const sessionsDir = path.join(root, 'sessions');
  const logsDir = path.join(root, 'logs');

  const mem = process.memoryUsage();
  const heapMB = Math.round(mem.heapUsed / 1024 / 1024);
  const rssMB = Math.round(mem.rss / 1024 / 1024);

  const sessionsCount = countDirs(sessionsDir);
  const logsCount = countFiles(logsDir);

  console.log('\n╔══════════════════════════════════════════════════╗');
  console.log('║      WhatsApp Bot Linda — Runtime Status         ║');
  console.log('╚══════════════════════════════════════════════════╝\n');

  console.log(`Node.js:      ${process.version}`);
  console.log(`Platform:     ${process.platform}`);
  console.log(`Environment:  ${process.env.NODE_ENV || 'development'}`);
  console.log(`Heap / RSS:   ${heapMB} MB / ${rssMB} MB`);
  console.log(`Sessions dir: ${fs.existsSync(sessionsDir) ? 'present' : 'missing'} (${sessionsCount} account folder(s))`);
  console.log(`Logs dir:     ${fs.existsSync(logsDir) ? 'present' : 'missing'} (${logsCount} file(s))`);

  console.log('\n✅ Status check completed.\n');
}

main();
