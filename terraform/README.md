# ServerlessWebTemplate Infrastructure

This directory contains the Terraform configuration for deploying the ServerlessWebTemplate application using the `serverless-web-infra` module.

## Quick Start

1. **Copy terraform.tfvars**:
   ```bash
   cp terraform.tfvars.example terraform.tfvars
   ```

2. **Update variables**:
   - Set your domain name
   - Configure GitHub repository details
   - Update shared infrastructure settings

3. **Set environment variables**:
   ```bash
   export TF_VAR_github_token="your_github_token"
   ```

4. **Initialize and deploy**:
   ```bash
   terraform init
   terraform plan
   terraform apply
   ```

## Configuration

### Required Variables

Update these in `terraform.tfvars`:

- `service_name` - Name of your service
- `domain_name` - Your domain (e.g., "example.com")
- `github_owner` - Your GitHub org/username
- `github_repository` - Repository name

### Backend Configuration

The S3 backend is pre-configured with centralized state management in `main.tf`. During project setup, the service name is automatically inserted into the key:

```hcl
backend "s3" {
  bucket = "tf-state-jeffrey-keyser-prod"
  key    = "{service_name}/terraform.tfstate"
  region = "us-east-1"
}
```

Each project's state is stored using its service name as the key (e.g., `my-service/terraform.tfstate`), ensuring unique state files within the centralized bucket. The setup scripts automatically replace the placeholder with your actual service name.

## Outputs

After deployment, you'll get:

- `frontend_url` - Your application URL
- `api_url` - API base URL
- `ecr_repository_url` - Container registry URL
- `github_oidc_role_arn` - CI/CD role ARN

## CI/CD Setup

1. Add GitHub secrets:
   ```
   AWS_ROLE_ARN: (from github_oidc_role_arn output)
   S3_BUCKET: (from s3_bucket_name output)
   ECR_REPOSITORY: (from ecr_repository_url output)
   CLOUDFRONT_DISTRIBUTION_ID: (from cloudfront_distribution_id output)
   ```

2. Use in GitHub Actions:
   ```yaml
   - name: Configure AWS credentials
     uses: aws-actions/configure-aws-credentials@v4
     with:
       role-to-assume: ${{ secrets.AWS_ROLE_ARN }}
       aws-region: us-east-1
   ```

## Migration from Old Terraform

The new configuration replaces the entire `terraform/` directory. To migrate:

1. **Backup current state**:
   ```bash
   terraform state pull > backup.tfstate
   ```

2. **Import existing resources** (if needed):
   ```bash
   terraform import module.serverless_web_infra.module.compute.aws_lambda_function.main your-function-name
   # ... repeat for other resources
   ```

3. **Update CI/CD workflows** to use new outputs

## Troubleshooting

### Domain Validation

If certificate validation fails:
- Ensure Route53 zone is created first
- Check DNS propagation: `dig NS your-domain.com`

### Lambda Deployment

Container image must exist in ECR before first deployment:
```bash
# Build and push initial image
docker build -t serverlesswebtemplate .
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin $ECR_URL
docker tag serverlesswebtemplate:latest $ECR_URL:latest
docker push $ECR_URL:latest
```