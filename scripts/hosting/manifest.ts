import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import { extname, join } from 'node:path';

export const retentionMs = 30 * 24 * 60 * 60 * 1000;
export const fresh = 'public, max-age=0, must-revalidate';
export const immutable = 'public, max-age=31536000, immutable';
const types: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.pdf': 'application/pdf',
  '.map': 'application/json',
};
export interface FileEntry {
  key: string;
  bytes: number;
  sha256: string;
  checksumSHA256: string;
  contentType: string;
  cacheControl: string;
  phase: 'assets' | 'documents';
}
export interface Manifest {
  schemaVersion: 1;
  files: FileEntry[];
}
export async function manifest(directory: string): Promise<Manifest> {
  const files: FileEntry[] = [];
  async function walk(prefix: string) {
    for (const entry of await readdir(join(directory, prefix), {
      withFileTypes: true,
    })) {
      // Astro copies the repository's empty-directory marker from public/.
      if (entry.name === '.gitkeep' && entry.isFile()) continue;
      const key = prefix + entry.name;
      if (!/^[A-Za-z0-9_./-]+$/.test(key) || entry.name.startsWith('.')) {
        throw new Error(`Unsupported object key: ${key}`);
      }
      if (entry.isDirectory()) await walk(key + '/');
      else if (entry.isFile()) {
        const contentType = types[extname(key).toLowerCase()];
        if (!contentType) throw new Error(`Unknown MIME type: ${key}`);
        const data = await readFile(join(directory, key));
        const digest = createHash('sha256').update(data).digest();
        const sha256 = digest.toString('hex');
        // A directory, extension or hash-looking token is not proof. Conservative
        // fallback for Astro/Vite's opaque build hashes: revalidate those assets.
        const proven =
          key.startsWith('_astro/') &&
          key.split('/').pop()!.includes(`.${sha256}.`);
        const document = /\.(?:html|txt|xml|json|webmanifest)$/i.test(key);
        files.push({
          key,
          bytes: data.length,
          sha256,
          checksumSHA256: digest.toString('base64'),
          contentType,
          cacheControl: proven && !document ? immutable : fresh,
          phase: document ? 'documents' : 'assets',
        });
      } else throw new Error(`Non-regular file: ${key}`);
    }
  }
  await walk('');
  if (
    !files.some((file) => file.key === 'index.html') ||
    !files.some((file) => file.key === '404.html')
  ) {
    throw new Error('index.html and 404.html are required');
  }
  return {
    schemaVersion: 1,
    files: files.sort((a, b) => a.key.localeCompare(b.key)),
  };
}

// This is an offline upload contract; #11 supplies the AWS transport and durable
// release ledger under the environment lock. Re-uploading all files is deliberate.
export function publication(
  next: Manifest,
  previous: Manifest = { schemaVersion: 1, files: [] },
) {
  const old = new Map(previous.files.map((file) => [file.key, file]));
  for (const file of next.files) {
    const prior = old.get(file.key);
    if (prior?.cacheControl === immutable && prior.sha256 !== file.sha256) {
      throw new Error(`Immutable object changed: ${file.key}`);
    }
  }
  const current = new Set(next.files.map((file) => file.key));
  return {
    uploadAssets: next.files.filter((file) => file.phase === 'assets'),
    uploadDocuments: next.files.filter((file) => file.phase === 'documents'),
    removeDocuments: previous.files
      .filter((file) => file.phase === 'documents' && !current.has(file.key))
      .map((file) => file.key),
    retainAssets: previous.files
      .filter((file) => file.phase === 'assets' && !current.has(file.key))
      .map((file) => file.key),
    // Covers canonical, explicit index, rewritten and removed routes, stable files
    // and cached errors. Small site: one wildcard is safer than a route inventory.
    invalidate: ['/*'],
    minimumRetentionMs: retentionMs,
  };
}
export interface RetiredAsset {
  key: string;
  supersededAt: number;
}
export function cleanupCandidates(
  retired: RetiredAsset[],
  protectedKeys: Set<string>,
  now: number,
): string[] {
  if (!Number.isFinite(now)) throw new Error('Invalid cleanup time');
  // A reintroduced asset can have multiple ledger entries. The latest
  // supersession controls eligibility; any uncertain entry blocks deletion.
  const latest = new Map<string, number>();
  for (const asset of retired) {
    const time = Number.isFinite(asset.supersededAt)
      ? asset.supersededAt
      : Infinity;
    latest.set(asset.key, Math.max(latest.get(asset.key) ?? -Infinity, time));
  }
  return [...latest]
    .filter(
      ([key, time]) => time <= now - retentionMs && !protectedKeys.has(key),
    )
    .map(([key]) => key);
}
