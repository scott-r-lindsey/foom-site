import { writeFile } from 'node:fs/promises';

/** Resolve shell-provided build settings, independently of Astro/Vite mode. */
export function siteSettings(env = process.env) {
  const environment = env.SITE_ENV ?? 'development';
  if (!['development', 'production'].includes(environment)) {
    throw new Error('SITE_ENV must be development or production.');
  }
  const indexable = environment === 'production';
  if (indexable && !env.SITE_ORIGIN) {
    throw new Error('Production requires SITE_ORIGIN.');
  }
  let origin;
  try {
    origin = new URL(env.SITE_ORIGIN ?? 'http://localhost:4321');
  } catch {
    throw new Error('SITE_ORIGIN must be an absolute HTTP(S) origin.');
  }
  if (
    !['http:', 'https:'].includes(origin.protocol) ||
    origin.username ||
    origin.password ||
    origin.pathname !== '/' ||
    origin.search ||
    origin.hash ||
    (indexable &&
      (origin.protocol !== 'https:' ||
        origin.hostname === 'localhost' ||
        origin.hostname.endsWith('.localhost') ||
        origin.hostname === '[::1]' ||
        origin.hostname.startsWith('127.')))
  ) {
    throw new Error(
      'SITE_ORIGIN must contain only an HTTP(S) origin; production requires HTTPS and a non-loopback host.',
    );
  }
  return { origin: origin.origin, indexable };
}

/** @param {string} value */
function escapeXml(value) {
  return value.replace(/[<>&"']/g, (character) => {
    return {
      '<': '&lt;',
      '>': '&gt;',
      '&': '&amp;',
      '"': '&quot;',
      "'": '&apos;',
    }[character];
  });
}

/** @param {string} origin @returns {import('astro').AstroIntegration} */
export function metadata(origin) {
  return {
    name: 'foom-static-metadata',
    hooks: {
      'astro:build:done': async ({ pages, dir }) => {
        const urls = pages
          .map(({ pathname }) => `/${pathname.replace(/^\/+|\/+$/g, '')}`)
          .filter((path) => path !== '/404' && path !== '/404.html')
          .map(
            (path) => new URL(path === '/' ? path : `${path}/`, origin).href,
          );
        const entries = [...new Set(urls)]
          .sort()
          .map((url) => `  <url><loc>${escapeXml(url)}</loc></url>`);
        await writeFile(
          new URL('sitemap.xml', dir),
          `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.join('\n')}\n</urlset>\n`,
        );
      },
    },
  };
}
