# Production bootstrap and launch

Scott approved production bootstrap and launch with the current content on
2026-10-27 in [issue #33](https://github.com/scott-r-lindsey/foom-site/issues/33#issuecomment-6458700496).
Content issues #28–#32 do not block this launch. Future content reaches production
through the normal validated push-to-main publisher.

## Authorized live preflight and state

The assigned infrastructure base was `d30d19e4064018f00d8696ac75bfbabd23b0ac6c`.
Read-only checks confirmed the approved account, public `foom-term.com` zone and
matching four-server public delegation. The committed shared backend was accessible
in us-east-1 with AES256 encryption and no versioning, unchanged from the
owner-approved development bootstrap. No production state, lock, bucket, apex
A/AAAA alias, distribution, named CloudFront policies/function/OAC, apex certificate
or deploy role existed before bootstrap. Bucket HEAD returned 404; actual creation
is the definitive name-availability check.

The first `TF_WORKSPACE=prod` init stopped because the workspace did not exist.
No retry concealed this failure. The orchestrator then explicitly approved
creating only the empty production workspace. With `TF_WORKSPACE` unset, init
against the committed backend succeeded; `workspace new -lock=true prod` created
only `foom-site/prod/terraform.tfstate`, with no remaining lock or removed keys.
The empty state had no resources or outputs and was snapshotted before planning.
See the [workspace initialization procedure](../terraform/bootstrap/README.md#first-production-workspace-initialization).
No plan or apply ran in `default`.

Restricted snapshots are stored under
`/home/slindsey/.local/state/foom-site/backups`, with directory mode `0700` and
file mode `0600`; state and saved plans are never printed or committed. There
was no preexisting production state to copy before workspace creation. These
operator snapshots are not ongoing automatic backups. Shared backend versioning
remains disabled by explicit owner decision; application bucket versioning is
independent and enabled by the infrastructure configuration.

## Reviewed production plan

The saved plan used `TF_WORKSPACE=prod`, `-var=environment=prod`, the committed
S3 backend and a restricted operator `TF_DATA_DIR` separate from offline checks.
It contained **17 creates, zero changes, zero destroys**:

- `aws_acm_certificate.site`
- `aws_acm_certificate_validation.site`
- `aws_cloudfront_cache_policy.site`
- `aws_cloudfront_distribution.site`
- `aws_cloudfront_function.routing`
- `aws_cloudfront_origin_access_control.site`
- `aws_cloudfront_response_headers_policy.site`
- `aws_route53_record.site["A"]`
- `aws_route53_record.site["AAAA"]`
- `aws_route53_record.validation["foom-term.com"]`
- `aws_s3_bucket.site`
- `aws_s3_bucket_ownership_controls.site`
- `aws_s3_bucket_policy.site`
- `aws_s3_bucket_public_access_block.site`
- `aws_s3_bucket_server_side_encryption_configuration.site`
- `aws_s3_bucket_versioning.site`
- `terraform_data.environment`

The orchestrator independently reviewed the resource list, production names,
sole apex alias/certificate, approved zone and environment, then explicitly
approved only saved plan SHA-256
`51b6545c00007ccc23afe2bba50c68400eb8030f6cc346e8a23c5b28c468195a`.
That hash was checked again immediately before apply. On 2026-10-28 UTC
(2026-10-27 Pacific), applying that exact saved file completed successfully with
17 added, zero changed and zero destroyed. The resulting production state was
copied to a restricted post-apply backup. Production uses distribution
`EWHI9NJ60HNKA` and private bucket `foom-site-prod-225319921763-us-west-2`.
The shared backend configuration, zone itself, OIDC provider and all development
resources/state/settings were left unchanged; only the approved production
records were added to the externally owned zone.

## Production publication bootstrap

The role `foom-site-github-production-deploy` was created with the generated
production trust and publication policy from `terraform/bootstrap/policies.py`.
The confirmed GitHub immutable subject configuration was rechecked; trust permits
only audience `sts.amazonaws.com` and subject
`repo:scott-r-lindsey@457016/foom-site@1421149044:ref:refs/heads/main`.
The publication policy substitutes the actual distribution ARN for
`EWHI9NJ60HNKA`. Readback confirmed the exact trust, one publication inline
policy, and no attached managed policies. There are no infrastructure, backend
or IAM grants; release-history deletion remains explicitly denied.

The production bucket was confirmed empty before enabling publication.
`PROD_DISTRIBUTION_ID=EWHI9NJ60HNKA` was set first, then
`PROD_DEPLOY_ENABLED=true`. Readback confirmed existing development variables
were unchanged and `PROD_INFRA_APPROVED_SHA` remained absent. Infrastructure
continues to be bootstrap-owned; enabling content publication does not enable
CI Terraform operations.

## First production publication

[PR #35](https://github.com/scott-r-lindsey/foom-site/pull/35) merged as
`82d6dde2eb7cbfac98629197a057ba2718a71e43`.
[Main run 40620201832, attempt 1](https://github.com/scott-r-lindsey/foom-site/actions/runs/40620201832)
passed Quality and `Deploy validated artifact / publish`, publishing the current
content to <https://foom-term.com>. Read-only ledger inspection confirmed:

| Field                         | Verified value                                                            |
| ----------------------------- | ------------------------------------------------------------------------- |
| Source SHA                    | `82d6dde2eb7cbfac98629197a057ba2718a71e43`                                |
| Release                       | `40620201832-1-12787305854`                                               |
| Content artifact              | `12787305854`                                                             |
| GitHub artifact digest        | `sha256:656ba8bb4314fa8a65bd932cdb61045b877b72630cf734ccfb9598fbb0d4e98b` |
| Invalidation                  | `IC1VTIY4DIWHTPISKWCEVSAKV`, `Completed`, paths `/*`                      |
| Invalidation caller reference | `40620201832-1-12787305854`                                               |
| Ledger                        | One retained release, current matches above, `pending: null`              |

The retained ZIP was downloaded read-only and verified through the trusted
publisher's unpacking checks: GitHub digest, archive digest, source/origin
manifest and recomputed file hashes/metadata all matched the ledger. A local
production build from that exact deployed source, with the pinned toolchain and
`SITE_ENV=production SITE_ORIGIN=https://foom-term.com`, independently matched
every deployed file hash and metadata entry. No AWS infrastructure or publication
mutations were performed during hosted verification.

## Authorized hosted verification

The suite now accepts only the explicit approved development or production
`HOSTED_ORIGIN`; unset or other origins still fail before discovery. Production
always expects development fixtures absent, regardless of the development
rollback fixture override. Existing development assertions remain intact.

Headless Chromium ran at 320px and 1440px with zero Playwright retries. On
2026-10-28 UTC (2026-10-27 Pacific), both production attempts used the unchanged
suite and exact deployed production build:

1. **First attempt: 21/22 passed.** The first narrow-home navigation failed with
   `net::ERR_NAME_NOT_RESOLVED` at `page.goto`, before accessibility assertions.
   All later same-host navigations and the other 21 tests passed. Work stopped
   and the failure was handed to the orchestrator; it was not hidden by retries.
2. The orchestrator assessed the isolated failure as transient resolver/negative
   cache warmup shortly after apex record creation and explicitly authorized one
   environmental retry. `getent hosts foom-term.com` confirmed resolution without
   sleeps. **Second full attempt: 22/22 passed**, unchanged, with zero Playwright
   retries. No third attempt was made.

The successful run covered all six deployed files byte-for-byte and their exact
MIME/cache/security metadata; HTTP-to-HTTPS and canonical 308 query-preserving
redirects; custom 404s for missing paths/assets; valid TLS 1.2/1.3; home canonical
`https://foom-term.com/` and `index, follow`; robots `Allow: /` with the production
sitemap; production-only sitemap URLs; and custom 404s plus absent sitemap entries
for both development fixture paths. The responsive shell passed axe WCAG A/AA,
loading checks, enlarged-text overflow and native keyboard navigation with and
without JavaScript. IPv6 reachability was not established: the operator host has
no IPv6 connectivity; that is not evidence of a site failure. Playwright reported
its Ubuntu 24.04 fallback browser build on Linux Mint.

Development regression verification passed **22/22 on its first attempt**, using
the exact retained checked development artifact: release
`40619860150-1-12786339423`, source
`3e8fdb6d4ffe1dd0d838a0f9b48b6844b4b4ed69`, artifact digest
`sha256:9a1495aa69a90a34619923c2cd90da3a001a6dd83b5b1daf8c7bf96d0796d3af`.
Read-only ledger inspection showed no pending transaction. Every deployed byte
matched; development retains `noindex, nofollow`, robots `Disallow: /`, its own
canonical/sitemap origin, and both accessible nested verification fixtures.
Normal local/CI checks remain separate from these explicit hosted requests.

## Rollback rehearsal: phase 1 prepared

[PR #36](https://github.com/scott-r-lindsey/foom-site/pull/36) merged as
`da223f975c9f8fe58a33ca1f9c52e409583a3150`.
[Main run 40621262298, attempt 1](https://github.com/scott-r-lindsey/foom-site/actions/runs/40621262298)
passed, including production publication. On 2026-10-28 UTC, authorized read-only
checks confirmed the second normal production release:

| Field                         | Verified value                                                                 |
| ----------------------------- | ------------------------------------------------------------------------------ |
| Source SHA                    | `da223f975c9f8fe58a33ca1f9c52e409583a3150`                                     |
| Release                       | `40621262298-1-12787646898`                                                    |
| Content artifact              | `12787646898`                                                                  |
| GitHub artifact digest        | `sha256:29edbef3ccc3b7a9c1dc53aac827d1f1aba5aabf1466ee13d063c92d71543e39`      |
| Invalidation                  | `I69TZCLQ857EB3FMNACNWQYEYA`, `Completed`, paths `/*`                          |
| Invalidation caller reference | `40621262298-1-12787646898`                                                    |
| Ledger                        | Exactly two retained releases, current matches second release, `pending: null` |

The two releases' ledger manifests have the same six keys and identical SHA-256
for every deployed file. For example, `index.html` is
`9a50df3c8c8319814d37765bacb30ddd08c16ac0c975c2dde0d30e320e630b24` in both.
The artifacts have distinct digests/source identities because their provenance
changed; no visible content difference is expected during this rehearsal.
Recovery must therefore be demonstrated through the new scheduling identity,
`rollbackOf` and `contentSha`, in addition to retained-byte comparisons and a
completed invalidation. This does not claim a visible content rollback.

The orchestrator explicitly authorized phase 1. After checking the second
release, the operator set
`PROD_RECOVERY_RELEASE=40620201832-1-12787305854` and verified the exact value by
repository-variable readback. All previously configured variables remained
unchanged, and `PROD_INFRA_APPROVED_SHA` remained absent. No workflow was
triggered directly and no site objects or infrastructure were mutated by these
checks. Development settings remain unchanged.

At the phase-1 checkpoint, the recovery override was active and sticky. The
integration owner's merge of the docs-only rehearsal PR supplied the fresh
eligible main run through the normal serialized publisher. An ordinary rerun
would not bypass stale/equal scheduling identities.

## Rollback rehearsal: phase 2 verified

[PR #37](https://github.com/scott-r-lindsey/foom-site/pull/37) merged as
`0abfd239ed4ed01ebe3714301260f73e252f85d2`.
[Recovery main run 40621930001, attempt 1](https://github.com/scott-r-lindsey/foom-site/actions/runs/40621930001)
succeeded, including `Deploy validated artifact / publish`. Authorized read-only
checks verified the recovery ledger and CloudFront invalidation:

| Field                         | Verified value                                                            |
| ----------------------------- | ------------------------------------------------------------------------- |
| Scheduling source SHA         | `0abfd239ed4ed01ebe3714301260f73e252f85d2`                                |
| Scheduling release            | `40621930001-1-12788250462`                                               |
| Scheduling artifact           | `12788250462`                                                             |
| `rollbackOf`                  | Exact first release identity, `40620201832-1-12787305854`                 |
| `contentSha`                  | `82d6dde2eb7cbfac98629197a057ba2718a71e43`                                |
| Content artifact              | `12787305854`                                                             |
| Retained content digest       | `sha256:656ba8bb4314fa8a65bd932cdb61045b877b72630cf734ccfb9598fbb0d4e98b` |
| Invalidation                  | `I22ZVV5HGOM7MMR6IU4MFUVL3Q`, `Completed`, paths `/*`                     |
| Invalidation caller reference | `40621930001-1-12788250462`                                               |
| Ledger                        | Three retained releases, current is recovery release, `pending: null`     |

The first retained artifact was downloaded read-only and independently verified
again through trusted ZIP/archive digest, source/origin and recomputed file
manifest checks. The current recovery manifest equaled that first retained
manifest. Headless verification against the extracted first-release build at
`https://foom-term.com` passed **22/22 on its first attempt**, with zero Playwright
retries at 320px and 1440px. Every live file matched retained bytes and exact
publication metadata; production canonical/indexing/sitemap, fixture absence,
redirects, custom 404s, TLS/security headers, accessibility and keyboard checks
passed. Both original normal releases had identical deployed bytes, so the
explicit `rollbackOf`/`contentSha` transition and new scheduling identity are the
recovery observables; no visible content change is claimed.

The session was interrupted by a provider **model-at-capacity error** after the
hosted suite completed. This was a provider/session interruption, not a site or
test failure. On resume, the completed result was confirmed as passed with no
failed tests; the suite was not rerun.

Only after successful identity, invalidation and live-byte verification,
`PROD_RECOVERY_RELEASE` was deleted. Repository-variable readback confirmed its
absence and every other variable unchanged; `PROD_INFRA_APPROVED_SHA` remains
absent. No direct object writes, infrastructure operations, IAM changes or
development-variable changes were used for recovery verification. The existing
main publisher performed the authorized recovery.

## Normal restoration awaiting evidence-PR merge

The recovery override is now absent. The integration owner's merge of the final
evidence PR will schedule a fresh normal main publication. Recovery is verified;
normal restoration has **not yet been observed** at this checkpoint. After the
merge, verify successful publication, a current main scheduling/content identity
without `rollbackOf`/`contentSha` recovery overrides, `pending: null`, completed
invalidation, matching live bytes and continued absence of the recovery variable.
Record that final evidence in an issue #33 comment as authorized by the owner.

The owner explicitly approved using `Closes #33` in the evidence PR once only
post-merge restoration observation remained. That closing reference is
conditional on this documented final check; it is not a claim that restoration
has already been verified. The implementer hands off for the orchestrator's
review/merge and does not merge locally.

## Offline evidence

Local validation is separate from the authorized AWS work above. Node 24.17.0
and pnpm 11.19.0 frozen installation, lint and typecheck passed. All 16 offline
deployment tests passed. Terraform formatting, backend-disabled initialization,
validation and explicitly mocked dev/prod/default-workspace tests passed
(3 + 3 + 1 cases), with AWS credentials/configuration disabled and a separate
Terraform data directory. These checks do not prove production publication or
CI infrastructure permissions. PR CI evidence is recorded in the PR. Subsequent live hosted results are recorded
separately above.

For the hosted-suite extension, local `pnpm lint`, `pnpm typecheck`, all 16
offline deployment tests, documentation relative-link checks and
`git diff --check` passed. Discovery-only `pnpm test:hosted --list` checks accepted
the two approved origins and rejected both unset and unapproved origins before
test discovery; they made no hosted requests. The test-only changes do not alter
production site bytes, workflow triggers, Terraform, IAM or repository variables.

The phase-1 rehearsal change is documentation-only. Relative file links,
formatting and `git diff --check` were checked locally; the commit hooks also run
lint and typecheck. Full PR CI results are recorded separately in the PR body.
The live release/variable evidence above is distinct from those offline checks.

The phase-2 evidence change is documentation-only. Formatting, relative file
links, consistency and `git diff --check` are checked locally, with lint and
typecheck enforced by commit hooks. PR Quality gate evidence is recorded in the
PR separately from the completed recovery hosted run above.
