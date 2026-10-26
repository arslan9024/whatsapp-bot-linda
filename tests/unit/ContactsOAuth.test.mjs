import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import {
  CONTACTS_EMAIL, CONTACTS_SCOPE, createContactsClient, saveContactsToken,
  validateContactsToken,
} from '../../src/integrations/google/api/ContactsOAuth.js';

test('validates account, offline access and write scope before saving', () => {
  const record = { email: CONTACTS_EMAIL, tokens: { refresh_token: 'test', scope: CONTACTS_SCOPE } };
  assert.doesNotThrow(() => validateContactsToken(record));
  assert.throws(() => validateContactsToken({ ...record, email: 'other@example.com' }));
  assert.throws(() => validateContactsToken({ ...record, tokens: { scope: CONTACTS_SCOPE } }));
  assert.throws(() => validateContactsToken({
    ...record, tokens: { refresh_token: 'test', scope: `${CONTACTS_SCOPE}.readonly` },
  }));
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'linda-contacts-'));
  try {
    const target = path.join(dir, 'token.json');
    saveContactsToken(record, target);
    assert.deepEqual(JSON.parse(fs.readFileSync(target, 'utf8')), record);
    const clientPath = path.join(dir, 'client.json');
    fs.writeFileSync(clientPath, JSON.stringify({ installed: { client_id: 'test-id', client_secret: 'test-secret' } }));
    const client = createContactsClient('http://127.0.0.1:1234/oauth2callback', clientPath);
    assert.equal(client._clientId, 'test-id');
    fs.writeFileSync(clientPath, JSON.stringify({ web: { client_id: 'test' } }));
    assert.throws(() => createContactsClient(undefined, clientPath));
  } finally {
    fs.rmSync(path.join(dir, 'token.json'), { force: true });
    fs.rmSync(path.join(dir, 'client.json'), { force: true });
    fs.rmdirSync(dir);
  }
});

test('loopback flow requests only Contacts/email, uses PKCE/state and rejects denial', { timeout: 15000 }, async () => {
  const child = spawn(process.execPath, ['tools/authorize-contacts.js'], {
    cwd: path.resolve(import.meta.dirname, '..', '..'), stdio: ['ignore', 'pipe', 'pipe'],
  });
  let output = '';
  let errors = '';
  child.stderr.on('data', data => { errors += data; });
  const exited = once(child, 'exit');
  try {
    const url = await new Promise((resolve, reject) => {
      child.stdout.on('data', data => {
        output += data;
        const match = output.match(/https:\/\/accounts\.google\.com\/[^\s]+/);
        if (match) resolve(new URL(match[0]));
      });
      child.once('error', reject);
      child.once('exit', () => reject(new Error('Setup exited before producing authorization URL.')));
    });
    assert.equal(url.searchParams.get('code_challenge_method'), 'S256');
    assert.ok(url.searchParams.get('code_challenge'));
    assert.equal(url.searchParams.get('login_hint'), CONTACTS_EMAIL);
    assert.deepEqual(new Set(url.searchParams.get('scope').split(' ')),
      new Set([CONTACTS_SCOPE, 'https://www.googleapis.com/auth/userinfo.email']));
    const callback = new URL(url.searchParams.get('redirect_uri'));
    assert.equal(callback.hostname, '127.0.0.1');
    const invalid = new URL(callback);
    invalid.searchParams.set('state', 'wrong');
    assert.equal((await fetch(invalid)).status, 400);
    callback.searchParams.set('state', url.searchParams.get('state'));
    const incomplete = await fetch(callback);
    assert.equal(incomplete.status, 400);
    assert.match(await incomplete.text(), /still waiting/);
    assert.equal(child.exitCode, null);
    assert.equal((await fetch(invalid)).status, 400);
    callback.searchParams.set('error', 'access_denied');
    assert.equal((await fetch(callback)).status, 400);
    assert.equal((await exited)[0], 1);
    assert.match(errors, /Consent denied/);
  } finally {
    if (child.exitCode === null) child.kill();
  }
});
