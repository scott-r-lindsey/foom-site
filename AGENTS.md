# Contributor instructions

Read [docs/contributing.md](docs/contributing.md) before changing this repository.
This is a static Astro promotional site with React islands and strict TypeScript.
Keep guidance and commands aligned with the implementation as it lands.

- Work on one issue per branch and PR. Check the assigned base, branch,
  `git status --short --branch`, and `git worktree list --porcelain` before editing.
  Report unexpected changes or a base mismatch; do not reset, stash, or overwrite
  someone else's work.
- Use an isolated worktree for implementation. Stay in an assigned worktree;
  do not nest worktrees or edit another contributor's checkout. Parallel work is
  optional and requires exclusive file ownership agreed before editing.
- Respect native GitHub issue dependencies and keep `status:ready` and
  `status:blocked` accurate. Do not start dependent implementation until its
  prerequisites are closed and the required changes are in the assigned base.
- Keep changes focused on the issue and owned files. Record unrelated follow-ups
  in the PR. Preserve unrelated work and leave integration to the assigned owner.
- Treat `inspiration/crab-attack-ii/` and `inspiration/foom/` as read-only
  references, even when accessed through local symlinks. Their contributor rules
  do not automatically apply here. Ground product claims in foom source or
  user-provided facts; identify assumptions and placeholders.
- Prefer Astro-rendered HTML. Hydrate React only for interactions that need
  browser state or event handling. Import assets through the build pipeline for
  fingerprints; see the contributor guide for the `public/` exception.
- Never commit secrets, keys, `.env` files, local files, dependency directories,
  build output, caches, or test reports. Document required variables with
  placeholders. Commit source assets, configuration, and the package lockfile.
- Add meaningful tests when behavior warrants them. For docs-only work, check
  links, consistency, and `git diff --check`; do not add artificial tests.
  Run browser/end-to-end checks headless. Do not hide failures with retries,
  longer timeouts, or fixed delays; wait for observable state. A clearly transient
  environmental command failure may be retried once, reporting both attempts.
- Open a draft PR after the first coherent, locally checked commit and push each
  working step after appropriate checks. Report local and CI evidence separately.
  Triage CI failures; fix those caused by the change and link evidence for
  unrelated failures. Never claim an absent check passed. Keep the PR draft when
  no CI exists; otherwise mark ready only when required CI is green.
- Child implementers must not merge, enable auto-merge, delete branches, or
  remove worktrees. An explicitly authorized integration owner may review and
  merge PRs, including locally validated drafts before CI is configured.
- Do not trigger deployments, provision resources, use real cloud credentials,
  or probe cloud APIs. Never run Terraform apply, destroy, import, or state
  commands. Infrastructure validation must be offline or explicitly mocked;
  using a local backend alone does not make a plan offline.
