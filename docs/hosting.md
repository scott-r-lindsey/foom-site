# Hosting discovery and AWS bootstrap contract

Status: discovery draft for [issue #9](https://github.com/scott-r-lindsey/foom-site/issues/9).
No deployment-specific AWS or domain values have been approved. This document
records requirements and proposed conventions, not evidence of provisioned
resources. Required owner inputs remain open; #9 is not complete and
[infrastructure #10](https://github.com/scott-r-lindsey/foom-site/issues/10)
remains blocked. Implementation belongs to #10 and
[deployment #11](https://github.com/scott-r-lindsey/foom-site/issues/11).

## Evidence and status vocabulary

- **Confirmed requirement**: supplied by the issue or assigned hosting brief.
- **Proposal**: a concrete convention to review before implementation.
- **Owner input**: a deployment-specific value or decision still required.

The repository at discovery base `9677b067085708fac3b907284091da6c17805cd2`
contains only `.gitignore`; it supplies no hosting configuration or inventory.
No cloud calls, credential discovery, provisioning, or Terraform operations
were used for discovery. Shared resources described below are prerequisites to
confirm, not resources known to exist in Foom's account.

Read-only local patterns inspected in `inspiration/crab-attack-ii/`:

- `terraform/README.md` and `terraform/bootstrap/README.md`: ownership,
  environment state, separate roles, OIDC subject configuration, recovery.
- `terraform/setup.tf`, `terraform/app.tf`, and modules `static-site/main.tf`
  and `site-deploy/main.tf`: private origin, certificates, DNS, object metadata.
- `.github/workflows/deploy.yml`: environment selection and deployment handoff.

The reference may be available through the local inspiration symlink; it is
not a tracked dependency. Its account, zone, domains, buckets, role ARNs, and
immutable repository IDs are not approved Foom inputs. Its API/score backend
is outside this promotional site's scope. Its root-index-only routing/cache
handling, independent build/deploy checks, and apply cancellation must not be
carried over; the multipage and validation requirements below supersede them.

## Required inputs and proposed names

Angle-bracket values are unresolved placeholders, never executable defaults.
Variable names in this table are proposed configuration contracts, not existing
Terraform declarations or GitHub settings. The owner must approve the final
values and storage locations before bootstrap or provisioning.

| Input | Status and value/convention | Owner confirmation needed |
| --- | --- | --- |
| Repository and environment labels | Confirmed: `scott-r-lindsey/foom-site`; `dev`, `prod` | None for these labels |
| Production domains | Owner input: `<PROD_DOMAIN>`, optional `<PROD_ALIAS_DOMAINS>` | Canonical hostname, aliases, redirects, domain ownership and registrar contact |
| Development domain | Owner input: `<DEV_DOMAIN>` | Dedicated hostname; proposed subdomain of the approved production domain |
| AWS account | Owner input: `<AWS_ACCOUNT_ID>` | Target account, whether both environments share it, accountable administrator |
| Application AWS region | Owner input: `<AWS_REGION>` | Bucket region and any regional constraints |
| TLS certificate region | Architecture constraint: CloudFront ACM certificate in `us-east-1` | Confirm DNS validation authority for every alias |
| DNS zone | Owner input: `<DNS_ZONE_ID>`, `<DNS_ZONE_NAME>` | Zone/account owner, delegation and permission to manage only Foom records; proposed Route 53 public zone |
| State backend | Owner input: `<STATE_BUCKET>`, `<STATE_REGION>`, optional `<STATE_KMS_KEY_ARN>` | Existing versus new shared bucket, encryption, versioning/backups, lock support, administrators and recovery owner |
| State key scheme | Proposal: S3 backend `workspace_key_prefix = "foom-site"`, `key = "terraform.tfstate"`; only `dev`/`prod` workspaces | Approve effective keys `foom-site/dev/terraform.tfstate` and `foom-site/prod/terraform.tfstate`; corresponding `.tflock` objects; reject `default` |
| Resource naming | Proposal: prefix `foom-site-<ENV>`; bucket `foom-site-<ENV>-<AWS_ACCOUNT_ID>-<AWS_REGION>` | Confirm global bucket uniqueness and naming policy; names remain placeholders until approved |
| Resource tags | Proposal: `Application=foom-site`, `Environment=dev\|prod`, `Repository=scott-r-lindsey/foom-site`, `ManagedBy=Terraform` for environment resources | Approve required organizational tags; bootstrap resources have a distinct management owner |
| Account GitHub OIDC provider | Owner input: `<GITHUB_OIDC_PROVIDER_ARN>` for `https://token.actions.githubusercontent.com`, audience `sts.amazonaws.com` | Existing shared provider ownership or authorized creation; exact repository subject format |
| Separate deploy roles | Confirmed separation; proposed names `foom-site-github-development-deploy`, `foom-site-github-production-deploy` | Approve `<DEV_ROLE_ARN>`, `<PROD_ROLE_ARN>` and reviewed trust/permission policies |
| GitHub repository variables | Proposal: `DEV_AWS_DEPLOY_ROLE_ARN=<DEV_ROLE_ARN>`, `PROD_AWS_DEPLOY_ROLE_ARN=<PROD_ROLE_ARN>`, `AWS_REGION=<AWS_REGION>` | Repository administrator sets approved non-secret values; backend/domain/zone inputs use reviewed configuration, not hidden defaults |
| Release retention and access | Owner input: `<RETENTION_WINDOW>`, `<BOOTSTRAP_OWNER>`, `<RECOVERY_OWNER>` | Approve rollback window, cleanup authority, deployment approval and recovery access |

Distribution IDs and CloudFront hostnames should come from environment outputs,
not copied reference values. No AWS access keys, private keys, credentials, or
`.env` files belong in the repository. OIDC uses short-lived sessions; role
ARNs and region variables are non-secret identifiers.

## Architecture and environment mapping

Each environment owns an independent private S3 bucket, CloudFront distribution
and origin access control (OAC), TLS certificate, Foom DNS/validation records,
and routing/cache configuration. Use the S3 REST origin with signed OAC reads,
blocked public access, encryption, and a bucket policy limited to that
CloudFront distribution. Serve HTTPS with appropriate security headers. Public
S3 website hosting is not part of this contract. No Lambda, API Gateway, or
DynamoDB resources are required.

| Trigger | Environment and state | Credentials and result |
| --- | --- | --- |
| Same-repository PR targeting `main` | Shared `dev`; only dev state and resources | Development role; deploy exact validated development artifact |
| Push to `main` | `prod`; only prod state and resources | Production role; deploy exact validated production artifact |
| Fork PR or other branch/event | No deployment | Validation only, no deployment role or OIDC credential job |

Shared dev is one mutable preview URL, not a per-PR environment. A deployment
from another PR replaces the visible preview; closing one PR must not destroy
shared dev. The run summary must identify URL, PR/commit, and deployed artifact.
Separate buckets and state prevent dev changes from modifying prod.

Use one deployment concurrency group per environment across all PRs/runs,
covering apply and publication. Never cancel an in-progress apply to favor a
newer build. Backend state locking is required in addition to workflow
serialization. A stale queued build must be rejected before mutation; GitHub
queue order alone is not a freshness guarantee. #11 must define and enforce
ordering across PRs for shared dev, plus the latest eligible `main` commit for
prod. Superseded builds can be discarded before entering mutation; intentional
rollback must be explicit and serialized through the same environment lock.

## State, ownership, and bootstrap boundary

| Boundary | Resources and responsibility | Recovery/management contract |
| --- | --- | --- |
| Shared prerequisites, outside environment state | AWS account, domain registration/delegation, hosted zone, state bucket/encryption/backup/locking, account GitHub OIDC provider | Account/DNS/backend owners confirm inventory and restore these independently. Existing ownership is unknown; approve creation separately if absent. Never let app teardown remove them. |
| Foom bootstrap, outside environment state | Separate dev/prod IAM roles, trust and permission policies, GitHub variables and any environment protection settings | `<BOOTSTRAP_OWNER>` with authorized administrative access creates/restores these before CI can authenticate. App roles cannot grant themselves access or change their own trust. |
| Foom environment state, separate for dev/prod | Site bucket/content ownership, OAC, distribution, routing/cache/security policies, ACM certificate and Foom DNS records | #10 defines lifecycle and content ownership; #11 publishes through the matching role. No resource or object is managed by two states or competing publishers. |

Proposed state backend requires encrypted transport/storage, versioned state
backups and S3 lock files. Dev permissions cover only its effective state and
lock keys; prod permissions cover only prod's. Scope bucket listing by the
required prefixes. Permit state read/write and lock creation/read/deletion
without granting blanket state deletion or access to other applications.
If KMS is selected, scope key access to the required use. Neither application
role owns the shared backend bucket, zone, or OIDC provider. Shared DNS
validation records must have one explicit owner if environments overlap.

Bootstrap documentation in #11 must record reviewed policies and restoration
steps after the owner settles the table above. Discovery authorizes no cloud
commands. Any later offline plan must use explicit mocks/offline provider
configuration; a local backend alone does not prevent cloud access.

## OIDC trust and least privilege

Both role trusts must require the approved provider, exact audience
`sts.amazonaws.com`, and exact repository/event or branch subject. No wildcard
repository or branch trust. Verify the repository's actual OIDC subject
configuration during separately authorized bootstrap; do not infer it from
Crab Attack's immutable IDs.

Candidate subjects **only if standard GitHub subjects are confirmed**:

- Dev: `repo:scott-r-lindsey/foom-site:pull_request`.
- Prod: `repo:scott-r-lindsey/foom-site:ref:refs/heads/main`.

If the repository uses immutable/custom subjects, replace these with the exact
owner-confirmed subjects. If GitHub Environments are introduced, account for
the changed environment subject and enforce branch restrictions/protections;
never silently broaden trust to make authentication work.

The standard PR subject does not distinguish fork PRs from same-repository
PRs. #11 must explicitly check the head repository before granting access to
a credential-bearing job. Fork PR validation must never reach that job, and
untrusted PR code must not run with credentials via `pull_request_target`.
Same-repository PR contributors are consequently trusted with dev privileges;
owner review must accept that boundary. Grant `id-token: write` only to the
authorized deployment job and minimal other GitHub permissions.

Each role must be limited to its environment's application bucket/objects,
state/lock keys, approved DNS record names/types in the approved zone,
certificate and distribution operations, routing functions and associated
policies required by #10, and invalidations for its distribution. Scope by
resource ARN, names, tags and conditions where supported. Review and justify
any service-required wildcard actions individually; no administrator policy,
IAM role/trust editing, general `PassRole`, unrelated app services, or access
to the other environment. Shared-zone access must not let dev modify prod
records. Changes requiring broader bootstrap permissions go to the bootstrap
owner, not automatic privilege escalation by deployment.

## Multipage build and publication requirements

These are agreed requirements for #10/#11, not implemented behavior:

- Resolve nested directory indexes, e.g. `/features/` serves
  `/features/index.html`. Define canonical redirects for `/features` and
  explicit index paths consistently with the generated links and sitemap.
  A root `default_root_object` alone does not provide nested routing.
- Unknown paths return a useful error page with actual HTTP **404**, including
  missing assets. No SPA fallback returning root HTML with 200. Account for
  private-origin missing-object 403 responses without concealing operational
  access failures; verify error status and body in #10.
- Only proven content-fingerprinted assets receive year-long
  `public, max-age=31536000, immutable` caching. A directory or file extension
  alone is insufficient evidence of fingerprinting.
- All HTML, including nested indexes and the error page, plus `robots.txt`,
  sitemaps, manifests and other stable filenames must stay fresh through
  revalidation or no caching. CloudFront minimum TTL must not override those
  policies. Invalidation must cover all relevant HTML URLs, rewritten/index
  forms and changed stable files, not just `/index.html`.
- Deploy the exact artifact that passed required checks for the selected
  commit/environment. Include canonical URL and dev indexing restrictions in
  that validated build. Failed validation cannot reach credentials/apply;
  rebuilding different content after the gate is insufficient. Record artifact
  identity and commit in the deployment summary.
- Upload new fingerprinted assets before publishing HTML that references
  them. Retain old hashes for `<RETENTION_WINDOW>` so cached HTML and open
  tabs continue working. Do not blindly delete every object absent from the
  newest build. #10/#11 must define object ownership, release manifests,
  ordered publication and cleanup; bucket versioning alone does not keep
  deleted asset URLs available.
- Preserve the prior validated artifact and release metadata for rollback.
  Rollback republishes a compatible HTML/stable-file set with its retained
  assets, refreshes all affected URLs, and uses the same serialized deployment
  path. Define failure recovery for partial publication; do not assume an S3
  sync or Terraform apply is an atomic release.

## Recovery order

1. The account/domain owner restores account access, domain delegation and
   the hosted zone. Reconcile any changed IDs with approved configuration.
2. The backend owner restores the state bucket, encryption access, locking
   and state backups before any environment mutation. Preserve separate keys.
3. The bootstrap owner restores the OIDC provider, reviewed dev/prod roles,
   trust/permissions and GitHub variables/protections.
4. The recovery owner reconciles restored state with actual resources. If
   state is lost but resources remain, stop automated deployment and arrange
   a separately authorized state-recovery procedure; do not apply blindly.
5. After reconciliation, restore dev first using a validated artifact, verify
   routing/cache/error behavior, then restore prod through the protected
   deployment path. Use retained release artifacts for content rollback;
   state restoration is not a substitute for an application rollback.

Discovery includes no recovery commands or permission to execute these steps.

## Bundled owner decisions still required

1. Approve prod canonical domain/aliases, dev hostname, DNS zone/delegation
   ownership, and who may modify the required records.
2. Supply target AWS account(s), application region and shared prerequisite
   inventory: state bucket/region/encryption/backup/locking and OIDC provider.
3. Approve state paths, resource naming/tags, exact OIDC subjects, separate
   role ARNs/policies, repository variables and deployment protections.
4. Name bootstrap/backend/recovery owners; approve shared-dev replacement
   behavior, cross-PR freshness policy, retention window and rollback access.

Until these are settled, this draft supports review and implementation design
but does not close #9, unblock #10, or authorize provisioning/deployment.
