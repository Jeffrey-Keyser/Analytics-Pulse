# Getting Started with Analytics-Pulse

This guide will walk you through deploying Analytics-Pulse and tracking your first website.

## Prerequisites

Before you begin, ensure you have the following:

### Required Tools
- **Node.js 18+** and npm
- **Docker** (for building server images)
- **Terraform 1.13.5+** (use [tfenv](https://github.com/tfutils/tfenv) for version management)
- **AWS CLI** configured with valid credentials
- **Git**

### Required Accounts
- **AWS Account** with administrative access
- **GitHub Account** with a repository for your deployment
- **Domain Name** (registered via AWS Route 53 or another registrar)

### Required Credentials
- **GitHub Personal Access Token** (PAT) with `repo` and `read:packages` scopes
- **AWS Access Keys** (or configure AWS CLI with credentials)

## Installation Methods

Analytics-Pulse offers two installation paths:

### Option 1: Automated Deployment (Recommended) ⚡

The fastest way to get Analytics-Pulse running (8-10 minutes):

```bash
# Clone the repository
git clone https://github.com/Jeffrey-Keyser/Analytics-Pulse.git
cd Analytics-Pulse

# Export your GitHub token
export GITHUB_TOKEN="your_github_pat_here"

# Run automated deployment
./scripts/new-service-auto.sh analytics-pulse yourdomain.com
```

**What this does:**
1. Validates prerequisites
2. Runs automated project setup
3. Initializes Terraform backend
4. Creates ECR repository
5. Builds and pushes Docker image
6. Deploys full AWS infrastructure
7. Configures environment files
8. Commits and pushes changes

**Customization via environment variables:**

```bash
export GITHUB_OWNER="your-org"        # Default: Jeffrey-Keyser
export GITHUB_REPO="custom-repo"      # Default: analytics-pulse
export AWS_REGION="us-west-2"         # Default: us-east-1
export ENVIRONMENT="staging"          # Default: prod
```

Skip to [Post-Deployment](#post-deployment-configuration) after the script completes.

---

### Option 2: Manual Deployment

For more control over the deployment process:

#### Step 1: Clone and Configure

```bash
# Clone the repository
git clone https://github.com/Jeffrey-Keyser/Analytics-Pulse.git
cd Analytics-Pulse

# Install Terraform 1.13.5
tfenv install 1.13.5
tfenv use 1.13.5

# Verify installation
terraform version
```

#### Step 2: Run Setup Script

```bash
# Linux/macOS
./setup-project.sh

# Windows (PowerShell)
./setup-project.ps1
```

The script will prompt you for:
- Service name (e.g., "analytics-pulse")
- Domain name (e.g., "analytics.yourdomain.com")
- GitHub repository name
- GitHub owner/organization
- AWS region
- Environment (prod/staging/dev)

**Non-Interactive Mode** (for automation):

```bash
export SETUP_SERVICE_NAME="analytics-pulse"
export SETUP_DOMAIN_NAME="analytics.yourdomain.com"
export SETUP_GITHUB_REPO="Analytics-Pulse"
export SETUP_GITHUB_OWNER="YourGitHubOrg"
export GITHUB_TOKEN="your_github_pat"

./setup-project.sh --non-interactive
```

#### Step 3: Configure Terraform

```bash
# Navigate to Terraform directory
cd terraform

# Initialize Terraform
terraform init

# Create ECR repository first
terraform apply -target=module.main.aws_ecr_repository.ecr_repo
```

#### Step 4: Build and Push Docker Image

```bash
# Navigate back to root
cd ..

# Build server image
docker build -t analytics-pulse-server -f Dockerfile_Server ./server

# Get ECR login credentials
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin YOUR_ECR_URL

# Tag and push image
docker tag analytics-pulse-server:latest YOUR_ECR_URL:latest
docker push YOUR_ECR_URL:latest
```

#### Step 5: Deploy Infrastructure

```bash
# Navigate to Terraform directory
cd terraform

# Apply full infrastructure
terraform apply

# Review the plan, then type 'yes' to confirm
```

**Terraform will create:**
- Lambda function for backend API
- API Gateway for HTTP routing
- RDS PostgreSQL database
- S3 bucket for frontend client
- CloudFront distribution
- Route 53 DNS records
- ACM SSL/TLS certificate
- IAM roles and policies
- CloudWatch log groups

#### Step 6: Configure GitHub Secrets

Terraform automatically configures these GitHub repository variables:
- `AWS_ROLE_ARN` (for OIDC authentication)
- `AWS_ECR_URL`
- `AWS_LAMBDA_FUNCTION_NAME`
- `AWS_S3_BUCKET_NAME`
- `AWS_REGION`
- `API_BASE_URL`
- `APP_URL`

And these secrets:
- `AWS_CLOUDFRONT_DISTRIBUTION_ID`
- `PRIVATE_ACTIONS_TOKEN`

Verify configuration:

```bash
./scripts/verify-github-secrets.sh
```

## Post-Deployment Configuration

### Update DNS Records

If your domain is not managed by Route 53, update your domain registrar with the Route 53 nameservers:

```bash
# Get nameservers from Terraform output
cd terraform
terraform output route53_nameservers

# Add these NS records to your domain registrar
```

DNS propagation can take up to 48 hours but typically completes within 1-2 hours.

### Wait for SSL Certificate Validation

AWS Certificate Manager (ACM) will automatically validate your domain via DNS. This typically takes 5-30 minutes.

Check status:
```bash
aws acm describe-certificate --certificate-arn YOUR_CERT_ARN --region us-east-1
```

### Access Your Analytics-Pulse Dashboard

Once DNS propagates and the certificate validates, visit:

```
https://yourdomain.com
```

You should see the Analytics-Pulse login page.

## Create Your First Project

### 1. Log In

Use the Pay authentication service to log in to your Analytics-Pulse dashboard.

**For testing/development:**
- Use the "Guest Login" option
- Or create an account via the Pay service

### 2. Create a New Project

1. Click **"Create New Project"** button
2. Fill in project details:
   - **Name**: My Website
   - **Domain**: example.com
   - **Description**: (optional)
3. Click **"Create Project"**

Your project is created with a unique ID.

### 3. Generate an API Key

1. Open your newly created project
2. Navigate to the **"Settings"** or **"API Keys"** tab
3. Click **"Generate New Key"**
4. Enter a name (e.g., "Production Website")
5. **IMPORTANT**: Copy the full API key immediately!
   - Format: `ap_abc123def456...`
   - This is shown **only once** for security
   - Store securely (password manager, secrets vault)

### 4. Install Tracking Code

Choose your integration method:

#### Option A: CDN (Quickest)

Add to your website's `<head>` section:

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>My Website</title>

  <!-- Analytics-Pulse Tracking -->
  <script src="https://cdn.jsdelivr.net/npm/@analytics-pulse/tracking-library"></script>
  <script>
    const analytics = new AnalyticsPulse('YOUR_API_KEY', {
      endpoint: 'https://api.yourdomain.com/api/v1/track',
      autoTrack: true,              // Automatic pageview tracking
      respectDoNotTrack: true,      // Honor DNT browser setting
      enableBatching: true,         // Batch events for efficiency
      sessionTimeout: 1800000       // 30 minutes
    });
  </script>
</head>
<body>
  <!-- Your content -->
</body>
</html>
```

#### Option B: NPM Package

For React, Vue, Angular, or other modern frameworks:

```bash
npm install @analytics-pulse/tracking-library
```

**React Example:**

```typescript
// src/analytics.ts
import { AnalyticsPulse } from '@analytics-pulse/tracking-library';

export const analytics = new AnalyticsPulse(
  import.meta.env.VITE_ANALYTICS_API_KEY,
  {
    endpoint: import.meta.env.VITE_ANALYTICS_ENDPOINT,
    autoTrack: true,
    respectDoNotTrack: true,
    enableBatching: true
  }
);

// src/App.tsx
import { useEffect } from 'react';
import { analytics } from './analytics';

function App() {
  useEffect(() => {
    // Analytics automatically tracks pageviews
    // Track custom events:
    analytics.track('app_loaded', {
      version: '1.0.0',
      environment: 'production'
    });
  }, []);

  return <div>Your App</div>;
}
```

**Vue Example:**

```typescript
// src/plugins/analytics.ts
import { AnalyticsPulse } from '@analytics-pulse/tracking-library';

export const analytics = new AnalyticsPulse(
  process.env.VUE_APP_ANALYTICS_API_KEY,
  {
    endpoint: process.env.VUE_APP_ANALYTICS_ENDPOINT,
    autoTrack: true
  }
);

// main.ts
import { analytics } from './plugins/analytics';

app.config.globalProperties.$analytics = analytics;
```

### 5. Verify Tracking

1. Visit your website in a browser
2. Open browser DevTools → Network tab
3. Look for requests to `https://api.yourdomain.com/api/v1/track/event`
4. Go back to Analytics-Pulse dashboard
5. Navigate to **Real-Time** view
6. You should see your visit appear within seconds!

## View Your Analytics

### Real-Time Dashboard

Shows activity in the last 5-30 minutes:
- **Active Visitors**: Users currently on your site (last 5 minutes)
- **Recent Pageviews**: Pageview count (last 30 minutes)
- **Current Pages**: Pages being viewed right now
- **Auto-Refresh**: Updates every 30 seconds

### Historical Analytics

View trends and insights:
1. Select a date range (today, last 7 days, last 30 days, custom)
2. Choose granularity (day, week, month)
3. View metrics:
   - **Pageviews**: Total page loads
   - **Unique Visitors**: Distinct visitors (by hashed IP)
   - **Sessions**: Distinct browsing sessions
   - **Bounce Rate**: Single-page sessions
   - **Avg Session Duration**: Time spent per session

### Charts and Breakdowns

- **Pageviews Over Time**: Line chart showing traffic trends
- **Top Pages**: Bar chart of most-visited URLs
- **Traffic Sources**: Referrer breakdown
- **Geographic Distribution**: Country and city map
- **Device Breakdown**: Pie chart (desktop, mobile, tablet)
- **Browser & OS**: Technology stack of your visitors

## Track Custom Events

Beyond pageviews, track any user interaction:

```javascript
// Button clicks
document.querySelector('#signup-button').addEventListener('click', () => {
  analytics.track('button_click', {
    button: 'signup',
    location: 'header',
    plan: 'pro'
  });
});

// Form submissions
document.querySelector('#contact-form').addEventListener('submit', (e) => {
  analytics.track('form_submit', {
    form: 'contact',
    fields: ['name', 'email', 'message']
  });
});

// Video plays
analytics.track('video_play', {
  video_id: 'intro-video',
  video_title: 'Product Overview',
  duration_seconds: 120
});

// E-commerce events
analytics.track('purchase', {
  order_id: 'ORD-12345',
  total: 299.99,
  currency: 'USD',
  items: 3
});
```

**Custom properties** can be any JSON-serializable data (up to 5KB per event).

## Set Up Conversion Goals

Track specific outcomes:

### 1. Create a Goal

1. Go to project **Settings** → **Goals**
2. Click **"Create New Goal"**
3. Choose goal type:

**Event Goal** - Tracks specific custom events:
```
Name: Newsletter Signup
Type: Event
Target Event: newsletter_signup
```

**Pageview Goal** - Tracks URL visits:
```
Name: Thank You Page
Type: Pageview
Target URL: /thank-you
```

**Value Goal** - Tracks monetary conversions:
```
Name: Purchase
Type: Value
Target Value: 100.00 (minimum purchase)
```

### 2. View Goal Conversions

- Navigate to **Goals** tab in your project
- See completion count, conversion rate, and trend over time
- Filter by date range

### 3. Analyze Conversion Funnels

Track multi-step conversion paths:

1. Create multiple goals representing funnel steps
2. Go to **Goals** → **Funnel Analysis**
3. Select goals in order (e.g., View Product → Add to Cart → Checkout → Purchase)
4. See drop-off rates between each step

## Track UTM Campaigns

Analytics-Pulse automatically extracts UTM parameters from URLs:

```
https://example.com/?utm_source=google&utm_medium=cpc&utm_campaign=spring_sale
```

**Supported parameters:**
- `utm_source`: Traffic source (google, facebook, newsletter)
- `utm_medium`: Marketing medium (cpc, email, social)
- `utm_campaign`: Campaign name (spring_sale, product_launch)
- `utm_term`: Paid keywords
- `utm_content`: Ad variant (banner_a, link_b)

**First-touch attribution**: Original UTM parameters are preserved across the entire session, even if the user navigates to pages without UTM params.

View campaign analytics:
1. Navigate to **Campaigns** tab
2. See all campaigns with metrics (pageviews, conversions, etc.)
3. Compare campaigns side-by-side
4. Export campaign data

## Export Your Data

Analytics-Pulse never locks you in:

1. Go to project **Settings** → **Export**
2. Choose export type:
   - **Analytics Summary**: Key metrics and breakdowns
   - **Custom Events**: All tracked events with properties
   - **Campaign Data**: UTM campaign performance
3. Select format:
   - **CSV**: Import into spreadsheets (Excel, Google Sheets)
   - **JSON**: Programmatic access and custom analysis
4. Choose date range
5. Click **"Export"** and download file

## Set Up Email Reports (Optional)

Get automated analytics reports:

1. Go to project **Settings** → **Email Reports**
2. Enable desired report frequency:
   - **Daily**: Every morning at 9 AM
   - **Weekly**: Every Monday at 9 AM
   - **Monthly**: 1st of the month at 9 AM
3. Configure timezone (e.g., "America/New_York")
4. **Send test report** to preview
5. Save preferences

**Unsubscribe**: Use the link at the bottom of any report email.

## Next Steps

Now that you've set up Analytics-Pulse, explore these advanced features:

### 📖 Learn More
- **[Tracking Guide](./TRACKING_GUIDE.md)**: Complete JavaScript library reference
- **[API Reference](./API_REFERENCE.md)**: REST API documentation
- **[Architecture](./ARCHITECTURE.md)**: System design and architecture
- **[Privacy Policy](./PRIVACY.md)**: Data handling and compliance

### 🔧 Advanced Configuration
- **Dark Mode**: Enable in user preferences
- **Multiple Projects**: Track multiple websites from one dashboard
- **API Access**: Use REST API for custom integrations
- **Performance Tuning**: See [PERFORMANCE.md](./PERFORMANCE.md)

### 🛠️ Troubleshooting

**Events not appearing?**
- Verify API key is correct
- Check browser console for errors
- Ensure endpoint URL is correct
- Verify API key is active (not revoked)
- Check rate limits (10,000 req/hour)

**SSL certificate errors?**
- Wait for ACM validation (5-30 minutes)
- Check DNS propagation: `dig yourdomain.com`
- Verify nameservers are correct

**Dashboard not loading?**
- Check CloudFront distribution is deployed
- Verify S3 bucket has frontend files
- Check GitHub Actions deployment logs

**Database connection errors?**
- Verify RDS instance is running
- Check security group rules
- Verify Lambda has VPC access
- Check database credentials in Secrets Manager

### 📞 Get Help

- **Issues**: [GitHub Issues](https://github.com/Jeffrey-Keyser/Analytics-Pulse/issues)
- **Discussions**: [GitHub Discussions](https://github.com/Jeffrey-Keyser/Analytics-Pulse/discussions)
- **Contributing**: See [CONTRIBUTING.md](../CONTRIBUTING.md)

## Summary

You've successfully:
- ✅ Deployed Analytics-Pulse to AWS
- ✅ Created your first project
- ✅ Generated an API key
- ✅ Installed tracking code
- ✅ Viewed real-time and historical analytics
- ✅ Learned about goals, campaigns, and exports

Analytics-Pulse is now tracking your website with complete privacy and data ownership. Enjoy your privacy-first analytics platform!
