mock_provider "aws" { override_during = plan }
mock_provider "aws" {
  alias           = "certificate"
  override_during = plan
  mock_resource "aws_acm_certificate" {
    defaults = {
      arn = "arn:aws:acm:us-east-1:225319921763:certificate/00000000-0000-0000-0000-000000000000"
      domain_validation_options = [{
        domain_name           = "dev.foom-term.com"
        resource_record_name  = "_mock.dev.foom-term.com"
        resource_record_type  = "CNAME"
        resource_record_value = "_mock.acm-validations.aws."
      }]
    }
  }
  mock_resource "aws_acm_certificate_validation" {
    defaults = { certificate_arn = "arn:aws:acm:us-east-1:225319921763:certificate/00000000-0000-0000-0000-000000000000" }
  }

}
run "reject_default_workspace" {
  command = plan
  variables { environment = "dev" }
  expect_failures = [terraform_data.environment]
}
