# Validated deployment preparation

Refs [#11](https://github.com/scott-r-lindsey/foom-site/issues/11). This is an
**offline implementation, disabled by default**. No cloud resources, credentials,
repository variables, or deployments have been created or verified. Successful
live dev publication remains an open acceptance criterion; #12 remains blocked.
Merging this change alone cannot publish. Scott must separately authorize cloud
access/bootstrap and the first dev run before enabling anything below.

## Trust and gate

Quality validates four builds: the existing two reserved `.test` fixtures and
both approved real origins from [hosting.md](hosting.md). Each runs lint,
typecheck, hosting/artifact fixtures, build checks and headless browser checks.
The `Quality gate` requires the entire matrix and mocked infrastructure checks.
Only real-origin artifacts have `purpose: deployment`, `deployable: true` and the
#10 `files.json`. The checked output is archived without rebuilding.

The dependent job calls the local `.github/workflows/publish.yml` reusable
workflow so the initial preparation PR can run quality checks before the file
exists on main. Its credential-bearing job checks out **main**, not the candidate,
with persisted Git credentials disabled,
installs no project dependencies, and executes only trusted main Python/Node
standard-library tools. Downloaded output is data, never executable code.
Before OIDC, main tools also compare both workflow definitions at the selected
source with main; workflow-editing PRs require integration before publication.
The local reusable definition is a reviewed code contract, not protection against
a malicious same-repository writer replacing credential steps. There is no `pull_request_target`, privileged `workflow_run`, fork credential
path, PR Terraform execution, or GitHub Environment subject substitution.
Same-repository writers remain trusted with dev privileges as described in
hosting discovery; a malicious writer can modify a PR workflow to request its
own PR-subject token. IAM must limit that token to dev. This implementation does
not claim to turn same-repository writers into an untrusted security boundary.

Before requesting an OIDC token the publisher checks the run's workflow path,
repository/event/attempt, successful `Quality gate`, immutable artifact ID and
GitHub SHA-256 ZIP digest, archive SHA-256, manifest schema/settings/toolchain,
source lockfile digest and head/base/source identity. ZIP and tar limits are
50 MiB compressed/100 MiB expanded and 10,000 tar entries. Unexpected ZIP files,
duplicates, unsafe paths, links, special files and `_releases/` collisions fail.
The trusted #10 helper recomputes every file's bytes, checksum, MIME and cache
metadata before upload. Validation-only output is rejected.

Shared dev requires an open same-repository PR into main, current head and current
main base and matching merge SHA. Prod requires latest main. The publisher scans
newer runs for a passing gate and eligible source, ordering by **original
created_at, then numeric run ID**. Reruns keep their position. It repeats source
and ordering checks immediately before mutation and compares the durable current
release identity, rejecting older/equal runs. New validations that finish after
publication starts replace it on a later serialized run. Failed validation never
reaches the caller's dependent deployment job; the trusted publisher also refuses
a failed, missing, skipped or cancelled gate.

All quality runs are non-cancelling because a run can include publication. All
publication, future applies and recovery use `foom-release-dev` or
`foom-release-prod` with `cancel-in-progress: false`. GitHub can replace pending
jobs; freshness checks, rather than queue order, decide eligibility. Do not
manually cancel an active mutation. Backend locking also remains required.

## Bootstrap and enablement (operator action, not executed)

Read [hosting ownership and exact immutable subjects](hosting.md#oidc-trust-and-least-privilege)
and [bootstrap templates](../terraform/bootstrap/README.md). The shared backend,
zone and OIDC provider stay externally owned. Confirm their existence, security,
recovery and authorization separately. Do not broaden trust to make a failure go
away. Roles are the confirmed dev/prod ARNs, hardcoded in the trusted publisher;
legacy role ARN variables are unnecessary. Region is fixed at `us-west-2`.

After separately authorized bootstrap, record the environment's approved
CloudFront output as `DEV_DISTRIBUTION_ID` / `PROD_DISTRIBUTION_ID`. These are
non-secret identifiers. Enable **only** `DEV_DEPLOY_ENABLED=true` after review;
leave `PROD_DEPLOY_ENABLED` absent until authorized dev checks and #12 pass.
Absent/other values disable the respective job. Never use cloud keys or `.env`.
Repository variables may be changed only by the authorized operator; this task
has not changed them. Review main protection and workflow write access. All credential-job steps
must continue to use trusted main tools; never add PR checkout, dependency
installation, downloaded executable content or candidate Terraform there.

Content publication needs only the publication policy. Infrastructure is
**reviewed-main only**, never the candidate PR's Terraform. Ordinarily leave
`DEV_INFRA_APPROVED_SHA` / `PROD_INFRA_APPROVED_SHA` absent. Setting one to the exact
reviewed main commit is an explicit operator approval for that configuration's
plan/apply on the next eligible run. Under the same non-cancelling lock, CI
requires its trusted checkout to equal that SHA, initializes the committed S3
backend with `TF_WORKSPACE=dev|prod`, generates `approved.tfplan` with an explicit
`environment`, and applies that exact saved plan. Terraform 1.15.9/provider locks
are pinned. Backend init, real plan and apply are future enabled operations only.
The distribution/bucket/origin/environment outputs must match the approved
publication target. Remove the approval variable after completion. Any main
change invalidates approval. Plan output is captured rather than printed with
potential configuration data. This is approval of reviewed configuration with a
CI-generated plan, not a claim that a human reviewed the resulting live plan.

The maintenance IAM template is intentionally incomplete for initial creation or
resource replacement. Bootstrap owns creation and the review of any
service-required wildcard permissions; see its README. Leave infrastructure
approval absent until a complete scoped permission review and initial resource
bootstrap have happened. Missing permissions fail closed, never grant `*:*`.
No live infrastructure plan or deployment was run to test these operations.

## Publication and durable recovery

The adapter uses S3 PutObject with exact Content-Type, Cache-Control, base64
ChecksumSHA256 and `sha256` metadata, requiring S3 checksum confirmation. It
preserves the complete GitHub ZIP and journal under `_releases/` in the private
site bucket **before any site mutation**. These keys are never linked by the
site. They contain public build bytes and provenance, no secrets. The origin can
read this namespace if its URL is guessed; do not put private information there.

`_releases/ledger.json` checkpoints assets, documents, obsolete document deletion
and invalidation. Every asset finishes before the first document. Only previously
journaled document keys are removed. There is no asset cleanup or `sync --delete`.
All historical immutable keys are checked for conflicts. Invalidation covers
`/*` and waits for completion. Only then does the final ledger mark a release
published and timestamp the prior release's supersession. A failed upload,
removal, invalidation or final checkpoint leaves a pending transaction and blocks
normal publication. Bucket versioning supports investigation; it is not rollback.

Archives, manifests, all historical assets and failed-release records are retained
**indefinitely**. This safely exceeds 30 days after latest supersession, including
an indefinitely current release and reintroduced assets. GitHub's 14-day upload
retention is only transport. There is no lifecycle expiry or cleanup job. Manual
cleanup is also disabled in this initial design. A future reviewed cleanup must
hold the same environment lock, reject incomplete journals, protect current,
rollback-pinned and all retained releases, and honor the latest retirement time;
it must never apply a time filter to arbitrary bucket objects.

For a partial failure, first disable the environment enable variable to stop new
credential jobs; let an active job finish and inspect its journal and S3 versions
through separately authorized access. Do not clear `pending` or force a stale run.
Choose a retained release ID (`runId-runAttempt-artifactId`) from `releases`, or
the pending release ID to finish that content. Set the environment's
`DEV_RECOVERY_RELEASE` / `PROD_RECOVERY_RELEASE` to that exact ID, then re-enable
only the authorized environment and run a **fresh eligible quality run**. A stale
rerun still fails freshness. This run's scheduling identity records the recovery;
the retained archive's content SHA is reported separately as `contentSha` and
`rollbackOf`. Recovery verifies its digest, settings, recomputed files and ledger
before republishing its exact bytes. A pending release is retained as failed
history, so recovery removes documents unique to failed/new output too. It uses
the same assets-first, invalidation and final checkpoint path and lock. No manual
file synchronization is required. Clear recovery and infrastructure approval
variables afterward, inspect the published identity and perform authorized live
checks. Recovery is deliberately sticky until the operator clears the variable.

If the ledger/archive is missing, inconsistent, inaccessible or corrupted, stop:
preserve versions and coordinate Scott's recovery procedure. Do not initialize an
empty replacement ledger over existing site content. Initial empty-ledger
publication is for a freshly bootstrapped empty bucket only. IAM denies deleting
release history; disable any external lifecycle policy that would expire it.

## Offline evidence and outstanding work

Run `python3 -m unittest discover -s tests/deploy -v` for transport-free tests of
gate/source rejection, path/archive attacks, immutable history conflicts, ordering,
asset-before-document publication, partial failures and explicit recovery.
`pnpm lint`, `pnpm typecheck`, the four quality builds and mocked Terraform tests
remain the other checks. No test supplies AWS credentials or calls AWS.

Live evidence is outstanding: OIDC subject/session acceptance, least-privilege
permissions, backend locking, actual apply, successful dev publication, hosted
routing/status/headers/cache behavior, durable failure recovery and rollback.
Do not mark #11 complete or unblock #12 based on offline evidence. Production
requires separately authorized dev verification and explicit enablement.
