#!/bin/bash

# ServerlessWebTemplate Automated Deployment Script
# One-command deployment from template to live service
# Usage: ./scripts/new-service-auto.sh <service-name> <domain>

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

# Progress tracking
TOTAL_STEPS=10
CURRENT_STEP=0

# State file for rollback
STATE_FILE=".deployment-state"

# Function to print colored output with step tracking
print_step() {
    CURRENT_STEP=$((CURRENT_STEP + 1))
    echo ""
    echo -e "${MAGENTA}[STEP $CURRENT_STEP/$TOTAL_STEPS]${NC} ${CYAN}$1${NC}"
    echo "────────────────────────────────────────────────────────────────"
}

print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to update deployment state
update_state() {
    local step=$1
    echo "$step" >> "$STATE_FILE"
    print_info "State saved: $step"
}

# Function to check if step was completed
is_step_completed() {
    local step=$1
    if [ -f "$STATE_FILE" ]; then
        grep -q "^$step$" "$STATE_FILE" && return 0
    fi
    return 1
}

# Function to rollback on error
rollback() {
    print_error "Deployment failed! Initiating rollback..."

    # Check what steps were completed
    if [ -f "$STATE_FILE" ]; then
        print_info "Rolling back completed steps..."

        # Rollback Terraform if it was applied
        if is_step_completed "terraform_applied"; then
            print_warning "Terraform was applied. You may want to run 'terraform destroy' manually."
        fi

        # Clean up state file
        rm -f "$STATE_FILE"
    fi

    print_error "Rollback complete. Please fix errors and try again."
    exit 1
}

# Trap errors and call rollback
trap 'rollback' ERR

# Header
echo ""
echo "══════════════════════════════════════════════════════════════════"
echo "  ServerlessWebTemplate - Automated Service Deployment"
echo "══════════════════════════════════════════════════════════════════"
echo ""

# Parse flags first
NON_INTERACTIVE=false
POSITIONAL_ARGS=()

while [[ $# -gt 0 ]]; do
    case $1 in
        --yes|-y)
            NON_INTERACTIVE=true
            shift
            ;;
        -*)
            print_error "Unknown option: $1"
            echo ""
            echo "Usage: $0 <service-name> <domain> [--yes|-y]"
            echo ""
            echo "Options:"
            echo "  --yes, -y    Skip all interactive prompts (non-interactive mode)"
            echo ""
            echo "Example:"
            echo "  $0 my-awesome-service example.com"
            echo "  $0 my-awesome-service example.com --yes"
            echo ""
            exit 1
            ;;
        *)
            POSITIONAL_ARGS+=("$1")
            shift
            ;;
    esac
done

# Restore positional parameters
set -- "${POSITIONAL_ARGS[@]}"

# Validate arguments
if [ -z "$1" ] || [ -z "$2" ]; then
    print_error "Missing required arguments"
    echo ""
    echo "Usage: $0 <service-name> <domain> [--yes|-y]"
    echo ""
    echo "Options:"
    echo "  --yes, -y    Skip all interactive prompts (non-interactive mode)"
    echo ""
    echo "Example:"
    echo "  $0 my-awesome-service example.com"
    echo "  $0 my-awesome-service example.com --yes"
    echo ""
    exit 1
fi

SERVICE_NAME="$1"
DOMAIN_NAME="$2"
GITHUB_OWNER="${GITHUB_OWNER:-Jeffrey-Keyser}"
GITHUB_REPO="${GITHUB_REPO:-$SERVICE_NAME}"
AWS_REGION="${AWS_REGION:-us-east-1}"
ENVIRONMENT="${ENVIRONMENT:-prod}"
DATABASE_SCHEMA="${DATABASE_SCHEMA:-public}"

# CORS Configuration (can be overridden via environment variables)
CORS_ALLOWED_ORIGINS="${CORS_ALLOWED_ORIGINS:-https://${DOMAIN_NAME}}"
CORS_ALLOW_CREDENTIALS="${CORS_ALLOW_CREDENTIALS:-Y}"
CORS_ALLOWED_METHODS="${CORS_ALLOWED_METHODS:-GET,POST,PUT,DELETE,OPTIONS}"
CORS_ALLOWED_HEADERS="${CORS_ALLOWED_HEADERS:-Content-Type,Authorization,X-Requested-With}"

# Validate domain format
if [[ ! "$DOMAIN_NAME" =~ ^[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?)*$ ]]; then
    print_error "Invalid domain format: $DOMAIN_NAME"
    exit 1
fi

echo "Configuration:"
echo "  Service Name:    $SERVICE_NAME"
echo "  Domain:          $DOMAIN_NAME"
echo "  GitHub Owner:    $GITHUB_OWNER"
echo "  GitHub Repo:     $GITHUB_REPO"
echo "  AWS Region:      $AWS_REGION"
echo "  Environment:     $ENVIRONMENT"
echo "  CORS Origins:    $CORS_ALLOWED_ORIGINS"
echo ""

if [ "$NON_INTERACTIVE" = false ]; then
    read -p "Continue with this configuration? (y/N): " CONFIRM
    if [[ ! "$CONFIRM" =~ ^[Yy]$ ]]; then
        print_warning "Deployment cancelled by user"
        exit 0
    fi
else
    print_info "Running in non-interactive mode (--yes flag)"
fi

# Start timer
START_TIME=$(date +%s)

# ══════════════════════════════════════════════════════════════════
print_step "Checking prerequisites"
# ══════════════════════════════════════════════════════════════════

# Check for required tools
MISSING_TOOLS=()

if ! command -v node &> /dev/null; then
    MISSING_TOOLS+=("Node.js")
fi

if ! command -v npm &> /dev/null; then
    MISSING_TOOLS+=("npm")
fi

if ! command -v terraform &> /dev/null; then
    MISSING_TOOLS+=("Terraform")
fi

if ! command -v aws &> /dev/null; then
    MISSING_TOOLS+=("AWS CLI")
fi

if ! command -v docker &> /dev/null; then
    MISSING_TOOLS+=("Docker")
fi

if ! command -v git &> /dev/null; then
    MISSING_TOOLS+=("Git")
fi

if [ ${#MISSING_TOOLS[@]} -gt 0 ]; then
    print_error "Missing required tools: ${MISSING_TOOLS[*]}"
    print_info "Please install missing tools and try again"
    exit 1
fi

# Check for GitHub token
if [ -z "$GITHUB_TOKEN" ]; then
    print_error "GITHUB_TOKEN environment variable not set"
    print_info "Please set GITHUB_TOKEN and try again"
    exit 1
fi

# Check AWS credentials
if ! aws sts get-caller-identity &> /dev/null; then
    print_error "AWS credentials not configured or invalid"
    print_info "Please configure AWS credentials and try again"
    exit 1
fi

# Check Docker daemon
if ! docker ps &> /dev/null; then
    print_error "Docker daemon is not running"
    print_info "Please start Docker and try again"
    exit 1
fi

print_success "All prerequisites met"
update_state "prerequisites_checked"

# ══════════════════════════════════════════════════════════════════
print_step "Running automated project setup"
# ══════════════════════════════════════════════════════════════════

if ! is_step_completed "project_setup"; then
    # Create automated input for setup-project.sh
    print_info "Configuring project with automated inputs..."

    # Run setup-project.sh with automated inputs
    {
        echo "$SERVICE_NAME"
        echo "$DOMAIN_NAME"
        echo "$GITHUB_REPO"
        echo "$GITHUB_OWNER"
        echo "$AWS_REGION"
        echo "$ENVIRONMENT"
        echo "shared-infra-terraform-state"
        echo "$DATABASE_SCHEMA"
        echo "$CORS_ALLOWED_ORIGINS"
        echo "$CORS_ALLOW_CREDENTIALS"
        echo "$CORS_ALLOWED_METHODS"
        echo "$CORS_ALLOWED_HEADERS"
        echo "Y"  # Use OIDC
        echo "$GITHUB_TOKEN"
        echo "n"  # Don't open VS Code
    } | ./setup-project.sh

    print_success "Project setup completed"
    update_state "project_setup"
else
    print_info "Project setup already completed (skipping)"
fi

# ══════════════════════════════════════════════════════════════════
print_step "Initializing Terraform"
# ══════════════════════════════════════════════════════════════════

if ! is_step_completed "terraform_init"; then
    cd terraform

    # Source environment for GitHub token
    if [ -f .env ]; then
        set -a
        source .env
        set +a
    fi

    print_info "Running terraform init..."
    terraform init

    cd ..
    print_success "Terraform initialized"
    update_state "terraform_init"
else
    print_info "Terraform already initialized (skipping)"
fi

# ══════════════════════════════════════════════════════════════════
print_step "Creating ECR repository"
# ══════════════════════════════════════════════════════════════════

if ! is_step_completed "ecr_created"; then
    cd terraform

    # Source environment for GitHub token
    if [ -f .env ]; then
        set -a
        source .env
        set +a
    fi

    print_info "Running targeted apply for ECR repository..."
    terraform apply -target=module.serverless_web_infra.aws_ecr_repository.ecr_repo -auto-approve

    # Get ECR URL
    ECR_URL=$(terraform output -raw ecr_repository_url)
    print_success "ECR repository created: $ECR_URL"

    cd ..
    update_state "ecr_created"
else
    print_info "ECR repository already created (skipping)"
    cd terraform
    ECR_URL=$(terraform output -raw ecr_repository_url)
    cd ..
fi

# ══════════════════════════════════════════════════════════════════
print_step "Building and pushing Docker image"
# ══════════════════════════════════════════════════════════════════

if ! is_step_completed "docker_pushed"; then
    print_info "Building Docker image for server..."

    # Build Docker image
    cd server
    docker build -t "$ECR_URL:latest" .
    cd ..

    print_success "Docker image built successfully"

    # Authenticate with ECR
    print_info "Authenticating with ECR..."
    AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
    aws ecr get-login-password --region "$AWS_REGION" | \
        docker login --username AWS --password-stdin "$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com"

    print_success "ECR authentication successful"

    # Push Docker image
    print_info "Pushing Docker image to ECR..."
    docker push "$ECR_URL:latest"

    print_success "Docker image pushed to ECR"
    update_state "docker_pushed"
else
    print_info "Docker image already pushed (skipping)"
fi

# ══════════════════════════════════════════════════════════════════
print_step "Applying full Terraform configuration"
# ══════════════════════════════════════════════════════════════════

if ! is_step_completed "terraform_applied"; then
    cd terraform

    # Source environment for GitHub token
    if [ -f .env ]; then
        set -a
        source .env
        set +a
    fi

    print_info "Running full terraform apply..."
    print_warning "This may take several minutes..."

    terraform apply -auto-approve

    print_success "Terraform apply completed"
    cd ..
    update_state "terraform_applied"
else
    print_info "Terraform already applied (skipping)"
fi

# ══════════════════════════════════════════════════════════════════
print_step "Extracting Terraform outputs"
# ══════════════════════════════════════════════════════════════════

if ! is_step_completed "outputs_extracted"; then
    cd terraform

    # Extract outputs
    print_info "Extracting Terraform outputs..."

    FRONTEND_URL=$(terraform output -raw frontend_url 2>/dev/null || echo "")
    API_URL=$(terraform output -raw api_url 2>/dev/null || echo "")
    LAMBDA_FUNCTION_NAME=$(terraform output -raw lambda_function_name 2>/dev/null || echo "")
    S3_BUCKET_NAME=$(terraform output -raw s3_bucket_name 2>/dev/null || echo "")
    ECR_URL=$(terraform output -raw ecr_repository_url 2>/dev/null || echo "")
    CLOUDFRONT_DISTRIBUTION_ID=$(terraform output -raw cloudfront_distribution_id 2>/dev/null || echo "")
    GITHUB_OIDC_ROLE_ARN=$(terraform output -raw github_oidc_role_arn 2>/dev/null || echo "")

    cd ..

    print_success "Outputs extracted successfully"

    # Display key outputs
    echo ""
    echo "Key Infrastructure Details:"
    echo "  Frontend URL:         $FRONTEND_URL"
    echo "  API URL:              $API_URL"
    echo "  Lambda Function:      $LAMBDA_FUNCTION_NAME"
    echo "  S3 Bucket:            $S3_BUCKET_NAME"
    echo "  ECR Repository:       $ECR_URL"
    echo "  CloudFront Dist ID:   $CLOUDFRONT_DISTRIBUTION_ID"
    if [ -n "$GITHUB_OIDC_ROLE_ARN" ]; then
        echo "  GitHub OIDC Role:     $GITHUB_OIDC_ROLE_ARN"
    fi
    echo ""

    update_state "outputs_extracted"
else
    print_info "Outputs already extracted (skipping)"
fi

# ══════════════════════════════════════════════════════════════════
print_step "Updating environment files with outputs"
# ══════════════════════════════════════════════════════════════════

if ! is_step_completed "env_updated"; then
    print_info "Updating client/.env with production URLs..."

    # Update client .env
    if [ -f client/.env ]; then
        # Update VITE_PAY_URL_PRODUCTION
        if grep -q "^VITE_PAY_URL_PRODUCTION=" client/.env; then
            sed -i.bak "s|^VITE_PAY_URL_PRODUCTION=.*|VITE_PAY_URL_PRODUCTION=$API_URL|g" client/.env
        else
            echo "" >> client/.env
            echo "# Production Pay URL (used during deployment)" >> client/.env
            echo "VITE_PAY_URL_PRODUCTION=$API_URL" >> client/.env
        fi
        rm -f client/.env.bak
        print_success "Updated client/.env with production API URL"
    fi

    # Create deployment info file
    cat > deployment-info.txt <<EOF
Deployment Information
═══════════════════════════════════════════════════════════════

Service Details:
  Name:                 $SERVICE_NAME
  Domain:               $DOMAIN_NAME
  Environment:          $ENVIRONMENT
  Deployed:             $(date)

URLs:
  Frontend:             $FRONTEND_URL
  API:                  $API_URL

Infrastructure:
  Lambda Function:      $LAMBDA_FUNCTION_NAME
  S3 Bucket:            $S3_BUCKET_NAME
  ECR Repository:       $ECR_URL
  CloudFront Dist:      $CLOUDFRONT_DISTRIBUTION_ID

GitHub Configuration:
  Repository:           $GITHUB_OWNER/$GITHUB_REPO
  OIDC Role ARN:        $GITHUB_OIDC_ROLE_ARN

Next Steps:
  1. Verify GitHub secrets are configured (run scripts/verify-github-secrets.sh)
  2. Update domain registrar with Route 53 nameservers (if needed)
  3. Wait for DNS propagation (may take up to 48 hours)
  4. Test the deployment at $FRONTEND_URL

EOF

    print_success "Created deployment-info.txt"
    update_state "env_updated"
else
    print_info "Environment files already updated (skipping)"
fi

# ══════════════════════════════════════════════════════════════════
print_step "Committing configuration changes"
# ══════════════════════════════════════════════════════════════════

if ! is_step_completed "changes_committed"; then
    print_info "Staging configuration files..."

    git add terraform/terraform.tfvars \
            terraform/.env \
            server/.env \
            client/.env \
            .env \
            deployment-info.txt \
            setup-notes.md \
            github-secrets-checklist.txt 2>/dev/null || true

    # Check if there are changes to commit
    if git diff --staged --quiet; then
        print_warning "No changes to commit"
    else
        print_info "Committing changes..."
        git commit -m "feat: automated deployment for $SERVICE_NAME

- Configure service for domain: $DOMAIN_NAME
- Set up Terraform infrastructure
- Configure environment files
- ECR repository and Docker image deployed
- Lambda function and CloudFront distribution created

Deployed at: $(date)
Frontend: $FRONTEND_URL
API: $API_URL"

        print_success "Changes committed"
    fi

    update_state "changes_committed"
else
    print_info "Changes already committed (skipping)"
fi

# ══════════════════════════════════════════════════════════════════
print_step "Pushing to remote repository"
# ══════════════════════════════════════════════════════════════════

if ! is_step_completed "changes_pushed"; then
    # Get current branch
    CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)

    print_info "Pushing to branch: $CURRENT_BRANCH..."

    # Check if remote exists
    if git remote -v | grep -q origin; then
        git push -u origin "$CURRENT_BRANCH" || print_warning "Push failed - you may need to push manually"
        print_success "Changes pushed to remote"
    else
        print_warning "No git remote 'origin' configured"
        print_info "Please configure remote and push manually"
    fi

    update_state "changes_pushed"
else
    print_info "Changes already pushed (skipping)"
fi

# ══════════════════════════════════════════════════════════════════
# Deployment Complete
# ══════════════════════════════════════════════════════════════════

# Calculate deployment time
END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))
MINUTES=$((DURATION / 60))
SECONDS=$((DURATION % 60))

# Clean up state file on success
rm -f "$STATE_FILE"

echo ""
echo "══════════════════════════════════════════════════════════════════"
echo -e "${GREEN}  ✓ DEPLOYMENT COMPLETED SUCCESSFULLY!${NC}"
echo "══════════════════════════════════════════════════════════════════"
echo ""
echo -e "${CYAN}Deployment Time:${NC} ${MINUTES}m ${SECONDS}s"
echo ""
echo -e "${CYAN}Your service is live at:${NC}"
echo -e "  ${GREEN}$FRONTEND_URL${NC}"
echo ""
echo -e "${CYAN}Next Steps:${NC}"
echo "  1. Run: ${YELLOW}./scripts/verify-github-secrets.sh${NC}"
echo "  2. Update domain registrar with Route 53 nameservers"
echo "  3. Wait for DNS propagation (up to 48 hours)"
echo "  4. Visit your site: ${GREEN}$FRONTEND_URL${NC}"
echo ""
echo -e "${CYAN}Documentation:${NC}"
echo "  - Deployment Info:    ${YELLOW}deployment-info.txt${NC}"
echo "  - Setup Notes:        ${YELLOW}setup-notes.md${NC}"
echo "  - GitHub Checklist:   ${YELLOW}github-secrets-checklist.txt${NC}"
echo ""
echo "══════════════════════════════════════════════════════════════════"
echo ""

# Optional: Open deployment info
if [ "$NON_INTERACTIVE" = false ] && command -v cat &> /dev/null; then
    read -p "Display deployment info? (y/N): " SHOW_INFO
    if [[ "$SHOW_INFO" =~ ^[Yy]$ ]]; then
        echo ""
        cat deployment-info.txt
    fi
fi
