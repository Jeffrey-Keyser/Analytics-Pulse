# GitHub Actions Variables - Infrastructure outputs automatically configured
resource "github_actions_variable" "aws_ecr_url" {
  repository    = var.github_repository
  variable_name = "AWS_ECR_URL"
  value         = module.serverless_web_infra.ecr_repository_url
}

resource "github_actions_variable" "aws_s3_bucket_name" {
  repository    = var.github_repository
  variable_name = "AWS_S3_BUCKET_NAME"
  value         = module.serverless_web_infra.s3_bucket_name
}

resource "github_actions_variable" "aws_lambda_function_name" {
  repository    = var.github_repository
  variable_name = "AWS_LAMBDA_FUNCTION_NAME"
  value         = module.serverless_web_infra.lambda_function_name
}

resource "github_actions_variable" "api_base_url" {
  repository    = var.github_repository
  variable_name = "API_BASE_URL"
  value         = module.serverless_web_infra.api_url
}

resource "github_actions_variable" "app_url" {
  repository    = var.github_repository
  variable_name = "APP_URL"
  value         = module.serverless_web_infra.frontend_url
}

# GitHub Actions Secrets - Sensitive infrastructure outputs
resource "github_actions_secret" "aws_cloudfront_distribution_id" {
  repository      = var.github_repository
  secret_name     = "AWS_CLOUDFRONT_DISTRIBUTION_ID"
  plaintext_value = module.serverless_web_infra.cloudfront_distribution_id
}

# GitHub OIDC Role ARN for AWS authentication (recommended over static credentials)
resource "github_actions_variable" "github_oidc_role_arn" {
  count         = var.enable_github_oidc ? 1 : 0
  repository    = var.github_repository
  variable_name = "AWS_ROLE_ARN"
  value         = module.serverless_web_infra.github_oidc_role_arn
}

# AWS Region for GitHub Actions
resource "github_actions_variable" "aws_region" {
  repository    = var.github_repository
  variable_name = "AWS_REGION"
  value         = var.region
}

# GitHub Personal Access Token for Actions (for accessing private actions)
resource "github_actions_secret" "private_actions_token" {
  repository      = var.github_repository
  secret_name     = "PRIVATE_ACTIONS_TOKEN"
  plaintext_value = var.github_personal_access_token
}

# AWS credentials for GitHub Actions (only created if OIDC is disabled)
# When OIDC is enabled, GitHub Actions uses temporary credentials via the OIDC role
resource "github_actions_secret" "aws_access_key_id" {
  count           = var.enable_github_oidc ? 0 : 1
  repository      = var.github_repository
  secret_name     = "AWS_ACCESS_KEY_ID"
  plaintext_value = var.aws_access_key_id
}

resource "github_actions_secret" "aws_secret_access_key" {
  count           = var.enable_github_oidc ? 0 : 1
  repository      = var.github_repository
  secret_name     = "AWS_SECRET_ACCESS_KEY"
  plaintext_value = var.aws_secret_access_key
}