import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const moduleURL = pathToFileURL(path.resolve('src', 'linking', 'deviceStatus.js')).href;
const target = path.resolve('data', 'device-status', '15550000001.json');
const run = body => execFileSync(process.execPath, ['--input-type=module', '-e', `
  import fs from 'node:fs';
  import path from 'node:path';
  import os from 'node:os';
  import assert from 'node:assert/strict';
  import { syncBuiltinESMExports } from 'node:module';
  const { createDeviceStatusFile, getDeviceStatus, updateDeviceStatus } = await import(${JSON.stringify(moduleURL)});
  const files = new Map();
  const created = [];
  const writes = [];
  fs.existsSync = file => files.has(file);
  fs.mkdirSync = dir => created.push(dir);
  fs.writeFileSync = (file, data) => { writes.push(file); files.set(file, data); };
  fs.readFileSync = file => files.get(file);
  syncBuiltinESMExports();
  const phone = '+15550000001';
  const target = ${JSON.stringify(target)};
  ${body}
`], { encoding: 'utf8' });

describe('Device metadata does not create duplicate LocalAuth profiles', () => {
  test('plus and digits share one metadata file outside sessions', () => {
    run(`
      createDeviceStatusFile(phone);
      updateDeviceStatus(phone, {deviceLinked:true});
      assert.equal(getDeviceStatus('15550000001').deviceLinked, true);
      assert.deepEqual([...files.keys()], [target]);
      assert.ok(created.every(dir => dir === path.dirname(target)));
    `);
  });

  test('legacy metadata is preserved and updates write only the new location', () => {
    const legacy = path.resolve('sessions', 'session-+15550000001', 'device-status.json');
    run(`
      files.set(${JSON.stringify(legacy)}, JSON.stringify({number:phone, deviceLinked:true, linkedAt:'original'}));
      assert.equal(getDeviceStatus(phone).linkedAt, 'original');
      updateDeviceStatus(phone, {isActive:false});
      const saved = JSON.parse(files.get(target));
      assert.equal(saved.linkedAt, 'original');
      assert.equal(saved.deviceLinked, true);
      assert.equal(saved.isActive, false);
      assert.deepEqual(writes, [target]);
    `);
  });

  test('storage stays project-relative when launched from another directory', () => {
    run(`
      process.chdir(os.tmpdir());
      createDeviceStatusFile(phone);
      assert.deepEqual([...files.keys()], [target]);
    `);
  });
});
