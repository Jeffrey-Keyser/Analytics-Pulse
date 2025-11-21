# Provider configuration
terraform {
  required_version = ">= 1.13.5"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    github = {
      source  = "integrations/github"
      version = "~> 6.4.0"
    }
  }
  
  # Configure remote backend (centralized state management)
  backend "s3" {
    bucket = "tf-state-jeffrey-keyser-prod"  
    key    = "SERVICE_NAME_PLACEHOLDER/terraform.tfstate"
    region = "us-east-1"
  }
}

# GitHub provider configuration
provider "github" {
  token = var.github_token
}

# Main serverless web infrastructure module
module "serverless_web_infra" {
  source = "git::https://github.com/Jeffrey-Keyser/serverless-web-infra.git?ref=v1.5.0"

  # Core Configuration
  service_name = var.service_name
  domain_name  = var.domain_name
  region       = var.region
  environment  = var.environment

  # Lambda Configuration
  lambda_memory_size = var.lambda_memory_size
  lambda_timeout     = var.lambda_timeout
  lambda_environment_variables = {
    NODE_ENV         = var.environment == "prod" ? "production" : var.environment
    ORIGIN_BASE_URL  = "https://api.${var.domain_name}"
    CORS_ALLOWED_ORIGINS = join(",", var.cors_allowed_origins)
    NODE_TLS_REJECT_UNAUTHORIZED = "0"
    JWT_SECRET        = var.jwt_secret
    PAY_SERVICE_URL   = "https://pay.jeffreykeyser.net"
  }

  # Database Configuration
  database_environment_variables = {
    DB_USER     = data.terraform_remote_state.shared_infra.outputs.db_username
    DB_PASSWORD = data.terraform_remote_state.shared_infra.outputs.db_password
    DB_HOST     = data.terraform_remote_state.shared_infra.outputs.db_alias
    DB_PORT     = data.terraform_remote_state.shared_infra.outputs.db_port
    DB_NAME     = "postgres"
    DB_SSLMODE  = data.terraform_remote_state.shared_infra.outputs.ssl_mode_recommendation
  }

  # Domain Configuration
  alternative_domain_names = var.alternative_domain_names
  
  # Route53 zone configuration from shared infrastructure
  route53_zone_config = {
    zone_id     = data.terraform_remote_state.shared_dns_zones.outputs.zone_id
    domain_name = data.terraform_remote_state.shared_dns_zones.outputs.domain_name
  }

  # Container Configuration
  ecr_force_delete    = var.ecr_force_delete

  # Storage Configuration
  s3_force_destroy       = var.s3_force_destroy
  s3_versioning_enabled  = var.s3_versioning_enabled

  # CDN Configuration
  cloudfront_price_class             = var.cloudfront_price_class
  cloudfront_geo_restriction_type    = var.cloudfront_geo_restriction_type
  cloudfront_geo_restriction_locations = var.cloudfront_geo_restriction_locations

  # Security Features
  enable_waf                  = var.enable_waf
  enable_custom_error_pages   = var.enable_custom_error_pages

  # Monitoring
  log_retention_days        = var.log_retention_days
  enable_api_gateway_logging = var.enable_api_gateway_logging

  # GitHub Integration for CI/CD
  github_owner       = var.github_owner
  github_repository  = var.github_repository
  enable_github_oidc = var.enable_github_oidc

  # CORS Configuration
  cors_allowed_origins   = var.cors_allowed_origins
  cors_allow_credentials = var.cors_allow_credentials
  cors_allowed_methods   = var.cors_allowed_methods
  cors_allowed_headers   = var.cors_allowed_headers

  # VPC Configuration
  vpc_id     = data.terraform_remote_state.shared_infra.outputs.shared_vpc_id
  subnet_ids = data.terraform_remote_state.shared_infra.outputs.private_subnet_ids
  security_group_ids = [data.terraform_remote_state.shared_infra.outputs.lambda_security_group_id]

  # Tags
  tags = merge(
    {
      Project     = "ServerlessWebTemplate"
      Environment = var.environment
      ManagedBy   = "terraform"
    },
    var.additional_tags
  )
}

