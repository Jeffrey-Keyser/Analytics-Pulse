# Application URLs
output "frontend_url" {
  description = "Frontend application URL"
  value       = module.serverless_web_infra.frontend_url
}

output "api_url" {
  description = "API base URL"
  value       = module.serverless_web_infra.api_url
}

output "frontend_urls" {
  description = "All frontend URLs including alternatives"
  value       = module.serverless_web_infra.frontend_urls
}

# Infrastructure Details
output "lambda_function_name" {
  description = "Lambda function name"
  value       = module.serverless_web_infra.lambda_function_name
}

output "s3_bucket_name" {
  description = "S3 bucket name for frontend assets"
  value       = module.serverless_web_infra.s3_bucket_name
}

output "ecr_repository_url" {
  description = "ECR repository URL for container images"
  value       = module.serverless_web_infra.ecr_repository_url
}

output "cloudfront_distribution_id" {
  description = "CloudFront distribution ID for cache invalidation"
  value       = module.serverless_web_infra.cloudfront_distribution_id
}

# DNS Information
output "route53_zone_id" {
  description = "Route53 hosted zone ID"
  value       = module.serverless_web_infra.route53_zone_id
}

output "route53_name_servers" {
  description = "Route53 name servers (update domain registrar with these)"
  value       = module.serverless_web_infra.route53_name_servers
}

# CI/CD Information
output "github_oidc_role_arn" {
  description = "GitHub OIDC IAM role ARN for CI/CD"
  value       = module.serverless_web_infra.github_oidc_role_arn
  sensitive   = false
}

# Certificate Information
output "acm_certificate_arn" {
  description = "ACM certificate ARN for CloudFront"
  value       = module.serverless_web_infra.acm_certificate_arn
}

# Infrastructure Summary
output "infrastructure_summary" {
  description = "Summary of deployed infrastructure"
  value       = module.serverless_web_infra.infrastructure_summary
}