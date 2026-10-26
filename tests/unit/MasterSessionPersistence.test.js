import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

describe('Real ESM session profile resolution', () => {
  test('session and cache paths remain project-relative when launched from another directory', () => {
    const url = pathToFileURL(path.resolve('code', 'utils', 'SessionManager.js')).href;
    const result = execFileSync(process.execPath, ['--input-type=module', '-e', `
      import os from 'node:os';
      process.chdir(os.tmpdir());
      const { SESSIONS_DIR, WEB_CACHE_DIR } = await import(${JSON.stringify(url)});
      console.log('RESULT:' + JSON.stringify([SESSIONS_DIR, WEB_CACHE_DIR]));
    `], { encoding: 'utf8' });
    expect(JSON.parse(result.split('RESULT:')[1].trim())).toEqual([
      path.resolve('sessions'), path.resolve('.wwebjs_cache'),
    ]);
  });

  test('preserves persisted client ID, discovers configured sessionPath and falls back to phone without exposing authentication data', () => {
    const url = pathToFileURL(path.resolve('code', 'utils', 'SessionManager.js')).href;
    const result = execFileSync(process.execPath, ['--input-type=module', '-e', `
      import { SessionManager } from ${JSON.stringify(url)};
      const existing = new Set(['actual-profile', 'phone-profile', '15550000001']);
      SessionManager.hasSessionArtifacts = id => existing.has(id);
      const resolved = [
        SessionManager.resolveClientId('+15550000001', {clientId: 'actual-profile'}, {id: 'configured'}),
        SessionManager.resolveClientId('+15550000001', {}, {id: 'other-id', sessionPath: 'sessions/session-phone-profile'}),
        SessionManager.resolveClientId('+15550000001', {}, {id: 'other-id', sessionPath: 'sessions\\\\session-phone-profile'}),
        SessionManager.resolveClientId('+15550000001', {}, {id: 'missing'}),
        SessionManager.resolveClientId('+15550000001', {clientId: 'missing-persisted'}, {id: 'phone-profile'}),
      ];
      console.log('RESULT:' + JSON.stringify(resolved));
    `], { encoding: 'utf8' });
    expect(JSON.parse(result.split('RESULT:')[1].trim())).toEqual([
      'actual-profile', 'phone-profile', 'phone-profile', '15550000001', 'missing-persisted',
    ]);
  });
});
