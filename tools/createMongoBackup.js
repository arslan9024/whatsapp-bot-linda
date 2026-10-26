import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';

const uri = process.env.MONGODB_URI || process.env.DATABASE_URL;
if (!uri || uri.includes('yourhost')) {
  throw new Error('Set MONGODB_URI or DATABASE_URL before creating a backup.');
}

const targetRoot = path.resolve(process.argv[2] || path.join(process.cwd(), 'backups', 'mongo'));
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const backupPath = path.join(targetRoot, timestamp);
await fs.mkdir(targetRoot, { recursive: true });

await new Promise((resolve, reject) => {
  const child = spawn('mongodump', ['--uri', uri, '--out', backupPath], { stdio: ['ignore', 'ignore', 'pipe'] });
  let stderr = '';
  child.stderr.setEncoding('utf8');
  child.stderr.on('data', (chunk) => { stderr += chunk; });
  child.once('error', reject);
  child.once('close', (code) => {
    if (code === 0) resolve();
    else reject(new Error(`mongodump exited with code ${code}: ${stderr.replaceAll(uri, '[REDACTED]').trim()}`));
  });
});

console.log(`MongoDB backup created at ${backupPath}`);
