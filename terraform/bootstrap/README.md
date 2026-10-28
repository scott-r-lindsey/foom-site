# Offline IAM review templates

`python3 terraform/bootstrap/policies.py dev` (or `prod`) prints separate trust,
publication, backend and infrastructure-maintenance policy documents. It makes
no cloud calls and provisions nothing. Split the documents before operator use;
the combined review JSON is not an IAM policy. Replace distribution/certificate
placeholders from the matching environment's approved outputs. Review with the
account owner before attaching anything. These templates do not create or adopt
the externally owned OIDC provider, backend or zone.

Trust uses the exact immutable repository subjects in [hosting.md](../../docs/hosting.md),
audience `sts.amazonaws.com`, and the confirmed account provider. There are no
GitHub Environments, trust wildcards, IAM mutations, PassRole or cross-environment
resources. Restore changed trust only after rechecking immutable subject settings.
The dev PR subject includes same-repository writers' dev trust boundary; fork
exclusion also depends on the trusted reusable workflow checks.

Publication grants own-bucket list/read/write, document-extension deletion and
invalidation/read-wait for one distribution. It explicitly denies deleting
`_releases/*`, including version deletion. It cannot clean assets or mutate
infrastructure. An initial bucket must be empty; ownership/journal recovery must
precede enabling publication against an existing bucket.

Backend access is separate: own environment prefix, Get/Put state and
Get/Put/Delete lock only. No state deletion, other environment keys, backend
configuration, bucket creation or KMS permissions. If shared backend encryption
requires KMS, obtain the exact approved key and scoped use from its external
owner; do not invent one. Backend discovery may need additional narrowly scoped
listing during authorized setup; review the provider's actual error first.

The maintenance template scopes bucket configuration, distribution, named routing
function, exact certificate and apex/dev alias records. It intentionally omits
initial creates, deletes/replacements, ACM validation CNAME writes (supply exact
owner-reviewed name once issued), Route53 change polling IDs and CloudFront
OAC/cache/header policy operations whose IAM APIs lack resource scoping. It is a
**review starting point, not a complete runnable initial-provisioning policy**.
Bootstrap must create those resources through separately authorized ownership and
provide exact IDs, then review required maintenance additions. Do not enable CI
infrastructure approval until this review and initial bootstrap are complete.

For each unavoidable wildcard action, document its service API, why resource
scoping is unsupported, its threat surface and the bootstrap owner's explicit
approval. In particular CloudFront Create/Get/Update/DeleteOriginAccessControl,
cache-policy and response-headers-policy APIs can require `Resource: "*"` and
cannot safely distinguish dev/prod by the invented application name. They are
not silently granted by these templates. Keep them bootstrap-owned if that
shared-account exposure is unacceptable. Read the current primary references:
[CloudFront actions/resources](https://docs.aws.amazon.com/service-authorization/latest/reference/list_cloudfront.html),
[Route53 record conditions](https://docs.aws.amazon.com/service-authorization/latest/reference/list_route53.html),
[ACM conditions](https://docs.aws.amazon.com/service-authorization/latest/reference/list_acm.html).
No wildcard is justified merely because Terraform reported access denied.

Restore roles/policies with separately authorized bootstrap administrative access;
CI cannot change its own role/trust. Preserve shared-resource ownership and state
recovery order from hosting discovery. [Deployment operations](../../docs/deployment.md)
describes disabled variables, trusted-main infrastructure approval, durable
retention and serialized rollback. No permissions or live behavior are claimed
verified here.

## First production workspace initialization

Only with explicit production bootstrap authorization, check that production
resources and state do not already exist. Preserve any existing state in
restricted operator backups and stop for reconciliation if resources or state
are unexpected. Use a restricted, operator-owned `TF_DATA_DIR` outside the
repository for live operations; keep offline validation in a separate directory.

For an absent production workspace, initialize the committed backend without a
workspace override, then create only `prod` with locking enabled:

```sh
unset TF_WORKSPACE
export TF_DATA_DIR=/absolute/operator/path/to/restricted/terraform-data
terraform -chdir=terraform init -input=false -lockfile=readonly
terraform -chdir=terraform workspace new -lock=true prod
export TF_WORKSPACE=prod
```

Do not plan or apply in `default`. Verify the only new backend key is
`foom-site/prod/terraform.tfstate` (plus a transient `.tflock`), confirm the
state is empty, and snapshot it to operator backups with directory mode `0700`
and file mode `0600`. Never print or commit state. Do not create another
workspace, change backend configuration, or touch development state.

Save a production plan with `-var=environment=prod` and `-out` pointing to a
restricted plan file. Review the action counts, resource addresses and production
targets before requesting apply approval. Apply only the approved saved file
after verifying its SHA-256, using the same `TF_DATA_DIR` and `TF_WORKSPACE=prod`;
capture a restricted post-apply state snapshot. Plans can contain sensitive data
and must remain outside Git. See [production bootstrap evidence](../../docs/production-bootstrap.md).
