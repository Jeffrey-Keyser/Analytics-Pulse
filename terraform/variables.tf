# Core Configuration Variables
variable "service_name" {
  description = "Name of the service (used for resource naming)"
  type        = string
  default     = "serverlesswebtemplate"
  validation {
    condition     = can(regex("^[a-z0-9-]+$", var.service_name))
    error_message = "Service name must be lowercase letters, numbers, and hyphens only."
  }
}

variable "domain_name" {
  description = "Primary domain name for the application"
  type        = string
  default     = "example.com" # TODO: Update with your actual domain
}

variable "region" {
  description = "AWS region to deploy resources"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
  default     = "prod"
  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be one of: dev, staging, prod."
  }
}

# Lambda Configuration
variable "lambda_memory_size" {
  description = "Memory size for Lambda function in MB"
  type        = number
  default     = 256
}

variable "lambda_timeout" {
  description = "Timeout for Lambda function in seconds"
  type        = number
  default     = 10
}

# Domain Configuration
variable "alternative_domain_names" {
  description = "Alternative domain names (e.g., www subdomain)"
  type        = list(string)
  default     = [] # e.g., ["www.example.com"]
}

# Container Configuration
variable "ecr_force_delete" {
  description = "Force delete ECR repository on destroy"
  type        = bool
  default     = true
}

# Storage Configuration
variable "s3_force_destroy" {
  description = "Force destroy S3 bucket on terraform destroy"
  type        = bool
  default     = true
}

variable "s3_versioning_enabled" {
  description = "Enable versioning on S3 bucket"
  type        = bool
  default     = false
}

# CDN Configuration
variable "cloudfront_price_class" {
  description = "CloudFront distribution price class"
  type        = string
  default     = "PriceClass_100"
}

variable "cloudfront_geo_restriction_type" {
  description = "Type of geographic restriction"
  type        = string
  default     = "whitelist"
}

variable "cloudfront_geo_restriction_locations" {
  description = "List of country codes for geographic restriction"
  type        = list(string)
  default     = ["US"]
}

# Security Features
variable "enable_waf" {
  description = "Enable AWS WAF for CloudFront"
  type        = bool
  default     = false
}

variable "enable_custom_error_pages" {
  description = "Enable custom error pages for CloudFront"
  type        = bool
  default     = true
}

# Monitoring Configuration
variable "log_retention_days" {
  description = "CloudWatch log retention in days"
  type        = number
  default     = 7
}

variable "enable_api_gateway_logging" {
  description = "Enable API Gateway access logging"
  type        = bool
  default     = false
}

# Authentication Configuration
variable "jwt_secret" {
  description = "JWT secret for token signing and verification (auto-generated during setup)"
  type        = string
  sensitive   = true

  validation {
    condition     = var.jwt_secret != "your-super-secret-jwt-key-change-this-in-production"
    error_message = "JWT secret must be changed from the default placeholder value. Run setup script to auto-generate."
  }

  validation {
    condition     = length(var.jwt_secret) >= 32
    error_message = "JWT secret must be at least 32 characters for security."
  }
}

# GitHub Integration
variable "github_owner" {
  description = "GitHub repository owner"
  type        = string
  default     = "yourorg" # TODO: Update with your GitHub org/username
}

variable "github_repository" {
  description = "GitHub repository name"
  type        = string
  default     = "ServerlessWebTemplate"
}

variable "github_token" {
  description = "GitHub token for Terraform provider"
  type        = string
  sensitive   = true
}

variable "enable_github_oidc" {
  description = "Enable GitHub OIDC for CI/CD"
  type        = bool
  default     = true
}

# GitHub Personal Access Token (for accessing private actions)
variable "github_personal_access_token" {
  description = "GitHub Personal Access Token for private actions access"
  type        = string
  sensitive   = true
}

# AWS Credentials (only required if OIDC is disabled)
variable "aws_access_key_id" {
  description = "AWS Access Key ID (only used if enable_github_oidc is false)"
  type        = string
  sensitive   = true
  default     = ""
}

variable "aws_secret_access_key" {
  description = "AWS Secret Access Key (only used if enable_github_oidc is false)"
  type        = string
  sensitive   = true
  default     = ""
}

# CORS Configuration
variable "cors_allowed_origins" {
  description = "List of allowed origins for CORS. Note: Due to CORS specification, only the first origin is used. For multiple domains, implement dynamic origin validation in your application. Example: ['https://yourdomain.com']"
  type        = list(string)
  default     = ["*"]
}

variable "cors_allow_credentials" {
  description = "Whether to allow credentials in CORS requests"
  type        = bool
  default     = false
}

variable "cors_allowed_methods" {
  description = "Comma-separated list of allowed HTTP methods for CORS"
  type        = string
  default     = "GET,POST,PUT,DELETE,OPTIONS"
}

variable "cors_allowed_headers" {
  description = "Comma-separated list of allowed headers for CORS"
  type        = string
  default     = "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token"
}

# Tags
variable "additional_tags" {
  description = "Additional tags to apply to all resources"
  type        = map(string)
  default     = {}
}