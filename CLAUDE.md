# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Development Commands

### Automated Deployment
```bash
# Fully automated end-to-end deployment (template to live in <10 minutes)
export GITHUB_TOKEN="your_github_pat"
./scripts/new-service-auto.sh <service-name> <domain>

# Interactive mode (default - prompts for confirmation)
./scripts/new-service-auto.sh my-service example.com

# Non-interactive mode (for automation/CI/CD - skips all prompts)
./scripts/new-service-auto.sh my-service example.com --yes
./scripts/new-service-auto.sh my-service example.com -y

# The script will:
# 1. Validate prerequisites
# 2. Run automated project setup
# 3. Initialize Terraform
# 4. Create ECR and push Docker image
# 5. Deploy full infrastructure
# 6. Configure environment files
# 7. Commit and push changes

# Features: idempotent, error handling, rollback, progress tracking
# Modes: interactive (default) or non-interactive (--yes/-y flag)
```

### Server Development
```bash
# Navigate to server directory
cd server

# Development server (requires .env file - copy from .env.example)
npm run dev

# Build TypeScript
npm run build

# Lint TypeScript files (ESLint v9)
npm run lint

# Watch mode for TypeScript compilation
npm run watch

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run a single test file
npm test -- path/to/test.test.ts
```

### Client Development
```bash
# Navigate to client directory
cd client

# Development server
npm run dev

# Production build
npm run build

# Run tests (using Vitest)
npm run test

# Test coverage
npm run coverage

# Storybook development
npm run storybook
```

### Database Management
```bash
# Deploy database migrations and SQL files
cd server/db
./deploy.sh

# Deploy specific SQL files using the package CLI
cd server
npx db-deploy directory ./db/schema
npx db-deploy session-tables --schema public --table session

# Create a new migration (still uses Sequelize CLI)
npx sequelize-cli migration:generate --name your-migration-name

# Run migrations manually
npx sequelize-cli db:migrate

# Undo last migration
npx sequelize-cli db:migrate:undo

# Create seed data
npx sequelize-cli seed:generate --name demo-data

# Teardown database (use with caution - removes all data)
cd server/db
./teardown.sh
```

### Terraform Configuration
```bash
# Ensure Terraform 1.13.5 or higher is installed
# Using tfenv (recommended):
tfenv install 1.13.5
tfenv use 1.13.5

# Verify version
terraform version

# Navigate to terraform directory
cd terraform

# Create terraform.tfvars from example (REQUIRED before first apply)
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars with your actual values (DO NOT commit this file)

# Initialize Terraform
terraform init

# Plan infrastructure changes
terraform plan

# Apply infrastructure changes
terraform apply

# Destroy infrastructure (use with caution)
terraform destroy
```

**IMPORTANT Security Notes:**
- `terraform.tfvars` contains sensitive credentials and is gitignored
- NEVER commit `terraform.tfvars` to version control
- Use `terraform.tfvars.example` as a template showing required variables
- GitHub Personal Access Token is required for accessing private actions
- AWS credentials are only needed if `enable_github_oidc = false` (not recommended)
- When using OIDC (default), GitHub Actions uses temporary AWS credentials via IAM roles

**Required Variables in terraform.tfvars:**
- `github_token`: GitHub PAT for Terraform provider (managing GitHub resources)
- `github_personal_access_token`: PAT for accessing private GitHub Actions
- `jwt_secret`: Secure random string for JWT token signing
- `aws_access_key_id` and `aws_secret_access_key`: Only if OIDC disabled

## Architecture Overview

### API Versioning

This template implements formal API contract versioning using the `/api/v{N}/` prefix pattern for stability and backward compatibility.

**Versioned Endpoints:**
- `/api/v1/auth/me` - Get current user details
- `/api/v1/diagnostics/detailed` - Get system diagnostics
- All future application endpoints

**Version Negotiation:**
- **URL-based**: Version specified in URL path (e.g., `/api/v1/`)
- **Header-based**: Use `Accept-Version: 1` header for version selection
- **Response Header**: All versioned responses include `API-Version` header
- **Default**: Defaults to latest stable version (v1)

**Backward Compatibility:**
- Legacy `/v1/*` routes redirect to `/api/v1/*` (301 Permanent Redirect)
- Query parameters preserved during redirects
- No breaking changes to existing consumers

**Unversioned Routes:**
The following routes remain at root level (not versioned):
- `/` - API root information
- `/ping` - Health check utility
- `/health` - Health check endpoint
- `/api-docs` - Swagger documentation
- `/auth/*` - Pay service integration routes (external package)

**Implementation:**
- **Middleware**: `server/middleware/versioning.ts` handles version negotiation and redirects
- **Router**: `server/routes/versions/v1/` contains v1 routes
- **Documentation**: See `docs/API_VERSIONING_STRATEGY.md` for complete strategy

**Adding New Endpoints:**
```typescript
// 1. Create route in appropriate file (e.g., routes/auth.ts)
// 2. Export the router
// 3. Import in routes/versions/v1/index.ts
// 4. Add Swagger docs with /api/v1/ prefix
v1Router.use('/resource', resourceRouter);
```

**Testing Versioned APIs:**
```bash
# Test v1 endpoint
curl http://localhost:3001/api/v1/diagnostics/detailed

# Test legacy redirect
curl -I http://localhost:3001/v1/diagnostics/detailed
# Returns: 301 Location: /api/v1/diagnostics/detailed

# Test version header
curl -H "Accept-Version: 1" http://localhost:3001/api/v1/auth/me
# Returns: API-Version: 1
```

### Server Architecture (Express/Lambda)
- **Authentication**: Uses `@jeffrey-keyser/pay-auth-integration` package, proxying to external service at `https://pay.jeffreykeyser.net`
- **Middleware Pipeline**: Auth (JWT/sessions), CORS, error handling, request validation
- **API Structure**: RESTful endpoints under `/auth/*` for authentication, `/health/*` for diagnostics
- **Configuration**: Centralized environment config in `server/config/env.ts` with validation
- **Database**: PostgreSQL with `@jeffrey-keyser/database-base-config` package using native `pg` driver
- **Session Storage**: Uses `connect-pg-simple` for database-backed sessions via the database package
- **DAL Pattern**: Data Access Layer using BaseDal classes with transaction support and raw SQL queries
- **Deployment**: Express app wrapped with serverless-http for AWS Lambda execution

### Client Architecture (React/Redux)
- **State Management**: Redux Toolkit with RTK Query for API calls and caching
- **Component Pattern**: Smart containers (in `containers/`) manage state, presentational components (in `components/`) handle UI
- **Styling**: CSS Modules for component-scoped styles, Styled Components available
- **Payment Integration**: Stripe Elements for payment processing
- **Auth Flow**: Protected routes with JWT token management, uses `@jeffrey-keyser/pay-auth-integration` for client-side helpers
- **UI Library**: Uses `@jkeyser/ui-kit` for consistent UI components
- **Testing**: Vitest for unit tests, Testing Library for component tests

### Infrastructure (AWS/Terraform)
- **Current State**: Legacy modules in `terraform/modules/`, migration to external module planned
- **Future State**: External `serverless-web-infra` module (see `terraform-new/`)
- **Serverless Backend**: Lambda function with API Gateway, Docker images stored in ECR
- **Static Frontend**: React app deployed to S3, served via CloudFront CDN
- **Database**: PostgreSQL on RDS (connection via Sequelize ORM)
- **State Management**: Terraform state centrally managed in tf-state-jeffrey-keyser-prod bucket with service-specific keys
- **CI/CD**: GitHub Actions workflows using OIDC for AWS authentication (manual Terraform deployment)

## Key Implementation Details

### Authentication
- Supports both session cookies and JWT bearer tokens
- User data proxied from external service (`PAY_SERVICE_URL`), not stored locally
- JWT tokens validated via middleware in `server/middleware/auth.ts`
- Public routes configured in middleware (bypass authentication)
- Client stores auth state in Redux with automatic token refresh
- PayUser type extends standard User model with additional fields

### GitHub Actions AWS Authentication

This project uses **GitHub OIDC (OpenID Connect)** for AWS authentication in CI/CD workflows (recommended):

**Benefits:**
- No long-lived AWS credentials stored in GitHub Secrets
- Temporary credentials issued per workflow run (automatic expiration)
- Enhanced security with automatic credential rotation
- Role ARN configured automatically via Terraform
- Better compliance with security best practices

**Configuration:**
- Terraform creates IAM OIDC provider and GitHub Actions role
- `enable_github_oidc = true` in `terraform.tfvars` (default)
- `AWS_ROLE_ARN` variable automatically set in GitHub repository
- Workflows use `aws-actions/configure-aws-credentials@v4` with `role-to-assume`

**Workflow Setup:**
```yaml
jobs:
  deploy:
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

**Migration:**
- Existing projects can migrate from access keys to OIDC
- See `docs/OIDC_MIGRATION.md` for step-by-step guide
- Rollback supported by setting `enable_github_oidc = false`

#### Troubleshooting OIDC

**Error: Not authorized to perform sts:AssumeRoleWithWebIdentity**
- Verify `enable_github_oidc = true` in `terraform.tfvars`
- Run `terraform apply` to create OIDC infrastructure
- Confirm `AWS_ROLE_ARN` variable exists in GitHub repository settings
- Check IAM OIDC provider exists: `aws iam list-open-id-connect-providers`

**Error: Invalid identity token**
- Ensure workflow has `permissions: id-token: write` in job definition
- Verify using `aws-actions/configure-aws-credentials@v4` or later
- Check GitHub repository settings allow OIDC (Settings → Actions → General)
- Confirm workflow uses `role-to-assume` (not `aws-access-key-id`)

**Error: AWS_ROLE_ARN variable not found**
- Run `terraform apply` to create the GitHub variable
- Manually verify in repository Settings → Secrets and variables → Actions → Variables
- Check Terraform output: `terraform output github_oidc_role_arn`

**Legacy Access Key Authentication:**
- Set `enable_github_oidc = false` in `terraform.tfvars`
- Provide `aws_access_key_id` and `aws_secret_access_key` in `terraform.tfvars`
- Terraform will create `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` secrets
- Not recommended for production use

### API Documentation
- Swagger UI served at root path `/api-docs` when server is running
- API endpoints documented with JSDoc comments in route files
- Interactive testing available through Swagger interface

### Environment Configuration
- Server requires `.env` file (create from `.env.example` template)
- All env vars loaded and validated through `server/config/env.ts`
- Database config validated via `@jeffrey-keyser/database-base-config` package
- Supports both `DATABASE_*` (package standard) and `DB_*` (legacy) environment variables
- Access config via imported object, not `process.env` directly
- Key variables: `PAY_SERVICE_URL`, JWT/session secrets, database connection

**Future Enhancement: Config Loader Package**
- New `@jeffrey-keyser/service-config-loader` package extracts config pattern (~140 lines → ~14 lines)
- Reference implementation available in `server/config/env.ts.new`
- Migration guide: `docs/CONFIG_LOADER_MIGRATION.md`
- Package repository: https://github.com/Jeffrey-Keyser/service-config-loader
- Awaiting npm publication before template integration

### Testing Strategy
- Client: Vitest for unit tests, Testing Library for component tests
- Server: Jest for unit and integration tests, Supertest for API testing
- Test files located in `server/tests/__tests__/` with unit and integration subdirectories
- Mocks available in `server/tests/__mocks__/`
- Run single test: `npm test -- path/to/test.test.ts`

### Code Quality
- **ESLint**: Server uses ESLint v9 with flat config format (`eslint.config.js`)
- **TypeScript**: Configured for ES2020 target with strict type checking
- **Linting**: Run `npm run lint` in server directory
- **Type Safety**: Avoid `any` types, use proper TypeScript interfaces
- **Configuration**: Uses `@typescript-eslint/parser` and `@typescript-eslint/eslint-plugin` v8

### Type System
- Comprehensive TypeScript types in `server/types/` directory
- Service response patterns: `ServiceResponse<T>` and `ApiResponse<T>`
- PayUser type from pay-auth-integration package
- Express request types extended with user and session data

### Deployment Process
1. Push to GitHub triggers CI/CD workflows
2. Server Docker image built and pushed to ECR
3. Lambda function updated with new image
4. Client built and synced to S3
5. CloudFront cache invalidated
6. Note: Terraform deployment is manual (workflow_dispatch)

## Development Workflow

1. **Environment Setup**: Create server `.env` file from example
2. **Database Setup**: Run deployment script if needed
3. **Start Development**: Run dev servers for client and server
4. **Code Style**: Follow existing patterns in codebase
5. **Type Safety**: Maintain TypeScript types throughout
6. **API Changes**: Update Swagger documentation when modifying endpoints
7. **Testing**: Run tests before committing changes
8. **Linting**: Ensure code passes linting (server only has lint command)

### Adding New Shell Scripts

When adding shell scripts to the repository, ensure they are executable after clone:

1. **Make the script executable locally:**
   ```bash
   chmod +x new-script.sh
   ```

2. **Update Git index to preserve executable permission:**
   ```bash
   git update-index --chmod=+x new-script.sh
   ```

3. **Verify the permission was set:**
   ```bash
   git ls-files -s new-script.sh
   # Should show: 100755 (executable) not 100644 (regular file)
   ```

4. **Commit as usual:**
   ```bash
   git add new-script.sh
   git commit -m "Add new script with executable permissions"
   ```

**Why this matters:**
- Git doesn't preserve file permissions from Windows systems by default
- Scripts without executable permissions require `chmod +x` or `bash` prefix after clone
- This is confusing for users and breaks scripts that execute other scripts
- Setting the executable bit in Git ensures scripts work immediately after clone on Linux/macOS

## Project Setup Scripts

### Initial Setup (from root directory)
- **Linux/macOS**: `./setup-project.sh`
- **Windows PowerShell**: `./setup-project.ps1`

These scripts will:
- Check prerequisites (Node.js, npm, Terraform, AWS CLI)
- Prompt for project configuration (service name, domain, GitHub owner, environment)
- Create Terraform configuration files
- Set up environment files from examples
- Install all dependencies
- Generate secure SESSION_SECRET and JWT_SECRET
- Configure database settings

### Non-Interactive Setup (Automated Mode)

Both setup scripts support non-interactive mode for automation, CI/CD, and AI-driven workflows.

**Usage:**

```bash
# Using environment variables
export SETUP_SERVICE_NAME="my-service"
export SETUP_DOMAIN_NAME="example.com"
export SETUP_GITHUB_REPO="my-repo"
export SETUP_GITHUB_OWNER="Jeffrey-Keyser"
export GITHUB_TOKEN="your_github_pat"

./setup-project.sh --non-interactive

# Using config file
cp setup-config.env.example setup-config.env
# Edit setup-config.env with your values
./setup-project.sh --non-interactive

# PowerShell
./setup-project.ps1 -NonInteractive
# or
./setup-project.ps1 -y
```

**Key Features:**

- ✅ **Environment Variable Support**: All configuration via `SETUP_*` variables
- ✅ **Config File Support**: Load settings from `setup-config.env`
- ✅ **Backward Compatible**: Interactive mode still works by default
- ✅ **Precedence**: Environment vars → Config file → Defaults
- ✅ **CI/CD Ready**: No user input required
- ✅ **AI-Friendly**: Perfect for automated setup workflows

**Available Variables:**

| Variable | Default | Description |
|----------|---------|-------------|
| `SETUP_SERVICE_NAME` | `my-new-service` | Service name |
| `SETUP_DOMAIN_NAME` | `example.com` | Domain name |
| `SETUP_GITHUB_REPO` | `my-new-service-repo` | GitHub repository |
| `SETUP_GITHUB_OWNER` | `Jeffrey-Keyser` | GitHub owner/org |
| `SETUP_AWS_REGION` | `us-east-1` | AWS region |
| `SETUP_ENVIRONMENT` | `prod` | Environment |
| `SETUP_DATABASE_SCHEMA` | `public` | Database schema |
| `SETUP_CORS_ORIGINS` | `https://$DOMAIN` | CORS origins (comma-separated) |
| `SETUP_CORS_CREDENTIALS` | `true` | Allow credentials |
| `SETUP_CORS_METHODS` | `GET,POST,PUT,DELETE,OPTIONS` | Allowed methods |
| `SETUP_CORS_HEADERS` | `Content-Type,Authorization,X-Requested-With` | Allowed headers |
| `SETUP_ENABLE_OIDC` | `true` | Use GitHub OIDC |

**Example Workflows:**

```bash
# Minimal setup (uses all defaults)
export GITHUB_TOKEN="$GITHUB_TOKEN"
./setup-project.sh --non-interactive

# Custom service setup
SETUP_SERVICE_NAME="my-api" \
SETUP_DOMAIN_NAME="api.example.com" \
SETUP_GITHUB_REPO="my-api" \
GITHUB_TOKEN="$GITHUB_TOKEN" \
./setup-project.sh --non-interactive

# Using config file for complex setups
cat > setup-config.env <<EOF
SETUP_SERVICE_NAME=my-service
SETUP_DOMAIN_NAME=example.com
SETUP_CORS_ORIGINS=https://example.com,https://www.example.com
SETUP_CORS_CREDENTIALS=true
EOF
export GITHUB_TOKEN="$GITHUB_TOKEN"
./setup-project.sh --non-interactive
```

See `setup-config.env.example` for complete documentation.

### GitHub Secrets Verification
After setup, verify GitHub secrets configuration:
- **Linux/macOS**: `./scripts/verify-github-secrets.sh`
- **Windows PowerShell**: `./scripts/verify-github-secrets.ps1`

**Required GitHub Variables (OIDC enabled, default):**
- `AWS_ROLE_ARN` - IAM role ARN for GitHub Actions (auto-configured by Terraform)
- `AWS_REGION` - AWS region (auto-configured by Terraform)
- `AWS_LAMBDA_FUNCTION_NAME`, `AWS_ECR_URL`, `AWS_S3_BUCKET_NAME`
- `API_BASE_URL`, `APP_URL`

**Required GitHub Secrets (OIDC enabled):**
- `AWS_CLOUDFRONT_DISTRIBUTION_ID`
- `PRIVATE_ACTIONS_TOKEN` - GitHub PAT for accessing private actions

**Additional Secrets (only if OIDC disabled):**
- `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` - Only required when `enable_github_oidc = false`

## Common Tasks and Patterns

### Adding New API Endpoints
1. Create route handler in `server/routes/` directory
2. Add JSDoc comments for Swagger documentation
3. Register route in `server/app.ts`
4. Add TypeScript types in `server/types/`
5. Update client API slice in `client/src/reducers/`
6. Add tests in `server/tests/__tests__/`

### Database Operations
- Use DAL pattern: Create new DAL class extending `BaseDal`
- Transactions: Use `withTransaction` method from BaseDal
- Raw queries: Use parameterized queries to prevent SQL injection
- Session tables: Managed by `@jeffrey-keyser/database-base-config` package

### Client State Management
- API calls: Use RTK Query slices in `client/src/reducers/`
- Local state: Create Redux slices with Redux Toolkit
- Auth state: Managed by `userApi.ts` with auto-refresh
- Type safety: Define models in `client/src/models/`

### Error Handling
- Server: Use `@jeffrey-keyser/api-errors` for consistent error responses
- Client: Error boundaries and RTK Query error handling
- API errors displayed via UI kit toast notifications

### Package Dependencies
- UI Components: `@jkeyser/ui-kit` (Button, Layout, LoadingSpinner, Toast)
- Auth Integration: `@jeffrey-keyser/pay-auth-integration` for client/server auth
- Database Config: `@jeffrey-keyser/database-base-config` for connection management
- Service Config: `@jeffrey-keyser/service-config-loader` for configuration loading (future integration)
- Express Middleware: `@jeffrey-keyser/express-middleware-suite` for common middleware