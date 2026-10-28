# Validated deployment operations

Development publication is operational at <https://dev.foom-term.com> following
owner-authorized bootstrap on 2026-10-15. The first successful gated publication
was [run 38833818304, attempt 2](https://github.com/scott-r-lindsey/foom-site/actions/runs/38833818304/attempts/2),
release `38833818304-2-12018703593`, source
`cf9ce039187ae9ac477da10060df45686add9f16` (PR #25, now merged).
Its GitHub artifact digest was
`sha256:6c45c898e131fcfc60eda5a396540030494e96da2e875ce79805da0294107550`.
Invalidation `I4QMS45OW6CJ0FRMUR56LE2G4X` completed. #11 is closed.

Development uses `DEV_DEPLOY_ENABLED=true`,
`DEV_DISTRIBUTION_ID=E39JUFE2OF7XBP` and private bucket
`foom-site-dev-225319921763-us-west-2`. Owner-authorized
[production bootstrap](production-bootstrap.md) has provisioned distribution
`EWHI9NJ60HNKA` and private bucket `foom-site-prod-225319921763-us-west-2`, with
`PROD_DISTRIBUTION_ID=EWHI9NJ60HNKA` and `PROD_DEPLOY_ENABLED=true`.
Production publication is enabled for the next validated push to main; first
publication, hosted verification and rollback remain pending. Infrastructure
approval variables are absent. Both GitHub roles have publication permissions
only, with no infrastructure, backend or IAM grants. See
[development bootstrap evidence and state recovery limits](development-bootstrap.md).
Issue #12 records hosted checks and retained-release rollback separately below.

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

## Bootstrap and enablement (separately authorized operator action)

Read [hosting ownership and exact immutable subjects](hosting.md#oidc-trust-and-least-privilege)
and [bootstrap templates](../terraform/bootstrap/README.md). The shared backend,
zone and OIDC provider stay externally owned. Confirm their existence, security,
recovery and authorization separately. Do not broaden trust to make a failure go
away. Roles are the confirmed dev/prod ARNs, hardcoded in the trusted publisher;
legacy role ARN variables are unnecessary. Region is fixed at `us-west-2`.

After separately authorized bootstrap, record the environment's approved
CloudFront output as `DEV_DISTRIBUTION_ID` / `PROD_DISTRIBUTION_ID`. These are
non-secret identifiers. Enable the respective environment only after explicit
owner authorization and prerequisite verification. Development verification in
#12 is complete; #33 records separate production bootstrap/launch approval and
`PROD_DEPLOY_ENABLED=true` enablement.
Absent/other values disable the respective job. Never use cloud keys or `.env`.
Repository variables may be changed only within explicit operator authorization. Review main protection and workflow write access. All credential-job steps
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
Development and production infrastructure were bootstrapped separately; CI
infrastructure plan/apply remains disabled and unverified.

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

Live dev publication establishes OIDC acceptance and the exercised publication
permissions, not CI infrastructure/backend permissions or live partial-failure
recovery. Partial-failure behavior remains covered by offline tests. Production
has separate explicit authorization and enablement recorded in
[production bootstrap](production-bootstrap.md); its first publication and hosted
verification remain pending.

## Hosted verification (#12)

Use the opt-in command in [README](../README.md#authorized-development-verification)
against the exact deployed source/artifact. Never compare a different local build
to shared dev: another eligible PR can replace it. The suite checks file bytes,
MIME/cache/security headers, HTTPS/TLS, nested routing and query redirects,
custom 404 status, canonical/sitemap/noindex policy and responsive keyboard/axe
behavior. It starts no local server and needs no AWS credentials. Existing local
checks do not make these requests. Two unlinked development fixtures provide real
nested routes without adding claims or operational UI to the marketing homepage;
production builds emit neither route.

Initial #12 fixture publication passed Quality and publication in
[run 38837313221](https://github.com/scott-r-lindsey/foom-site/actions/runs/38837313221).
Head `302e10198c5268cf7bd71be823a8c61b335eaf48`, source
`6257e01ea37c321af8edc2fdf5f26997082cc449`, release
`38837313221-1-12019189716`, artifact digest
`sha256:60eda505a7f2366e8544513bc9f113a5aa11aea7b0d27d1b302436a45574e97e`.
All 20 hosted tests passed against the exact local development build after
publication and completed invalidation; the durable ledger had no pending work.
Fixture revision A was visible on both nested pages, with SHA-256:

- `/verification/a/`: `a0bc3e6c9d0b18993bb504e10ca7c0f4f9d6b2a153e9ef0181600eab17003824`
- `/verification/b/`: `d7bc1c913cb8bfe1dd2d2ec1433e50b50864bc52a98f51c2fb43163e2603b0ca`

The initial hosted test development exposed two incorrect test assumptions,
corrected before recording passing evidence: direct `/404.html` returns 200
(the custom error response for unknown paths is 404), and CloudFront reorders
query keys while preserving encoded/repeated values. No retries masked these
failures. Baseline checks then passed 20/20 against the downloaded first-release
artifact with fixtures explicitly expected absent.

Revision B changed visible text on both fixture pages. Quality and normal
publication passed in [run 38837659792](https://github.com/scott-r-lindsey/foom-site/actions/runs/38837659792),
head `3594075bde2eab3de7f8c45638c501f9e9252cca`, source
`a1008117e83e8828690659819fe0f4ee492a9674`, release
`38837659792-1-12019857725`, digest
`sha256:dac7115f79d15afa46e19c9939cea56b567460e8902ecb79801f5fd96d03f14a`.
All 20 hosted checks passed again after publication, with no pending transaction.
Both pages returned 200 with new SHA-256 values:

- `/verification/a/`: `3f92634491de9f2fb75422f3383e52a9812a86c0b4e3033cabca25cdf2547ed1`
- `/verification/b/`: `823398dbabfa5092c7bda7cdd62f00fa8943e47d8d0bf45a3f024cbb2a336e3a`

The baseline assets remained reachable and byte-identical across both updates:
`_astro/client.BmNEQPXu.js` SHA-256
`99d0eaab3f751cac2f92058776607f33ebb63338d880b15eb403fa9fe8768b7d` and
`_astro/favicon.5zOVtI7c.svg` SHA-256
`c4fb8dfd915f3a067296a9c406869bd70c1bd596fed0b2226b7c9e64d98f974d`.
Both use `public, max-age=0, must-revalidate`: the publisher conservatively
revalidates Astro's opaque filenames; only names containing a verified full
SHA-256 qualify for immutable caching. HTML uses the same revalidation policy.

The authorized rollback exercise selects baseline release
`38833818304-2-12018703593` through `DEV_RECOVERY_RELEASE` and a fresh eligible
PR run. Its checks must compare the retained baseline bytes with
`HOSTED_FIXTURES=absent`, including removal of both newer fixture pages and their
sitemap entries. Clear the override afterward and publish the latest normal
build. The live rollback completed successfully in
[run 38837937548](https://github.com/scott-r-lindsey/foom-site/actions/runs/38837937548),
scheduling head `009040dc8351d4ff129d1520845ead1ffd182316`, source
`9e1f96b717dcb5921290e49817b8a7a2b0e2a803`, scheduling release
`38837937548-1-12019828301`. The ledger explicitly records `rollbackOf` baseline
release `38833818304-2-12018703593`, `contentSha`
`cf9ce039187ae9ac477da10060df45686add9f16`, content artifact `12018703593`, and
the baseline ZIP digest above. Quality and publication passed; invalidation
completed and `pending` was null.

All 20 hosted checks passed against the downloaded baseline artifact. Both
`/verification/a/` and `/verification/b/` returned the custom document with HTTP
404, and their sitemap entries disappeared. All six original files matched
exactly, including homepage SHA-256
`e7b754155db7429151794ab76ff93a2715c133b7722cd591977bfb5d1a26cabe`, 404 document
`163bb981b6d6f10c05336c7329671147396f9dd38a451830a793a1ee82032ffe`, and sitemap
`293c081d9513ab71bf33b2cd6e3394178fab7edf542cf2d1f983368c66d00c6d`.

`DEV_RECOVERY_RELEASE` was then deleted; repository variables again contained
only the dev enable flag and distribution ID. Normal publication then restored revision B in
[run 38838273723](https://github.com/scott-r-lindsey/foom-site/actions/runs/38838273723):
head `f126598d1eb45222c029e7ae7b76020f4ee990a9`, source
`f45a7ca25ce130edb88f8cf3f9a05388962fc2ea`, release
`38838273723-1-12020127140`, artifact digest
`sha256:d250ce30c07b63450dfab6ea2bd6b26d00ffc4b072ce459d7ece44ffe3d8dbac`.
Quality and publication succeeded. All 20 hosted checks passed again; both
fixture pages returned 200 with the revision B hashes above, assets were intact,
and the ledger contained no pending work or rollback identity. The override
remained absent. [PR #26](https://github.com/scott-r-lindsey/foom-site/pull/26)
records the final documentation head's subsequent normal publication identity;
its site bytes are unchanged from this verified restoration. No direct object writes/deletes, AWS
credential commands, infrastructure operations, IAM changes or production
operations were performed during #12. Only the existing reviewed-main publisher
mutated development content. Automated
accessibility checks do not establish screen-reader usability or final design.
Visual design, product copy, demos, download distribution and launch assets remain
separate follow-up scope in [#1](https://github.com/scott-r-lindsey/foom-site/issues/1).

## Local and live evidence boundaries

The clean assigned checkout at `8d21dfa00b921fd9ca059ba275dbcaacdf4004b7`
completed the README sequence with Node 24.17.0/pnpm 11.19.0: Corepack enable,
frozen install, lint, typecheck, build, 12 artifact fixtures plus emitted-output
checks, matching Chromium install, and all 8 production-preview browser tests.
Playwright reported its Ubuntu 24.04 fallback on Linux Mint; no browser retries
were used. Subsequent local production/development builds verified fixture
exclusion/inclusion, 27 hosting tests and 16 offline deployment tests passed.
Each linked CI run separately passed the four-build matrix, offline Terraform
checks, required Quality gate and publication. Hosted checks were opt-in local
runs against the public dev URL, not part of that offline CI matrix.

Live results: nested pages 200; slash/index canonical redirects 308 with encoded
and repeated query values preserved; HTTP-to-HTTPS 301; unknown path and missing
CSS 404 with the custom HTML document; exact HTML/JS/SVG/XML/plain-text MIME and
manifest cache policy; HSTS, nosniff, DENY framing, referrer and permissions
policies; trusted HTTPS with TLS 1.2/1.3; dev canonical URLs, sitemap and
`noindex, nofollow` plus robots `Disallow: /`. Headless Chromium at 320px and
1440px passed axe WCAG A/AA, keyboard skip/home navigation, loading checks on the
baseline, and overflow checks including 200% text. Desktop/mobile screenshots
were visually inspected. Normal local checks make no hosted requests, and the
hosted command without its explicit origin opt-in fails before test discovery.

Retained-release rollback was exercised live; deliberate partial upload,
invalidation and checkpoint failures were exercised **offline only**. No live
failure was injected. CI infrastructure/backend locking operations, production publication/hosted
behavior, screen-reader review and final product design remain unverified.
Production infrastructure itself was subsequently bootstrapped as recorded in
[production bootstrap](production-bootstrap.md).
The shared state bucket still has no versioning or automatic ongoing backup;
its owner-approved local snapshot limitation is documented in
[development-bootstrap.md](development-bootstrap.md).
