import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { acquireBotInstance } from '../../src/core/BotInstanceGuard.js';

const execute = promisify(execFile);
const moduleURL = pathToFileURL(path.resolve('src', 'core', 'BotInstanceGuard.js')).href;

test('only one process can own the same project and clean release allows a restart', async () => {
  const project = path.resolve('instance-guard-test-' + process.pid);
  const guard = await acquireBotInstance(project);
  try {
    const result = await execute(process.execPath, ['--input-type=module', '-e', `
      import { acquireBotInstance } from ${JSON.stringify(moduleURL)};
      try {
        await acquireBotInstance(${JSON.stringify(project)});
        console.log('UNEXPECTED');
      } catch(error) { console.log(error.message); }
    `]);
    expect(result.stdout).toContain('Cannot reserve bot ownership');
    expect(result.stdout).not.toContain('UNEXPECTED');
  } finally {
    await guard.release();
  }
  const next = await acquireBotInstance(project);
  await next.release();
});

test('process exit releases ownership without deleting any lock files', async () => {
  const project = path.resolve('instance-exit-test-' + process.pid);
  await execute(process.execPath, ['--input-type=module', '-e', `
    import { acquireBotInstance } from ${JSON.stringify(moduleURL)};
    await acquireBotInstance(${JSON.stringify(project)});
    process.exit(0);
  `]);
  const next = await acquireBotInstance(project);
  await next.release();
});
