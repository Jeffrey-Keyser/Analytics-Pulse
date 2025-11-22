# Analytics-Pulse

**Privacy-First Web Analytics Platform**

Analytics-Pulse is a self-hosted, privacy-focused web analytics platform built on serverless AWS infrastructure. Track and analyze website traffic, user behavior, and conversions without compromising user privacy or data ownership.

## 🌟 Why Analytics-Pulse?

- **🔒 Privacy-First**: No cookies, respects Do Not Track, anonymous visitor tracking via hashed IPs
- **🏠 Self-Hosted**: Complete data ownership and control on your AWS infrastructure
- **⚡ High-Performance**: Optimized for 10,000+ events/second with <50ms p99 latency
- **💰 Cost-Efficient**: Serverless architecture scales to zero, pay only for what you use
- **🌍 GDPR/CCPA Compliant**: Built for privacy regulations from the ground up
- **📊 Real-Time Analytics**: Live dashboards with active visitor tracking
- **🎯 Conversion Tracking**: Goals, funnels, and campaign attribution (UTM parameters)
- **📧 Automated Reports**: Daily, weekly, and monthly email reports
- **🚀 Easy Integration**: Simple JavaScript snippet, npm package, or REST API

Built on the ServerlessWebTemplate foundation, this project utilizes Terraform for infrastructure management and includes pre-configured authentication using the Pay service integration package.

## ✨ Core Features

### 📊 Comprehensive Analytics
- **Historical Analytics**: Pageviews, unique visitors, sessions, bounce rate, average session duration
- **Real-Time Dashboard**: Active visitors, live pageviews, current pages being viewed
- **Time-Series Data**: Day/week/month granularity with customizable date ranges
- **Traffic Sources**: Referrer tracking, UTM campaign attribution, geographic distribution
- **Device Intelligence**: Browser, OS, device type, screen resolution breakdown
- **Custom Events**: Track any user interaction with custom properties (up to 5KB per event)

### 🎯 Conversion Tracking
- **Flexible Goals**: Event-based, pageview-based, and value-based goal types
- **Funnel Analysis**: Multi-step conversion path tracking
- **Campaign Performance**: UTM parameter tracking with first-touch attribution
- **Conversion Rates**: Automatic calculation of goal completion rates
- **Custom Properties**: Attach metadata to track specific conversion contexts

### 📈 Campaign Analytics
- **UTM Parameter Support**: Source, medium, campaign, term, content tracking
- **Campaign Comparison**: Compare multiple campaigns side-by-side
- **Top Campaigns**: Identify best-performing campaigns by any metric
- **Attribution**: First-touch attribution preserves original UTM across session
- **Campaign Export**: Export campaign data for external analysis

### 📧 Email Reporting
- **Automated Reports**: Daily, weekly, and monthly scheduled reports
- **Customizable Timing**: Configure send times and timezone preferences
- **Test Reports**: Preview reports before enabling automation
- **Unsubscribe Management**: Token-based opt-out system
- **Report History**: Track sent, failed, and bounced reports

### 📦 Data Export
- **Multiple Formats**: CSV and JSON export options
- **Flexible Exports**: Analytics summaries, custom events, campaign data
- **Date Range Filtering**: Export specific time periods
- **Pagination Support**: Handle large datasets efficiently

### 🔐 Privacy & Security
- **No Cookies**: Cookieless tracking using session/visitor UUIDs
- **IP Hashing**: IP addresses hashed (SHA-256) before storage
- **Do Not Track**: Respects browser DNT settings
- **API Key Authentication**: Secure tracking with bcrypt-hashed keys
- **Rate Limiting**: 10,000 requests/hour per API key
- **GDPR/CCPA Ready**: Privacy-first design for compliance

### ⚡ Performance Optimized
- **Partitioned Tables**: Monthly partitioning for fast queries (10-100x improvement)
- **Daily Aggregation**: Pre-computed metrics for instant dashboard loading
- **Redis Caching**: Distributed caching with in-memory fallback
- **Connection Pooling**: Optimized database connections (2-20 pool size)
- **Load Tested**: Proven at 10,000+ events/second with <50ms latency

## 🚀 Quick Start

### 1. Deploy Analytics-Pulse

```bash
# Clone the repository
git clone https://github.com/Jeffrey-Keyser/Analytics-Pulse.git
cd Analytics-Pulse

# Run automated setup and deployment
export GITHUB_TOKEN="your_github_pat"
./scripts/new-service-auto.sh analytics-pulse yourdomain.com
```

See [DEPLOYMENT.md](./docs/DEPLOYMENT.md) for detailed deployment instructions.

### 2. Create a Project

Log in to your Analytics-Pulse dashboard and create a new project for your website:

1. Navigate to **Projects** → **Create New Project**
2. Enter your website name and domain
3. Click **Create Project**

### 3. Generate an API Key

1. Open your project settings
2. Go to **API Keys** tab
3. Click **Generate New Key**
4. **Save the key immediately** (shown only once!)

### 4. Install Tracking Code

Add the tracking snippet to your website's `<head>` section:

```html
<script src="https://cdn.jsdelivr.net/npm/@analytics-pulse/tracking-library"></script>
<script>
  const analytics = new AnalyticsPulse('your-api-key', {
    endpoint: 'https://api.yourdomain.com/api/v1/track',
    autoTrack: true
  });
</script>
```

Or install via npm for modern applications:

```bash
npm install @analytics-pulse/tracking-library
```

```typescript
import { AnalyticsPulse } from '@analytics-pulse/tracking-library';

const analytics = new AnalyticsPulse('your-api-key', {
  endpoint: 'https://api.yourdomain.com/api/v1/track',
  autoTrack: true
});

// Track custom events
analytics.track('button_click', { button: 'signup' });
```

See [TRACKING_GUIDE.md](./docs/TRACKING_GUIDE.md) for complete tracking documentation.

### 5. View Analytics

Visit your dashboard to see real-time and historical analytics:
- **Real-Time**: See active visitors and current pageviews
- **Historical**: Analyze trends, traffic sources, and top pages
- **Campaigns**: Track UTM campaign performance
- **Goals**: Set up and monitor conversions

## 📚 Documentation

- **[Getting Started Guide](./docs/GETTING_STARTED.md)** - Complete setup walkthrough
- **[Tracking Guide](./docs/TRACKING_GUIDE.md)** - JavaScript library documentation
- **[API Reference](./docs/API_REFERENCE.md)** - Complete REST API documentation
- **[Architecture Overview](./docs/ARCHITECTURE.md)** - System design and architecture
- **[Deployment Guide](./docs/DEPLOYMENT.md)** - Infrastructure and deployment
- **[Privacy Policy Template](./docs/PRIVACY.md)** - Data handling and privacy practices
- **[Contributing Guide](./CONTRIBUTING.md)** - How to contribute to Analytics-Pulse

## Initial Project Setup

To bootstrap a new project from this template, you can use the automated setup script or follow the manual steps below.

### Automated Setup (Recommended)

**For Linux/macOS:**

```bash
./setup-project.sh
```

**For Windows (PowerShell):**

```powershell
./setup-project.ps1
```

The setup script will:

- Check prerequisites (Node.js, npm, Terraform, AWS CLI)
- Prompt for project configuration (service name, domain, etc.)
- Create Terraform configuration files
- Set up environment files from examples
- Install all dependencies
- Create helpful documentation for next steps

### Non-Interactive Setup (For CI/CD and Automation)

Both setup scripts support non-interactive mode for automated deployments, CI/CD pipelines, and AI-driven setup.

**Using environment variables:**

```bash
export SETUP_SERVICE_NAME="my-service"
export SETUP_DOMAIN_NAME="example.com"
export SETUP_GITHUB_REPO="my-repo"
export SETUP_GITHUB_OWNER="Jeffrey-Keyser"
export GITHUB_TOKEN="your_github_pat"

./setup-project.sh --non-interactive
```

**Using config file:**

```bash
cp setup-config.env.example setup-config.env
# Edit setup-config.env with your values
./setup-project.sh --non-interactive
```

**PowerShell:**

```powershell
$env:SETUP_SERVICE_NAME = "my-service"
$env:SETUP_DOMAIN_NAME = "example.com"
$env:GITHUB_TOKEN = "your_github_pat"

./setup-project.ps1 -NonInteractive
# or
./setup-project.ps1 -y
```

**Available Environment Variables:**

| Variable | Default | Description |
|----------|---------|-------------|
| `SETUP_SERVICE_NAME` | `my-new-service` | Service name |
| `SETUP_DOMAIN_NAME` | `example.com` | Domain name |
| `SETUP_GITHUB_REPO` | `my-new-service-repo` | GitHub repository |
| `SETUP_GITHUB_OWNER` | `Jeffrey-Keyser` | GitHub owner/org |
| `SETUP_AWS_REGION` | `us-east-1` | AWS region |
| `SETUP_ENVIRONMENT` | `prod` | Environment |
| `SETUP_DATABASE_SCHEMA` | `public` | Database schema |
| `SETUP_CORS_ORIGINS` | `https://$DOMAIN` | CORS origins |
| `SETUP_CORS_CREDENTIALS` | `true` | Allow credentials |
| `SETUP_CORS_METHODS` | `GET,POST,PUT,DELETE,OPTIONS` | Allowed methods |
| `SETUP_CORS_HEADERS` | `Content-Type,Authorization,X-Requested-With` | Allowed headers |
| `SETUP_ENABLE_OIDC` | `true` | Use GitHub OIDC |

See `setup-config.env.example` for complete documentation and examples.

### Fully Automated Deployment (New!)

For the fastest path from template to live service (target: <10 minutes), use the fully automated deployment script:

**Prerequisites:**
- Docker installed and running
- AWS CLI configured with valid credentials
- `GITHUB_TOKEN` environment variable set
- All required tools (Node.js, npm, Terraform, Git)

**Usage:**

```bash
export GITHUB_TOKEN="your_github_pat_here"
./scripts/new-service-auto.sh <service-name> <domain>
```

**Example:**

```bash
./scripts/new-service-auto.sh my-awesome-service example.com
```

**What it does:**

This script automates the entire deployment process end-to-end:

1. ✅ Validates prerequisites (Node.js, npm, Docker, Terraform, AWS CLI, Git)
2. ✅ Runs automated project setup with pre-configured inputs
3. ✅ Initializes Terraform backend with centralized state management
4. ✅ Creates ECR repository (targeted Terraform apply)
5. ✅ Builds Docker image for the server application
6. ✅ Authenticates with ECR and pushes the Docker image
7. ✅ Runs full Terraform apply to create all infrastructure
8. ✅ Extracts Terraform outputs (URLs, resource names, etc.)
9. ✅ Updates environment files with production configuration
10. ✅ Commits changes and pushes to trigger CI/CD pipeline

**Features:**

- **Idempotent**: Can be safely re-run if interrupted (state tracking)
- **Error Handling**: Automatic rollback on failures
- **Progress Indicators**: Clear visual feedback for each step
- **Time Tracking**: Reports total deployment time
- **Documentation**: Generates deployment-info.txt with all details

**After Deployment:**

1. Run `./scripts/verify-github-secrets.sh` to verify GitHub configuration
2. Update your domain registrar with Route 53 nameservers
3. Wait for DNS propagation (up to 48 hours)
4. Visit your live site!

**Expected Deployment Time:** 8-10 minutes (vs. 30-45 minutes manual)

**Environment Variables:**

You can customize the deployment with these optional environment variables:

```bash
export GITHUB_OWNER="your-org"        # Default: Jeffrey-Keyser
export GITHUB_REPO="custom-repo"      # Default: service-name
export AWS_REGION="us-west-2"         # Default: us-east-1
export ENVIRONMENT="staging"          # Default: prod
export DATABASE_SCHEMA="custom"       # Default: public
```

### Manual Setup

1.  **Terraform Version:** This project requires **Terraform 1.13.5 or higher**. Using tfenv is recommended for version management:
    ```bash
    # Install Terraform 1.13.5
    tfenv install 1.13.5
    tfenv use 1.13.5

    # Verify installation
    terraform version
    ```

    A `.terraform-version` file is included in the repository root to automatically use the correct version with tfenv.

2.  **Domain Name:** Ensure you have a registered domain name (e.g., via AWS Route 53).
3.  **Configuration File (`terraform.tfvars`):**
    Create a file named `terraform.tfvars` in the `terraform/accounts/us-east-1/` directory with the following content, replacing the placeholder values:

    ```terraform
    // terraform/accounts/us-east-1/terraform.tfvars
    service_name = "MyNewService"
    domain_name  = "yourdomain.com"
    github_repo  = "YourGitHubRepoName" // Just the repository name, e.g., MyNewServiceRepo
    ```

    These variables are defined in `terraform/modules/variables.tf`.

3.  **Terraform Backend Configuration:**
    Edit `terraform/accounts/us-east-1/config.tf`:

    - The S3 backend is pre-configured with centralized state management. During setup, your service name is automatically inserted:
      ```terraform
      terraform {
        // ...
        backend "s3" {
          region = "us-east-1"
          bucket = "tf-state-jeffrey-keyser-prod"
          key    = "{service_name}/terraform.tfstate"
        }
        // ...
      }
      ```
    - **Important Security Note:** The GitHub provider token is configured in `terraform/accounts/us-east-1/config.tf` to use `var.github_token`. This variable is defined in `terraform/accounts/us-east-1/variables.tf` and is marked as sensitive. You **must** set this token as an environment variable for Terraform to pick it up:
      ```bash
      export TF_VAR_github_token="your_github_pat"
      ```
      Ensure this Personal Access Token has the necessary permissions (e.g., repo access). Do not commit this token to your repository.

4.  **GitHub Actions Authentication (OIDC - Recommended):**
    This template uses **GitHub OIDC** for secure AWS authentication by default. Terraform automatically configures the following in your GitHub repository:

    **Automatically Configured Variables:**
    - `AWS_ROLE_ARN`: IAM role ARN for GitHub Actions (OIDC authentication)
    - `AWS_ECR_URL`: Full URL to your ECR repository
    - `AWS_LAMBDA_FUNCTION_NAME`: The Lambda function name
    - `AWS_S3_BUCKET_NAME`: S3 bucket for client application
    - `AWS_REGION`: AWS region for deployments
    - `API_BASE_URL`: Backend API URL
    - `APP_URL`: Frontend application URL

    **Automatically Configured Secrets:**
    - `AWS_CLOUDFRONT_DISTRIBUTION_ID`: CloudFront distribution ID
    - `PRIVATE_ACTIONS_TOKEN`: GitHub PAT for accessing private actions

    **Benefits of OIDC:**
    - No long-lived AWS credentials stored in GitHub
    - Temporary credentials that automatically expire
    - Enhanced security with automatic rotation
    - Easier compliance and auditing

    **Legacy Static Credentials (Not Recommended):**
    If you need to use static AWS credentials instead of OIDC, set `enable_github_oidc = false` in `terraform.tfvars`. You'll then need to manually configure:
    - `AWS_ACCESS_KEY_ID`
    - `AWS_SECRET_ACCESS_KEY`

    For migrating existing projects to OIDC, see `docs/OIDC_MIGRATION.md`

5.  **Initial Terraform Deployment:**
    Navigate to the `terraform/` directory in your shell.
    - **Set Terraform Version:** Use `tfenv use` (if you use `tfenv`) or ensure your local Terraform version is 1.13.5 or higher. The `.terraform-version` file will automatically set the correct version if you're using tfenv.
    - **Initialize Terraform:**
      ```bash
      terraform init
      ```
    - **(Recommended) Create ECR Repository First:** To avoid initial apply failures related to the Lambda needing an image, first apply only the ECR repository resource. You'll need to identify its resource address within your modules (e.g., `module.main.aws_ecr_repository.ecr_repo`).
      ```bash
      terraform apply -target=module.main.aws_ecr_repository.ecr_repo
      # Replace module.main.aws_ecr_repository.ecr_repo with the actual resource path
      ```
    - **Commit and Push:** Commit all your changes (including the new `terraform.tfvars` and updated `config.tf`) and push to your GitHub repository. This should trigger the `lambda-push.yml` GitHub Action to build and push your server image to the newly created ECR repository.
    - **Full Apply:** Once the ECR image is pushed, run the full Terraform apply:
      ```bash
      terraform apply
      ```
      This should now succeed as the Lambda function can find its required container image.

## API Documentation

The API documentation is automatically generated from JSDoc comments in the route files (`server/routes/*.ts`) and is served by Swagger UI.

- **Swagger UI Endpoint**: `/api-docs`
- **Local Development**: `http://localhost:3001/api-docs`
- **Complete API Reference**: [docs/API_REFERENCE.md](./docs/API_REFERENCE.md)

### API Overview

Analytics-Pulse provides two types of API authentication:

1. **Bearer Token Authentication** (Dashboard/Management APIs):
   - Projects management
   - API keys management
   - Analytics data retrieval
   - Goals and campaigns
   - Email reporting configuration

2. **API Key Authentication** (Tracking APIs):
   - Event tracking endpoints
   - Batch event tracking
   - Use API keys generated via the management endpoints

### Key Endpoint Categories

#### 📁 Project Management (`/api/v1/projects`)
Create and manage analytics projects for your websites.

```bash
# List projects
GET /api/v1/projects

# Create project
POST /api/v1/projects
{
  "name": "My Website",
  "domain": "example.com",
  "description": "Main website analytics"
}

# Get project
GET /api/v1/projects/:id
```

#### 🔑 API Keys (`/api/v1/projects/:projectId/api-keys`)
Generate secure API keys for event tracking.

```bash
# Generate new API key
POST /api/v1/projects/:projectId/api-keys
{
  "name": "Production Key",
  "description": "Main website tracking"
}

# Response includes full key (shown only once!)
{
  "key": "ap_abc123def456...",
  "keyPrefix": "ap_abc123..."
}
```

#### 📊 Analytics Data (`/api/v1/projects/:id`)

```bash
# Historical analytics
GET /api/v1/projects/:id/analytics?startDate=2025-01-01&endDate=2025-01-31&granularity=day

# Real-time analytics
GET /api/v1/projects/:id/realtime

# Export data
GET /api/v1/projects/:id/analytics/export?format=csv&startDate=2025-01-01
```

#### 📍 Event Tracking (`/api/v1/track`)

```bash
# Track single event
POST /api/v1/track/event
Headers: X-API-Key: your-api-key
{
  "event_type": "pageview",
  "url": "https://example.com/products",
  "referrer": "https://google.com",
  "utm_params": {
    "utm_source": "google",
    "utm_medium": "cpc",
    "utm_campaign": "spring_sale"
  }
}

# Track batch events (up to 100)
POST /api/v1/track/batch
Headers: X-API-Key: your-api-key
{
  "events": [...]
}
```

#### 🎯 Goals & Conversions (`/api/v1/projects/:id/goals`)

```bash
# Create goal
POST /api/v1/projects/:id/goals
{
  "name": "Newsletter Signup",
  "goal_type": "event",
  "target_event_name": "newsletter_signup"
}

# Get conversion funnel
POST /api/v1/projects/:id/goals/funnel
{
  "goal_ids": ["goal-1", "goal-2", "goal-3"],
  "start_date": "2025-01-01",
  "end_date": "2025-01-31"
}
```

#### 📈 Campaign Analytics (`/api/v1/projects/:id/campaigns`)

```bash
# Get campaign stats
GET /api/v1/projects/:id/campaigns?startDate=2025-01-01&endDate=2025-01-31

# Compare campaigns
POST /api/v1/projects/:id/campaigns/compare
{
  "campaigns": ["spring_sale", "summer_promo"],
  "start_date": "2025-01-01",
  "end_date": "2025-06-30"
}

# Top campaigns by metric
GET /api/v1/projects/:id/campaigns/top?metric=conversions&limit=10
```

#### 📧 Email Reporting (`/api/v1/projects/:id/email-preferences`)

```bash
# Configure email reports
PUT /api/v1/projects/:id/email-preferences
{
  "daily_report_enabled": true,
  "daily_report_time": "09:00",
  "weekly_report_enabled": true,
  "weekly_report_day": "monday",
  "timezone": "America/New_York"
}

# Send test report
POST /api/v1/projects/:id/email-preferences/test
```

### Rate Limiting

- **Tracking APIs**: 10,000 requests/hour per API key
- **Management APIs**: Standard rate limits apply
- **Batch Tracking**: Max 100 events per request, 100KB payload limit

### Interactive Documentation

When the server is running, visit `/api-docs` for:
- Complete endpoint specifications
- Request/response schemas
- Interactive API testing with authentication
- Example requests and responses
- Error code documentation

For complete API documentation, see [API_REFERENCE.md](./docs/API_REFERENCE.md).

## Authentication Setup

This template includes pre-configured Pay authentication integration. Follow these steps to set up authentication for your new project.

### Prerequisites

- Access to the Pay service (https://pay.jeffreykeyser.net)
- Valid Pay service credentials

### Environment Configuration

The template requires specific environment variables for authentication to work properly.

**Server Environment Variables** (in `server/.env`):

```bash
# Pay Service Configuration
PAY_SERVICE_URL=https://pay.jeffreykeyser.net
PAY_SERVICE_TOKEN=<optional-service-token>

# Server Configuration
NODE_ENV=development
PORT=3001
```

**Client Environment Variables** (in `client/.env`):

```bash
# Pay Integration Configuration
VITE_PAY_URL=http://localhost:3001
```

**Important Notes:**

- `VITE_PAY_URL` should point to YOUR backend server, not the Pay service directly
- `PAY_SERVICE_URL` is used by your server to communicate with the Pay service
- Use unique port numbers if running multiple projects simultaneously

### Authentication Components

The template includes pre-built authentication components:

#### Server-Side Setup

Authentication is automatically configured in `server/src/app.ts`:

```typescript
import { setupPayAuth } from "@jeffrey-keyser/pay-auth-integration/server";

// Pay authentication is set up with sensible defaults
setupPayAuth(app, {
  payUrl: process.env.PAY_SERVICE_URL!,
  publicRoutes: ["/health", "/api/public/*"],
  debug: process.env.NODE_ENV === "development",
});
```

#### Client-Side Setup

The React application is wrapped with PayAuthProvider in `client/src/main.tsx`:

```typescript
import { PayAuthProvider } from "@jeffrey-keyser/pay-auth-integration/client/react";

<PayAuthProvider payUrl={import.meta.env.VITE_PAY_URL}>
  <App />
</PayAuthProvider>;
```

#### Authentication Components

Use the pre-built authentication components:

```typescript
// Import authentication hooks and components
import {
  usePayAuth,
  useAuthModal,
} from "@jeffrey-keyser/pay-auth-integration/client/react";
import { AuthModal } from "@jeffrey-keyser/pay-auth-integration/client/react";

// Example usage in your components
function MyComponent() {
  const { user, isAuthenticated, logout } = usePayAuth();
  const { isOpen, openModal, closeModal } = useAuthModal();

  if (isAuthenticated) {
    return (
      <div>
        <span>Welcome, {user?.email}</span>
        <button onClick={logout}>Logout</button>
      </div>
    );
  }

  return (
    <>
      <button onClick={openModal}>Login</button>
      <AuthModal isOpen={isOpen} onClose={closeModal} />
    </>
  );
}
```

### Protecting Routes

#### Server-Side Route Protection

Routes are automatically protected by the Pay authentication middleware. User information is available in request objects:

```typescript
// routes/protected.ts
app.get("/api/protected", (req: AuthenticatedRequest, res) => {
  if (!req.user) {
    return res.status(401).json({ error: "Authentication required" });
  }

  res.json({ message: "Protected data", user: req.user });
});
```

#### Client-Side Route Protection

Use authentication hooks to protect client-side routes:

```typescript
import { usePayAuth } from "@jeffrey-keyser/pay-auth-integration/client/react";

function ProtectedPage() {
  const { isAuthenticated, user } = usePayAuth();

  if (!isAuthenticated) {
    return <div>Please login to access this page</div>;
  }

  return <div>Protected content for {user?.email}</div>;
}
```

### Role-Based Access Control

The template supports role-based access control:

```typescript
// Server-side role checking
app.get("/api/admin", (req: AuthenticatedRequest, res) => {
  if (!req.user?.roles?.includes("admin")) {
    return res.status(403).json({ error: "Admin access required" });
  }
  // Admin-only logic here
});

// Client-side role checking
function AdminPanel() {
  const { user, hasRole } = usePayAuth();

  if (!hasRole("admin")) {
    return <div>Admin access required</div>;
  }

  return <div>Admin interface</div>;
}
```

### Customization

#### Theming the Authentication Modal

Customize the appearance of the authentication modal:

```typescript
<AuthModal
  isOpen={isOpen}
  onClose={closeModal}
  theme={{
    primaryColor: "#your-brand-color",
    borderRadius: "8px",
    fontFamily: "Your Font Family",
  }}
/>
```

#### Custom Public Routes

Configure which routes don't require authentication:

```typescript
// In server/src/app.ts
setupPayAuth(app, {
  payUrl: process.env.PAY_SERVICE_URL!,
  publicRoutes: [
    "/health",
    "/api/public/*",
    "/api/webhooks/*",
    "/", // Add your public routes here
  ],
  debug: process.env.NODE_ENV === "development",
});
```

### Testing Authentication

The template includes authentication testing utilities:

```typescript
// client/src/test/auth-test-utils.tsx
import { PayAuthProvider } from "@jeffrey-keyser/pay-auth-integration/client/react";

export const AuthTestWrapper = ({
  children,
}: {
  children: React.ReactNode;
}) => (
  <PayAuthProvider payUrl="http://localhost:3001" debug={true}>
    {children}
  </PayAuthProvider>
);

// Use in your tests
import { render } from "@testing-library/react";
import { AuthTestWrapper } from "./test/auth-test-utils";

test("component with authentication", () => {
  render(<YourComponent />, { wrapper: AuthTestWrapper });
  // Test authentication-dependent behavior
});
```

### Troubleshooting

Common authentication issues and solutions:

1. **Module Resolution Errors**: Ensure `tsconfig.json` uses `"moduleResolution": "node16"`
2. **Network Errors**: Verify `VITE_PAY_URL` points to your backend server
3. **CORS Issues**: Check that your server allows requests from your frontend origin
4. **Token Issues**: Clear browser localStorage if authentication seems stuck

For detailed troubleshooting, see the [Migration Documentation](.kiro/specs/pay-integration-migration/TROUBLESHOOTING_GUIDE.md).

## Docker Development Environment

### Prerequisites
- [Docker](https://docs.docker.com/get-docker/) (includes Docker Compose)
- [GitHub Personal Access Token](https://github.com/settings/tokens) with `read:packages` scope

### Quick Start

1. **Set up environment file:**
   ```bash
   cp .env.docker.example .env.docker
   ```

2. **Add your GitHub token to `.env.docker`:**
   ```bash
   GITHUB_TOKEN=your_github_token_here
   ```

3. **Start the development environment:**
   ```bash
   ./scripts/docker-dev.sh
   ```

   This will:
   - Build Docker images for client and server
   - Start PostgreSQL database
   - Start backend server (http://localhost:3001)
   - Start frontend client (http://localhost:3002)

4. **Access your application:**
   - Frontend: http://localhost:3002
   - Backend API: http://localhost:3001
   - Database: localhost:5432 (credentials in .env.docker)

### Docker Commands

**Start environment:**
```bash
./scripts/docker-dev.sh
```

**Stop environment (preserves data):**
```bash
./scripts/docker-dev-stop.sh
```

**Reset environment (deletes all data):**
```bash
./scripts/docker-dev-reset.sh
```

**View logs:**
```bash
# All services
docker-compose -f docker-compose.dev.yml logs -f

# Specific service
docker-compose -f docker-compose.dev.yml logs -f backend
docker-compose -f docker-compose.dev.yml logs -f frontend
docker-compose -f docker-compose.dev.yml logs -f postgres
```

**Access container shell:**
```bash
# Backend
docker exec -it serverless-template-backend-dev sh

# Frontend
docker exec -it serverless-template-frontend-dev sh

# Database
docker exec -it serverless-template-postgres-dev psql -U template_user -d template_dev
```

### Hot Reload

Both client and server support hot-reload in Docker:
- **Server:** Changes to TypeScript files automatically restart the dev server
- **Client:** Changes to React files automatically refresh the browser
- **Database:** Schema changes require manual migration (see Database section)

### Troubleshooting

**Build fails with authentication error:**
- Ensure your GITHUB_TOKEN is set in `.env.docker`
- Verify the token has `read:packages` scope
- Check token hasn't expired

**Port already in use:**
- Stop existing processes on ports 3001, 3002, or 5432
- Or modify ports in `docker-compose.dev.yml`

**Database connection issues:**
- Ensure PostgreSQL container is healthy: `docker-compose -f docker-compose.dev.yml ps`
- Check logs: `docker-compose -f docker-compose.dev.yml logs postgres`

**Changes not reflecting:**
- Verify volume mounts in `docker-compose.dev.yml`
- Check file permissions (especially on Windows/WSL)
- Restart containers: `./scripts/docker-dev.sh`

### Development Workflow Comparison

| Task | Docker | Non-Docker |
|------|--------|------------|
| Initial setup | `./scripts/docker-dev.sh` | Install Node.js, PostgreSQL, configure manually |
| Start dev server | Automatic | `cd server && npm run dev` |
| Start client | Automatic | `cd client && npm run dev` |
| Database | Automatic | Install & configure PostgreSQL |
| Dependencies | Isolated in containers | Installed globally/locally |
| Clean reset | `./scripts/docker-dev-reset.sh` | Manual cleanup |

### When to Use Docker vs Non-Docker

**Use Docker when:**
- Onboarding new developers
- Need consistent environments across team
- Want to avoid installing PostgreSQL locally
- Testing deployment-like configuration

**Use Non-Docker when:**
- Debugging low-level issues
- Need direct access to Node.js debugger
- Prefer native performance
- Working with specific Node.js versions

## Environment Variables

The server module (`server/`) uses a centralized configuration system for environment variables, managed in `server/config/env.ts`.

**Setup:**

1.  **`.env` File:** Before running the server, you need to create a `.env` file in the `server/` directory. You can do this by copying the example file:
    ```bash
    cp server/.env.example server/.env
    ```
2.  **Populate `.env`:** Edit the newly created `server/.env` file and provide the necessary values for your environment. Comments in `.env.example` explain each variable.

**Key Points:**

- **Centralized Configuration:** All environment variables are loaded, validated, and exported from `server/config/env.ts`.
- **Validation:** The server will perform validation checks at startup. If required variables are missing or have invalid formats (e.g., a non-numeric `PORT`), the application will throw an error and exit.
- **Type Safety:** The configuration object is typed, providing better autocompletion and preventing type-related errors when accessing environment variables in the code.
- **Access:** Throughout the server codebase, environment variables should be accessed via the imported `config` object (e.g., `config.PORT`, `config.DB_HOST`) rather than `process.env` directly.

## Database Setup

The server uses PostgreSQL with Sequelize ORM for database management.

**Migration System:**

1.  **Create a migration:**

    ```bash
    cd server
    npx sequelize-cli migration:generate --name create-users-table
    ```

2.  **Run migrations:**

    ```bash
    # Run all pending migrations
    cd server/db
    ./deploy.sh

    # Or manually run migrations
    cd server
    npx sequelize-cli db:migrate
    ```

3.  **Rollback migrations:**
    ```bash
    cd server
    npx sequelize-cli db:migrate:undo
    ```

**Database Scripts:**

- `server/db/deploy.sh` - Runs all migrations and optional SQL scripts
- `server/db/teardown.sh` - Removes all tables (use with caution)
- See `server/db/README.md` for detailed database documentation

## Testing

**Server Testing:**

```bash
cd server
npm test              # Run all tests
npm run test:watch    # Run tests in watch mode
npm run test:coverage # Run tests with coverage report
```

**Test Structure:**

- Unit tests: `server/tests/__tests__/unit/`
- Integration tests: `server/tests/__tests__/integration/`
- Test utilities and mocks: `server/tests/__mocks__/`

**Client Testing:**

```bash
cd client
npm test              # Run all tests
npm run coverage      # Run tests with coverage
```

## Project Structure Notes

- **Client:** `Vite`, `React & Redux`, `Typescript`
- **Server:** `Express`, `Node`, `Typescript`
- **Terraform:**
  - Modules are in `terraform/modules/`.
  - Account/environment-specific configurations are in `terraform/accounts/us-east-1/`. To create a new environment (e.g., staging), copy the `us-east-1/` directory, rename it (e.g., `us-east-1-staging` or `us-east-1/staging`), and update its `terraform.tfvars` and backend configuration in `config.tf` accordingly.

## Infrastructure Overview

The infrastructure for this application typically includes:

1.  **Amazon Lambda**: Serves the backend server application.
2.  **Amazon ECR (Elastic Container Registry)**: Stores Docker images for the Lambda function.
3.  **Amazon S3**: Hosts static website content for the client application.
4.  **Amazon CloudFront**: Distributes S3 content with low latency.
5.  **Amazon Route 53**: Manages DNS and domain name.
6.  **Amazon ACM (Certificate Manager)**: Provides SSL/TLS certificates.
7.  **Amazon CloudWatch**: Stores application and service logs.
8.  **Amazon IAM**: Manages Identity and Access Management roles and policies.
9.  **Amazon VPC**: Provides network isolation and security.
10. **GitHub Actions**: Powers CI/CD pipelines for deployment.

These components are defined using Terraform and rely on a remote state stored in an S3 bucket.

## Don't Forget..

Register these template repos for your project:

- "@jeffrey-keyser/{TODO your_package_name}-domain-core": "0.0.0" -- Contains domain logic
- "@jeffrey-keyser/{TODO your_package_name}-api-types": "0.0.0", -- Client/Server api types
