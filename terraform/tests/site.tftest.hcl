mock_provider "aws" {
  override_during = plan
  mock_resource "aws_s3_bucket" {
    defaults = { arn = "arn:aws:s3:::mock-foom-site" }
  }
  mock_resource "aws_cloudfront_distribution" {
    defaults = { arn = "arn:aws:cloudfront::225319921763:distribution/MOCK" }
  }
}
mock_provider "aws" {
  alias           = "certificate"
  override_during = plan
  mock_resource "aws_acm_certificate" {
    defaults = {
      arn = "arn:aws:acm:us-east-1:225319921763:certificate/00000000-0000-0000-0000-000000000000"
      domain_validation_options = [{
        domain_name           = "mock.foom-term.com"
        resource_record_name  = "_validation.mock.foom-term.com"
        resource_record_type  = "CNAME"
        resource_record_value = "_validation.acm-validations.aws."
      }]
    }
  }
  mock_resource "aws_acm_certificate_validation" {
    defaults = { certificate_arn = "arn:aws:acm:us-east-1:225319921763:certificate/00000000-0000-0000-0000-000000000000" }
  }

}

run "environment_plan" {
  command = plan
  assert {
    condition     = aws_s3_bucket.site.bucket == "foom-site-${terraform.workspace}-225319921763-us-west-2" && !aws_s3_bucket.site.force_destroy
    error_message = "Bucket identity and destruction guard must be environment-specific."
  }
  assert {
    condition     = aws_s3_bucket_public_access_block.site.block_public_acls && aws_s3_bucket_public_access_block.site.block_public_policy && aws_s3_bucket_public_access_block.site.ignore_public_acls && aws_s3_bucket_public_access_block.site.restrict_public_buckets
    error_message = "All public access must be blocked."
  }
  assert {
    condition     = aws_s3_bucket_ownership_controls.site.rule[0].object_ownership == "BucketOwnerEnforced" && aws_s3_bucket_versioning.site.versioning_configuration[0].status == "Enabled" && one(aws_s3_bucket_server_side_encryption_configuration.site.rule).apply_server_side_encryption_by_default[0].sse_algorithm == "AES256"
    error_message = "Private origin requires ownership, versioning and encryption."
  }
  assert {
    condition     = aws_cloudfront_origin_access_control.site.signing_behavior == "always" && aws_cloudfront_origin_access_control.site.signing_protocol == "sigv4"
    error_message = "Origin reads must be signed."
  }
  assert {
    condition     = alltrue([for statement in slice(jsondecode(aws_s3_bucket_policy.site.policy).Statement, 0, 2) : statement.Principal.Service == "cloudfront.amazonaws.com" && statement.Condition.StringEquals["AWS:SourceArn"] == aws_cloudfront_distribution.site.arn]) && jsondecode(aws_s3_bucket_policy.site.policy).Statement[0].Action == "s3:GetObject" && jsondecode(aws_s3_bucket_policy.site.policy).Statement[1].Action == "s3:ListBucket" && jsondecode(aws_s3_bucket_policy.site.policy).Statement[1].Resource == aws_s3_bucket.site.arn
    error_message = "Reads and missing-key lookup must be limited to this OAC distribution."
  }
  assert {
    condition     = aws_cloudfront_response_headers_policy.site.security_headers_config[0].content_type_options[0].override && aws_cloudfront_response_headers_policy.site.security_headers_config[0].frame_options[0].frame_option == "DENY" && aws_cloudfront_response_headers_policy.site.security_headers_config[0].strict_transport_security[0].access_control_max_age_sec == 31536000
    error_message = "Security headers must be enabled."
  }
  assert {
    condition     = aws_cloudfront_cache_policy.site.min_ttl == 0 && aws_cloudfront_cache_policy.site.default_ttl == 0 && aws_cloudfront_cache_policy.site.max_ttl == 31536000
    error_message = "CDN must respect freshness and allow proven immutable assets."
  }
  assert {
    condition     = length(aws_cloudfront_distribution.site.custom_error_response) == 1 && one(aws_cloudfront_distribution.site.custom_error_response).error_code == 404 && one(aws_cloudfront_distribution.site.custom_error_response).response_code == 404 && one(aws_cloudfront_distribution.site.custom_error_response).response_page_path == "/404.html"
    error_message = "Only genuine 404s receive the error document; do not mask 403s or serve SPA fallback."
  }
  assert {
    condition     = aws_cloudfront_distribution.site.default_cache_behavior[0].viewer_protocol_policy == "redirect-to-https" && aws_cloudfront_distribution.site.viewer_certificate[0].minimum_protocol_version == "TLSv1.2_2021" && aws_acm_certificate.site.domain_name == (terraform.workspace == "prod" ? "foom-term.com" : "dev.foom-term.com")
    error_message = "TLS and sole approved alias must match environment."
  }
  assert {
    condition     = aws_route53_record.site["A"].zone_id == "Z0451547IUIBRZP42UO4" && aws_route53_record.site["AAAA"].zone_id == "Z0451547IUIBRZP42UO4" && local.tags.Environment == terraform.workspace
    error_message = "Use the Foom zone and environment tags."
  }
}
run "mismatched_environment" {
  command = plan
  variables { environment = run.environment_plan.publication.environment == "prod" ? "dev" : "prod" }
  expect_failures = [terraform_data.environment]
}
run "invalid_environment" {
  command = plan
  variables { environment = "staging" }
  expect_failures = [var.environment]
}
