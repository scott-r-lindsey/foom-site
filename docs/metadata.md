# Static metadata and indexing

`SiteLayout.astro` renders a page-specific title and description, canonical URL,
Open Graph website metadata, Twitter summary metadata, and robots directive.
Pass `title` and `description` for each page. Titles other than `foom` receive
` | foom`. No social image or account handle is supplied: approved brand assets
and social accounts are still unknown. `src/assets/favicon.svg` is an explicitly
provisional terminal-prompt icon, not a final brand mark. Astro imports it into
the build with a content fingerprint.

## Build environment contract

Set these variables in the shell/process that invokes Astro. The configuration
reads `process.env`; `.env` files are not part of this contract. Do not commit
environment files. These are build inputs, not runtime settings: changing them
requires a new build and validation of that exact artifact.

| Variable      | Default                 | Contract                                                                                                                   |
| ------------- | ----------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `SITE_ENV`    | `development`           | Exactly `development` or `production`; other values fail configuration. Controls indexing independently of Vite/Node mode. |
| `SITE_ORIGIN` | `http://localhost:4321` | Absolute HTTP(S) origin only, with optional final `/`; no credentials, path, query, or fragment. Required for production.  |

Production additionally requires HTTPS and rejects localhost/loopback origins.
This validation checks URL structure; it does not confirm DNS, ownership, or
deployment. No final Foom domain has been selected. `NODE_ENV=production`,
`astro build`, or `--mode production` alone does **not** enable indexing.

Local build (no origin needed, noindex):

```sh
pnpm build
```

Development artifact with an explicit example origin:

```sh
SITE_ENV=development SITE_ORIGIN=https://preview.example.test pnpm build
```

Production artifact with an explicit example origin:

```sh
SITE_ENV=production SITE_ORIGIN=https://metadata.example.test pnpm build
```

The `.test` origins above are verification examples, not deployment settings.
Deployment must supply the approved environment origin and explicit `SITE_ENV`.
Development artifacts render `noindex, nofollow` on every page and a
`robots.txt` that disallows all crawling, without advertising a sitemap.
Production renders `index, follow` on ordinary pages and permits crawling with
an absolute sitemap reference in `robots.txt`. These signals discourage
indexing; they do not make a preview private or enforce access control. Crawlers
blocked by robots may not see the HTML noindex directive.

## Routes and error pages

The local Astro integration in `metadata.mjs` writes `dist/sitemap.xml` from
Astro's generated HTML page paths at `astro:build:done`. Adding a static page or
prerendered dynamic route automatically adds its generated paths. Endpoints
(including `robots.txt`) are not HTML pages and do not enter that list. There
is no manually duplicated page inventory or additional dependency. The sitemap
is generated for development builds too, but development robots do not list it.

Ordinary canonical and sitemap paths use a final slash, matching
`trailingSlash: 'always'` and directory build format. The root stays `/`.
The 404 is an intentional exception: Astro emits `404.html`; its layout uses
`canonicalPath="/404.html"` and `noindex` in every environment, and the integration
excludes `/404` and `/404.html` from the sitemap. If future pages need `noindex`,
extend sitemap exclusion alongside the page metadata. Canonicals use the
configured origin rather than a request host. Hosting must preserve directory
redirects and actual error HTTP status; see [hosting discovery](hosting.md).

## Verification

Run `pnpm lint`, `pnpm typecheck`, and `pnpm build`, then repeat the explicit
production and development builds above. Inspect the actual `dist/index.html`,
`dist/404.html`, `dist/robots.txt`, and `dist/sitemap.xml` after each build:

- Titles/descriptions are unique, social metadata matches each page, and
  canonical/OG URLs use the selected example origin.
- Ordinary URLs end in `/`; 404 uses `/404.html`, is always noindex, and never
  appears in the sitemap. Robots references the sitemap only in production.
- The favicon link resolves to a generated SVG asset; no client scripts or
  hydration are introduced by metadata.
- A temporary nested page should enter the sitemap with the same canonical
  slash policy, without editing the integration. Remove the fixture afterward.

Also verify that `SITE_ENV=production pnpm build` without `SITE_ORIGIN` fails,
and reject invalid environment names, malformed origins, non-HTTP(S) schemes,
credentialed origins, origins with paths/query/fragment, and HTTP/loopback
production origins. A default build must succeed with localhost and noindex.
Run any browser checks headless. Rebuild with the intended settings after
verification; never commit `dist/` or example-origin output. Final domain and
HTTP routing verification belongs to deployment, not this local build check.
