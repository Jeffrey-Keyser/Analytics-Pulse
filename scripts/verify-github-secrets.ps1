# GitHub Secrets & Variables Verification Script (PowerShell)
# This script verifies that Terraform has properly configured GitHub repository secrets and variables

param(
    [string]$Owner,
    [string]$Repository
)

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

# Header
Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "GitHub Secrets & Variables Verification" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Check if GitHub CLI is installed
try {
    $null = gh --version
} catch {
    Write-Error "GitHub CLI (gh) is not installed. Please install it first:"
    Write-Host "  - Windows: winget install GitHub.CLI"
    Write-Host "  - Or download from: https://github.com/cli/cli/releases"
    exit 1
}

# Check if user is authenticated with GitHub CLI
try {
    $null = gh auth status 2>$null
} catch {
    Write-Error "Not authenticated with GitHub CLI. Please run: gh auth login"
    exit 1
}

# Get repository information
if (-not $Owner -or -not $Repository) {
    # Try to get from git remote if not provided
    if (Test-Path ".git") {
        try {
            $remoteUrl = git remote get-url origin 2>$null
            if ($remoteUrl -match "github\.com[:/]([^/]+)/([^/]+)(?:\.git)?$") {
                $Owner = $matches[1]
                $Repository = $matches[2] -replace "\.git$", ""
            } else {
                throw "Could not parse repository info from remote URL"
            }
        } catch {
            Write-Error "Could not determine repository information from git remote."
            Write-Host "Please run this script with parameters: .\verify-github-secrets.ps1 -Owner 'your-org' -Repository 'your-repo'"
            exit 1
        }
    } else {
        Write-Error "Not in a git repository and no Owner/Repository specified."
        Write-Host "Please run this script with parameters: .\verify-github-secrets.ps1 -Owner 'your-org' -Repository 'your-repo'"
        exit 1
    }
}

Write-Info "Checking repository: $Owner/$Repository"
Write-Host ""

# Core expected variables (always required)
$CoreVariables = @(
    "AWS_ECR_URL",
    "AWS_S3_BUCKET_NAME",
    "AWS_LAMBDA_FUNCTION_NAME",
    "API_BASE_URL",
    "APP_URL",
    "AWS_REGION"
)

# Expected secrets that should be configured by Terraform
$ExpectedSecrets = @(
    "AWS_CLOUDFRONT_DISTRIBUTION_ID"
)

# Check if OIDC is enabled by looking for AWS_ROLE_ARN variable
$OIDCEnabled = $false
try {
    $roleArn = gh variable get "AWS_ROLE_ARN" --repo "$Owner/$Repository" 2>$null
    if ($roleArn) {
        $OIDCEnabled = $true
        Write-Info "GitHub OIDC authentication detected (AWS_ROLE_ARN variable found)"
    } else {
        Write-Info "Static AWS credentials authentication detected (no AWS_ROLE_ARN variable)"
    }
} catch {
    Write-Info "Static AWS credentials authentication detected (no AWS_ROLE_ARN variable)"
}
Write-Host ""

# Build expected variables list based on authentication method
$ExpectedVariables = $CoreVariables.Clone()
if ($OIDCEnabled) {
    $ExpectedVariables += "AWS_ROLE_ARN"
}

# Optional secrets (manual configuration)
$OptionalSecrets = @(
    "SLACK_WEBHOOK"
)

# AWS credentials are only required if OIDC is not enabled
if (-not $OIDCEnabled) {
    Write-Warning "OIDC is not enabled. AWS static credentials are required."
    $ExpectedSecrets += "AWS_ACCESS_KEY_ID"
    $ExpectedSecrets += "AWS_SECRET_ACCESS_KEY"
}

Write-Info "Checking Repository Variables..."

# Check each expected variable
$VariablesOK = $true
foreach ($var in $ExpectedVariables) {
    try {
        $value = gh variable get $var --repo "$Owner/$Repository" 2>$null
        if ($value) {
            Write-Success "✅ $var`: $value"
        } else {
            Write-Warning "⚠️  $var`: (empty value)"
        }
    } catch {
        Write-Error "❌ $var`: NOT FOUND"
        $VariablesOK = $false
    }
}

Write-Host ""
Write-Info "Checking Repository Secrets..."

# Check each expected secret
$SecretsOK = $true
foreach ($secret in $ExpectedSecrets) {
    try {
        $secretList = gh secret list --repo "$Owner/$Repository" 2>$null
        if ($secretList -match "^$secret\s") {
            Write-Success "✅ $secret`: CONFIGURED"
        } else {
            Write-Error "❌ $secret`: NOT FOUND"
            $SecretsOK = $false
        }
    } catch {
        Write-Error "❌ $secret`: NOT FOUND"
        $SecretsOK = $false
    }
}

Write-Host ""
Write-Info "Checking Optional Secrets..."

# Check optional secrets
foreach ($secret in $OptionalSecrets) {
    try {
        $secretList = gh secret list --repo "$Owner/$Repository" 2>$null
        if ($secretList -match "^$secret\s") {
            Write-Success "✅ $secret`: CONFIGURED (optional)"
        } else {
            Write-Warning "⚠️  $secret`: NOT CONFIGURED (optional)"
        }
    } catch {
        Write-Warning "⚠️  $secret`: NOT CONFIGURED (optional)"
    }
}

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "OIDC Health Check" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

if ($OIDCEnabled) {
    Write-Success "✅ OIDC authentication is enabled"

    # Verify AWS_ROLE_ARN is properly formatted
    try {
        $roleArn = gh variable get "AWS_ROLE_ARN" --repo "$Owner/$Repository" 2>$null
        if ($roleArn -match "^arn:aws:iam::\d+:role/.+") {
            Write-Success "✅ AWS_ROLE_ARN is properly formatted: $roleArn"
        } else {
            Write-Warning "⚠️  AWS_ROLE_ARN format may be incorrect: $roleArn"
        }
    } catch {
        Write-Warning "⚠️  Could not verify AWS_ROLE_ARN format"
    }

    # Check if workflows have proper permissions
    Write-Info "Ensure your workflows have 'permissions: id-token: write'"

    # Check for legacy credentials
    try {
        $secretList = gh secret list --repo "$Owner/$Repository" 2>$null
        if ($secretList -match "^AWS_ACCESS_KEY_ID\s") {
            Write-Warning "⚠️  AWS_ACCESS_KEY_ID secret found - consider removing legacy credentials"
        }
        if ($secretList -match "^AWS_SECRET_ACCESS_KEY\s") {
            Write-Warning "⚠️  AWS_SECRET_ACCESS_KEY secret found - consider removing legacy credentials"
        }
    } catch {
        # Ignore errors checking for legacy credentials
    }
} else {
    Write-Warning "⚠️  OIDC authentication is not enabled (using static AWS credentials)"
    Write-Info "Consider migrating to OIDC for better security:"
    Write-Host "  - See docs/OIDC_MIGRATION.md for migration guide"
    Write-Host "  - Set enable_github_oidc = true in terraform.tfvars"
    Write-Host "  - Run: cd terraform; terraform apply"
}

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan

if ($VariablesOK -and $SecretsOK) {
    Write-Success "All required GitHub secrets and variables are properly configured!"
    Write-Host ""
    if ($OIDCEnabled) {
        Write-Info "Authentication Method: GitHub OIDC (recommended)"
        Write-Info "Your workflows will use temporary AWS credentials via IAM role assumption"
    } else {
        Write-Info "Authentication Method: Static AWS Credentials"
        Write-Warning "Consider migrating to OIDC for improved security"
    }
    Write-Host ""
    Write-Info "Your CI/CD pipeline should now work correctly."
    Write-Info "You can now safely push code changes to trigger GitHub Actions workflows."
} else {
    Write-Error "Some required secrets or variables are missing."
    Write-Host ""
    Write-Info "This usually means:"
    Write-Host "  1. Terraform has not been applied yet (run 'terraform apply')"
    Write-Host "  2. The Terraform GitHub provider is not properly configured"
    Write-Host "  3. The terraform/secrets.tf file is not included in your Terraform configuration"
    Write-Host ""
    Write-Info "To fix this:"
    Write-Host "  1. Ensure you have a valid GitHub token set: `$env:TF_VAR_github_token = 'your_token'"
    Write-Host "  2. Run: cd terraform; terraform apply"
    Write-Host "  3. Re-run this verification script"
}

Write-Host ""