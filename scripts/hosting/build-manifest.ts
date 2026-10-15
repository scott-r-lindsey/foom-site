import { mkdir, writeFile } from 'node:fs/promises';
import { manifest } from './manifest.ts';

await mkdir('.cache/hosting', { recursive: true });
await writeFile(
  '.cache/hosting/files.json',
  JSON.stringify(await manifest('dist'), null, 2) + '\n',
);
