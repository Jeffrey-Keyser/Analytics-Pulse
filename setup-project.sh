#!/bin/bash

# ServerlessWebTemplate Setup Script
# This script automates the initial setup of a new project from this template

set -e  # Exit on error

# Parse command line arguments
NON_INTERACTIVE=false
if [[ "$1" == "--non-interactive" ]] || [[ "$1" == "-y" ]]; then
    NON_INTERACTIVE=true
fi

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

# Function to prompt for input with a default value
prompt_with_default() {
    local prompt="$1"
    local default="$2"
    local var_name="$3"
    local env_var="${4:-}"  # Optional env var name

    # Check if running in non-interactive mode
    if [ "$NON_INTERACTIVE" = true ]; then
        # Use environment variable if available, otherwise use default
        if [ -n "$env_var" ] && [ -n "${!env_var}" ]; then
            eval "$var_name='${!env_var}'"
            print_info "Using $var_name from environment: ${!env_var}"
        else
            eval "$var_name='$default'"
            print_info "Using default for $var_name: $default"
        fi
        return
    fi

    # Interactive mode - check env var first
    if [ -n "$env_var" ] && [ -n "${!env_var}" ]; then
        eval "$var_name='${!env_var}'"
        print_success "Using $var_name from environment: ${!env_var}"
        return
    fi

    # Fall back to interactive prompt
    read -p "$prompt [$default]: " input
    if [ -z "$input" ]; then
        eval "$var_name='$default'"
    else
        eval "$var_name='$input'"
    fi
}

# Load config file if it exists
if [ -f setup-config.env ]; then
    print_info "Loading configuration from setup-config.env"
    source setup-config.env
fi

# Header
echo ""
echo "=========================================="
echo "ServerlessWebTemplate Project Setup"
if [ "$NON_INTERACTIVE" = true ]; then
    echo "(Non-Interactive Mode)"
fi
echo "=========================================="
echo ""

# Check prerequisites
print_info "Checking prerequisites..."

# Check for Node.js
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check for npm
if ! command -v npm &> /dev/null; then
    print_error "npm is not installed. Please install npm first."
    exit 1
fi

# Check for Terraform
if ! command -v terraform &> /dev/null; then
    print_warning "Terraform is not installed. You'll need it for infrastructure deployment."
fi

# Check for AWS CLI
if ! command -v aws &> /dev/null; then
    print_warning "AWS CLI is not installed. You'll need it for AWS deployments."
fi

print_success "Prerequisites check completed"
echo ""

# Step 1: Gather project information
print_info "Step 1: Project Configuration"
echo ""

prompt_with_default "Service Name" "my-new-service" SERVICE_NAME "SETUP_SERVICE_NAME"
prompt_with_default "Domain Name (e.g., yourdomain.com)" "example.com" DOMAIN_NAME "SETUP_DOMAIN_NAME"
prompt_with_default "GitHub Repository Name" "my-new-service-repo" GITHUB_REPO "SETUP_GITHUB_REPO"
prompt_with_default "GitHub Owner/Organization" "Jeffrey-Keyser" GITHUB_OWNER "SETUP_GITHUB_OWNER"
prompt_with_default "AWS Region" "us-east-1" AWS_REGION "SETUP_AWS_REGION"
prompt_with_default "Environment (dev/staging/prod)" "prod" ENVIRONMENT "SETUP_ENVIRONMENT"
prompt_with_default "Shared Infrastructure State Bucket" "shared-infra-terraform-state" SHARED_INFRA_BUCKET "SETUP_SHARED_INFRA_BUCKET"
prompt_with_default "Database Schema Name" "public" DATABASE_SCHEMA "SETUP_DATABASE_SCHEMA"

echo ""
print_info "CORS Configuration"
print_info "Configure Cross-Origin Resource Sharing for your API"
echo ""

# Smart default based on domain
DEFAULT_CORS_ORIGIN="https://${DOMAIN_NAME}"
if [ "$NON_INTERACTIVE" = false ]; then
    print_info "Primary CORS origin (your frontend URL): $DEFAULT_CORS_ORIGIN"
    print_info "For multiple origins, enter comma-separated list (e.g., https://example.com,https://www.example.com)"
fi
prompt_with_default "CORS Allowed Origins" "$DEFAULT_CORS_ORIGIN" CORS_ORIGINS_INPUT "SETUP_CORS_ORIGINS"

# Parse and format for Terraform
IFS=',' read -ra CORS_ARRAY <<< "$CORS_ORIGINS_INPUT"
CORS_ORIGINS_TF="["
for idx in "${!CORS_ARRAY[@]}"; do
    origin=$(echo "${CORS_ARRAY[$idx]}" | xargs) # Trim whitespace
    if [ $idx -gt 0 ]; then CORS_ORIGINS_TF+=", "; fi
    CORS_ORIGINS_TF+="\"$origin\""
done
CORS_ORIGINS_TF+="]"

# Credentials (default: true for authenticated apps)
if [ -n "$SETUP_CORS_CREDENTIALS" ]; then
    CORS_ALLOW_CREDENTIALS="$SETUP_CORS_CREDENTIALS"
    if [ "$NON_INTERACTIVE" = false ]; then
        print_success "Using CORS credentials from environment: $CORS_ALLOW_CREDENTIALS"
    else
        print_info "Using CORS credentials from environment: $CORS_ALLOW_CREDENTIALS"
    fi
elif [ "$NON_INTERACTIVE" = true ]; then
    CORS_ALLOW_CREDENTIALS="true"
    print_info "Using default for CORS credentials: true"
else
    print_info "Allow credentials (cookies, JWT tokens) in cross-origin requests?"
    read -p "Allow Credentials (Y/n) [Y]: " CORS_CRED_INPUT
    CORS_CRED_INPUT=${CORS_CRED_INPUT:-Y}
    if [[ "$CORS_CRED_INPUT" =~ ^[Yy]$ ]]; then
        CORS_ALLOW_CREDENTIALS="true"
        print_info "Note: When credentials=true, only one origin should be specified for best compatibility"
    else
        CORS_ALLOW_CREDENTIALS="false"
    fi
fi

# HTTP Methods (most apps use these defaults)
prompt_with_default "CORS Allowed Methods" "GET,POST,PUT,DELETE,OPTIONS" CORS_METHODS "SETUP_CORS_METHODS"

# Headers (common headers for REST APIs)
prompt_with_default "CORS Allowed Headers" "Content-Type,Authorization,X-Requested-With" CORS_HEADERS "SETUP_CORS_HEADERS"

print_success "CORS configuration collected"

echo ""
print_info "Step 2: Authentication Configuration"
echo ""

# Prompt for OIDC vs Access Keys
if [ -n "$SETUP_ENABLE_OIDC" ]; then
    ENABLE_GITHUB_OIDC="$SETUP_ENABLE_OIDC"
    if [ "$ENABLE_GITHUB_OIDC" = "true" ]; then
        print_success "OIDC authentication enabled (from environment)"
        if [ "$NON_INTERACTIVE" = false ]; then
            print_info "AWS credentials will not be required for GitHub Actions"
        fi
    else
        print_warning "Using static AWS credentials (from environment, not recommended for production)"
    fi
elif [ "$NON_INTERACTIVE" = true ]; then
    ENABLE_GITHUB_OIDC="true"
    print_info "Using default for OIDC: true (recommended)"
else
    print_info "GitHub OIDC provides secure, temporary credentials for CI/CD (recommended)"
    read -p "Use GitHub OIDC for AWS authentication? (Y/n) [Y]: " USE_OIDC
    USE_OIDC=${USE_OIDC:-Y}

    if [[ "$USE_OIDC" =~ ^[Yy]$ ]]; then
        ENABLE_GITHUB_OIDC="true"
        print_success "OIDC authentication enabled (recommended)"
        print_info "AWS credentials will not be required for GitHub Actions"
    else
        ENABLE_GITHUB_OIDC="false"
        print_warning "Using static AWS credentials (not recommended for production)"
        print_info "You will need to provide AWS access keys"
    fi
fi

echo ""
print_info "Step 3: GitHub Configuration"
echo ""

# Check for GitHub token
if [ -z "$TF_VAR_github_token" ] && [ -z "$GITHUB_TOKEN" ]; then
    if [ "$NON_INTERACTIVE" = true ]; then
        print_error "GitHub token not found in environment (TF_VAR_github_token or GITHUB_TOKEN required in non-interactive mode)"
        exit 1
    fi
    print_warning "GitHub token not found in environment"
    print_info "Your token will be visible as you type (for verification)"
    read -p "Enter your GitHub Personal Access Token: " GITHUB_TOKEN
    export TF_VAR_github_token="$GITHUB_TOKEN"
elif [ -z "$TF_VAR_github_token" ]; then
    export TF_VAR_github_token="$GITHUB_TOKEN"
    GITHUB_TOKEN="$GITHUB_TOKEN"
    print_success "GitHub token found in environment"
else
    print_success "GitHub token found in environment"
    GITHUB_TOKEN="$TF_VAR_github_token"
fi

# Step 3: Create Terraform configuration
print_info "Step 3: Creating Terraform configuration..."

# Generate Terraform JWT secret
print_info "Generating secure JWT secret for Terraform..."
TERRAFORM_JWT_SECRET=$(openssl rand -base64 32)
print_success "Generated secure JWT secret for Terraform configuration"

# Create terraform.tfvars
# Convert service name to lowercase for Terraform
SERVICE_NAME_LOWER=$(echo "$SERVICE_NAME" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9-]/-/g')

cat > terraform/terraform.tfvars <<EOF
# Core Configuration
service_name = "jeffrey-keyser-$SERVICE_NAME_LOWER"
domain_name  = "$DOMAIN_NAME"
region       = "$AWS_REGION"
environment  = "$ENVIRONMENT"

# Domain Configuration
alternative_domain_names = ["www.$DOMAIN_NAME"]
create_route53_zone     = true
register_domain         = false

# Lambda Configuration
lambda_memory_size = 256
lambda_timeout     = 10

# Container Configuration
container_image_tag = "latest"
ecr_force_delete    = true

# Storage Configuration
s3_force_destroy      = true
s3_versioning_enabled = false

# CDN Configuration
cloudfront_price_class             = "PriceClass_100"
cloudfront_geo_restriction_type    = "whitelist"
cloudfront_geo_restriction_locations = ["US"]

# Security Features
enable_waf                = false
enable_custom_error_pages = true

# Monitoring
log_retention_days         = 7
enable_api_gateway_logging = false

# GitHub Integration
github_owner      = "$GITHUB_OWNER"
github_repository = "$GITHUB_REPO"
enable_github_oidc = $ENABLE_GITHUB_OIDC

# Security Configuration
# JWT secret auto-generated during setup
# To rotate: openssl rand -base64 32
jwt_secret = "$TERRAFORM_JWT_SECRET"

# CORS Configuration
cors_allowed_origins   = $CORS_ORIGINS_TF
cors_allow_credentials = $CORS_ALLOW_CREDENTIALS
cors_allowed_methods   = "$CORS_METHODS"
cors_allowed_headers   = "$CORS_HEADERS"

# Shared Infrastructure - Disabled for now
# shared_infrastructure_state = null

# Additional Tags
additional_tags = {
  Owner   = "$GITHUB_OWNER"
  Project = "$SERVICE_NAME_LOWER"
}
EOF

print_success "Created terraform.tfvars"

# Create terraform/.env file
print_info "Creating terraform/.env file..."
cat > terraform/.env <<EOF
TF_VAR_github_token=$GITHUB_TOKEN
EOF

print_success "Created terraform/.env with GitHub token"

print_info "Terraform backend is pre-configured with centralized state management"

# Update Terraform backend key with service name
print_info "Configuring Terraform state key for service: $SERVICE_NAME"
if [ -f terraform/main.tf ]; then
    sed -i.bak "s/SERVICE_NAME_PLACEHOLDER/$SERVICE_NAME/g" terraform/main.tf
    rm terraform/main.tf.bak
    print_success "Updated Terraform backend key with service name"
else
    print_warning "terraform/main.tf not found - skipping key configuration"
fi

# Step 4: Setup environment files
print_info "Step 4: Setting up environment files..."

# Copy root .env.example file
if [ -f .env.example ]; then
    cp .env.example .env
    print_success "Created root .env from .env.example"
    
    # Update root .env with project values
    sed -i.bak "s/your-github-token-here/$GITHUB_TOKEN/g" .env
    sed -i.bak "s/your-project-name/$SERVICE_NAME/g" .env
    rm .env.bak
    print_success "Updated root .env with project configuration"
fi

# .npmrc files should use environment variables for CI/CD compatibility
# No changes needed to .npmrc files as they already use ${GITHUB_TOKEN}
print_info "Keeping .npmrc files with environment variable references for CI/CD compatibility"

# Export NPM_TOKEN for npm/yarn install commands
export NPM_TOKEN="$GITHUB_TOKEN"
print_success "Set NPM_TOKEN environment variable for package authentication"

# Copy .env.example files
if [ -f server/.env.example ]; then
    cp server/.env.example server/.env
    print_success "Created server/.env from .env.example"
    
    # Generate secrets
    print_info "Generating secure secrets..."
    SESSION_SECRET=$(openssl rand -base64 32)
    JWT_SECRET=$(openssl rand -base64 32)
    
    # Update .env with defaults and generated values
    # Database configuration - using postgres defaults
    sed -i.bak "s/your_database_name/postgres/g" server/.env
    sed -i.bak "s/your_database_user/postgres/g" server/.env
    sed -i.bak "s/your_database_password/postgres/g" server/.env
    sed -i.bak "s/DATABASE_SCHEMA=public/DATABASE_SCHEMA=$DATABASE_SCHEMA/g" server/.env
    
    # Service URLs (keeping defaults for local development)
    # ORIGIN_BASE_URL already set to http://localhost:3001
    
    # Secrets
    sed -i.bak "s|SESSION_SECRET=your-session-secret-here-change-this-in-production|SESSION_SECRET=$SESSION_SECRET|g" server/.env
    sed -i.bak "s|JWT_SECRET=your-jwt-secret-here-change-this-in-production|JWT_SECRET=$JWT_SECRET|g" server/.env
    
    # Add GitHub token to server .env if not already present
    if ! grep -q "^GITHUB_TOKEN=" server/.env; then
        echo "" >> server/.env
        echo "# GitHub Personal Access Token" >> server/.env
        echo "GITHUB_TOKEN=$GITHUB_TOKEN" >> server/.env
    else
        sed -i.bak "s|^GITHUB_TOKEN=.*|GITHUB_TOKEN=$GITHUB_TOKEN|g" server/.env
    fi
    
    rm server/.env.bak
    
    print_success "Generated secure secrets for SESSION_SECRET and JWT_SECRET"
    print_success "Saved GitHub token to .env files for package authentication"
    print_warning "Database configured with postgres defaults - update if using different credentials"
    print_info "Note: .npmrc files use environment variables for NPM authentication"
fi

if [ -f client/.env.example ]; then
    cp client/.env.example client/.env
    print_success "Created client/.env from .env.example"
    
    # Update VITE_PAY_URL to use backend proxy
    # For local development, use localhost:3001
    # For production, it will be updated to use the deployed API URL
    sed -i.bak "s|VITE_PAY_URL=http://localhost:3001|VITE_PAY_URL=http://localhost:3001|g" client/.env
    
    # Add GitHub token to client .env if not already present
    if ! grep -q "^GITHUB_TOKEN=" client/.env; then
        echo "" >> client/.env
        echo "# GitHub Personal Access Token" >> client/.env
        echo "GITHUB_TOKEN=$GITHUB_TOKEN" >> client/.env
    else
        sed -i.bak "s|^GITHUB_TOKEN=.*|GITHUB_TOKEN=$GITHUB_TOKEN|g" client/.env
        rm client/.env.bak
    fi
    
    # Update VITE_PAY_URL for production deployment (will be used by CI/CD)
    # This creates an environment variable that can be used during build
    if ! grep -q "^VITE_PAY_URL_PRODUCTION=" client/.env; then
        echo "" >> client/.env
        echo "# Production Pay URL (used during deployment)" >> client/.env
        echo "VITE_PAY_URL_PRODUCTION=https://api.$DOMAIN_NAME" >> client/.env
    fi
    
    rm client/.env.bak 2>/dev/null || true
fi

# Step 5: Install dependencies
print_info "Step 5: Installing dependencies..."

# Install root dependencies
print_info "Installing root dependencies..."
# Ensure NPM_TOKEN is set for private package authentication
export NPM_TOKEN="$GITHUB_TOKEN"
npm install

# Install server dependencies
print_info "Installing server dependencies..."
# Ensure NPM_TOKEN is set for private package authentication
export NPM_TOKEN="$GITHUB_TOKEN"
cd server && npm install && cd ..

# Install client dependencies
print_info "Installing client dependencies..."
# Ensure NPM_TOKEN is set for private package authentication
export NPM_TOKEN="$GITHUB_TOKEN"
cd client && npm install && cd ..

print_success "All dependencies installed"

# Step 6: GitHub repository check
echo ""
print_info "Step 6: GitHub Repository Setup"
echo ""

if git remote -v | grep -q origin; then
    print_success "Git remote 'origin' already configured"
else
    if [ "$NON_INTERACTIVE" = true ]; then
        print_info "No git remote 'origin' found - skipping in non-interactive mode"
    else
        print_warning "No git remote 'origin' found"
        prompt_with_default "GitHub repository URL (e.g., git@github.com:username/repo.git)" "" REPO_URL "SETUP_REPO_URL"
        if [ ! -z "$REPO_URL" ]; then
            git remote add origin "$REPO_URL"
            print_success "Added git remote 'origin'"
        fi
    fi
fi

# Step 7: Create GitHub secrets file
print_info "Step 7: Creating GitHub secrets checklist..."

cat > github-secrets-checklist.txt <<EOF
GitHub Secrets & Variables Configuration:

✅ AUTOMATICALLY CONFIGURED BY TERRAFORM:
The following secrets and variables will be automatically configured when you run 'terraform apply':

Repository Variables (Public):
- ✅ AWS_ECR_URL
- ✅ AWS_S3_BUCKET_NAME  
- ✅ AWS_LAMBDA_FUNCTION_NAME
- ✅ API_BASE_URL
- ✅ APP_URL
- ✅ AWS_ROLE_ARN (for GitHub OIDC)
- ✅ AWS_REGION

Repository Secrets (Private):
- ✅ AWS_CLOUDFRONT_DISTRIBUTION_ID

🔧 MANUAL CONFIGURATION REQUIRED:

Repository Secrets:
- [ ] PRIVATE_ACTIONS_TOKEN (required for private GitHub packages - needs package:read permission)

If using static AWS credentials instead of GitHub OIDC (enable_github_oidc = false):
- [ ] AWS_ACCESS_KEY_ID (only required when OIDC is disabled)
- [ ] AWS_SECRET_ACCESS_KEY (only required when OIDC is disabled)

Optional Secrets (for notifications):
- [ ] SLACK_WEBHOOK (optional, for deployment notifications)

📋 NEXT STEPS:
1. Run 'terraform apply' to automatically configure GitHub secrets/variables
2. Run 'scripts/verify-github-secrets.sh' to verify the configuration
3. Your project is configured to use GitHub OIDC (enable_github_oidc = $ENABLE_GITHUB_OIDC)
4. Optionally configure Slack webhook for deployment notifications

Note: GitHub OIDC (default) provides more secure authentication than static AWS credentials.
It uses temporary credentials that automatically rotate with each workflow run.
EOF

print_success "Created github-secrets-checklist.txt"

# Step 8: Create setup notes
print_info "Creating setup completion notes..."

cat > setup-notes.md <<EOF
# Project Setup Notes

⚠️ **SECURITY WARNING**
- This file may contain sensitive information
- Do not commit this file to version control (already in .gitignore)
- Do not share this file with others
- Use environment variable references, not hardcoded tokens
- Rotate any exposed tokens immediately

## Configuration Summary
- **Service Name**: $SERVICE_NAME
- **Domain Name**: $DOMAIN_NAME
- **GitHub Repository**: $GITHUB_REPO
- **AWS Region**: $AWS_REGION
- **Database Schema**: $DATABASE_SCHEMA
- **CORS Origins**: $CORS_ORIGINS_INPUT
- **CORS Credentials**: $CORS_ALLOW_CREDENTIALS

## Security Configuration

The following secrets were auto-generated during setup:
- **SESSION_SECRET**: For server session encryption
- **JWT_SECRET**: For server-side JWT signing
- **Terraform jwt_secret**: For Lambda environment JWT signing

These secrets are unique to this deployment and should be rotated regularly.

### Rotating Secrets

To generate a new secret:
\`\`\`bash
openssl rand -base64 32
\`\`\`

Update the appropriate configuration file:
- Server secrets: \`server/.env\`
- Terraform JWT: \`terraform/terraform.tfvars\`

## Next Steps

### 1. Database Setup
Update \`server/.env\` with your actual database credentials:
- DATABASE_HOST
- DATABASE_NAME
- DATABASE_USER
- DATABASE_PASSWORD
- DATABASE_SCHEMA (currently set to: $DATABASE_SCHEMA)

### 2. Terraform Deployment
\`\`\`bash
cd terraform
# Source the environment file to load GitHub token
source .env
terraform init
terraform apply -target=aws_ecr_repository.ecr_repo
# Wait for ECR creation, then commit and push to trigger Docker build
git add .
git commit -m "Initial project setup for $SERVICE_NAME"
git push origin main
# After Docker image is pushed to ECR:
source .env && terraform apply
\`\`\`

### 3. GitHub Secrets
After Terraform creates resources, add the secrets listed in \`github-secrets-checklist.txt\`

### 4. Database Initialization
\`\`\`bash
cd server/db
./deploy.sh
\`\`\`

### 5. Local Development
\`\`\`bash
# Set NPM_TOKEN for private package authentication
export NPM_TOKEN=\$GITHUB_TOKEN

# Terminal 1 - Server
cd server
npm run dev

# Terminal 2 - Client
cd client
npm run dev
\`\`\`

## Important Files Modified
- \`terraform/terraform.tfvars\`
- \`terraform/.env\` (GitHub token for Terraform)
- \`terraform/main.tf\` (backend configuration)
- \`server/.env\`
- \`client/.env\` (if applicable)
EOF

print_success "Created setup-notes.md"

# Final summary
echo ""
echo "=========================================="
echo "${GREEN}Setup Completed Successfully!${NC}"
echo "=========================================="
echo ""
echo "Summary:"
echo "- Service Name: $SERVICE_NAME"
echo "- Domain: $DOMAIN_NAME"
echo "- Repository: $GITHUB_REPO"
echo ""
echo "Important next steps:"
echo "1. Update ${YELLOW}server/.env${NC} with your database credentials"
echo "2. Review ${YELLOW}setup-notes.md${NC} for detailed next steps"
echo "3. Configure GitHub secrets (see ${YELLOW}github-secrets-checklist.txt${NC})"
echo "4. Run Terraform to create infrastructure"
echo ""
print_warning "Don't forget to:"
echo "  - Set up your domain in Route 53 (if not already done)"
echo "  - Terraform state is centrally managed in tf-state-jeffrey-keyser-prod bucket"
echo "  - Ensure your AWS credentials are configured"
echo ""

# Cleanup backup files
find . -name "*.bak" -type f -delete 2>/dev/null || true

# Optional: Open setup notes
if [ "$NON_INTERACTIVE" = false ] && command -v code &> /dev/null; then
    read -p "Open setup-notes.md in VS Code? (y/n): " open_vscode
    if [ "$open_vscode" = "y" ]; then
        code setup-notes.md
    fi
fi