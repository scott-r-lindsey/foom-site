# Hosting discovery and AWS bootstrap contract

Current operational status: [development bootstrap](development-bootstrap.md) and
[deployment operations](deployment.md) supersede preparation-only statements below.
Dev and production are live. [Production bootstrap](production-bootstrap.md)
records the apex infrastructure, successful main publication and hosted checks;
production retained-release recovery is verified with its override cleared.
Normal restoration awaits the final evidence PR merge and verification. The shared backend is
encrypted but not versioned by explicit owner decision; restricted local state
snapshots are not ongoing automatic backups. GitHub uses the dev/prod
enable/distribution variables, with role ARNs and region fixed in trusted
publication code. Both roles have publication permissions only; infrastructure
approval variables remain absent.

Historical discovery status: configuration discovery complete for [issue #9](https://github.com/scott-r-lindsey/foom-site/issues/9),
using owner approval recorded on **2026-10-15**. This contract supplies inputs for
[infrastructure #10](https://github.com/scott-r-lindsey/foom-site/issues/10) and
[deployment #11](https://github.com/scott-r-lindsey/foom-site/issues/11). It does
not establish that live resources exist or authorize deployment. #10 can begin
once #9 is closed and this contract is integrated into its base.

## Evidence and status vocabulary

- **Confirmed configuration**: owner-approved values recorded in #9 on
  2026-10-15, including explicitly approved reuse of shared AWS identities.
- **Implementation default**: routine Foom naming or operational choices made
  here for #10/#11; not a claim that resources or settings already exist.
- **Operational verification**: live checks and authorization required before
  deployment, outside this discovery task.

The implementation base is `cb0a9b9df87010ebd967538740117c3977f0291b`, with
#2–8 integrated. No cloud calls, credential discovery, provisioning, or Terraform
operations were used for discovery. GitHub OIDC evidence below was supplied by
the orchestrator's read-only repository API inspection, not a cloud probe.

Read-only local patterns inspected in `inspiration/crab-attack-ii/`:

- `terraform/README.md` and `terraform/bootstrap/README.md`: ownership,
  environment state, separate roles, OIDC subject configuration, recovery.
- `terraform/setup.tf`, `terraform/app.tf`, and modules `static-site/main.tf`
  and `site-deploy/main.tf`: private origin, certificates, DNS, object metadata.
- `.github/workflows/deploy.yml`: environment selection and deployment handoff.

The reference may be available through the local inspiration symlink; it is
not a tracked dependency. Only the account, state bucket and OIDC provider
explicitly approved below are reused. Its zone, application resources, role
identities, domains and immutable repository ID must not be copied. Its API/score
backend is outside this promotional site's scope. Its root-index-only
routing/cache handling, independent build/deploy checks, and apply cancellation
must not be carried over; the multipage and validation requirements below
supersede them.

## Confirmed inputs and implementation defaults

These are configuration contracts for #10/#11, not existing Terraform declarations
or verified GitHub settings. Scott is the accountable account/DNS contact and
bootstrap, backend and recovery owner; shared resources retain their external
management ownership.

| Input                        | Value and status                                                                                                                                                                                     |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Repository and environments  | Confirmed: `scott-r-lindsey/foom-site`; `dev`, `prod`                                                                                                                                                |
| Production origin            | Confirmed: `https://foom-term.com`; sole production alias/certificate name `foom-term.com`                                                                                                           |
| Development origin           | Confirmed: `https://dev.foom-term.com`; sole dev alias/certificate name `dev.foom-term.com`                                                                                                          |
| AWS account                  | Confirmed shared account: `225319921763`                                                                                                                                                             |
| Application region           | Confirmed: `us-west-2` for both application buckets                                                                                                                                                  |
| TLS certificate region       | Confirmed: `us-east-1` for CloudFront ACM certificates                                                                                                                                               |
| DNS zone                     | Confirmed new Foom public zone: `foom-term.com`, `Z0451547IUIBRZP42UO4`; separate from Crab Attack, managed outside environment state                                                                |
| State backend                | Confirmed shared bucket `terraform-state-xxx`, region `us-east-1`; implementation requires encryption, versioning/backups and S3 lock files; live settings unverified                                |
| State key scheme             | Default: `workspace_key_prefix = "foom-site"`, `key = "terraform.tfstate"`; only `dev`/`prod`, reject `default`                                                                                      |
| Effective state objects      | `s3://terraform-state-xxx/foom-site/dev/terraform.tfstate` and `s3://terraform-state-xxx/foom-site/prod/terraform.tfstate`; each lock object appends `.tflock`                                       |
| Resource naming              | Default prefix `foom-site-<ENV>` for OAC, distribution comment, routing functions and custom policies; bucket names below; global uniqueness remains unverified                                      |
| Dev application bucket       | Planned: `foom-site-dev-225319921763-us-west-2`                                                                                                                                                      |
| Prod application bucket      | Planned: `foom-site-prod-225319921763-us-west-2`                                                                                                                                                     |
| Resource tags                | Default: `Application=foom-site`, `Environment=dev` or `prod`, `Repository=scott-r-lindsey/foom-site`, `ManagedBy=Terraform` for environment resources; bootstrap uses its separate management owner |
| Account GitHub OIDC provider | Confirmed reuse: `arn:aws:iam::225319921763:oidc-provider/token.actions.githubusercontent.com`, audience `sts.amazonaws.com`                                                                         |
| Development role             | Planned: `foom-site-github-development-deploy`, ARN `arn:aws:iam::225319921763:role/foom-site-github-development-deploy`                                                                             |
| Production role              | Planned: `foom-site-github-production-deploy`, ARN `arn:aws:iam::225319921763:role/foom-site-github-production-deploy`                                                                               |
| GitHub repository variables  | Default: `DEV_AWS_DEPLOY_ROLE_ARN` and `PROD_AWS_DEPLOY_ROLE_ARN` set to the respective planned ARNs, `AWS_REGION=us-west-2`; reviewed configuration holds domain/zone/backend inputs                |
| Retention and access         | Default: retain prior fingerprinted assets and compatible rollback artifacts/metadata for at least 30 days after supersession; Scott owns cleanup, bootstrap and recovery authorization              |

`www.foom-term.com` is an optional follow-up, not an approved alias or prerequisite.
Adding it later requires an explicit domain/redirect decision, certificate and
DNS changes. The current scope includes only the confirmed apex and dev names.

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

| Trigger                             | Environment and state                      | Credentials and result                                        |
| ----------------------------------- | ------------------------------------------ | ------------------------------------------------------------- |
| Same-repository PR targeting `main` | Shared `dev`; only dev state and resources | Development role; deploy exact validated development artifact |
| Push to `main`                      | `prod`; only prod state and resources      | Production role; deploy exact validated production artifact   |
| Fork PR or other branch/event       | No deployment                              | Validation only, no deployment role or OIDC credential job    |

Shared dev is one mutable preview URL, not a per-PR environment. A deployment
from another PR replaces the visible preview; closing one PR must not destroy
shared dev. The run summary must identify URL, PR/commit, and deployed artifact.
Separate buckets, state and role permissions must prevent dev changes from
modifying prod.

Use one deployment concurrency group per environment across all PRs/runs,
covering apply and publication, with in-progress mutation cancellation disabled.
Never cancel an in-progress apply to favor a newer build. Backend state locking
is required in addition to workflow serialization.

The shared-dev default is **latest eligible run**, ordered by the original
validation run's creation time across all eligible same-repository PRs (run ID
breaks ties); a retry retains its original position. Eligible means the PR is
still open against `main`, its current head/base match the validated artifact,
and all required checks passed with the approved dev origin. Before mutation
under the environment lock, #11 must reject superseded candidates and candidates
older than the last published run; GitHub queue order is not a freshness check.
A newer failed or still-running validation does not displace the latest passing
eligible run. Once publication begins it completes under the lock; a newly
eligible run can replace it afterward. This deliberately allows one PR to
replace another's preview, with no per-PR persistence guarantee.

For prod, require the validated latest `main` commit at the freshness check;
reject stale queued commits. Intentional rollback is Scott-authorized, explicit,
and serialized through the same environment lock, rather than a stale-run
bypass. #11 implements these checks and records run/artifact provenance.

## State, ownership, and bootstrap boundary

| Boundary                                        | Resources and responsibility                                                                                                   | Recovery/management contract                                                                                                                                                                   |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Shared prerequisites, outside environment state | AWS account, domain registration/delegation, hosted zone, state bucket/encryption/backup/locking, account GitHub OIDC provider | Scott coordinates external account/DNS/backend owners to verify and restore these independently. Missing shared resources require separate authorization; app teardown must never remove them. |
| Foom bootstrap, outside environment state       | Separate dev/prod IAM roles, trust and permission policies, GitHub variables and any environment protection settings           | Scott with separately authorized administrative access creates/restores these before CI can authenticate. App roles cannot grant themselves access or change their own trust.                  |
| Foom environment state, separate for dev/prod   | Site bucket/content ownership, OAC, distribution, routing/cache/security policies, ACM certificate and Foom DNS records        | #10 defines lifecycle and content ownership; #11 publishes through the matching role. No resource or object is managed by two states or competing publishers.                                  |

The state backend contract requires encrypted transport/storage, versioned state
backups and S3 lock files. Dev permissions cover only its effective state and
lock keys; prod permissions cover only prod's. Scope bucket listing by the
required prefixes. Permit state read/write and lock creation/read/deletion
without granting blanket state deletion or access to other applications.
No customer-managed KMS key is selected by this contract. If the shared backend
requires one, Scott must supply its ARN and scope access to the required use
before deployment; do not change shared encryption settings. Neither application
role owns the shared backend bucket, zone, or OIDC provider. Shared DNS
validation records must have one explicit owner if environments overlap.

Bootstrap documentation in #11 must record reviewed policies and restoration
steps using these inputs, with offline-reviewed trust/permissions before any
separately authorized creation. Discovery authorizes no cloud
commands. Any later offline plan must use explicit mocks/offline provider
configuration; a local backend alone does not prevent cloud access.

## OIDC trust and least privilege

Both role trusts must allow `sts:AssumeRoleWithWebIdentity` only for the
confirmed provider, with `StringEquals` conditions for audience
`sts.amazonaws.com` and the exact environment-specific subject below. No wildcard
repository or branch trust.

Repository API evidence supplied by the orchestrator on **2026-10-15** from
`GET /repos/scott-r-lindsey/foom-site/actions/oidc/customization/sub`:

```text
use_default: true
use_immutable_subject: true
sub_claim_prefix: repo:scott-r-lindsey@457016/foom-site@1421149044
```

Exact trusted subjects:

- Dev: `repo:scott-r-lindsey@457016/foom-site@1421149044:pull_request`.
- Prod: `repo:scott-r-lindsey@457016/foom-site@1421149044:ref:refs/heads/main`.

The immutable subject applies despite `use_default: true`; the standard subject
without IDs is not the confirmed configuration. Never copy Crab Attack's
repository ID. Recheck the repository configuration before restoring trust;
if it changes, review exact subjects rather than broadening the policy.
GitHub Environments are not selected by this default: introducing them changes
the subject contract and requires explicit trust and branch-protection review.

The PR subject does not distinguish fork PRs from same-repository PRs. #11 must
explicitly check the head repository before granting access to a credential-bearing
job. Fork PR validation must never reach that job, and untrusted PR code must not
run with credentials via `pull_request_target`.
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

The offline infrastructure and publication contract are implemented in
[terraform/README.md](../terraform/README.md). The following requirements also
govern #11's transport/workflow and authorized live verification:

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
  them. Retain old hashes for at least 30 days after supersession so cached HTML and open
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

## Implementation readiness and deployment verification

The deployment-specific configuration required by #9 is supplied; there are no
remaining discovery inputs blocking #10 design/implementation after integration.
#10 owns Terraform and offline validation; #11 owns deployment workflows,
bootstrap instructions/policies and publication/cleanup behavior. The existing
[Quality workflow artifacts](ci.md#artifact-contract) are validation-only with
reserved test origins and `deployable: false`; they must not be published.
#11 must validate artifacts built with `https://dev.foom-term.com` or
`https://foom-term.com` as appropriate, and preserve the checks/provenance contract.

Before any real deployment, Scott must separately authorize cloud access and
coordinate these operational checks; none are claimed verified here:

1. Confirm target account access, Foom zone ownership and registrar delegation,
   and authority for the exact alias and ACM validation records. Do not use the
   Crab Attack zone or manage delegation from environment state.
2. Verify live shared backend/provider existence, region, encryption, backup,
   locking and scoped access. Restore missing shared prerequisites through
   their external owners, without adopting or recreating them in app state.
3. Confirm planned bucket names are available, create/reconcile the separate
   Foom roles with reviewed trust and least-privilege policies, and configure
   repository variables and approved deployment access. Role ARNs above are
   planned identities, not evidence of created roles or working authentication.
4. Verify DNS validation, routing/404 status, headers/cache behavior, artifact
   publication order, retention and rollback in authorized dev deployment
   before production. Record live evidence separately from offline checks.

Optional aliases, live bootstrap verification and cloud authorization are later
operational steps, not reasons to leave this discovery issue open. This contract
does not authorize provisioning, deployment triggers or cloud API probes.
