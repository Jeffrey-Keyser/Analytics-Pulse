# Terraform Deployment Guide

## Initial Deployment Steps

Due to circular dependencies in the infrastructure, follow these steps for the first deployment:

### Step 1: Deploy ECR Repository First
```bash
terraform apply -target=module.serverless_web_infra.aws_ecr_repository.ecr_repo
```

### Step 2: Build and Push Docker Image
After ECR is created, commit your code and push to GitHub to trigger the Docker build:
```bash
git add .
git commit -m "Initial setup"
git push origin main
```

Wait for the GitHub Actions workflow to build and push the Docker image to ECR.

### Step 3: Deploy Core Infrastructure
Deploy the main infrastructure without certificates initially:
```bash
terraform apply -target=module.serverless_web_infra -var="enable_github_oidc=false"
```

### Step 4: Configure DNS (if using custom domain)
1. If creating a new Route53 zone, update your domain's nameservers with the values from the Terraform output
2. Wait for DNS propagation (can take up to 48 hours)

### Step 5: Request SSL Certificates
Once DNS is configured:
```bash
terraform apply -target=module.serverless_web_infra.aws_acm_certificate.cloudfront_cert
terraform apply -target=module.serverless_web_infra.aws_acm_certificate.api_cert
```

### Step 6: Final Deployment
After certificates are validated:
```bash
terraform apply
```

### Step 7: Enable GitHub OIDC (Optional)
To use GitHub OIDC instead of static credentials:
1. Update `terraform.tfvars` to set `enable_github_oidc = true`
2. Run `terraform apply`
3. Remove AWS access key secrets from GitHub and use the AWS_ROLE_ARN instead

## Troubleshooting

### Certificate Validation Issues
- Ensure your domain's nameservers are pointing to the Route53 zone
- Check that the validation CNAME records were created
- Certificate validation can take 5-30 minutes

### API Gateway Domain Issues
The error about `count` depending on `api_certificate_arn` is expected during initial deployment. Following the step-by-step approach above will resolve this.

### GitHub OIDC Issues
- The OIDC role is only created when `enable_github_oidc = true`
- Keep it disabled for initial deployment, then enable it later

## Clean Deployment Script

For a completely automated deployment, create this script:

```bash
#!/bin/bash
set -e

echo "Step 1: Creating ECR repository..."
terraform apply -target=module.serverless_web_infra.aws_ecr_repository.ecr_repo -auto-approve

echo "Step 2: Please commit and push your code to trigger Docker build"
echo "Press enter when the Docker image has been pushed to ECR..."
read

echo "Step 3: Deploying core infrastructure..."
terraform apply -auto-approve

echo "Deployment complete!"
```