# Static hosting infrastructure

This root owns one environment's private S3 REST origin, OAC, CloudFront
function/distribution/cache/header policies, ACM certificate and Route 53 alias
and validation records. It does not own shared prerequisites, bootstrap IAM,
GitHub settings, or published objects. Approved identities and ownership are in
[hosting.md](../docs/hosting.md). Development and production infrastructure have
been bootstrapped through separately authorized operator actions; see
[development](../docs/development-bootstrap.md) and
[production](../docs/production-bootstrap.md) evidence. Production publication and
hosted verification have passed; production rollback rehearsal remains pending.

Terraform **1.15.9** and AWS provider **6.21.0** are pinned; commit the provider
lockfile. The certificate provider alias uses `us-east-1`; the default provider
uses `us-west-2`. Both restrict the account to `225319921763`. Environment default
tags identify the repository, application, environment and management owner.
Only matching `dev`/`prod` workspaces and `environment` inputs are accepted;
`default`, unknown inputs and mismatches fail a resource precondition (not a
nonblocking check). Each workspace creates only its own environment. The backend
uses the exact approved prefix/key, encryption and S3 lockfiles. Offline quality CI never selects or initializes that backend. The future
explicitly approved trusted-main deployment path can initialize it under the
environment lock; see [deployment operations](../docs/deployment.md). Its live
configuration and permissions require separate authorization and review.

## Credential-free checks

From the repository root, with no AWS credentials:

```sh
terraform -chdir=terraform fmt -check -recursive
terraform -chdir=terraform init -backend=false -lockfile=readonly
terraform -chdir=terraform validate
TF_WORKSPACE=dev terraform -chdir=terraform test -var=environment=dev
TF_WORKSPACE=prod terraform -chdir=terraform test -var=environment=prod
TF_WORKSPACE=default terraform -chdir=terraform test -test-directory=guard-tests
pnpm test:hosting
pnpm build
pnpm hosting:manifest
```

Provider installation downloads signed provider packages from the Terraform
registry; it does not contact AWS. All test runs explicitly use `command = plan`
and [mock providers](https://developer.hashicorp.com/terraform/language/tests/mocking),
including the certificate alias. `TF_WORKSPACE` here selects an in-memory test
workspace, without remote workspace commands. Mock plans are configuration
reviews, not proof of live AWS acceptance, resource existence or permissions.
Never substitute a normal provider-backed plan. Do not run backend initialization,
apply, destroy, import, state operations, cloud probes or deployment triggers as
part of these checks.

## Routing, errors and security

The viewer-request function runs before origin lookup. `/` and `/a/b/` rewrite
to their directory index; `/a/b` and `/a/b/index.html` redirect to `/a/b/` with
308 and preserve encoded query values, including repeats. Files with extensions
pass through; unknown directories still resolve to missing keys, not home HTML.
Ambiguous scheme-relative, backslash, whitespace and encoded separator/CRLF
paths fail with 400. Redirects use a same-origin path and never a request Host.
Queries do not vary static content and are excluded from the origin/cache key;
redirect queries are preserved. Root bucket requests always become `index.html`,
so the CDN cannot act as a ListObjects endpoint, even with listing query parameters.

S3 has all public access blocks, enforced bucket ownership, SSE-S3 encryption,
versioning and destruction protection. The bucket policy grants only GetObject
and ListBucket to the CloudFront service with this distribution's SourceArn.
ListBucket is deliberately bucket-wide **for that OAC distribution only**:
S3's [GetObject contract](https://docs.aws.amazon.com/AmazonS3/latest/API/API_GetObject.html)
requires this permission to distinguish missing objects (404) from access denied
(403). It grants no anonymous listing and no write/delete permissions.
CloudFront maps only 404 to `/404.html` with status 404; it never converts 403
or 5xx into a missing page. An inaccessible/missing error document must be treated
as an operational failure in live verification. S3 origins can cache errors for
at least one second even when the configured error TTL is zero.

HTTPS redirects, TLS 1.2 minimum, HSTS, nosniff, frame denial, referrer policy and
restricted browser capabilities apply through a response headers policy. HSTS
omits preload/includeSubDomains because those commitments are outside scope.
A CSP is deferred until the site has a reviewed script/style policy; Astro's
inline styles must remain usable. Function-generated redirects explicitly set
revalidation; live checks must also inspect function response headers.

## File publication contract for #11

`pnpm hosting:manifest` reads the **already checked** `dist/` and writes
`.cache/hosting/files.json`. The schema is implemented in
[manifest.ts](../scripts/hosting/manifest.ts) and tested with temporary fixtures.
It records every object key, byte count, lowercase hex SHA-256, base64 S3
`ChecksumSHA256`, exact Content-Type and Cache-Control. Unknown MIME types,
unsafe names, symlinks and missing home/error documents fail closed. The copied
`.gitkeep` marker is explicitly excluded. Extend the
MIME allowlist with tests when new formats land. The publisher must verify the
manifest again against the checked artifact immediately before uploading;
checksums bind bytes, not GitHub provenance. The CI artifact trust checks in
[ci.md](../docs/ci.md) remain required.

The upload adapter in #11 consumes each entry as PutObject metadata: `Key=key`,
`Body=artifact file`, `ContentType=contentType`, `CacheControl=cacheControl`,
`ChecksumSHA256=checksumSHA256`, and user metadata `sha256=sha256`. Do not use an
ETag as a content hash. No Terraform `aws_s3_object` resources or `sync --delete`
are permitted: Terraform manages infrastructure while the serialized publisher
owns all site objects. This implements #10's file metadata and upload ordering
contract offline; the credential-bearing transport/workflow belongs to #11.

HTML (including 404), robots, sitemap, manifests and stable names use
`public, max-age=0, must-revalidate`. CloudFront min/default TTLs are zero.
Only `_astro/` assets with a **full verified SHA-256 filename component** get
`public, max-age=31536000, immutable`. Astro/Vite's opaque short hashes currently
fall back to revalidation: a hash-shaped token alone is insufficient evidence.
This intentionally trades some cache efficiency for correctness and requires no
rewriting of generated files. Assets still upload first and retain old URLs.

`publication(next, previous)` returns the ordered contract:

1. Verify provenance, approved origin/environment and manifest bytes under the
   shared environment lock. Preserve the current validated archive, file manifest,
   release identity and durable publication journal before mutation. Refuse an
   immutable key whose existing recorded hash differs.
2. Upload **all assets** and confirm checksums before any document. Never delete
   superseded asset keys during publication, including opaque Astro hashes.
3. Upload documents/stable metadata (including 404), then remove only obsolete
   document keys returned by `removeDocuments` so removed pages become 404.
   Publication is not atomic; record each phase and stop on any failed upload.
4. Invalidate `/*` and await completion: this covers every canonical, explicit
   index, rewritten, removed and stable URL plus cached errors. Record success
   only after publication/invalidation completes. Do not only invalidate root.
5. Persist the active release and supersession timestamps. Preserve previous
   validated archives/manifests and retired assets for **at least 30 days after
   supersession**, not since upload. Keep a union of keys referenced by the active
   and every retained rollback release. Cleanup may remove only ledger-owned,
   retired asset keys older than that boundary and outside the protected union;
   `cleanupCandidates` implements the time/pin filter. Unknown objects, uncertain
   timestamps, failed releases and incomplete journals require reconciliation,
   not deletion. No bucket lifecycle rule expires current assets.

The #11 adapter must durably enforce these steps, including awaiting uploads and
invalidation and maintaining the ledger; this helper performs no cloud writes.
Use the same environment lock for cleanup and rollback. Reintroduction clears a
key's retirement time; later supersession starts a fresh 30-day interval. Never
apply the helper's cleanup filter to arbitrary bucket listings.

On partial failure, preserve both releases/assets, block cleanup, and finish the
journaled release or explicitly roll back under the lock. Rollback revalidates
and reuploads the prior exact archive's assets, then documents; removes documents
unique to the failed/new release; invalidates `/*`; and records a new active
release. Pin rollback artifacts beyond 30 days when operationally needed. Bucket
versioning alone is neither URL retention nor an application rollback procedure.

#11 implements the actual publisher/bootstrap and approved-origin artifact path;
#12 must record authorized live deep-link, query/redirect, 404 versus access-fault,
TLS/headers, freshness, retention and rollback checks in dev before production.

## Publication implementation

[#11 deployment preparation](../docs/deployment.md) now supplies the actual
AWS CLI adapter, trusted-main artifact verifier, durable journal, indefinite
archive/asset retention and explicit recovery/rollback selection. Publication and
infrastructure approval remain disabled by default in code. Publication is
operational in dev and enabled for prod through repository variables;
infrastructure approval remains absent. See the environment bootstrap evidence
above for live status. [Bootstrap review templates](bootstrap/README.md) are scoped offline
starting points, with initial infrastructure creation and policy expansion
reserved for the separately authorized bootstrap owner.
