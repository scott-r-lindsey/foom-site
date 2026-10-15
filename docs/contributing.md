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

| Path | Purpose |
| --- | --- |
| `src/pages/` | Astro routes and page composition |
| `src/components/` | Astro components and interactive React islands |
| `src/assets/` | Source assets processed by the build |
| `public/` | Files copied unchanged, for stable public paths |
| `dist/` | Generated static deployment output; never commit |
| `docs/` | Contributor and operational documentation |
| `inspiration/` | Optional local, read-only reference symlinks; never commit |

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

| Command | Result |
| --- | --- |
| `pnpm install --frozen-lockfile` | Install exactly the committed lockfile |
| `pnpm dev` | Start local development |
| `pnpm typecheck` | Check Astro and strict TypeScript types |
| `pnpm build` | Produce static HTML and assets in `dist/` |
| `pnpm serve` | Preview an existing production build; run build first |

No lint, unit-test, browser-test, or CI command exists at this baseline. Do not
claim one ran or add tooling solely to make this guide true. Document actual
commands as their owning issues implement them. No dependency installation is
needed for documentation-only changes.

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
indefinitely. No CI exists at this baseline, so leave the PR draft for orchestrator
review with local validation; do not describe CI as passing. When CI exists,
required checks must be green before marking ready. Child implementers must not merge or enable auto-merge, delete branches, or
remove worktrees. An explicitly authorized integration owner may review and merge
PRs, including locally validated drafts while CI is not yet configured.

Keep secrets, generated output, and local files out of commits as described in
`AGENTS.md`. Use placeholders for required variables. Infrastructure and hosting
work must remain offline or explicitly mocked: no real credentials, cloud API
probes, resource mutations, or deployment workflow triggers. Detailed hosting
instructions belong to #9 rather than this guide.
