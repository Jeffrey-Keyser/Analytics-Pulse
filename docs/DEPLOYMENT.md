# Deployment Guide

Complete guide to deploying Analytics-Pulse on AWS infrastructure.

## Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Deployment Options](#deployment-options)
- [Automated Deployment](#automated-deployment)
- [Manual Deployment](#manual-deployment)
- [Post-Deployment](#post-deployment)
- [CI/CD Pipeline](#cicd-pipeline)
- [Infrastructure Components](#infrastructure-components)
- [Environment Configuration](#environment-configuration)
- [Monitoring & Maintenance](#monitoring--maintenance)
- [Troubleshooting](#troubleshooting)

## Overview

Analytics-Pulse is deployed as a serverless application on AWS with the following architecture:

- **Frontend**: React app hosted on S3, distributed via CloudFront CDN
- **Backend**: Express.js API running on AWS Lambda (containerized)
- **Database**: PostgreSQL on Amazon RDS
- **Infrastructure**: Managed via Terraform
- **CI/CD**: GitHub Actions with OIDC authentication

**Deployment Time**: 8-10 minutes (automated) or 30-45 minutes (manual)

## Prerequisites

### Required Tools

Install these tools before deployment:

```bash
# Node.js 18+ and npm
node --version  # Should be 18.x or higher
npm --version

# Docker
docker --version

# Terraform 1.13.5+
terraform --version

# AWS CLI
aws --version

# Git
git --version
```

**Terraform Version Manager (recommended)**:
```bash
# Install tfenv
brew install tfenv  # macOS
# or
git clone https://github.com/tfutils/tfenv.git ~/.tfenv

# Install Terraform 1.13.5
tfenv install 1.13.5
tfenv use 1.13.5
```

### AWS Account Setup

1. **Create AWS Account**: [aws.amazon.com](https://aws.amazon.com)

2. **Create IAM User** with permissions:
   - `AdministratorAccess` (for initial setup)
   - Or custom policy with specific permissions (see below)

3. **Configure AWS CLI**:
   ```bash
   aws configure
   # Enter:
   # - AWS Access Key ID
   # - AWS Secret Access Key
   # - Default region (e.g., us-east-1)
   # - Default output format (json)
   ```

4. **Verify access**:
   ```bash
   aws sts get-caller-identity
   ```

### GitHub Setup

1. **Create GitHub Repository**:
   ```bash
   # Fork or create new repository
   gh repo create Analytics-Pulse --public
   ```

2. **Generate Personal Access Token (PAT)**:
   - Go to: Settings → Developer settings → Personal access tokens
   - Generate new token (classic)
   - Scopes required:
     - `repo` (full control)
     - `read:packages`
     - `write:packages` (if using GitHub Packages)
   - Save token securely

3. **Set environment variable**:
   ```bash
   export GITHUB_TOKEN="your_github_pat_here"
   ```

### Domain Name

Register a domain name:
- **Via AWS Route 53**: [console.aws.amazon.com/route53](https://console.aws.amazon.com/route53)
- **Via External Registrar**: GoDaddy, Namecheap, etc.

If using external registrar, you'll need to update nameservers after deployment.

## Deployment Options

### Option 1: Automated Deployment (Recommended)

Fastest path to production (8-10 minutes).

### Option 2: Manual Deployment

Step-by-step deployment for full control (30-45 minutes).

### Option 3: CI/CD Only

Use existing infrastructure, just set up CI/CD pipeline.

## Automated Deployment

### Single Command Deployment

```bash
# Clone repository
git clone https://github.com/Jeffrey-Keyser/Analytics-Pulse.git
cd Analytics-Pulse

# Set GitHub token
export GITHUB_TOKEN="your_github_pat_here"

# Run automated deployment
./scripts/new-service-auto.sh analytics-pulse yourdomain.com
```

### What the Script Does

The automated script performs these steps:

1. **Validate Prerequisites**
   - Checks for required tools
   - Verifies AWS credentials
   - Confirms Docker is running
   - Validates GitHub token

2. **Run Project Setup**
   - Creates Terraform configuration
   - Generates environment files
   - Sets up backend configuration
   - Configures CORS and domains

3. **Initialize Terraform**
   - Initializes Terraform backend
   - Downloads required providers
   - Configures remote state (S3)

4. **Create ECR Repository**
   - Targeted Terraform apply for ECR
   - Creates Docker image repository

5. **Build & Push Docker Image**
   - Builds server Docker image
   - Authenticates with ECR
   - Pushes image to registry

6. **Deploy Infrastructure**
   - Runs full Terraform apply
   - Creates all AWS resources
   - Configures GitHub secrets

7. **Configure Environment**
   - Extracts Terraform outputs
   - Updates server `.env` file
   - Updates client `.env` file

8. **Commit & Push**
   - Commits configuration changes
   - Pushes to GitHub
   - Triggers CI/CD pipeline

### Customization

Override defaults with environment variables:

```bash
export GITHUB_OWNER="your-organization"
export GITHUB_REPO="custom-repo-name"
export AWS_REGION="us-west-2"
export ENVIRONMENT="staging"
export DATABASE_SCHEMA="custom"

./scripts/new-service-auto.sh analytics-pulse yourdomain.com
```

### Non-Interactive Mode

For CI/CD and automation:

```bash
./scripts/new-service-auto.sh analytics-pulse yourdomain.com --yes
# or
./scripts/new-service-auto.sh analytics-pulse yourdomain.com -y
```

## Manual Deployment

### Step 1: Clone Repository

```bash
git clone https://github.com/Jeffrey-Keyser/Analytics-Pulse.git
cd Analytics-Pulse
```

### Step 2: Run Setup Script

**Interactive Mode**:
```bash
./setup-project.sh
```

**Non-Interactive Mode**:
```bash
export SETUP_SERVICE_NAME="analytics-pulse"
export SETUP_DOMAIN_NAME="analytics.yourdomain.com"
export SETUP_GITHUB_REPO="Analytics-Pulse"
export SETUP_GITHUB_OWNER="YourGitHubOrg"
export GITHUB_TOKEN="your_github_pat"

./setup-project.sh --non-interactive
```

The script will:
- Create `terraform/terraform.tfvars`
- Create `terraform/config.tf`
- Create `server/.env`
- Create `client/.env`
- Install dependencies

### Step 3: Review Configuration

**terraform/terraform.tfvars**:
```hcl
service_name = "analytics-pulse"
domain_name  = "analytics.yourdomain.com"
github_repo  = "Analytics-Pulse"
github_owner = "YourGitHubOrg"

# GitHub token for Terraform provider
github_token = "your_github_pat"

# GitHub token for accessing private actions
github_personal_access_token = "your_github_pat"

# JWT secret for authentication
jwt_secret = "generated_secure_random_string"

# Enable GitHub OIDC (recommended)
enable_github_oidc = true

# AWS credentials (only if OIDC disabled)
# aws_access_key_id     = "AKIAIOSFODNN7EXAMPLE"
# aws_secret_access_key = "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
```

**Important**: `terraform.tfvars` is gitignored and should never be committed!

### Step 4: Initialize Terraform

```bash
cd terraform

# Initialize backend
terraform init

# Verify configuration
terraform validate

# Review planned changes
terraform plan
```

### Step 5: Create ECR Repository

```bash
# Create ECR first (so Docker image has somewhere to go)
terraform apply -target=module.main.aws_ecr_repository.ecr_repo

# Note the ECR URL from output
terraform output ecr_repository_url
```

### Step 6: Build and Push Docker Image

```bash
# Navigate to root directory
cd ..

# Build server image
docker build -t analytics-pulse-server -f Dockerfile_Server ./server

# Get ECR URL from Terraform output
ECR_URL=$(cd terraform && terraform output -raw ecr_repository_url)

# Login to ECR
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin $ECR_URL

# Tag image
docker tag analytics-pulse-server:latest $ECR_URL:latest

# Push to ECR
docker push $ECR_URL:latest
```

### Step 7: Deploy Full Infrastructure

```bash
cd terraform

# Apply full infrastructure
terraform apply

# Review changes, type 'yes' to confirm
```

This creates:
- Lambda function (using ECR image)
- API Gateway
- RDS PostgreSQL instance
- S3 bucket for frontend
- CloudFront distribution
- Route 53 hosted zone & records
- ACM SSL/TLS certificate
- IAM roles and policies
- CloudWatch log groups
- GitHub OIDC provider (if enabled)
- GitHub repository secrets/variables

**Deployment Time**: ~15-20 minutes (mostly waiting for RDS and certificate validation)

### Step 8: Verify GitHub Secrets

```bash
cd ..
./scripts/verify-github-secrets.sh
```

Expected output:
```
✅ GitHub Variables:
  ✅ AWS_ROLE_ARN
  ✅ AWS_REGION
  ✅ AWS_ECR_URL
  ✅ AWS_LAMBDA_FUNCTION_NAME
  ✅ AWS_S3_BUCKET_NAME
  ✅ API_BASE_URL
  ✅ APP_URL

✅ GitHub Secrets:
  ✅ AWS_CLOUDFRONT_DISTRIBUTION_ID
  ✅ PRIVATE_ACTIONS_TOKEN

All required secrets and variables are configured!
```

### Step 9: Deploy Application Code

```bash
# Commit changes
git add .
git commit -m "chore: Configure infrastructure"

# Push to GitHub (triggers CI/CD)
git push origin main
```

GitHub Actions will:
1. Build server Docker image
2. Push to ECR
3. Update Lambda function
4. Build client React app
5. Sync to S3
6. Invalidate CloudFront cache

## Post-Deployment

### Update DNS (if using external registrar)

1. Get Route 53 nameservers:
   ```bash
   cd terraform
   terraform output route53_nameservers
   ```

2. Update your domain registrar:
   - Log in to registrar (GoDaddy, Namecheap, etc.)
   - Find DNS settings for your domain
   - Replace default nameservers with Route 53 nameservers
   - Save changes

3. Wait for DNS propagation (5 minutes to 48 hours, typically 1-2 hours)

4. Verify DNS:
   ```bash
   dig analytics.yourdomain.com
   nslookup analytics.yourdomain.com
   ```

### Wait for SSL Certificate

ACM will automatically validate your domain via DNS:

1. Check certificate status:
   ```bash
   aws acm list-certificates --region us-east-1
   aws acm describe-certificate --certificate-arn YOUR_CERT_ARN --region us-east-1
   ```

2. Validation time: 5-30 minutes

3. Once validated, CloudFront will use the certificate

### Access Your Application

Visit your deployed application:

```
Frontend: https://analytics.yourdomain.com
API: https://api.analytics.yourdomain.com
```

### Create First Project

1. Log in using Pay authentication
2. Click "Create New Project"
3. Enter project details
4. Generate API key
5. Install tracking code on your website

## CI/CD Pipeline

Analytics-Pulse uses GitHub Actions for continuous deployment.

### Workflows

**1. Lambda Deployment** (`.github/workflows/lambda-push.yml`):
- Triggers on push to `main` branch
- Builds server Docker image
- Pushes to ECR
- Updates Lambda function
- Runs on changes to `server/**`

**2. Client Deployment** (`.github/workflows/client-deploy.yml`):
- Triggers on push to `main` branch
- Builds React application
- Syncs to S3 bucket
- Invalidates CloudFront cache
- Runs on changes to `client/**`

**3. Terraform Deployment** (`.github/workflows/terraform.yml`):
- Triggers manually (`workflow_dispatch`)
- Plans infrastructure changes
- Applies Terraform configuration
- Updates infrastructure

### GitHub OIDC Authentication

Analytics-Pulse uses OIDC for secure AWS authentication:

**Benefits**:
- No long-lived AWS credentials in GitHub
- Temporary credentials per workflow run
- Automatic credential rotation
- Better security posture

**Configuration** (automatic via Terraform):
```yaml
- name: Configure AWS Credentials
  uses: aws-actions/configure-aws-credentials@v4
  with:
    role-to-assume: ${{ vars.AWS_ROLE_ARN }}
    aws-region: ${{ vars.AWS_REGION }}
```

**Required Permissions**:
```yaml
permissions:
  id-token: write  # Required for OIDC
  contents: read
```

### Manual Workflow Triggers

**Deploy Lambda**:
```bash
gh workflow run lambda-push.yml
```

**Deploy Client**:
```bash
gh workflow run client-deploy.yml
```

**Deploy Infrastructure**:
```bash
gh workflow run terraform.yml
```

## Infrastructure Components

### AWS Resources Created

| Resource | Purpose | Estimated Cost |
|----------|---------|----------------|
| **Lambda Function** | Backend API | ~$0.20 per million requests |
| **API Gateway** | HTTP routing | ~$1.00 per million requests |
| **RDS PostgreSQL** | Database (db.t3.micro) | ~$15/month |
| **S3 Bucket** | Frontend hosting | ~$0.023 per GB |
| **CloudFront** | CDN | ~$0.085 per GB |
| **Route 53** | DNS | $0.50 per hosted zone/month |
| **ACM Certificate** | SSL/TLS | Free |
| **CloudWatch Logs** | Logging | ~$0.50 per GB |

**Total Estimated Cost**: $20-30/month (low traffic) to $100-200/month (moderate traffic)

### Resource Naming Convention

```
Service Name: analytics-pulse
Environment: prod

Resources:
- Lambda: analytics-pulse-prod-lambda
- API Gateway: analytics-pulse-prod-api
- RDS: analytics-pulse-prod-db
- S3: analytics-pulse-prod-client
- CloudFront: auto-generated ID
- Route 53: analytics.yourdomain.com
```

### Terraform State Management

**Remote State** (S3 backend):
```hcl
backend "s3" {
  region = "us-east-1"
  bucket = "tf-state-jeffrey-keyser-prod"
  key    = "analytics-pulse/terraform.tfstate"
}
```

**State Locking** (DynamoDB):
- Table: `terraform-state-lock`
- Prevents concurrent modifications

**Access State**:
```bash
cd terraform
terraform state list
terraform state show module.main.aws_lambda_function.lambda
terraform output
```

## Environment Configuration

### Server Environment Variables

**server/.env**:
```bash
# Node Environment
NODE_ENV=production

# Server Configuration
PORT=3001

# Database
DATABASE_HOST=analytics-pulse-prod-db.xxxxx.us-east-1.rds.amazonaws.com
DATABASE_PORT=5432
DATABASE_NAME=analytics_pulse
DATABASE_USER=analytics_user
DATABASE_PASSWORD=generated_secure_password
DATABASE_SCHEMA=public

# Authentication
PAY_SERVICE_URL=https://pay.jeffreykeyser.net
JWT_SECRET=generated_secure_random_string
SESSION_SECRET=generated_secure_random_string

# CORS
CORS_ORIGIN=https://analytics.yourdomain.com
CORS_CREDENTIALS=true

# AWS (optional, for SES email)
AWS_REGION=us-east-1
AWS_SES_FROM_EMAIL=noreply@yourdomain.com

# Redis (optional, for caching)
REDIS_URL=redis://your-redis-instance:6379
```

### Client Environment Variables

**client/.env**:
```bash
# API Configuration
VITE_API_BASE_URL=https://api.analytics.yourdomain.com
VITE_APP_URL=https://analytics.yourdomain.com

# Pay Authentication
VITE_PAY_URL=https://api.analytics.yourdomain.com

# Analytics (for tracking the dashboard itself!)
VITE_ANALYTICS_API_KEY=ap_your_dashboard_tracking_key
VITE_ANALYTICS_ENDPOINT=https://api.analytics.yourdomain.com/api/v1/track
```

### Secrets Management

**Sensitive values** (in AWS Secrets Manager):
- Database password
- JWT secret
- Session secret
- API keys

**Access secrets from Lambda**:
```typescript
import { SecretsManager } from 'aws-sdk';

const secretsManager = new SecretsManager();
const secret = await secretsManager.getSecretValue({
  SecretId: 'analytics-pulse-prod-secrets'
}).promise();
```

## Monitoring & Maintenance

### CloudWatch Logs

**Lambda Logs**:
```bash
aws logs tail /aws/lambda/analytics-pulse-prod-lambda --follow
```

**API Gateway Logs**:
```bash
aws logs tail /aws/apigateway/analytics-pulse-prod-api --follow
```

### Database Maintenance

**Connect to RDS**:
```bash
# Get database endpoint from Terraform
DB_HOST=$(cd terraform && terraform output -raw database_endpoint)

# Connect via psql
psql -h $DB_HOST -U analytics_user -d analytics_pulse
```

**Run Migrations**:
```bash
cd server
npm run db:migrate
```

**Backup Database**:
```bash
# Automated backups enabled by default (7 day retention)
# Manual snapshot:
aws rds create-db-snapshot \
  --db-instance-identifier analytics-pulse-prod-db \
  --db-snapshot-identifier analytics-pulse-backup-$(date +%Y%m%d)
```

### Performance Monitoring

**Lambda Metrics**:
- Invocations
- Duration
- Errors
- Throttles

**RDS Metrics**:
- CPU utilization
- Database connections
- Read/write IOPS
- Storage space

**CloudFront Metrics**:
- Requests
- Data transfer
- Error rate
- Cache hit ratio

**View in AWS Console**:
- CloudWatch Dashboards
- Lambda Insights
- RDS Performance Insights

## Troubleshooting

### DNS Not Resolving

**Symptoms**:
- Domain doesn't load
- `ERR_NAME_NOT_RESOLVED`

**Solutions**:
1. Check DNS propagation:
   ```bash
   dig analytics.yourdomain.com
   ```

2. Verify nameservers:
   ```bash
   dig NS yourdomain.com
   ```

3. Wait up to 48 hours for full propagation

### SSL Certificate Not Validating

**Symptoms**:
- Certificate status: `PENDING_VALIDATION`
- HTTPS not working

**Solutions**:
1. Check certificate status:
   ```bash
   aws acm describe-certificate --certificate-arn YOUR_ARN
   ```

2. Verify DNS validation records exist in Route 53

3. Wait up to 30 minutes for validation

4. If stuck, delete and recreate certificate

### Lambda Function Errors

**Symptoms**:
- API returns 500 errors
- Timeouts

**Solutions**:
1. Check logs:
   ```bash
   aws logs tail /aws/lambda/analytics-pulse-prod-lambda --follow
   ```

2. Verify environment variables in Lambda console

3. Check VPC configuration (should have access to RDS)

4. Increase memory/timeout if needed

### Database Connection Failures

**Symptoms**:
- `ECONNREFUSED`
- `Connection timeout`

**Solutions**:
1. Verify security group rules:
   - Lambda security group → RDS security group on port 5432

2. Check database is running:
   ```bash
   aws rds describe-db-instances \
     --db-instance-identifier analytics-pulse-prod-db
   ```

3. Verify credentials in `server/.env`

4. Test connection from Lambda:
   ```bash
   # Add test endpoint to Lambda that runs pg.connect()
   ```

### GitHub Actions Failing

**Symptoms**:
- Workflows fail
- OIDC authentication errors

**Solutions**:
1. Verify GitHub secrets exist:
   ```bash
   ./scripts/verify-github-secrets.sh
   ```

2. Check OIDC role trust policy:
   ```bash
   aws iam get-role --role-name analytics-pulse-github-actions
   ```

3. Verify workflow permissions include `id-token: write`

4. Re-run Terraform to recreate OIDC provider:
   ```bash
   cd terraform
   terraform apply -target=aws_iam_openid_connect_provider.github
   ```

### High Costs

**Symptoms**:
- Unexpected AWS bill

**Solutions**:
1. Check CloudWatch metrics for unusual traffic

2. Review RDS instance type (can downgrade if needed)

3. Set up billing alerts:
   ```bash
   aws budgets create-budget --account-id YOUR_ACCOUNT \
     --budget file://budget.json
   ```

4. Enable detailed billing reports

5. Consider reserved instances for RDS (if long-term)

## Rollback Strategy

### Rollback Lambda Deployment

```bash
# List versions
aws lambda list-versions-by-function \
  --function-name analytics-pulse-prod-lambda

# Rollback to previous version
aws lambda update-alias \
  --function-name analytics-pulse-prod-lambda \
  --name production \
  --function-version PREVIOUS_VERSION
```

### Rollback Client Deployment

```bash
# Re-deploy previous commit
git revert HEAD
git push origin main  # Triggers CI/CD
```

### Rollback Infrastructure

```bash
cd terraform

# Checkout previous state
git checkout PREVIOUS_COMMIT

# Apply previous configuration
terraform apply
```

## Scaling Considerations

### Increase Lambda Resources

```hcl
# terraform/main.tf
resource "aws_lambda_function" "lambda" {
  memory_size = 512  # Increase from 128
  timeout     = 30   # Increase from 10
}
```

### Upgrade RDS Instance

```hcl
# terraform/main.tf
resource "aws_db_instance" "database" {
  instance_class = "db.t3.small"  # Upgrade from db.t3.micro
}
```

### Add Read Replicas

```hcl
resource "aws_db_instance" "read_replica" {
  replicate_source_db = aws_db_instance.database.id
  instance_class      = "db.t3.micro"
}
```

### Enable Auto Scaling

```hcl
resource "aws_appautoscaling_target" "lambda" {
  service_namespace  = "lambda"
  resource_id        = "function:${aws_lambda_function.lambda.function_name}:provisioned-concurrency"
  scalable_dimension = "lambda:function:ProvisionedConcurrentExecutions"
  min_capacity       = 1
  max_capacity       = 100
}
```

## Security Best Practices

1. **Enable MFA** on AWS root account
2. **Use IAM roles** (not access keys) where possible
3. **Enable CloudTrail** for audit logging
4. **Rotate secrets** regularly (every 90 days)
5. **Enable AWS GuardDuty** for threat detection
6. **Use VPC** for database isolation
7. **Enable encryption** at rest and in transit
8. **Regular security patches** (automated via Lambda)
9. **Principle of least privilege** for IAM policies
10. **Monitor for unauthorized access** (CloudWatch Alarms)

## Next Steps

After successful deployment:

1. **[Getting Started Guide](./GETTING_STARTED.md)** - Create your first project
2. **[Architecture Overview](./ARCHITECTURE.md)** - Understand the system
3. **[API Reference](./API_REFERENCE.md)** - Integrate with your apps
4. **[Monitoring Guide](../CLAUDE.md)** - Set up monitoring and alerts

---

**Deployment Support**: [GitHub Issues](https://github.com/Jeffrey-Keyser/Analytics-Pulse/issues)

**Infrastructure Questions**: [GitHub Discussions](https://github.com/Jeffrey-Keyser/Analytics-Pulse/discussions)
