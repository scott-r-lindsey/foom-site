# Site scaffold

A minimal static Astro site with React and strict TypeScript.

## Setup

Use Node.js 24.17.0 (`nvm install && nvm use` with nvm). The supported
Node range is recorded in `package.json`; `.nvmrc` pins the validated version.
Corepack selects the exact pnpm version from `packageManager`:

```sh
corepack enable
pnpm install --frozen-lockfile
```

Commit `pnpm-lock.yaml` whenever dependencies change. The install also runs `prepare` to install the Husky pre-commit hook, which runs
`pnpm typecheck` and `pnpm lint`. No environment variables
are required. Local `.env` files are ignored.

`pnpm-workspace.yaml` records pnpm's generated release-age exceptions for the
exact package versions selected during bootstrap and test-tool setup.

## Commands

| Command             | Purpose                                                               |
| ------------------- | --------------------------------------------------------------------- |
| `pnpm dev`          | Start the local development server.                                   |
| `pnpm typecheck`    | Check Astro files, TypeScript, and React TSX.                         |
| `pnpm lint`         | Check code with ESLint and formatting with Prettier.                  |
| `pnpm lint:fix`     | Format files and apply available ESLint fixes.                        |
| `pnpm format:check` | Check formatting alone.                                               |
| `pnpm build`        | Generate the static production site in `dist/`.                       |
| `pnpm serve`        | Preview an existing production build locally. Run `pnpm build` first. |

See [tooling coverage and worktree setup](docs/contributing.md#formatting-linting-and-hooks)
for checked file types, exclusions, and hook behavior.

## Smoke checks

After setup, run these in order:

```sh
pnpm lint
pnpm typecheck
pnpm build
pnpm test:artifacts
pnpm exec playwright install --with-deps chromium
pnpm test:browser
```

The browser install is needed once per machine or when Playwright changes. Linux
CI needs its matching browser and system libraries; the install command above
handles both (system package installation may need elevated privileges).
`test:browser` starts and stops Astro preview itself on `127.0.0.1:4327`; leave
that port free. It runs headless with zero retries. No deployment or credentials
are involved. To use an already installed Chrome locally, run
`PLAYWRIGHT_CHANNEL=chrome pnpm test:browser`; record that environment difference.
[Actions CI](docs/ci.md) uses the default matching Playwright Chromium and exposes
the required `Quality gate` check.

`test:artifacts` first tests the checker against temporary valid/broken fixtures,
then checks the existing `dist/`. Both test commands require a fresh production
build; neither rebuilds it. See [validation scope and limitations](docs/contributing.md#smoke-checks)
for coverage and the distinction from CDN routing/status verification.

## Layout

- `src/pages/`: file-based Astro routes.
- `src/components/`: components, including the build-time React welcome content.
- `src/assets/`: imported assets processed by Astro.
- `public/`: files copied unchanged to the output root.

Pages use directory-style output (`page/index.html`) and trailing-slash URLs.
The homepage renders React to static HTML without client hydration. No runtime
server or hosting adapter is configured.

`inspiration/` remains ignored and is read-only reference material. A linked
worktree may not contain its local symlinks.

## Contributing

Read [the contributor guide](docs/contributing.md) for architecture, commands,
validation, and issue/worktree conventions, and [AGENTS.md](AGENTS.md) for
repository instructions. Hosting requirements and outstanding inputs are recorded
in [the hosting discovery document](docs/hosting.md).

## Authorized development verification

Development is live at <https://dev.foom-term.com>.
[Production bootstrap](docs/production-bootstrap.md) has enabled publication on
push to main; production hosted verification is pending. The command below
currently supports development only.
For explicitly authorized hosted checks, build the exact deployed source with
`SITE_ENV=development SITE_ORIGIN=https://dev.foom-term.com pnpm build`, then run:

```sh
HOSTED_ORIGIN=https://dev.foom-term.com HOSTED_DIST="$PWD/dist" pnpm test:hosted
```

This separate headless, zero-retry suite makes real HTTP/browser requests. Normal
local/CI smoke checks remain offline from hosting. It compares every emitted file
byte and publication header, checks nested redirects/query preservation, errors,
TLS, development metadata, mobile/desktop layout, axe, and keyboard navigation.
For a retained baseline without fixtures, add `HOSTED_FIXTURES=absent`; both
fixture URLs must then return the custom 404. The unlinked `/verification/a/` and `/verification/b/` fixtures exist only in
development builds; artifact checks reject their presence in production.
See [deployment operations](docs/deployment.md) for live evidence and recovery.
