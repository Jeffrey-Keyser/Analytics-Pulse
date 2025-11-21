# ServerlessWebTemplate Setup Script for Windows
# This script automates the initial setup of a new project from this template

# Parse command line arguments
param(
    [switch]$NonInteractive,
    [switch]$y
)

$NON_INTERACTIVE = $NonInteractive -or $y

# Set error action preference
$ErrorActionPreference = "Stop"

# Colors for output
function Write-Info {
    Write-Host "[INFO] " -ForegroundColor Blue -NoNewline
    Write-Host $args[0]
}

function Write-Success {
    Write-Host "[SUCCESS] " -ForegroundColor Green -NoNewline
    Write-Host $args[0]
}

function Write-Warning {
    Write-Host "[WARNING] " -ForegroundColor Yellow -NoNewline
    Write-Host $args[0]
}

function Write-Error {
    Write-Host "[ERROR] " -ForegroundColor Red -NoNewline
    Write-Host $args[0]
}

# Function to prompt with default
function Prompt-WithDefault {
    param(
        [string]$Prompt,
        [string]$Default,
        [string]$EnvVar = ""
    )

    # Check if running in non-interactive mode
    if ($NON_INTERACTIVE) {
        # Use environment variable if available, otherwise use default
        if ($EnvVar -and (Test-Path "env:$EnvVar")) {
            $value = (Get-Item "env:$EnvVar").Value
            Write-Info "Using $EnvVar from environment: $value"
            return $value
        } else {
            Write-Info "Using default for ${Prompt}: $Default"
            return $Default
        }
    }

    # Interactive mode - check env var first
    if ($EnvVar -and (Test-Path "env:$EnvVar")) {
        $value = (Get-Item "env:$EnvVar").Value
        Write-Success "Using $EnvVar from environment: $value"
        return $value
    }

    # Fall back to interactive prompt
    $input = Read-Host "$Prompt [$Default]"
    if ([string]::IsNullOrWhiteSpace($input)) {
        return $Default
    }
    return $input
}

# Load config file if it exists
if (Test-Path "setup-config.env") {
    Write-Info "Loading configuration from setup-config.env"
    Get-Content "setup-config.env" | ForEach-Object {
        if ($_ -match '^\s*([^#][^=]+)=(.*)$') {
            $name = $matches[1].Trim()
            $value = $matches[2].Trim()
            Set-Item -Path "env:$name" -Value $value
        }
    }
}

# Header
Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "ServerlessWebTemplate Project Setup" -ForegroundColor Cyan
if ($NON_INTERACTIVE) {
    Write-Host "(Non-Interactive Mode)" -ForegroundColor Cyan
}
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Check prerequisites
Write-Info "Checking prerequisites..."

# Check for Node.js
try {
    $null = node --version
} catch {
    Write-Error "Node.js is not installed. Please install Node.js first."
    exit 1
}

# Check for yarn
try {
    $null = yarn --version
} catch {
    Write-Error "yarn is not installed. Please install yarn first."
    exit 1
}

# Check for Terraform
try {
    $null = terraform --version
    Write-Success "Terraform found"
} catch {
    Write-Warning "Terraform is not installed. You'll need it for infrastructure deployment."
}

# Check for AWS CLI
try {
    $null = aws --version
    Write-Success "AWS CLI found"
} catch {
    Write-Warning "AWS CLI is not installed. You'll need it for AWS deployments."
}

Write-Success "Prerequisites check completed"
Write-Host ""

# Step 1: Gather project information
Write-Info "Step 1: Project Configuration"
Write-Host ""

$ServiceName = Prompt-WithDefault -Prompt "Service Name" -Default "my-new-service" -EnvVar "SETUP_SERVICE_NAME"
$DomainName = Prompt-WithDefault -Prompt "Domain Name (e.g., yourdomain.com)" -Default "example.com" -EnvVar "SETUP_DOMAIN_NAME"
$GitHubRepo = Prompt-WithDefault -Prompt "GitHub Repository Name" -Default "my-new-service-repo" -EnvVar "SETUP_GITHUB_REPO"
$GitHubOwner = Prompt-WithDefault -Prompt "GitHub Owner/Organization" -Default "Jeffrey-Keyser" -EnvVar "SETUP_GITHUB_OWNER"
$AWSRegion = Prompt-WithDefault -Prompt "AWS Region" -Default "us-east-1" -EnvVar "SETUP_AWS_REGION"
$Environment = Prompt-WithDefault -Prompt "Environment (dev/staging/prod)" -Default "prod" -EnvVar "SETUP_ENVIRONMENT"
$SharedInfraBucket = Prompt-WithDefault -Prompt "Shared Infrastructure State Bucket" -Default "shared-infra-terraform-state" -EnvVar "SETUP_SHARED_INFRA_BUCKET"
$DatabaseSchema = Prompt-WithDefault -Prompt "Database Schema Name" -Default "public" -EnvVar "SETUP_DATABASE_SCHEMA"

Write-Host ""
Write-Info "CORS Configuration"
Write-Info "Configure Cross-Origin Resource Sharing for your API"
Write-Host ""

# Smart default based on domain
$DefaultCorsOrigin = "https://$DomainName"
if (-not $NON_INTERACTIVE) {
    Write-Info "Primary CORS origin (your frontend URL): $DefaultCorsOrigin"
    Write-Info "For multiple origins, enter comma-separated list (e.g., https://example.com,https://www.example.com)"
}
$CorsOriginsInput = Prompt-WithDefault -Prompt "CORS Allowed Origins" -Default $DefaultCorsOrigin -EnvVar "SETUP_CORS_ORIGINS"

# Parse and format for Terraform
$corsArray = $CorsOriginsInput -split ',' | ForEach-Object { $_.Trim() }
$corsOriginsFormatted = ($corsArray | ForEach-Object { "`"$_`"" }) -join ", "
$CorsOriginsTF = "[$corsOriginsFormatted]"

# Credentials (default: true for authenticated apps)
if (Test-Path "env:SETUP_CORS_CREDENTIALS") {
    $CorsAllowCredentials = $env:SETUP_CORS_CREDENTIALS
    if ($CorsAllowCredentials -eq "true") {
        if (-not $NON_INTERACTIVE) {
            Write-Success "Using CORS credentials from environment: $CorsAllowCredentials"
        } else {
            Write-Info "Using CORS credentials from environment: $CorsAllowCredentials"
        }
    }
} elseif ($NON_INTERACTIVE) {
    $CorsAllowCredentials = "true"
    Write-Info "Using default for CORS credentials: true"
} else {
    Write-Info "Allow credentials (cookies, JWT tokens) in cross-origin requests?"
    $CorsCredInput = Read-Host "Allow Credentials (Y/n) [Y]"
    if ([string]::IsNullOrWhiteSpace($CorsCredInput)) {
        $CorsCredInput = "Y"
    }

    if ($CorsCredInput -match "^[Yy]") {
        $CorsAllowCredentials = "true"
        Write-Info "Note: When credentials=true, only one origin should be specified for best compatibility"
    } else {
        $CorsAllowCredentials = "false"
    }
}

# HTTP Methods (most apps use these defaults)
$CorsMethods = Prompt-WithDefault -Prompt "CORS Allowed Methods" -Default "GET,POST,PUT,DELETE,OPTIONS" -EnvVar "SETUP_CORS_METHODS"

# Headers (common headers for REST APIs)
$CorsHeaders = Prompt-WithDefault -Prompt "CORS Allowed Headers" -Default "Content-Type,Authorization,X-Requested-With" -EnvVar "SETUP_CORS_HEADERS"

Write-Success "CORS configuration collected"

Write-Host ""
Write-Info "Step 2: Authentication Configuration"
Write-Host ""

# Prompt for OIDC vs Access Keys
if (Test-Path "env:SETUP_ENABLE_OIDC") {
    $EnableGitHubOIDC = $env:SETUP_ENABLE_OIDC
    if ($EnableGitHubOIDC -eq "true") {
        Write-Success "OIDC authentication enabled (from environment)"
        if (-not $NON_INTERACTIVE) {
            Write-Info "AWS credentials will not be required for GitHub Actions"
        }
    } else {
        Write-Warning "Using static AWS credentials (from environment, not recommended for production)"
    }
} elseif ($NON_INTERACTIVE) {
    $EnableGitHubOIDC = "true"
    Write-Info "Using default for OIDC: true (recommended)"
} else {
    Write-Info "GitHub OIDC provides secure, temporary credentials for CI/CD (recommended)"
    $UseOIDC = Read-Host "Use GitHub OIDC for AWS authentication? (Y/n) [Y]"
    if ([string]::IsNullOrWhiteSpace($UseOIDC)) {
        $UseOIDC = "Y"
    }

    if ($UseOIDC -match "^[Yy]") {
        $EnableGitHubOIDC = "true"
        Write-Success "OIDC authentication enabled (recommended)"
        Write-Info "AWS credentials will not be required for GitHub Actions"
    } else {
        $EnableGitHubOIDC = "false"
        Write-Warning "Using static AWS credentials (not recommended for production)"
        Write-Info "You will need to provide AWS access keys"
    }
}

Write-Host ""
Write-Info "Step 3: GitHub Configuration"
Write-Host ""

# Check for GitHub token
if ([string]::IsNullOrWhiteSpace($env:TF_VAR_github_token) -and [string]::IsNullOrWhiteSpace($env:GITHUB_TOKEN)) {
    if ($NON_INTERACTIVE) {
        Write-Error "GitHub token not found in environment (TF_VAR_github_token or GITHUB_TOKEN required in non-interactive mode)"
        exit 1
    }
    Write-Warning "GitHub token not found in environment"
    Write-Info "Your token will be visible as you type (for verification)"
    $GitHubToken = Read-Host "Enter your GitHub Personal Access Token"
    $env:TF_VAR_github_token = $GitHubToken
} elseif ([string]::IsNullOrWhiteSpace($env:TF_VAR_github_token)) {
    $env:TF_VAR_github_token = $env:GITHUB_TOKEN
    $GitHubToken = $env:GITHUB_TOKEN
    Write-Success "GitHub token found in environment"
} else {
    Write-Success "GitHub token found in environment"
    $GitHubToken = $env:TF_VAR_github_token
}

# Step 3: Create Terraform configuration
Write-Info "Step 3: Creating Terraform configuration..."

# Generate Terraform JWT secret
Write-Info "Generating secure JWT secret for Terraform..."
$rngTerraform = New-Object System.Security.Cryptography.RNGCryptoServiceProvider
$terraformJwtBytes = New-Object byte[] 32
$rngTerraform.GetBytes($terraformJwtBytes)
$TerraformJWTSecret = [System.Convert]::ToBase64String($terraformJwtBytes)
$rngTerraform.Dispose()
Write-Success "Generated secure JWT secret for Terraform configuration"

# Create terraform.tfvars
# Convert service name to lowercase and replace invalid characters
$ServiceNameLower = $ServiceName.ToLower() -replace '[^a-z0-9-]', '-'

$tfvarsContent = @"
# Core Configuration
service_name = "jeffrey-keyser-$ServiceNameLower"
domain_name  = "$DomainName"
region       = "$AWSRegion"
environment  = "$Environment"

# Domain Configuration
alternative_domain_names = ["www.$DomainName"]
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
github_owner      = "$GitHubOwner"
github_repository = "$GitHubRepo"
enable_github_oidc = $EnableGitHubOIDC

# Security Configuration
# JWT secret auto-generated during setup
# To rotate: openssl rand -base64 32 (bash) or [Convert]::ToBase64String((New-Object byte[] 32 | ForEach-Object { [byte](Get-Random -Maximum 256) }))
jwt_secret = "$TerraformJWTSecret"

# CORS Configuration
cors_allowed_origins   = $CorsOriginsTF
cors_allow_credentials = $CorsAllowCredentials
cors_allowed_methods   = "$CorsMethods"
cors_allowed_headers   = "$CorsHeaders"

# Shared Infrastructure - Disabled for now
# shared_infrastructure_state = null

# Additional Tags
additional_tags = {
  Owner   = "$GitHubOwner"
  Project = "$ServiceNameLower"
}
"@

Set-Content -Path "terraform/terraform.tfvars" -Value $tfvarsContent
Write-Success "Created terraform/terraform.tfvars"

# Create terraform/.env file
Write-Info "Creating terraform/.env file..."
$terraformEnvContent = "TF_VAR_github_token=$GitHubToken"

Set-Content -Path "terraform/.env" -Value $terraformEnvContent
Write-Success "Created terraform/.env with GitHub token"

Write-Info "Terraform backend is pre-configured with centralized state management"

# Update Terraform backend key with service name
Write-Info "Configuring Terraform state key for service: $ServiceName"
$mainPath = "terraform/main.tf"
if (Test-Path $mainPath) {
    $mainContent = Get-Content $mainPath -Raw
    $mainContent = $mainContent -replace 'SERVICE_NAME_PLACEHOLDER', $ServiceName
    Set-Content -Path $mainPath -Value $mainContent
    Write-Success "Updated Terraform backend key with service name"
} else {
    Write-Warning "terraform/main.tf not found - skipping key configuration"
}

# Step 4: Setup environment files
Write-Info "Step 4: Setting up environment files..."

# Copy root .env.example file
if (Test-Path ".env.example") {
    Copy-Item ".env.example" ".env"
    Write-Success "Created root .env from .env.example"
    
    # Update root .env with project values
    $rootEnvContent = Get-Content ".env" -Raw
    $rootEnvContent = $rootEnvContent -replace 'your-github-token-here', $GitHubToken
    $rootEnvContent = $rootEnvContent -replace 'your-project-name', $ServiceName
    Set-Content -Path ".env" -Value $rootEnvContent
    Write-Success "Updated root .env with project configuration"
}

# .npmrc files should use environment variables for CI/CD compatibility
# No changes needed to .npmrc files as they already use ${GITHUB_TOKEN}
Write-Info "Keeping .npmrc files with environment variable references for CI/CD compatibility"

# Export NPM_TOKEN for npm/yarn install commands
$env:NPM_TOKEN = $GitHubToken
Write-Success "Set NPM_TOKEN environment variable for package authentication"

# Copy .env.example files
if (Test-Path "server/.env.example") {
    Copy-Item "server/.env.example" "server/.env"
    Write-Success "Created server/.env from .env.example"
    
    # Generate secrets
    Write-Info "Generating secure secrets..."
    $rng = New-Object System.Security.Cryptography.RNGCryptoServiceProvider
    $sessionBytes = New-Object byte[] 32
    $jwtBytes = New-Object byte[] 32
    $rng.GetBytes($sessionBytes)
    $rng.GetBytes($jwtBytes)
    $SessionSecret = [System.Convert]::ToBase64String($sessionBytes)
    $JWTSecret = [System.Convert]::ToBase64String($jwtBytes)
    $rng.Dispose()
    
    # Update .env with defaults and generated values
    $envContent = Get-Content "server/.env" -Raw
    
    # Database configuration - using postgres defaults
    $envContent = $envContent -replace 'your_database_name', "postgres"
    $envContent = $envContent -replace 'your_database_user', "postgres"
    $envContent = $envContent -replace 'your_database_password', "postgres"
    $envContent = $envContent -replace 'DATABASE_SCHEMA=public', "DATABASE_SCHEMA=$DatabaseSchema"
    
    # Service URLs
    $envContent = $envContent -replace 'ORIGIN_BASE_URL=http://localhost:3001', "ORIGIN_BASE_URL=http://localhost:3001"
    
    # Secrets
    $envContent = $envContent -replace 'SESSION_SECRET=your-session-secret-here-change-this-in-production', "SESSION_SECRET=$SessionSecret"
    $envContent = $envContent -replace 'JWT_SECRET=your-jwt-secret-here-change-this-in-production', "JWT_SECRET=$JWTSecret"
    
    # Add GitHub token if not already present
    if ($envContent -notmatch "GITHUB_TOKEN=") {
        $envContent += "`n`n# GitHub Personal Access Token`nGITHUB_TOKEN=$GitHubToken"
    } else {
        $envContent = $envContent -replace 'GITHUB_TOKEN=.*', "GITHUB_TOKEN=$GitHubToken"
    }
    
    Set-Content -Path "server/.env" -Value $envContent
    
    Write-Success "Generated secure secrets for SESSION_SECRET and JWT_SECRET"
    Write-Success "Saved GitHub token to .env files for package authentication"
    Write-Warning "Database configured with postgres defaults - update if using different credentials"
    Write-Info "Note: .npmrc files use environment variables for NPM authentication"
}

if (Test-Path "client/.env.example") {
    Copy-Item "client/.env.example" "client/.env"
    Write-Success "Created client/.env from .env.example"
    
    # Get the client .env content
    $clientEnvContent = Get-Content "client/.env" -Raw
    
    # Update VITE_PAY_URL to use backend proxy (already set correctly in .env.example)
    # For local development, use localhost:3001
    # For production, it will be updated to use the deployed API URL
    $clientEnvContent = $clientEnvContent -replace 'VITE_PAY_URL=http://localhost:3001', 'VITE_PAY_URL=http://localhost:3001'
    
    # Add GitHub token to client .env
    if ($clientEnvContent -notmatch "GITHUB_TOKEN=") {
        $clientEnvContent += "`n`n# GitHub Personal Access Token`nGITHUB_TOKEN=$GitHubToken"
    } else {
        $clientEnvContent = $clientEnvContent -replace 'GITHUB_TOKEN=.*', "GITHUB_TOKEN=$GitHubToken"
    }
    
    # Add production pay URL for deployment
    if ($clientEnvContent -notmatch "VITE_PAY_URL_PRODUCTION=") {
        $clientEnvContent += "`n`n# Production Pay URL (used during deployment)`nVITE_PAY_URL_PRODUCTION=https://api.$DomainName"
    }
    
    Set-Content -Path "client/.env" -Value $clientEnvContent
}

# Step 5: Install dependencies
Write-Info "Step 5: Installing dependencies..."

# Install root dependencies
Write-Info "Installing root dependencies..."
# Ensure NPM_TOKEN is set for private package authentication
$env:NPM_TOKEN = $GitHubToken
yarn install

# Install server dependencies
Write-Info "Installing server dependencies..."
# Ensure NPM_TOKEN is set for private package authentication
$env:NPM_TOKEN = $GitHubToken
Push-Location server
yarn install
Pop-Location

# Install client dependencies
Write-Info "Installing client dependencies..."
# Ensure NPM_TOKEN is set for private package authentication
$env:NPM_TOKEN = $GitHubToken
Push-Location client
yarn install
Pop-Location

Write-Success "All dependencies installed"

# Step 6: GitHub repository check
Write-Host ""
Write-Info "Step 6: GitHub Repository Setup"
Write-Host ""

$gitRemote = git remote -v 2>$null
if ($gitRemote -match "origin") {
    Write-Success "Git remote 'origin' already configured"
} else {
    if ($NON_INTERACTIVE) {
        Write-Info "No git remote 'origin' found - skipping in non-interactive mode"
    } else {
        Write-Warning "No git remote 'origin' found"
        $RepoURL = Read-Host "GitHub repository URL (e.g., git@github.com:username/repo.git) [leave empty to skip]"
        if (-not [string]::IsNullOrWhiteSpace($RepoURL)) {
            git remote add origin $RepoURL
            Write-Success "Added git remote 'origin'"
        }
    }
}

# Step 7: Create GitHub secrets file
Write-Info "Step 7: Creating GitHub secrets checklist..."

$secretsChecklist = @"
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
2. Run 'scripts/verify-github-secrets.ps1' to verify the configuration
3. Your project is configured to use GitHub OIDC (enable_github_oidc = $EnableGitHubOIDC)
4. Optionally configure Slack webhook for deployment notifications

Note: GitHub OIDC (default) provides more secure authentication than static AWS credentials.
It uses temporary credentials that automatically rotate with each workflow run.
"@

Set-Content -Path "github-secrets-checklist.txt" -Value $secretsChecklist
Write-Success "Created github-secrets-checklist.txt"

# Step 8: Create setup notes
Write-Info "Creating setup completion notes..."

$setupNotes = @"
# Project Setup Notes

⚠️ **SECURITY WARNING**
- This file may contain sensitive information
- Do not commit this file to version control (already in .gitignore)
- Do not share this file with others
- Use environment variable references, not hardcoded tokens
- Rotate any exposed tokens immediately

## Configuration Summary
- **Service Name**: $ServiceName
- **Domain Name**: $DomainName
- **GitHub Owner**: $GitHubOwner
- **GitHub Repository**: $GitHubRepo
- **AWS Region**: $AWSRegion
- **Environment**: $Environment
- **Shared Infrastructure Bucket**: $SharedInfraBucket
- **Database Schema**: $DatabaseSchema
- **CORS Origins**: $CorsOriginsInput
- **CORS Credentials**: $CorsAllowCredentials

## Security Configuration

The following secrets were auto-generated during setup:
- **SESSION_SECRET**: For server session encryption
- **JWT_SECRET**: For server-side JWT signing
- **Terraform jwt_secret**: For Lambda environment JWT signing

These secrets are unique to this deployment and should be rotated regularly.

### Rotating Secrets

To generate a new secret (PowerShell):
``````powershell
`$rng = New-Object System.Security.Cryptography.RNGCryptoServiceProvider
`$bytes = New-Object byte[] 32
`$rng.GetBytes(`$bytes)
[System.Convert]::ToBase64String(`$bytes)
`$rng.Dispose()
``````

Or using bash/openssl:
``````bash
openssl rand -base64 32
``````

Update the appropriate configuration file:
- Server secrets: ``server/.env``
- Terraform JWT: ``terraform/terraform.tfvars``

## Next Steps

### 1. Database Setup
Update ``server/.env`` with your actual database credentials:
- DATABASE_HOST
- DATABASE_NAME
- DATABASE_USER
- DATABASE_PASSWORD
- DATABASE_SCHEMA (currently set to: $DatabaseSchema)

### 2. Terraform Deployment
```bash
cd terraform
# Load environment variables (PowerShell)
. .\.env
# Or for bash/Linux users:
# source .env
terraform init
terraform apply -target=aws_ecr_repository.ecr_repo
# Wait for ECR creation, then commit and push to trigger Docker build
git add .
git commit -m "Initial project setup for $ServiceName"
git push origin main
# After Docker image is pushed to ECR:
. .\.env && terraform apply
```

### 3. GitHub Secrets (Mostly Automated!)
Most GitHub secrets and variables are automatically configured by Terraform! 
See ``github-secrets-checklist.txt`` for details on what's automated vs. manual.

### 4. Database Initialization
```bash
cd server/db
./deploy.sh
```

### 5. Local Development
```bash
# Set NPM_TOKEN for private package authentication (PowerShell)
`$env:NPM_TOKEN = `$env:GITHUB_TOKEN
# Or for bash/Linux users:
# export NPM_TOKEN=`$GITHUB_TOKEN

# Terminal 1 - Server
cd server
yarn dev

# Terminal 2 - Client
cd client
yarn dev
```

## Important Files Modified
- ``terraform/terraform.tfvars``
- ``terraform/.env`` (GitHub token for Terraform)
- ``terraform/main.tf`` (backend configuration)
- ``server/.env``
- ``client/.env`` (if applicable)
"@

Set-Content -Path "setup-notes.md" -Value $setupNotes
Write-Success "Created setup-notes.md"

# Final summary
Write-Host ""
Write-Host "==========================================" -ForegroundColor Green
Write-Host "Setup Completed Successfully!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Summary:"
Write-Host "- Service Name: $ServiceName"
Write-Host "- Domain: $DomainName"
Write-Host "- GitHub: $GitHubOwner/$GitHubRepo"
Write-Host "- Environment: $Environment"
Write-Host ""
Write-Host "Important next steps:"
Write-Host "1. Update " -NoNewline
Write-Host "server/.env" -ForegroundColor Yellow -NoNewline
Write-Host " with your database credentials"
Write-Host "2. Review " -NoNewline
Write-Host "setup-notes.md" -ForegroundColor Yellow -NoNewline
Write-Host " for detailed next steps"
Write-Host "3. Configure GitHub secrets (see " -NoNewline
Write-Host "github-secrets-checklist.txt" -ForegroundColor Yellow -NoNewline
Write-Host ")"
Write-Host "4. Run Terraform to create infrastructure"
Write-Host ""
Write-Warning "Don't forget to:"
Write-Host "  - Set up your domain in Route 53 (if not already done)"
Write-Host "  - Terraform state is centrally managed in tf-state-jeffrey-keyser-prod bucket"
Write-Host "  - Ensure your AWS credentials are configured"
Write-Host ""

# Optional: Open setup notes
if (-not $NON_INTERACTIVE -and (Get-Command code -ErrorAction SilentlyContinue)) {
    $openVSCode = Read-Host "Open setup-notes.md in VS Code? (y/n)"
    if ($openVSCode -eq "y") {
        code setup-notes.md
    }
}