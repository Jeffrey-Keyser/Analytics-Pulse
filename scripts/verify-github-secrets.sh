#!/bin/bash

# GitHub Secrets & Variables Verification Script
# This script verifies that Terraform has properly configured GitHub repository secrets and variables

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Header
echo ""
echo "=========================================="
echo "GitHub Secrets & Variables Verification"
echo "=========================================="
echo ""

# Check if GitHub CLI is installed
if ! command -v gh &> /dev/null; then
    print_error "GitHub CLI (gh) is not installed. Please install it first:"
    echo "  - macOS: brew install gh"
    echo "  - Windows: winget install GitHub.CLI"
    echo "  - Linux: See https://github.com/cli/cli/blob/trunk/docs/install_linux.md"
    exit 1
fi

# Check if user is authenticated with GitHub CLI
if ! gh auth status &> /dev/null; then
    print_error "Not authenticated with GitHub CLI. Please run: gh auth login"
    exit 1
fi

# Get current repository information
if [ ! -d ".git" ]; then
    print_error "This script must be run from the root of a Git repository"
    exit 1
fi

# Get repository owner and name from git remote
REPO_URL=$(git remote get-url origin 2>/dev/null || echo "")
if [ -z "$REPO_URL" ]; then
    print_error "No git remote 'origin' found. Please ensure this is a GitHub repository."
    exit 1
fi

# Extract owner/repo from URL (works with both SSH and HTTPS)
if [[ $REPO_URL =~ github\.com[:/]([^/]+)/([^/]+)\.git$ ]] || [[ $REPO_URL =~ github\.com[:/]([^/]+)/([^/]+)$ ]]; then
    REPO_OWNER="${BASH_REMATCH[1]}"
    REPO_NAME="${BASH_REMATCH[2]}"
else
    print_error "Could not parse GitHub repository from remote URL: $REPO_URL"
    exit 1
fi

print_info "Checking repository: $REPO_OWNER/$REPO_NAME"
echo ""

# Core expected variables (always required)
declare -a CORE_VARIABLES=(
    "AWS_ECR_URL"
    "AWS_S3_BUCKET_NAME"
    "AWS_LAMBDA_FUNCTION_NAME"
    "API_BASE_URL"
    "APP_URL"
    "AWS_REGION"
)

# Expected secrets that should be configured by Terraform
declare -a EXPECTED_SECRETS=(
    "AWS_CLOUDFRONT_DISTRIBUTION_ID"
)

# Check if OIDC is enabled by looking for AWS_ROLE_ARN variable
OIDC_ENABLED=false
if gh variable list --repo "$REPO_OWNER/$REPO_NAME" 2>/dev/null | grep -q "^AWS_ROLE_ARN"; then
    OIDC_ENABLED=true
    print_info "GitHub OIDC authentication detected (AWS_ROLE_ARN variable found)"
else
    print_info "Static AWS credentials authentication detected (no AWS_ROLE_ARN variable)"
fi
echo ""

# Build expected variables list based on authentication method
declare -a EXPECTED_VARIABLES=("${CORE_VARIABLES[@]}")
if [ "$OIDC_ENABLED" = true ]; then
    EXPECTED_VARIABLES+=("AWS_ROLE_ARN")
fi

# Optional secrets (manual configuration)
declare -a OPTIONAL_SECRETS=(
    "SLACK_WEBHOOK"
)

# AWS credentials are only required if OIDC is not enabled
if [ "$OIDC_ENABLED" = false ]; then
    print_warning "OIDC is not enabled. AWS static credentials are required."
    EXPECTED_SECRETS+=("AWS_ACCESS_KEY_ID" "AWS_SECRET_ACCESS_KEY")
fi

print_info "Checking Repository Variables..."

# Check each expected variable
VARIABLES_OK=true
for var in "${EXPECTED_VARIABLES[@]}"; do
    if gh variable list --repo "$REPO_OWNER/$REPO_NAME" | grep -q "^$var"; then
        VALUE=$(gh variable get "$var" --repo "$REPO_OWNER/$REPO_NAME" 2>/dev/null || echo "")
        if [ -n "$VALUE" ]; then
            print_success "✅ $var: $VALUE"
        else
            print_warning "⚠️  $var: (empty value)"
        fi
    else
        print_error "❌ $var: NOT FOUND"
        VARIABLES_OK=false
    fi
done

echo ""
print_info "Checking Repository Secrets..."

# Check each expected secret
SECRETS_OK=true
for secret in "${EXPECTED_SECRETS[@]}"; do
    if gh secret list --repo "$REPO_OWNER/$REPO_NAME" | grep -q "^$secret"; then
        print_success "✅ $secret: CONFIGURED"
    else
        print_error "❌ $secret: NOT FOUND"
        SECRETS_OK=false
    fi
done

echo ""
print_info "Checking Optional Secrets..."

# Check optional secrets
for secret in "${OPTIONAL_SECRETS[@]}"; do
    if gh secret list --repo "$REPO_OWNER/$REPO_NAME" | grep -q "^$secret"; then
        print_success "✅ $secret: CONFIGURED (optional)"
    else
        print_warning "⚠️  $secret: NOT CONFIGURED (optional)"
    fi
done

echo ""
echo "=========================================="
echo "OIDC Health Check"
echo "=========================================="

if [ "$OIDC_ENABLED" = true ]; then
    print_success "✅ OIDC authentication is enabled"

    # Verify AWS_ROLE_ARN is properly formatted
    AWS_ROLE_ARN=$(gh variable get "AWS_ROLE_ARN" --repo "$REPO_OWNER/$REPO_NAME" 2>/dev/null || echo "")
    if [[ $AWS_ROLE_ARN =~ ^arn:aws:iam::[0-9]+:role/.+ ]]; then
        print_success "✅ AWS_ROLE_ARN is properly formatted: $AWS_ROLE_ARN"
    else
        print_warning "⚠️  AWS_ROLE_ARN format may be incorrect: $AWS_ROLE_ARN"
    fi

    # Check if workflows have proper permissions
    print_info "Ensure your workflows have 'permissions: id-token: write'"

    # Check for legacy credentials
    if gh secret list --repo "$REPO_OWNER/$REPO_NAME" 2>/dev/null | grep -q "^AWS_ACCESS_KEY_ID"; then
        print_warning "⚠️  AWS_ACCESS_KEY_ID secret found - consider removing legacy credentials"
    fi
    if gh secret list --repo "$REPO_OWNER/$REPO_NAME" 2>/dev/null | grep -q "^AWS_SECRET_ACCESS_KEY"; then
        print_warning "⚠️  AWS_SECRET_ACCESS_KEY secret found - consider removing legacy credentials"
    fi
else
    print_warning "⚠️  OIDC authentication is not enabled (using static AWS credentials)"
    print_info "Consider migrating to OIDC for better security:"
    echo "  - See docs/OIDC_MIGRATION.md for migration guide"
    echo "  - Set enable_github_oidc = true in terraform.tfvars"
    echo "  - Run: cd terraform && terraform apply"
fi

echo ""
echo "=========================================="

if [ "$VARIABLES_OK" = true ] && [ "$SECRETS_OK" = true ]; then
    print_success "All required GitHub secrets and variables are properly configured!"
    echo ""
    if [ "$OIDC_ENABLED" = true ]; then
        print_info "Authentication Method: GitHub OIDC (recommended)"
        print_info "Your workflows will use temporary AWS credentials via IAM role assumption"
    else
        print_info "Authentication Method: Static AWS Credentials"
        print_warning "Consider migrating to OIDC for improved security"
    fi
    echo ""
    print_info "Your CI/CD pipeline should now work correctly."
    print_info "You can now safely push code changes to trigger GitHub Actions workflows."
else
    print_error "Some required secrets or variables are missing."
    echo ""
    print_info "This usually means:"
    echo "  1. Terraform has not been applied yet (run 'terraform apply')"
    echo "  2. The Terraform GitHub provider is not properly configured"
    echo "  3. The terraform/secrets.tf file is not included in your Terraform configuration"
    echo ""
    print_info "To fix this:"
    echo "  1. Ensure you have a valid GitHub token set: export TF_VAR_github_token=your_token"
    echo "  2. Run: cd terraform && terraform apply"
    echo "  3. Re-run this verification script"
fi

echo ""