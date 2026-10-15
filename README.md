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
exact Astro package versions selected during bootstrap.

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
