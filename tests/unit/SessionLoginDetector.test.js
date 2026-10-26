import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { chooseProfile, hasSavedLogin, waitForSavedLogin } from '../../src/sessions/SessionLoginDetector.js';

describe('Saved WhatsApp login detection', () => {
  let sessionsDir;
  const createProfile = (clientId, localStorage) => {
    const dir = path.join(sessionsDir, `session-${clientId}`, 'Default', 'Local Storage', 'leveldb');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, '000003.log'), localStorage, 'latin1');
  };

  beforeAll(() => {
    sessionsDir = fs.mkdtempSync(path.join(os.tmpdir(), 'linda-sessions-'));
    createProfile('971505760056', '\u0000_https://web.whatsapp.com\u0000\u0001last-wid-md\u0000"971505760056:3@c.us"');
    createProfile('arslan-malik', '\u0000_https://web.whatsapp.com\u0000\u0001WAWebVersion\u00002.3000');
  });

  afterAll(() => fs.rmSync(sessionsDir, { recursive: true, force: true }));

  it('distinguishes a saved login from an unfinished linking profile', () => {
    expect(hasSavedLogin(sessionsDir, '+971505760056')).toBe(true);
    expect(hasSavedLogin(sessionsDir, 'arslan-malik')).toBe(false);
    expect(hasSavedLogin(sessionsDir, 'missing')).toBe(false);
  });

  it('detects a login on newer WhatsApp Web builds that hash the last-wid keys', () => {
    const key = name => `\u0000_https://web.whatsapp.com\u0000\u0001${name}\u0000x`;
    createProfile('new-build-linked', ['WANoiseInfo', 'WAWebEncKeySalt', 'Y6YE613Bc6amSMCxZ3g9cg==', 'WASyncdPrimaryAllowsAllMutations', 'WAHistorySyncRemainingPausedSeconds'].map(key).join(''));
    createProfile('new-build-unlinked', ['WANoiseInfo', 'WAWebEncKeySalt', 'WAMms4Conn'].map(key).join(''));
    expect(hasSavedLogin(sessionsDir, 'new-build-linked')).toBe(true);
    expect(hasSavedLogin(sessionsDir, 'new-build-unlinked')).toBe(false);
  });

  it('notices a login written after an earlier check', () => {
    createProfile('late-login', 'WAWebVersion');
    expect(hasSavedLogin(sessionsDir, 'late-login')).toBe(false);
    fs.appendFileSync(path.join(sessionsDir, 'session-late-login', 'Default', 'Local Storage', 'leveldb', '000003.log'), 'last-wid-md');
    expect(hasSavedLogin(sessionsDir, 'late-login')).toBe(true);
  });

  const choose = (persisted, candidates) => chooseProfile({
    persisted, candidates,
    hasArtifacts: id => fs.existsSync(path.join(sessionsDir, `session-${id}`)),
    hasLogin: id => hasSavedLogin(sessionsDir, id),
  });

  it('restores from the profile holding the login even when metadata points to an empty profile', () => {
    expect(choose('arslan-malik', ['arslan-malik', 'arslan-malik', '+971505760056'])).toBe('971505760056');
  });

  it('keeps the persisted profile while no profile holds a login', () => {
    expect(choose('arslan-malik', ['other', '+15550000001'])).toBe('arslan-malik');
    expect(choose(undefined, ['other', '+15550000001'])).toBe('other');
  });

  it('uses the normalized phone for a new account instead of creating a display-name profile', () => {
    expect(chooseProfile({
      candidates: ['new-account-name', '+15550000001'],
      fallback: '+15550000001',
      hasArtifacts: () => false,
      hasLogin: () => false,
    })).toBe('15550000001');
  });

  it('waits for the login to reach disk', async () => {
    let checks = 0;
    await expect(waitForSavedLogin(() => ++checks >= 3, { timeoutMs: 1000, intervalMs: 5 })).resolves.toBe(true);
    await expect(waitForSavedLogin(() => false, { timeoutMs: 20, intervalMs: 5 })).resolves.toBe(false);
  });
});
