terraform {
  required_version = "= 1.15.9"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "= 6.21.0"
    }
  }
  backend "s3" {
    bucket               = "terraform-state-xxx"
    region               = "us-east-1"
    key                  = "terraform.tfstate"
    workspace_key_prefix = "foom-site"
    encrypt              = true
    use_lockfile         = true
  }
}

provider "aws" {
  region              = "us-west-2"
  allowed_account_ids = ["225319921763"]
  default_tags { tags = local.tags }
}
provider "aws" {
  alias               = "certificate"
  region              = "us-east-1"
  allowed_account_ids = ["225319921763"]
  default_tags { tags = local.tags }
}

variable "environment" {
  type = string
  validation {
    condition     = contains(["dev", "prod"], var.environment)
    error_message = "Environment must be dev or prod."
  }
}
locals {
  name   = "foom-site-${var.environment}"
  domain = var.environment == "prod" ? "foom-term.com" : "dev.foom-term.com"
  zone   = "Z0451547IUIBRZP42UO4"
  tags = {
    Application = "foom-site"
    Environment = var.environment
    Repository  = "scott-r-lindsey/foom-site"
    ManagedBy   = "Terraform"
  }
}
resource "terraform_data" "environment" {
  lifecycle {
    precondition {
      condition     = contains(["dev", "prod"], terraform.workspace) && terraform.workspace == var.environment
      error_message = "Select dev/prod workspace matching environment; default is forbidden."
    }
  }
}
