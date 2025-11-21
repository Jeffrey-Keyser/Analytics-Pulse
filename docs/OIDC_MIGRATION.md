# Migrating to GitHub OIDC Authentication

This guide helps existing projects spawned from ServerlessWebTemplate migrate from AWS access key authentication to GitHub OIDC (OpenID Connect) authentication for GitHub Actions workflows.

## Table of Contents

- [Overview](#overview)
- [Why Migrate to OIDC?](#why-migrate-to-oidc)
- [Prerequisites](#prerequisites)
- [Migration Steps](#migration-steps)
  - [Step 1: Backup Current Configuration](#step-1-backup-current-configuration)
  - [Step 2: Update Terraform Configuration](#step-2-update-terraform-configuration)
  - [Step 3: Deploy OIDC Infrastructure](#step-3-deploy-oidc-infrastructure)
  - [Step 4: Update GitHub Workflows](#step-4-update-github-workflows)
  - [Step 5: Test OIDC Authentication](#step-5-test-oidc-authentication)
  - [Step 6: Cleanup Legacy Credentials](#step-6-cleanup-legacy-credentials)
- [Rollback Procedure](#rollback-procedure)
- [Troubleshooting](#troubleshooting)
- [Security Best Practices](#security-best-practices)

## Overview

GitHub OIDC allows GitHub Actions to authenticate with AWS using temporary, short-lived credentials instead of long-lived access keys. This significantly improves security by:

- Eliminating the need to store AWS credentials in GitHub Secrets
- Providing automatic credential rotation
- Following the principle of least privilege with scoped IAM roles
- Reducing the risk of credential exposure

## Why Migrate to OIDC?

**Security Benefits:**
- No long-lived AWS credentials stored in GitHub
- Temporary credentials issued per workflow run (expire automatically)
- Reduced attack surface for credential theft
- Compliance with AWS security best practices

**Operational Benefits:**
- No manual credential rotation required
- Easier credential management and auditing
- Better traceability in CloudTrail logs
- Simplified secrets management

## Prerequisites

Before starting the migration, ensure you have:

- [ ] **AWS Account Access**: Admin or sufficient permissions to manage IAM roles and policies
- [ ] **GitHub Repository Admin Access**: Ability to manage secrets and variables
- [ ] **Terraform Installed**: Version >= 1.13.5 (check with `terraform version`)
- [ ] **Local Environment**: Access to the latest ServerlessWebTemplate changes
- [ ] **GitHub Token**: Personal Access Token with `repo` scope for Terraform provider
- [ ] **Backup**: Current working deployment that can be rolled back if needed

## Migration Steps

### Step 1: Backup Current Configuration

Before making any changes, document your current setup for potential rollback.

1. **Export current GitHub secrets** (for reference):
   ```bash
   # List current secrets (names only, values are not accessible)
   gh secret list
   ```

2. **Document current AWS credentials**:
   - Note which IAM user is currently used for GitHub Actions
   - Record the access key ID (you cannot retrieve the secret key)
   - Save a copy of the IAM user's permissions/policies

3. **Backup Terraform state**:
   ```bash
   cd terraform

   # Download current state for safekeeping
   terraform state pull > ../backup-terraform-state-$(date +%Y%m%d).json
   ```

4. **Save current workflow files**:
   ```bash
   # Create a backup branch
   git checkout -b backup/pre-oidc-migration
   git push origin backup/pre-oidc-migration
   git checkout main  # or your working branch
   ```

### Step 2: Update Terraform Configuration

Pull the latest changes from ServerlessWebTemplate that include OIDC support.

1. **Add upstream remote** (if not already added):
   ```bash
   git remote add template https://github.com/Jeffrey-Keyser/ServerlessWebTemplate.git
   git fetch template
   ```

2. **Review template changes**:
   ```bash
   # See what files changed in the template
   git diff template/main -- terraform/
   ```

3. **Copy updated Terraform files**:
   ```bash
   # Copy the updated files from the template
   # These files include OIDC configuration
   cp -i template-repo/terraform/secrets.tf terraform/
   cp -i template-repo/terraform/variables.tf terraform/

   # Note: Use -i flag to prompt before overwriting
   # Review differences carefully before copying
   ```

   **Key files to update:**
   - `terraform/secrets.tf` - Contains OIDC role ARN configuration
   - `terraform/variables.tf` - Includes `enable_github_oidc` variable
   - `terraform/terraform.tfvars.example` - Shows OIDC as default

4. **Update terraform.tfvars**:
   ```bash
   cd terraform
   ```

   Edit your `terraform.tfvars` file and set:
   ```hcl
   # Enable GitHub OIDC authentication
   enable_github_oidc = true

   # AWS credentials are now optional (only needed if OIDC is disabled)
   # Comment out or remove these lines:
   # aws_access_key_id     = "AKIA..."
   # aws_secret_access_key = "..."
   ```

5. **Review changes**:
   ```bash
   # See what Terraform will change
   terraform plan
   ```

   Expected changes:
   - Create IAM OIDC provider for GitHub
   - Create IAM role for GitHub Actions
   - Create `AWS_ROLE_ARN` GitHub variable
   - Remove `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` GitHub secrets

### Step 3: Deploy OIDC Infrastructure

Apply the Terraform changes to create OIDC resources in AWS.

1. **Initialize Terraform** (if needed):
   ```bash
   terraform init
   ```

2. **Apply Terraform changes**:
   ```bash
   terraform apply
   ```

   Review the plan carefully. You should see:
   - `+` Creation of OIDC provider
   - `+` Creation of GitHub Actions IAM role
   - `+` Creation of `AWS_ROLE_ARN` GitHub variable
   - `-` Deletion of AWS credential secrets (if enable_github_oidc = true)

3. **Verify OIDC setup in AWS**:
   ```bash
   # Check that OIDC provider was created
   aws iam list-open-id-connect-providers

   # Verify the GitHub Actions role exists
   aws iam get-role --role-name <service-name>-github-actions-role
   ```

4. **Verify GitHub variables**:
   ```bash
   # Check that AWS_ROLE_ARN variable was created
   gh variable list

   # Should show AWS_ROLE_ARN with the IAM role ARN
   ```

### Step 4: Update GitHub Workflows

Update your GitHub Actions workflow files to use OIDC authentication.

1. **Copy updated workflow files** from ServerlessWebTemplate:
   ```bash
   # Review the differences first
   git diff template/main -- .github/workflows/

   # Copy updated workflows
   cp -i template-repo/.github/workflows/ci-cd-pipeline.yml .github/workflows/
   cp -i template-repo/.github/workflows/terraform_deploy.yml .github/workflows/
   ```

2. **Verify OIDC configuration** in workflows:

   Each deployment job should have:
   ```yaml
   jobs:
     deploy-frontend:
       permissions:
         id-token: write  # Required for OIDC
         contents: read
       steps:
         - name: Configure AWS Credentials
           uses: aws-actions/configure-aws-credentials@v4
           with:
             role-to-assume: ${{ vars.AWS_ROLE_ARN }}
             aws-region: us-east-1
   ```

3. **Commit workflow changes**:
   ```bash
   git add .github/workflows/
   git commit -m "feat: migrate GitHub Actions to OIDC authentication"
   ```

### Step 5: Test OIDC Authentication

Test the OIDC setup with a controlled deployment.

1. **Create a test branch**:
   ```bash
   git checkout -b test/oidc-migration
   ```

2. **Make a minor change** to trigger the workflow:
   ```bash
   # Add a comment or minor change to trigger CI/CD
   echo "# OIDC Migration Test" >> README.md
   git add README.md
   git commit -m "test: verify OIDC authentication"
   git push origin test/oidc-migration
   ```

3. **Monitor the workflow**:
   - Go to your repository's Actions tab
   - Watch the workflow run
   - Check the "Configure AWS Credentials" step

   **Success indicators:**
   - Step shows "Assuming role..."
   - No errors about missing AWS credentials
   - Subsequent AWS operations succeed

4. **Check CloudTrail** (optional but recommended):
   ```bash
   # Verify the role assumption in CloudTrail
   aws cloudtrail lookup-events \
     --lookup-attributes AttributeKey=EventName,AttributeValue=AssumeRoleWithWebIdentity \
     --max-results 10
   ```

   You should see events showing GitHub Actions assuming the OIDC role.

5. **Verify deployment**:
   - Check that Lambda function updated successfully
   - Verify frontend deployed to S3
   - Test your application endpoints

### Step 6: Cleanup Legacy Credentials

Once OIDC is working, remove old access key credentials.

1. **Remove GitHub Secrets** (Terraform should have done this):
   ```bash
   # Verify secrets were removed
   gh secret list

   # Should NOT show AWS_ACCESS_KEY_ID or AWS_SECRET_ACCESS_KEY
   ```

2. **Rotate or delete AWS access keys**:
   ```bash
   # List access keys for the GitHub Actions user
   aws iam list-access-keys --user-name github-actions

   # Delete the old access key
   aws iam delete-access-key \
     --user-name github-actions \
     --access-key-id AKIA...
   ```

   **Important**: Only delete keys after confirming OIDC works!

3. **Optional: Delete IAM user** (if no longer needed):
   ```bash
   # If the github-actions user is no longer needed
   aws iam delete-user --user-name github-actions
   ```

4. **Update documentation**:
   - Update your project's README
   - Update deployment documentation
   - Notify team members of the change

5. **Merge to main**:
   ```bash
   git checkout main
   git merge test/oidc-migration
   git push origin main
   ```

## Rollback Procedure

If you encounter issues and need to rollback to access key authentication:

1. **Revert terraform.tfvars**:
   ```hcl
   # In terraform/terraform.tfvars
   enable_github_oidc = false

   # Re-add AWS credentials
   aws_access_key_id     = "AKIA..."
   aws_secret_access_key = "..."
   ```

2. **Re-apply Terraform**:
   ```bash
   cd terraform
   terraform apply
   ```

   This will:
   - Remove OIDC resources
   - Re-create AWS credential secrets in GitHub

3. **Revert workflow files**:
   ```bash
   git checkout backup/pre-oidc-migration -- .github/workflows/
   git commit -m "revert: rollback to access key authentication"
   git push
   ```

4. **Verify old authentication works**:
   - Trigger a workflow
   - Confirm deployments succeed with access keys

## Troubleshooting

### Error: "Not authorized to perform sts:AssumeRoleWithWebIdentity"

**Cause**: OIDC provider not configured or role trust policy incorrect.

**Solution**:
1. Verify `enable_github_oidc = true` in terraform.tfvars
2. Run `terraform apply` to create OIDC resources
3. Check that OIDC provider exists:
   ```bash
   aws iam list-open-id-connect-providers
   ```
4. Verify role trust policy allows GitHub:
   ```bash
   aws iam get-role --role-name <service-name>-github-actions-role \
     --query 'Role.AssumeRolePolicyDocument'
   ```

### Error: "Invalid identity token"

**Cause**: Workflow missing required permissions or GitHub OIDC not enabled.

**Solution**:
1. Ensure workflow has `permissions: id-token: write`
2. Check GitHub repository settings → Actions → General
3. Verify "Allow GitHub Actions to create and approve pull requests" is enabled
4. Confirm workflow uses `aws-actions/configure-aws-credentials@v4` or later

### Error: "AWS_ROLE_ARN variable not found"

**Cause**: Terraform didn't create the GitHub variable.

**Solution**:
1. Run `terraform apply` again
2. Manually create the variable:
   ```bash
   # Get the role ARN from Terraform output
   terraform output github_oidc_role_arn

   # Set it in GitHub
   gh variable set AWS_ROLE_ARN --body "arn:aws:iam::..."
   ```

### Error: "Access denied" after OIDC setup

**Cause**: IAM role has insufficient permissions.

**Solution**:
1. Check role permissions in AWS console
2. Verify the role has policies for:
   - ECR (push/pull images)
   - Lambda (update function)
   - S3 (upload objects)
   - CloudFront (create invalidations)
3. Review Terraform module's IAM policy configuration

### Workflow hangs at "Configure AWS Credentials"

**Cause**: Network issues or rate limiting.

**Solution**:
1. Re-run the workflow
2. Check AWS service health: https://status.aws.amazon.com/
3. Verify no IP restrictions on IAM role
4. Check GitHub Actions status: https://www.githubstatus.com/

### Multiple repositories, same AWS account

**Issue**: Each repository needs its own OIDC configuration.

**Solution**:
1. Each service should have its own IAM role
2. Use distinct role names based on service_name
3. Configure role trust policy to allow only specific repository:
   ```json
   {
     "Condition": {
       "StringEquals": {
         "token.actions.githubusercontent.com:sub": "repo:owner/repo-name:ref:refs/heads/main"
       }
     }
   }
   ```

## Security Best Practices

### Principle of Least Privilege

1. **Scope IAM role permissions** to only what's needed:
   ```hcl
   # Only grant specific permissions
   statement {
     actions = [
       "ecr:GetAuthorizationToken",
       "ecr:BatchCheckLayerAvailability",
       "ecr:PutImage",
       "lambda:UpdateFunctionCode"
     ]
     resources = [specific-resource-arns]
   }
   ```

2. **Restrict role assumption** to specific repositories and branches:
   ```hcl
   condition {
     test     = "StringEquals"
     variable = "token.actions.githubusercontent.com:sub"
     values   = ["repo:yourorg/yourrepo:ref:refs/heads/main"]
   }
   ```

### Monitoring and Auditing

1. **Enable CloudTrail logging**:
   - Monitor `AssumeRoleWithWebIdentity` events
   - Alert on unusual role assumptions
   - Review access patterns regularly

2. **Set up AWS CloudWatch alarms**:
   ```bash
   # Alert on failed role assumptions
   aws cloudwatch put-metric-alarm \
     --alarm-name oidc-assume-role-failures \
     --metric-name AssumeRoleFailures \
     --namespace AWS/IAM
   ```

3. **Review GitHub Actions audit log**:
   - Check workflow runs regularly
   - Monitor for unexpected credential usage
   - Review changes to workflow files

### Credential Hygiene

1. **Rotate GitHub tokens regularly**:
   - Personal Access Tokens for Terraform
   - Private Actions Token
   - Set calendar reminders for rotation

2. **Use separate roles for different environments**:
   - Production: Strict permissions, limited repos
   - Staging: Moderate permissions
   - Development: More permissive for testing

3. **Never commit credentials**:
   - Keep `terraform.tfvars` in `.gitignore`
   - Use pre-commit hooks to scan for secrets
   - Review Git history if accidental commit occurs

## Additional Resources

- [GitHub OIDC Documentation](https://docs.github.com/en/actions/deployment/security-hardening-your-deployments/configuring-openid-connect-in-amazon-web-services)
- [AWS IAM OIDC Documentation](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_providers_create_oidc.html)
- [aws-actions/configure-aws-credentials](https://github.com/aws-actions/configure-aws-credentials)
- [ServerlessWebTemplate Repository](https://github.com/Jeffrey-Keyser/ServerlessWebTemplate)

## Support

If you encounter issues not covered in this guide:

1. Check the [Troubleshooting](#troubleshooting) section above
2. Review closed issues in ServerlessWebTemplate repository
3. Create a new issue with:
   - Error messages (sanitize any sensitive data)
   - Terraform version
   - Workflow logs (relevant sections)
   - Steps already attempted

---

**Migration Checklist:**

- [ ] Backed up current configuration
- [ ] Updated Terraform files
- [ ] Set `enable_github_oidc = true`
- [ ] Applied Terraform changes
- [ ] Updated GitHub workflows
- [ ] Tested OIDC authentication
- [ ] Verified deployments work
- [ ] Cleaned up old credentials
- [ ] Updated documentation
- [ ] Notified team members
