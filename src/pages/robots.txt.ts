import type { APIRoute } from 'astro';

export const GET: APIRoute = ({ site }) => {
  const policy =
    import.meta.env.SITE_INDEXABLE === 'true'
      ? `User-agent: *\nAllow: /\nSitemap: ${new URL('sitemap.xml', site).href}\n`
      : 'User-agent: *\nDisallow: /\n';
  return new Response(policy, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
