# Pull request quality checks

`.github/workflows/quality.yml` runs on every pull request (including forks) and
push to `main`, without path filters. `pull_request` checks GitHub's synthetic
merge commit, so it verifies the proposed integration with the base. It uses no
secrets, environments, deployment credentials, or write permissions. Fork approval
may still be required by GitHub's repository policy. Do not replace this trigger
with `pull_request_target` to execute contributor code.

Superseded runs for the same PR/ref are cancelled. Each Ubuntu 24.04 matrix job
uses `.nvmrc`, the `packageManager` pin, a pnpm store cache keyed by
`pnpm-lock.yaml`, and `pnpm install --frozen-lockfile`. It runs the gate's negative
fixtures, lint (including formatting), typecheck, build, artifact fixtures and
checks, matching Chromium installation, and headless browser tests with zero
retries. Both `development`/`https://preview.example.test` and
`production`/`https://metadata.example.test` are checked. These origins come from
[metadata verification examples](metadata.md), not public Foom domains.

## Stable checks and branch protection

The check names are `Validate (development)`, `Validate (production)`, **`Infrastructure (offline)`**, and
**`Quality gate`**. Require `Quality gate` for `main` in GitHub Settings → Rules →
Rulesets (or Branches → branch protection): require a pull request and status
checks before merging, select `Quality gate` from GitHub Actions after its first
run, and require branches to be up to date if checks must cover the latest base.
Apply the rule to the intended contributors and review any bypass policy. This
change documents setup; it does not mutate repository settings or claim that
branch protection is already enabled. Keep the gate name unique across workflows.

The final job uses `always()` and depends on the complete validation matrix and offline infrastructure job.
Only explicit `success` passes; failed, cancelled, skipped, absent, and unknown
results fail. Upload failures also fail validation. If GitHub cancels the whole
run, a cancelled gate cannot satisfy a required successful check. New required
jobs must be added to `needs` and their results passed to the gate script.

Local failure demonstration and workflow syntax validation:

```sh
bash .github/scripts/test-quality-gate.sh
actionlint .github/workflows/quality.yml
git diff --check
```

The fixture invokes the same gate script with a failed required result alongside
a successful one, plus cancelled/skipped/unknown/empty results, and asserts every
case exits nonzero. It also checks successful results pass. Install
[actionlint v1.7.12](https://github.com/rhysd/actionlint/releases/tag/v1.7.12)
locally; it is a workflow authoring tool, not a site dependency.

## Artifact contract

Only after all checks in each matrix job pass, the workflow archives that job's
existing `dist/` as `dist.tar.gz` and adds `manifest.json`. The artifact name is
`validation-only-<SITE_ENV>-<github.sha>-<run_id>-<run_attempt>`, retained 14 days.
No output is rebuilt after checks. The run summary records GitHub's immutable
artifact ID, upload digest, and URL. The manifest records:

- Schema version, `purpose: validation-only`, and `deployable: false`.
- Repository, event, actual checked-out `sourceSha`, workflow `github.sha`, PR
  head/base SHA (base null on push), run ID and attempt.
- Exact `SITE_ENV` and `SITE_ORIGIN`, Node/package-manager versions, lockfile
  SHA-256, archive filename and SHA-256.

For PR events, `sourceSha` and `github.sha` identify the synthetic merge commit,
while `headSha` identifies the contributor commit. For main pushes the source and
head identify the pushed commit. The archive checksum binds the manifest to the
checked files; the upload digest identifies the outer GitHub artifact. Retention
expiry means the artifact is unavailable, not permission to rebuild unchecked.
Artifacts from a failed or cancelled overall run are not eligible for consumption,
even if an individual matrix job uploaded before another job failed.

**Neither artifact is deployable production output**, including the production
metadata fixture: its canonical/robots/sitemap origin is a reserved `.test`
example. Nothing here publishes a site. Future issue #11 must introduce approved
environment/origin configuration into validation before producing a deployable
artifact. A deployment consumer must select a successful trusted validation run,
verify its repository/event/workflow and `Quality gate`, select the immutable
artifact ID, verify its digest and archive checksum, and match the selected
commit, environment, origin, and settings against the manifest. It must reject
`deployable: false`, mismatches, fork artifacts, and PR merge output selected as a
main commit. It must consume the exact checked archive rather than silently
rebuilding with different settings. Downloaded manifests alone are not trust
proof; validate GitHub run provenance as well.

## Action versions

Verified against upstream releases on 2026-10-15 and pinned to their commit SHAs:

- [actions/checkout v7.0.1](https://github.com/actions/checkout/releases/tag/v7.0.1)
- [pnpm/action-setup v6.1.0](https://github.com/pnpm/action-setup/releases/tag/v6.1.0)
- [actions/setup-node v7.1.0](https://github.com/actions/setup-node/releases/tag/v7.1.0)
- [actions/upload-artifact v7.0.2](https://github.com/actions/upload-artifact/releases/tag/v7.0.2)

Use hosted runners supporting these Node 24 actions. Checkout disables persisted
credentials; pnpm setup reads `packageManager`, then setup-node selects `.nvmrc`
and configures the dependency cache. Cache hits never replace frozen installs.
Review upstream support, runtime requirements, and release-to-SHA resolution when
updating these pins.

## Offline infrastructure checks

`Infrastructure (offline)` installs Terraform 1.15.9 using pinned
[hashicorp/setup-terraform v4.0.1](https://github.com/hashicorp/setup-terraform/releases/tag/v4.0.1).
It checks recursive formatting, installs the locked AWS 6.21.0 provider with
`init -backend=false -lockfile=readonly`, validates, then executes explicitly
mocked plan tests for dev/prod and default-workspace rejection. Both provider
configurations are mocked. No credentials, backend initialization, cloud API calls,
deployment jobs or write permissions are added. The Quality gate requires this
job's explicit success as well as the existing matrix; the failure fixture covers
mixed successful/failed results.

Each site matrix job also runs `pnpm test:hosting` and generates the file manifest
from its existing build with `pnpm hosting:manifest`. The helpers and tests receive
ESLint and strict TypeScript coverage. This manifest is a local metadata check;
the existing validation-only artifact/provenance contract remains unchanged and
must not be deployed. See the [publication contract](../terraform/README.md).
