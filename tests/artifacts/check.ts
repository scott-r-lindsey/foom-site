import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { load } from 'cheerio';

const origin = 'https://artifact.invalid';

async function filesIn(directory: string, prefix = ''): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  return (
    await Promise.all(
      entries.map(async (entry) => {
        const name = path.posix.join(prefix, entry.name);
        return entry.isDirectory()
          ? filesIn(path.join(directory, entry.name), name)
          : [name];
      }),
    )
  ).flat();
}

/** Offline validation only: no requests, hosting rewrites, or status assertions. */
export async function checkArtifacts(directory: string): Promise<string[]> {
  const errors: string[] = [];
  let files: Set<string>;
  try {
    files = new Set(await filesIn(directory));
  } catch {
    return [`Missing build directory: ${directory}; run pnpm build first`];
  }
  for (const required of ['index.html', '404.html']) {
    if (!files.has(required))
      errors.push(`Missing required output: ${required}`);
  }
  const html = new Map<string, ReturnType<typeof load>>();
  for (const file of files) {
    if (file.endsWith('.html')) {
      const $ = load(await readFile(path.join(directory, file), 'utf8'));
      html.set(file, $);
      if (!$('title').text().trim() || !$('main h1').text().trim()) {
        errors.push(`${file}: missing page title or main heading`);
      }
    }
  }
  const notFound = html.get('404.html');
  if (notFound) {
    if (
      !/not found|404/i.test(notFound('title').text()) ||
      !/not found|404/i.test(notFound('main').text()) ||
      !notFound('main a[href="/"]').text().trim()
    ) {
      errors.push(
        '404.html: expected useful not-found content and a home link in main',
      );
    }
  }

  function checkReference(from: string, reference: string) {
    reference = reference.trim();
    // Absolute URLs (including canonical/OG/CDN URLs) are external, never filesystem paths.
    if (/^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(reference)) return;
    try {
      const route = from.endsWith('/index.html')
        ? from.slice(0, -10)
        : from === 'index.html'
          ? ''
          : from;
      const url = new URL(reference, `${origin}/${route}`);
      const name = decodeURIComponent(url.pathname).replace(/^\/+/, '');
      if (
        name.split('/').includes('..') ||
        name.includes('\\') ||
        name.includes('\0')
      ) {
        throw new Error('unsafe path');
      }
      const target = [
        name,
        `${name.replace(/\/$/, '')}/index.html`,
        name === '' ? 'index.html' : '',
      ].find((candidate) => files.has(candidate));
      if (!target) {
        errors.push(`${from}: missing local target ${reference}`);
      } else if (url.hash && html.has(target)) {
        const fragment = decodeURIComponent(url.hash.slice(1));
        const $ = html.get(target)!;
        if (
          fragment &&
          !$('[id], a[name]')
            .toArray()
            .some(
              (element) =>
                $(element).attr('id') === fragment ||
                $(element).attr('name') === fragment,
            )
        ) {
          errors.push(`${from}: missing fragment ${reference}`);
        }
      }
    } catch {
      errors.push(`${from}: invalid local URL ${reference}`);
    }
  }

  for (const [file, $] of html) {
    // A base tag changes URL semantics; fail explicitly rather than silently checking wrong paths.
    if ($('base').length)
      errors.push(`${file}: base URLs are unsupported by this checker`);
    $('[href], [src], [poster], [data]').each((_, element) => {
      for (const attribute of ['href', 'src', 'poster', 'data']) {
        const reference = $(element).attr(attribute);
        if (reference !== undefined) checkReference(file, reference);
      }
    });
    $('[srcset]').each((_, element) => {
      const value = $(element).attr('srcset')!;
      // Read URL tokens before descriptors; data URLs may contain commas.
      let rest = value;
      while (rest.trim()) {
        rest = rest.replace(/^[\s,]+/, '');
        const token = /^[^\s]+/.exec(rest)?.[0];
        if (!token) break;
        checkReference(file, token.replace(/,+$/, ''));
        rest = rest.slice(token.length);
        if (!token.endsWith(',')) rest = rest.replace(/^[^,]*(?:,|$)/, '');
      }
    });
  }
  for (const file of files) {
    if (!file.endsWith('.css')) continue;
    const css = (await readFile(path.join(directory, file), 'utf8')).replace(
      /\/\*[\s\S]*?\*\//g,
      '',
    );
    for (const match of css.matchAll(
      /url\(\s*['"]?([^'"\s)]+)['"]?\s*\)|@import\s+['"]([^'"]+)['"]/g,
    )) {
      checkReference(file, match[1] ?? match[2]!);
    }
  }
  return errors;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const directory = path.resolve(process.argv[2] ?? 'dist');
  const errors = await checkArtifacts(directory);
  const { existsSync } = await import('node:fs');
  for (const page of ['a', 'b']) {
    const emitted = existsSync(
      path.join(directory, 'verification', page, 'index.html'),
    );
    if (emitted !== (process.env.SITE_ENV !== 'production')) {
      errors.push(
        `verification/${page}: development-only route emission mismatch`,
      );
    }
  }
  if (errors.length) {
    console.error(errors.join('\n'));
    process.exitCode = 1;
  } else {
    console.log(
      'Static artifact checks passed. CDN routing/status are not verified.',
    );
  }
}
