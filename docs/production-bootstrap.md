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

## Publication and verification boundary

Production publication runs on push to `main`, consuming the exact checked
production artifact after the required Quality gate. A PR does not publish to
production. This bootstrap does not establish successful production OIDC,
publication, hosted verification, or rollback.

After the bootstrap PR is merged by the integration owner, record its main
publication run, source/artifact/release identity and completed invalidation.
Then compare the exact deployed artifact with headless
`playwright.hosted.config.ts` checks against `https://foom-term.com`, confirm
production canonical/sitemap/indexing and development noindex, and rehearse
retained-release recovery through `PROD_RECOVERY_RELEASE`. Clear the recovery
variable afterward and record restoration and journal evidence. The current
hosted configuration and metadata assertions are development-only and must be
extended to accept the explicit production origin before those checks can run;
production must keep development-only verification fixtures absent.

## Offline evidence

Local validation is separate from the authorized AWS work above. Node 24.17.0
and pnpm 11.19.0 frozen installation, lint and typecheck passed. All 16 offline
deployment tests passed. Terraform formatting, backend-disabled initialization,
validation and explicitly mocked dev/prod/default-workspace tests passed
(3 + 3 + 1 cases), with AWS credentials/configuration disabled and a separate
Terraform data directory. These checks do not prove production publication or
CI infrastructure permissions. PR CI evidence is recorded in the PR; no hosted
checks have run as part of this bootstrap.
