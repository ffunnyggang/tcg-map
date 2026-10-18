import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const sourcePath = path.resolve(here, '../components/FunyWebView.tsx');
const source = fs.readFileSync(sourcePath, 'utf8');
const names = ['APP_SHELL_BEFORE', 'APP_SHELL_AFTER', 'SHEET_SAME_WINDOW_BRIDGE'];

let failed = false;
for (const name of names) {
  const pattern = new RegExp(`const\\s+${name}\\s*=\\s*String\\.raw\\x60([\\s\\S]*?)\\x60;`);
  const match = source.match(pattern);
  if (!match) {
    console.error(`FAIL ${name}: String.raw template not found`);
    failed = true;
    continue;
  }
  const body = match[1];
  if (body.includes('${')) {
    console.error(`FAIL ${name}: unexpected template interpolation`);
    failed = true;
    continue;
  }
  try {
    // Parsing only. The browser globals referenced by the bridge are not executed.
    new Function(body);
    console.log(`PASS ${name}: ${body.length} characters`);
  } catch (error) {
    console.error(`FAIL ${name}: ${error instanceof Error ? error.message : String(error)}`);
    failed = true;
  }
}

if (failed) process.exit(1);
