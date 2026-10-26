import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

const uri = process.env.MONGODB_URI || process.env.DATABASE_URL;
if (!uri || uri.includes('yourhost')) {
  throw new Error('Set MONGODB_URI or DATABASE_URL before verifying a backup.');
}
if (!process.argv[2]) {
  throw new Error('Usage: npm run db:backup:verify -- <backup-timestamp-directory>');
}

const parsedUri = new URL(uri);
const sourceDatabase = decodeURIComponent(parsedUri.pathname.replace(/^\/+/, '').split('/')[0] || '');
if (!sourceDatabase) throw new Error('The MongoDB URI must include a source database name.');

const backupRoot = path.resolve(process.argv[2]);
const sourceDump = path.join(backupRoot, sourceDatabase);
const sourceStats = await fs.stat(sourceDump).catch(() => null);
if (!sourceStats?.isDirectory()) {
  throw new Error(`Backup folder must contain a mongodump directory named "${sourceDatabase}".`);
}

const verificationDatabase = `linda_restore_check_${randomUUID().replaceAll('-', '').slice(0, 16)}`;
if (verificationDatabase === sourceDatabase) throw new Error('Refusing to restore into the source database.');

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    child.stdout.setEncoding('utf8').on('data', (chunk) => { stdout += chunk; });
    child.stderr.setEncoding('utf8').on('data', (chunk) => { stderr += chunk; });
    child.once('error', reject);
    child.once('close', (code) => {
      if (code === 0) resolve(stdout.trim());
      else reject(new Error(`${command} exited with code ${code}: ${stderr.replaceAll(uri, '[REDACTED]').trim()}`));
    });
  });
}

let restoreSucceeded = false;
try {
  await run('mongorestore', [
    '--uri', uri,
    '--nsFrom', `${sourceDatabase}.*`,
    '--nsTo', `${verificationDatabase}.*`,
    '--drop',
    sourceDump,
  ]);
  const stats = await run('mongosh', [
    uri,
    '--quiet',
    '--eval',
    `JSON.stringify(db.getSiblingDB(${JSON.stringify(verificationDatabase)}).stats())`,
  ]);
  const parsedStats = JSON.parse(stats);
  if (parsedStats.ok !== 1 || parsedStats.collections < 1) {
    throw new Error('Restored database did not contain any collections.');
  }
  restoreSucceeded = true;
  console.log(`Backup restore verification passed (${parsedStats.collections} collections).`);
} finally {
  await run('mongosh', [
    uri,
    '--quiet',
    '--eval',
    `db.getSiblingDB(${JSON.stringify(verificationDatabase)}).dropDatabase()`,
  ]);
}

if (!restoreSucceeded) throw new Error('Backup restore verification failed.');
