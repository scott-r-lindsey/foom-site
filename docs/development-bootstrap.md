# Development bootstrap and verification

Scott authorized AWS bootstrap and the first development-only deployment on
2026-10-15. Production remains disabled and outside this authorization.
This supplements the preparation instructions in [deployment.md](deployment.md).

## Verified prerequisites

- AWS identity resolves to approved account `225319921763`.
- Public zone `Z0451547IUIBRZP42UO4` is `foom-term.com`; public registrar
  delegation matches its four Route 53 name servers.
- The shared backend `terraform-state-xxx` is in us-east-1 and uses AES256
  server-side encryption. No Foom state existed before bootstrap.
- The existing GitHub OIDC provider accepts audience `sts.amazonaws.com`.
  GitHub reports immutable repository subject prefix
  `repo:scott-r-lindsey@457016/foom-site@1421149044`.
- Scott explicitly declined enabling shared backend versioning. The bucket
  remains unchanged. Bootstrap retains separate restricted local Foom state
  snapshots; these are not committed and are not automatic ongoing backups.
  Capture the dev state before future infrastructure changes and preserve it in
  operator-controlled storage. S3 locking protects concurrent writes, not recovery
  from a lost or overwritten state file. Never recreate resources blindly if
  state is missing.

## Dev bootstrap scope

The reviewed Terraform plan contains 17 creates, zero changes, zero destroys:
private dev bucket, OAC, CloudFront and routing/cache/response policies, ACM
certificate in us-east-1, and only dev alias/validation records. State is isolated
at `foom-site/dev/terraform.tfstate`. Existing shared resources remain externally
owned. The application bucket retains its committed versioning configuration;
the owner's no-versioning decision applies to the shared state bucket.

The GitHub role `foom-site-github-development-deploy` uses the exact PR subject
and receives only the environment's publication policy, with its actual
CloudFront distribution ARN. It receives no infrastructure, backend or IAM
mutation permissions. Infrastructure approval variables remain absent.

Live publication evidence will be recorded after the first successful gated run.
