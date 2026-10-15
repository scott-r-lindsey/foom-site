# Contributing to foom-site

This repository contains a static promotional site built with Astro, React
integration, and strict TypeScript. The scaffold from issue
[#2](https://github.com/scott-r-lindsey/foom-site/issues/2) is implemented.
Use the committed package scripts and pinned tool versions as the source of truth.

## Architecture and layout

Astro renders pages to static HTML in `dist/`, with directory-style routes such
as `about/index.html`. Deployment serves that output as files; no runtime server
or hosting adapter is required. Hosting inputs and operational details belong
to [the hosting discovery document](hosting.md), owned by issue
[#9](https://github.com/scott-r-lindsey/foom-site/issues/9).

Repository layout:

| Path              | Purpose                                                    |
| ----------------- | ---------------------------------------------------------- |
| `src/pages/`      | Astro routes and page composition                          |
| `src/components/` | Astro components and interactive React islands             |
| `src/assets/`     | Source assets processed by the build                       |
| `public/`         | Files copied unchanged, for stable public paths            |
| `dist/`           | Generated static deployment output; never commit           |
| `docs/`           | Contributor and operational documentation                  |
| `inspiration/`    | Optional local, read-only reference symlinks; never commit |

Prefer Astro components for content and layout. React components can render
HTML without client hydration; add a `client:*` directive only when interaction
requires browser state or event handlers. Choose the least eager appropriate
trigger (for example, `client:visible` for an interaction below the fold), and
keep essential promotional content in rendered HTML.

Import assets from source through Astro's build pipeline so emitted assets
receive content fingerprints for cache invalidation. Files in `public/` retain
their names and are not fingerprinted; reserve them for paths that must stay
stable. Do not add manual cache-version query strings to imported assets.

Support product descriptions with specific foom source references or facts
provided by the user. Record that evidence in the PR or relevant content notes.
Do not present inferred capabilities, placeholder screenshots, or planned
features as shipped behavior. Ask for missing product facts rather than inventing
claims. Reference projects may inform implementation, but remain unchanged.

## Commands

Use Node 24.17.0 from `.nvmrc` and pnpm 11.19.0 pinned in `packageManager`.
Run `corepack enable` before the following commands; see the
[README](../README.md) for setup.

| Command                          | Result                                                |
| -------------------------------- | ----------------------------------------------------- |
| `pnpm install --frozen-lockfile` | Install exactly the committed lockfile                |
| `pnpm dev`                       | Start local development                               |
| `pnpm typecheck`                 | Check Astro and strict TypeScript types               |
| `pnpm lint`                      | Run ESLint, then check formatting with Prettier       |
| `pnpm lint:fix`                  | Format files, then apply available ESLint fixes       |
| `pnpm format:check`              | Check formatting without semantic linting             |
| `pnpm build`                     | Produce static HTML and assets in `dist/`             |
| `pnpm serve`                     | Preview an existing production build; run build first |

`pnpm test:hosting` checks offline routing and publication metadata/retention.
`pnpm hosting:manifest` describes an existing build; see
[the infrastructure guide](../terraform/README.md).

`pnpm test:artifacts` and `pnpm test:browser` validate an existing production
build; see the smoke checks below. [Actions CI](ci.md) runs these checks for every
pull request and push to main. Documentation-only edits need formatting,
link/consistency checks, and `git diff --check` locally; CI still runs the full suite.

## Smoke checks

Use the pinned Node/pnpm versions, then run these commands in this order locally
or in CI:

```sh
pnpm install --frozen-lockfile
pnpm lint
pnpm typecheck
pnpm build
pnpm test:artifacts
pnpm exec playwright install --with-deps chromium
pnpm test:browser
```

`pnpm typecheck` includes the TypeScript test files and Playwright configuration.
Node runs the artifact tests directly with its built-in TypeScript support.
Playwright needs a matching browser download and Linux system libraries; its
`install --with-deps chromium` command installs both. System library installation
may require elevated privileges. Repeat browser setup after dependency upgrades;
CI must install the browser matching the lockfile. For a local machine with
Chrome already installed, `PLAYWRIGHT_CHANNEL=chrome pnpm test:browser` is an
explicit alternative. Report that choice, since it differs from bundled Chromium.

The artifact command runs temporary fixture tests and then validates `dist/`.
It requires home and 404 output, page titles/main headings, useful 404 content
and a home link. It discovers every emitted HTML page and checks local `href`,
`src`, `poster`, `data`, and `srcset` references, nested directory routes, and
HTML fragment targets. It also checks CSS `url()` and quoted `@import` assets,
using actual emitted names rather than hardcoded fingerprints. Fixture tests
prove missing home/404 output, nested links, fragments, stylesheets, CSS assets,
responsive images, and unhelpful 404 content fail. Fixtures live in temporary
OS directories and are removed after each test.

Absolute/scheme-relative URLs (including canonical, Open Graph, external links,
and CDN assets) are not fetched or mapped to local files. This is a focused
static-site checker, not a crawler: it does not interpret JavaScript, inline CSS,
CSS escapes, or hosting rewrites. A `base` tag fails explicitly because it would
change relative URL semantics. Add expected outputs and meaningful fixtures as
routes and asset conventions expand; the required output list currently covers
the two shipped routes. Generated directories and reports remain ignored.

The browser suite starts its own production preview at `127.0.0.1:4327` (keep
that port free), and stops it afterward. `--ignore-lock` keeps Astro preview in
the foreground even in agent shells so Playwright owns its lifetime. It uses headless Chromium at 320px and
1440px widths with zero retries and no fixed sleeps. It checks both routes for
semantic landmarks, one main heading, WCAG A/AA axe findings, loading failures,
and horizontal overflow including enlarged text. Separate JavaScript-disabled
contexts exercise the first-tab skip link, visible focus, focus transfer to main,
and keyboard activation of the 404 home link. These are the real interactions
in the current shell; no React interaction is invented. Future interactive
controls need focused keyboard tests when they land.

Automated accessibility checks do not replace manual review of reading order,
focus appearance/contrast, screen reader use, or future interactive behavior.
Neither filesystem checks nor Astro preview establishes CDN behavior. In
particular, loading `/404.html` locally does not prove an unknown hosted URL
serves that document with HTTP 404. Hosted deep links, error routing/status,
headers, caching, and redirects need separate authorized hosting verification;
these commands make no cloud requests and trigger no deployments.

## Formatting, linting, and hooks

Use two spaces, with Prettier as the formatting authority. JavaScript and
TypeScript use single quotes and semicolons, matching the original scaffold.
`pnpm lint` checks the whole worktree, including unstaged changes, and exits
nonzero for ESLint errors, warnings, parse failures, or formatting differences.
`pnpm lint:fix` writes formatting and safe ESLint fixes; review its diff and fix
remaining diagnostics manually. Type errors are checked separately by
`pnpm typecheck`.

- **Astro:** `prettier-plugin-astro` formats complete components, including
  frontmatter, templates, scripts, and styles. `eslint-plugin-astro` recommended
  rules parse Astro syntax and check directives/templates; the TypeScript parser
  handles frontmatter. Core and TypeScript recommended rules also apply.
- **JS/TS/JSX/TSX:** Prettier formats these files; ESLint core recommended rules
  and TypeScript recommended rules (for TS/TSX) catch common mistakes. This is
  syntax-based linting; it does not add type-aware or React Hooks rule sets.
  Browser and Node globals are available for the site's mixed tooling/client code.
- **CSS and Markdown:** Prettier checks formatting and reports parser errors.
  There is no dedicated semantic CSS or Markdown linter. JSON and YAML
  configuration also receive formatting checks.

[Biome's language support](https://biomejs.dev/introduction/language-support/)
was assessed for issue #4: complete Astro support is still experimental and
Markdown formatting is unfinished. We use
[Astro's Prettier plugin](https://github.com/withastro/prettier-plugin-astro) and
[the Astro ESLint plugin](https://github.com/ota-meshi/eslint-plugin-astro)
to handle Astro syntax explicitly, plus Prettier's built-in Markdown support.

Both tools exclude `inspiration/` (including optional ignored reference symlinks),
dependencies, build output (`dist/`, `build/`, `out/`), Astro/Vite caches, coverage,
and test reports. Prettier also respects `.gitignore` and excludes the generated
pnpm lockfile. Keep the explicit ignore lists in `eslint.config.js` and
`.prettierignore` aligned when adding generated directories. Unsupported formats
(such as shell hooks and binary assets) are not formatting targets.

`pnpm install --frozen-lockfile` runs `prepare` (`husky`) to install the
pre-commit hook. It runs `pnpm typecheck && pnpm lint`, stops on failure, and does
not build, test in a browser, or contact deployment services. Use Node and pnpm
from setup in the shell that launches Git; no global tooling installation or
credentials are required. After manually correcting a failure, rerun the checks
and commit again.

Husky sets repository-local `core.hooksPath` to the relative `.husky/_` path.
Linked worktrees normally share that Git setting, but each resolves the path
inside its own checkout and needs its own install. Run the frozen install in each
worktree after checking out this tooling. Other branches without `.husky/` cannot
run this hook until they integrate the tooling. No global Git config is changed.
For an intentionally script-free install, `pnpm install --ignore-scripts` skips
hook setup; run `pnpm prepare` afterward to install it. `HUSKY=0` explicitly opts
out of hook installation/execution in environments that need it; it is not the
normal contributor setup.

## Issues and isolated work

Use one issue per branch and PR, with focused commits. Read the issue, root
[AGENTS.md](../AGENTS.md), and relevant docs first. Verify the assigned branch,
clean worktree, and base commit before editing. If anything differs, report it
instead of consuming or discarding unexpected work.

Use an isolated worktree outside the primary checkout, based on the assigned
committed ref. If already assigned a worktree, stay there. Parallel contributors
are optional: agree on exclusive file ownership before starting, keep each
contributor in their own worktree, and coordinate shared-file edits with the
integration owner. Never copy uncommitted changes between checkouts or overwrite
another contributor's files. Put unrelated findings in the PR as follow-ups.

Use GitHub's native **blocked by / blocking** issue relationships to record
prerequisites; body links provide context but do not replace those relationships.
Use the labels already defined in this repository, without importing a reference
project's roadmap scheme:

- If any prerequisite remains open, apply `status:blocked` and remove
  `status:ready`.
- When prerequisites close, review the native relationships, remove
  `status:blocked`, and apply `status:ready` if no blockers remain.
- Before dependent implementation begins, verify that the prerequisite changes
  are also present in the assigned base. A closed issue alone is insufficient;
  report a missing integration to the integration owner.

## Validation and handoff

For docs-only changes, validate relative links, planned-versus-implemented
statements, and `git diff --check`. For behavior changes, run the relevant
implemented checks and add tests that verify meaningful behavior. Run browser
and end-to-end tests headless. Follow the failure-handling rules in `AGENTS.md`;
record failures honestly rather than masking them with retries or delays.

After the first coherent commit and appropriate local checks, push and open a
draft PR. Push subsequent working steps after local validation. Include the issue,
scope, evidence, commands and results, commit SHA, and outstanding work. Use
`Closes #N` only when all acceptance criteria are satisfied; otherwise use
`Refs #N` and explain what remains. Separate local validation from CI run links
and results. Fix change-caused CI failures; record evidence for unrelated failures
and continue independent work. Hand off a draft if blocked rather than waiting
indefinitely. The required `Quality gate` check must be green before marking
ready; see [CI and branch protection](ci.md). Child implementers must not merge or
enable auto-merge, delete branches, or remove worktrees. An explicitly authorized
integration owner may review and merge PRs after required CI is green, including
reviewed drafts.

Keep secrets, generated output, and local files out of commits as described in
`AGENTS.md`. Use placeholders for required variables. Infrastructure and hosting
work must remain offline or explicitly mocked: no real credentials, cloud API
probes, resource mutations, or deployment workflow triggers. Detailed hosting
instructions belong to #9 rather than this guide.
