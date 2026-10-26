import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const moduleURL = pathToFileURL(path.resolve('src', 'sessions', 'SessionStateManager.js')).href;
const run = body => execFileSync(process.execPath, ['--input-type=module', '-e', `
  import fs from 'node:fs';
  import os from 'node:os';
  import path from 'node:path';
  import assert from 'node:assert/strict';
  import { syncBuiltinESMExports } from 'node:module';
  import SessionStateManager from ${JSON.stringify(moduleURL)};
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'linda-state-test-'));
  const file = path.join(directory, 'session-state.json');
  const manager = new SessionStateManager(() => {});
  manager.stateFilePath = file;
  try { ${body} } finally { fs.rmSync(directory, {recursive: true, force: true}); }
`], { encoding: 'utf8' });

test('metadata saves atomically and leaves no temporary file after successful saves', () => {
  run(`
    await manager.loadState();
    assert.equal(await manager.saveDeviceMetadata('+15550000001', {clientId:'actual',status:'linked'}), true);
    assert.equal(JSON.parse(fs.readFileSync(file)).accounts['+15550000001'].clientId, 'actual');
    assert.deepEqual(fs.readdirSync(directory), ['session-state.json']);
  `);
});

test.each(['{not-json', '{"accounts":[]}', '{"accounts":{"phone":null}}'])(
  'unreadable metadata is preserved and cannot be overwritten: %s', value => {
    run(`
      const original = ${JSON.stringify(value)};
      fs.writeFileSync(file, original);
      await assert.rejects(manager.loadState(), /original file preserved/);
      assert.equal(await manager.saveState(), false);
      assert.equal(fs.readFileSync(file, 'utf8'), original);
    `);
  }
);

test('failed replacement preserves the old metadata and removes only its own temporary file', () => {
  run(`
    await manager.loadState();
    const original = fs.readFileSync(file, 'utf8');
    const rename = fs.renameSync;
    fs.renameSync = () => { throw new Error('Disk replacement failed'); };
    syncBuiltinESMExports();
    try { assert.equal(await manager.saveDeviceMetadata('new', {status:'offline'}), false); }
    finally { fs.renameSync = rename; syncBuiltinESMExports(); }
    assert.equal(fs.readFileSync(file, 'utf8'), original);
    assert.deepEqual(fs.readdirSync(directory), ['session-state.json']);
  `);
});

test('an existing temporary file is not removed when exclusive creation fails', () => {
  run(`
    await manager.loadState();
    const temporary = file + '.' + process.pid + '.tmp';
    fs.writeFileSync(temporary, 'pre-existing');
    assert.equal(await manager.saveState(), false);
    assert.equal(fs.readFileSync(temporary, 'utf8'), 'pre-existing');
  `);
});
