/**
 * Which env file Linda loads: DOTENV_CONFIG_PATH if set, else ./.env,
 * else ./secrets/.env (the project's git-ignored settings file).
 */

import fs from 'fs';
import path from 'path';

export function resolveEnvFile(env = process.env, cwd = process.cwd(), exists = fs.existsSync) {
  if (env.DOTENV_CONFIG_PATH) return path.resolve(cwd, env.DOTENV_CONFIG_PATH);
  for (const candidate of [path.join(cwd, '.env'), path.join(cwd, 'secrets', '.env')]) {
    if (exists(candidate)) return candidate;
  }
  return null;
}
