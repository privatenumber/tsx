#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const distCli = path.resolve(__dirname, '../dist/cli.mjs');

if (!fs.existsSync(distCli)) {
  console.error(
    '[tsx] Build artifacts not found.\n' +
    'Please run `npm run build` before using the CLI in a local clone.'
  );
  process.exit(1);
}

await import(distCli);
