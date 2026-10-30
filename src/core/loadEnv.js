/** Side-effect import: loads the env file chosen by resolveEnvFile (first import of index.js). */

import dotenv from 'dotenv';
import { resolveEnvFile } from './EnvFile.js';

const file = resolveEnvFile();
if (file) dotenv.config({ path: file, quiet: true });
