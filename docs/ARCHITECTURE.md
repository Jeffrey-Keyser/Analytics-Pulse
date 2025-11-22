# Analytics-Pulse Architecture

Technical architecture documentation for Analytics-Pulse.

## Table of Contents

- [Overview](#overview)
- [System Architecture](#system-architecture)
- [Frontend Architecture](#frontend-architecture)
- [Backend Architecture](#backend-architecture)
- [Database Architecture](#database-architecture)
- [Infrastructure Architecture](#infrastructure-architecture)
- [Data Flow](#data-flow)
- [Security Architecture](#security-architecture)
- [Performance Optimizations](#performance-optimizations)
- [Scalability](#scalability)

## Overview

Analytics-Pulse is a serverless, privacy-first web analytics platform built on AWS infrastructure. The architecture prioritizes:

- **Privacy**: No cookies, hashed IPs, anonymous identifiers
- **Performance**: 10,000+ events/sec, <50ms p99 latency
- **Scalability**: Auto-scaling serverless components
- **Cost-Efficiency**: Pay-per-use pricing model
- **Reliability**: Multi-AZ deployment, automated backups

### Technology Stack

**Frontend**:
- React 18 + TypeScript
- Redux Toolkit + RTK Query
- Vite (build tool)
- Recharts (visualizations)
- CSS Modules

**Backend**:
- Node.js 18+ + TypeScript
- Express.js
- PostgreSQL 14+ (with partitioning)
- Redis (caching)
- AWS Lambda (serverless)

**Infrastructure**:
- Terraform (IaC)
- AWS (Lambda, RDS, S3, CloudFront, API Gateway)
- GitHub Actions (CI/CD)
- Docker (containerization)

## System Architecture

### High-Level Architecture

```
┌─────────────┐
│   Browser   │
└──────┬──────┘
       │ HTTPS
       ▼
┌─────────────────┐         ┌──────────────────┐
│   CloudFront    │◄────────│   S3 Bucket      │
│   (CDN)         │         │   (Frontend)     │
└─────────┬───────┘         └──────────────────┘
          │
          │ HTTPS
          ▼
┌──────────────────────────────────────────────────┐
│            API Gateway (HTTP API)                │
└───────────────────┬──────────────────────────────┘
                    │
                    │ Invoke
                    ▼
┌──────────────────────────────────────────────────┐
│        Lambda Function (Express.js)              │
│  ┌────────────┐  ┌─────────────┐  ┌──────────┐  │
│  │  Routes    │  │ Controllers │  │  DAL     │  │
│  └────────────┘  └─────────────┘  └──────────┘  │
└───────────────────┬──────────────────────────────┘
                    │
      ┌─────────────┴─────────────┐
      │                           │
      ▼                           ▼
┌─────────────┐           ┌──────────────┐
│  PostgreSQL │           │    Redis     │
│    (RDS)    │           │   (Cache)    │
│  Partitioned│           │   Optional   │
└─────────────┘           └──────────────┘
```

### Component Interaction

```
User Action (Pageview/Event)
    ↓
Tracking Library (JavaScript)
    ↓
Event Batching/Queuing
    ↓
POST /api/v1/track/event (or /batch)
    ↓
API Gateway → Lambda
    ↓
Rate Limiting Check (Redis)
    ↓
API Key Validation (bcrypt)
    ↓
Event Processing (parse UA, hash IP, GeoIP)
    ↓
Database Write (Partitioned Table)
    ↓
Response to Client
    ↓
Daily Aggregation (Cron Job)
    ↓
Dashboard Query (Cached)
    ↓
Display Analytics
```

## Frontend Architecture

### React Component Hierarchy

```
App
├── AuthProvider
│   └── Router
│       ├── PublicRoutes
│       │   ├── Login
│       │   └── Landing
│       └── ProtectedRoutes
│           ├── Dashboard
│           │   ├── ProjectList
│           │   └── CreateProjectModal
│           ├── ProjectDashboard
│           │   ├── RealTimeDashboard
│           │   │   ├── ActiveVisitorsCard
│           │   │   ├── RecentPageviewsCard
│           │   │   └── CurrentPagesTable
│           │   ├── HistoricalAnalytics
│           │   │   ├── SummaryCards
│           │   │   ├── PageviewsChart
│           │   │   ├── TopPagesChart
│           │   │   ├── DeviceBreakdown
│           │   │   └── GeoDistribution
│           │   ├── CampaignAnalytics
│           │   │   └── CampaignsTable
│           │   ├── GoalsDashboard
│           │   │   ├── GoalsList
│           │   │   └── ConversionFunnel
│           │   └── Settings
│           │       ├── ApiKeyManagement
│           │       ├── EmailPreferences
│           │       └── ProjectSettings
│           └── EventsDashboard
│               ├── EventsTable
│               └── EventFilters
```

### State Management

**Redux Store Structure**:

```typescript
{
  // Authentication
  auth: {
    user: PayUser | null,
    isAuthenticated: boolean,
    token: string | null
  },

  // API Cache (RTK Query)
  api: {
    queries: {
      'getProjects(undefined)': { data: Project[], ... },
      'getAnalytics({"id": "...", ...})': { data: Analytics, ... },
      'getRealtime({"id": "..."})': { data: Realtime, ... }
    },
    mutations: {
      'createProject': { ... },
      'generateApiKey': { ... }
    }
  },

  // UI State
  ui: {
    theme: 'light' | 'dark',
    sidebarOpen: boolean,
    selectedDateRange: { start: Date, end: Date },
    selectedGranularity: 'day' | 'week' | 'month'
  }
}
```

**RTK Query API Slices**:

```typescript
// API Definition
const projectsApi = createApi({
  reducerPath: 'projectsApi',
  baseQuery: fetchBaseQuery({
    baseUrl: '/api/v1',
    prepareHeaders: (headers, { getState }) => {
      const token = (getState() as RootState).auth.token;
      if (token) {
        headers.set('authorization', `Bearer ${token}`);
      }
      return headers;
    }
  }),
  tagTypes: ['Project', 'ApiKey', 'Analytics'],
  endpoints: (builder) => ({
    getProjects: builder.query<Project[], void>({ ... }),
    createProject: builder.mutation<Project, CreateProjectDto>({ ... }),
    getAnalytics: builder.query<Analytics, GetAnalyticsParams>({ ... })
  })
});
```

### Routing

**Routes**:
- `/` - Dashboard (project list)
- `/projects/:id` - Project analytics
- `/projects/:id/realtime` - Real-time dashboard
- `/projects/:id/campaigns` - Campaign analytics
- `/projects/:id/goals` - Goals and conversions
- `/projects/:id/events` - Custom events
- `/projects/:id/settings` - Project settings
- `/login` - Authentication

**Protected Routes**: All routes except `/login` require authentication.

## Backend Architecture

### Express Application Structure

```
server/
├── src/
│   ├── app.ts                 # Express app setup
│   ├── lambda.ts              # Lambda handler (serverless-http)
│   ├── routes/
│   │   ├── versions/v1/
│   │   │   └── index.ts       # API v1 router
│   │   ├── projects.ts
│   │   ├── apiKeys.ts
│   │   ├── tracking.ts
│   │   ├── analytics.ts
│   │   ├── events.ts
│   │   ├── campaigns.ts
│   │   ├── goals.ts
│   │   ├── emailPreferences.ts
│   │   ├── export.ts
│   │   ├── aggregation.ts
│   │   └── performance.ts
│   ├── controllers/
│   │   └── (controller logic)
│   ├── dal/                   # Data Access Layer
│   │   ├── BaseDal.ts
│   │   ├── ProjectsDal.ts
│   │   ├── ApiKeysDal.ts
│   │   ├── EventsDal.ts
│   │   ├── AnalyticsDal.ts
│   │   ├── GoalsDal.ts
│   │   └── EmailPreferencesDal.ts
│   ├── middleware/
│   │   ├── auth.ts            # JWT/session auth
│   │   ├── apiKeyAuth.ts      # API key validation
│   │   ├── rateLimiter.ts     # Rate limiting
│   │   ├── errorHandler.ts    # Global error handling
│   │   └── versioning.ts      # API versioning
│   ├── services/
│   │   ├── aggregation.ts     # Daily aggregation
│   │   ├── geoip.ts           # GeoIP lookup
│   │   ├── userAgent.ts       # UA parsing
│   │   ├── email.ts           # Email sending (SES)
│   │   └── cache.ts           # Redis caching
│   ├── models/
│   │   └── (Sequelize models - migrations only)
│   ├── types/
│   │   └── (TypeScript type definitions)
│   ├── config/
│   │   └── env.ts             # Environment configuration
│   └── utils/
│       └── (utility functions)
├── db/
│   ├── schema/                # SQL schema files
│   ├── migrations/            # Sequelize migrations
│   ├── deploy.sh              # Database deployment script
│   └── teardown.sh            # Database teardown script
└── tests/
    ├── __mocks__/
    └── __tests__/
        ├── unit/
        └── integration/
```

### Middleware Pipeline

```
Request
  ↓
CORS Middleware
  ↓
Body Parser (JSON, 10MB limit)
  ↓
API Versioning (header/URL negotiation)
  ↓
Rate Limiting (tracking: 10k/hr, management: standard)
  ↓
Authentication
  ├─ Management APIs: JWT/Session
  └─ Tracking APIs: API Key
  ↓
Route Handling
  ↓
Controller Logic
  ↓
DAL (Database Operations)
  ↓
Error Handling Middleware
  ↓
Response
```

### Data Access Layer (DAL) Pattern

**Base DAL** (`server/dal/BaseDal.ts`):

```typescript
abstract class BaseDal {
  protected pool: Pool;

  constructor() {
    this.pool = getDatabasePool();
  }

  // Transaction support
  async withTransaction<T>(
    callback: (client: PoolClient) => Promise<T>
  ): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // Query helpers
  protected async query<T>(sql: string, params?: any[]): Promise<T[]> {
    const result = await this.pool.query(sql, params);
    return result.rows;
  }

  protected async queryOne<T>(sql: string, params?: any[]): Promise<T | null> {
    const rows = await this.query<T>(sql, params);
    return rows[0] || null;
  }
}
```

**Example DAL** (`server/dal/EventsDal.ts`):

```typescript
class EventsDal extends BaseDal {
  async createEvent(event: CreateEventDto): Promise<Event> {
    const sql = `
      INSERT INTO events (
        project_id, session_id, event_type, event_name,
        url, referrer, country, city, browser, os,
        device_type, custom_data, utm_params, timestamp
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *
    `;

    return this.queryOne<Event>(sql, [
      event.project_id,
      event.session_id,
      event.event_type,
      event.event_name,
      event.url,
      event.referrer,
      event.country,
      event.city,
      event.browser,
      event.os,
      event.device_type,
      JSON.stringify(event.custom_data),
      JSON.stringify(event.utm_params),
      event.timestamp
    ]);
  }

  async getEvents(params: GetEventsParams): Promise<Event[]> {
    const sql = `
      SELECT * FROM events
      WHERE project_id = $1
        AND timestamp >= $2
        AND timestamp <= $3
      ORDER BY timestamp DESC
      LIMIT $4 OFFSET $5
    `;

    return this.query<Event>(sql, [
      params.project_id,
      params.start_date,
      params.end_date,
      params.limit,
      params.offset
    ]);
  }
}
```

## Database Architecture

### Database Schema

**Core Tables**:

```sql
-- Projects
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  domain VARCHAR(255) NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- API Keys
CREATE TABLE api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  key_hash VARCHAR(255) NOT NULL,
  key_prefix VARCHAR(20) NOT NULL,
  name VARCHAR(100),
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  last_used_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Events (PARTITIONED by month)
CREATE TABLE events (
  id UUID DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL,
  session_id UUID,
  event_type VARCHAR(50) NOT NULL,
  event_name VARCHAR(100),
  url TEXT NOT NULL,
  referrer TEXT,
  user_agent TEXT,
  ip_hash VARCHAR(64),
  country VARCHAR(100),
  city VARCHAR(100),
  browser VARCHAR(100),
  os VARCHAR(100),
  device_type VARCHAR(50),
  screen_width INTEGER,
  screen_height INTEGER,
  viewport_width INTEGER,
  viewport_height INTEGER,
  language VARCHAR(10),
  timezone VARCHAR(50),
  custom_data JSONB,
  utm_params JSONB,
  timestamp TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (id, timestamp)
) PARTITION BY RANGE (timestamp);

-- Goals
CREATE TABLE goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  goal_type VARCHAR(50) NOT NULL, -- 'event', 'pageview', 'value'
  target_event_name VARCHAR(100),
  target_url_pattern TEXT,
  target_value DECIMAL(10, 2),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Goal Completions (PARTITIONED by month)
CREATE TABLE goal_completions (
  id UUID DEFAULT gen_random_uuid(),
  goal_id UUID NOT NULL,
  project_id UUID NOT NULL,
  session_id UUID,
  event_id UUID,
  url TEXT,
  value DECIMAL(10, 2),
  metadata JSONB,
  timestamp TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (id, timestamp)
) PARTITION BY RANGE (timestamp);

-- Analytics Daily (Aggregated Metrics)
CREATE TABLE analytics_daily (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  pageviews INTEGER DEFAULT 0,
  unique_visitors INTEGER DEFAULT 0,
  sessions INTEGER DEFAULT 0,
  bounce_rate DECIMAL(5, 2),
  avg_session_duration_seconds INTEGER,
  top_pages JSONB,
  top_referrers JSONB,
  top_countries JSONB,
  top_cities JSONB,
  top_browsers JSONB,
  top_os JSONB,
  device_breakdown JSONB,
  events_count INTEGER DEFAULT 0,
  avg_events_per_session DECIMAL(10, 2),
  top_custom_events JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (project_id, date)
);

-- Email Preferences
CREATE TABLE email_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  user_email VARCHAR(255) NOT NULL,
  daily_report_enabled BOOLEAN DEFAULT false,
  daily_report_time TIME,
  weekly_report_enabled BOOLEAN DEFAULT false,
  weekly_report_day VARCHAR(20),
  weekly_report_time TIME,
  monthly_report_enabled BOOLEAN DEFAULT false,
  monthly_report_day INTEGER,
  monthly_report_time TIME,
  timezone VARCHAR(50) DEFAULT 'UTC',
  unsubscribe_token VARCHAR(255) UNIQUE,
  is_active BOOLEAN DEFAULT true,
  unsubscribed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (project_id, user_email)
);
```

### Partitioning Strategy

**Monthly Range Partitioning** for high-volume tables:

```sql
-- Create partition for January 2025
CREATE TABLE events_2025_01 PARTITION OF events
  FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');

-- Create partition for February 2025
CREATE TABLE events_2025_02 PARTITION OF events
  FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');
```

**Automatic Partition Creation** via trigger:

```sql
CREATE OR REPLACE FUNCTION create_partition_if_not_exists()
RETURNS TRIGGER AS $$
DECLARE
  partition_name TEXT;
  partition_start DATE;
  partition_end DATE;
BEGIN
  partition_start := DATE_TRUNC('month', NEW.timestamp);
  partition_end := partition_start + INTERVAL '1 month';
  partition_name := TG_TABLE_NAME || '_' || TO_CHAR(partition_start, 'YYYY_MM');

  IF NOT EXISTS (
    SELECT 1 FROM pg_class WHERE relname = partition_name
  ) THEN
    EXECUTE format(
      'CREATE TABLE %I PARTITION OF %I FOR VALUES FROM (%L) TO (%L)',
      partition_name,
      TG_TABLE_NAME,
      partition_start,
      partition_end
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER events_partition_trigger
  BEFORE INSERT ON events
  FOR EACH ROW EXECUTE FUNCTION create_partition_if_not_exists();
```

**Partition Maintenance**:

```sql
-- Create future partitions (6 months ahead)
SELECT create_future_partitions('events', 6);

-- Drop old partitions (older than 12 months)
SELECT drop_old_partitions('events', 12);

-- Daily maintenance (via cron)
VACUUM ANALYZE events;
REINDEX TABLE events;
```

**Performance Benefits**:
- Query performance: 10-100x faster (partition pruning)
- Index size: Smaller per-partition indexes
- Maintenance: Faster VACUUM, ANALYZE on individual partitions
- Data lifecycle: Easy deletion of old data (drop partition)

See [PARTITION_STRATEGY.md](./PARTITION_STRATEGY.md) for complete details.

### Indexes

```sql
-- Projects
CREATE INDEX idx_projects_domain ON projects(domain);

-- API Keys
CREATE INDEX idx_api_keys_project_id ON api_keys(project_id);
CREATE INDEX idx_api_keys_key_prefix ON api_keys(key_prefix);

-- Events (on each partition)
CREATE INDEX idx_events_project_id_timestamp ON events(project_id, timestamp DESC);
CREATE INDEX idx_events_session_id ON events(session_id);
CREATE INDEX idx_events_event_type ON events(event_type);
CREATE INDEX idx_events_url ON events(url);
CREATE INDEX idx_events_utm_params ON events USING GIN(utm_params);
CREATE INDEX idx_events_custom_data ON events USING GIN(custom_data);

-- Goals
CREATE INDEX idx_goals_project_id ON goals(project_id);

-- Goal Completions (on each partition)
CREATE INDEX idx_goal_completions_goal_id_timestamp ON goal_completions(goal_id, timestamp DESC);
CREATE INDEX idx_goal_completions_project_id_timestamp ON goal_completions(project_id, timestamp DESC);

-- Analytics Daily
CREATE INDEX idx_analytics_daily_project_id_date ON analytics_daily(project_id, date DESC);
```

## Infrastructure Architecture

### AWS Components

**Compute**:
```
Lambda Function
├── Runtime: Node.js 18.x
├── Memory: 512 MB (configurable)
├── Timeout: 30 seconds
├── Concurrency: 100 (reserved), 1000 (max)
├── Handler: dist/lambda.handler
└── Image: ECR (Docker container)
```

**Networking**:
```
VPC
├── Subnets (Multi-AZ)
│   ├── Public Subnets (NAT Gateway)
│   └── Private Subnets (Lambda, RDS)
├── Security Groups
│   ├── Lambda SG → RDS SG (port 5432)
│   └── RDS SG (allow from Lambda only)
└── Internet Gateway
```

**Database**:
```
RDS PostgreSQL
├── Engine: PostgreSQL 14.x
├── Instance: db.t3.micro (1 vCPU, 1GB RAM)
├── Storage: 20GB gp3 (auto-scaling to 100GB)
├── Multi-AZ: Enabled (production)
├── Backup: Automated (7 day retention)
└── Encryption: At rest (KMS)
```

**Storage & CDN**:
```
S3 Bucket
├── Versioning: Enabled
├── Encryption: AES-256
├── Lifecycle: Expire old versions after 90 days
└── Public Access: Block all (serve via CloudFront)

CloudFront Distribution
├── Origin: S3 bucket
├── SSL: ACM certificate
├── Cache: TTL 3600s (1 hour)
├── Compression: Enabled
└── IPv6: Enabled
```

**DNS & Certificates**:
```
Route 53
├── Hosted Zone: yourdomain.com
├── A Record: @ → CloudFront
└── A Record: api → API Gateway

ACM Certificate
├── Domain: *.yourdomain.com
├── Validation: DNS
└── Renewal: Automatic
```

### Infrastructure as Code (Terraform)

**Terraform Structure**:

```
terraform/
├── main.tf              # Root module
├── variables.tf         # Input variables
├── outputs.tf           # Outputs (ECR URL, API URL, etc.)
├── config.tf            # Backend & provider config
├── terraform.tfvars     # Variable values (gitignored)
└── modules/
    ├── lambda/
    │   ├── main.tf
    │   ├── variables.tf
    │   └── outputs.tf
    ├── rds/
    │   ├── main.tf
    │   ├── variables.tf
    │   └── outputs.tf
    ├── s3-cloudfront/
    │   ├── main.tf
    │   ├── variables.tf
    │   └── outputs.tf
    └── github/
        ├── main.tf      # OIDC, secrets, variables
        ├── variables.tf
        └── outputs.tf
```

**Terraform State**:
- Backend: S3 (`tf-state-jeffrey-keyser-prod`)
- State locking: DynamoDB table
- Encryption: At rest (SSE-S3)

**Key Terraform Resources**:

```hcl
# Lambda Function
resource "aws_lambda_function" "lambda" {
  function_name = "${var.service_name}-${var.environment}-lambda"
  image_uri     = "${aws_ecr_repository.ecr_repo.repository_url}:latest"
  package_type  = "Image"
  role          = aws_iam_role.lambda_role.arn
  memory_size   = 512
  timeout       = 30

  vpc_config {
    subnet_ids         = aws_subnet.private[*].id
    security_group_ids = [aws_security_group.lambda.id]
  }

  environment {
    variables = {
      NODE_ENV       = var.environment
      DATABASE_HOST  = aws_db_instance.database.address
      DATABASE_NAME  = var.database_name
      DATABASE_USER  = var.database_user
      # ... other env vars
    }
  }
}

# API Gateway
resource "aws_apigatewayv2_api" "api" {
  name          = "${var.service_name}-${var.environment}-api"
  protocol_type = "HTTP"

  cors_configuration {
    allow_origins = [var.app_url]
    allow_methods = ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
    allow_headers = ["Content-Type", "Authorization", "X-API-Key"]
    allow_credentials = true
  }
}

# RDS PostgreSQL
resource "aws_db_instance" "database" {
  identifier           = "${var.service_name}-${var.environment}-db"
  engine               = "postgres"
  engine_version       = "14.7"
  instance_class       = "db.t3.micro"
  allocated_storage    = 20
  max_allocated_storage = 100
  storage_encrypted    = true
  multi_az             = var.environment == "prod"
  backup_retention_period = 7
  skip_final_snapshot  = var.environment != "prod"
  publicly_accessible  = false

  vpc_security_group_ids = [aws_security_group.rds.id]
  db_subnet_group_name   = aws_db_subnet_group.database.name
}

# S3 + CloudFront
resource "aws_s3_bucket" "client" {
  bucket = "${var.service_name}-${var.environment}-client"
}

resource "aws_cloudfront_distribution" "cdn" {
  origin {
    domain_name = aws_s3_bucket.client.bucket_regional_domain_name
    origin_id   = "S3-${aws_s3_bucket.client.id}"

    s3_origin_config {
      origin_access_identity = aws_cloudfront_origin_access_identity.oai.cloudfront_access_identity_path
    }
  }

  enabled             = true
  default_root_object = "index.html"

  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD", "OPTIONS"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "S3-${aws_s3_bucket.client.id}"

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 3600
    max_ttl                = 86400
  }

  viewer_certificate {
    acm_certificate_arn = aws_acm_certificate.cert.arn
    ssl_support_method  = "sni-only"
  }
}

# GitHub OIDC
resource "aws_iam_openid_connect_provider" "github" {
  url = "https://token.actions.githubusercontent.com"

  client_id_list = ["sts.amazonaws.com"]

  thumbprint_list = [
    "6938fd4d98bab03faadb97b34396831e3780aea1"
  ]
}

resource "aws_iam_role" "github_actions" {
  name = "${var.service_name}-github-actions"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = {
        Federated = aws_iam_openid_connect_provider.github.arn
      }
      Action = "sts:AssumeRoleWithWebIdentity"
      Condition = {
        StringEquals = {
          "token.actions.githubusercontent.com:aud" = "sts.amazonaws.com"
        }
        StringLike = {
          "token.actions.githubusercontent.com:sub" = "repo:${var.github_owner}/${var.github_repo}:*"
        }
      }
    }]
  })
}
```

## Data Flow

### Event Tracking Flow

```
1. User Action (Pageview)
   ↓
2. Tracking Library Captures Event
   - URL, referrer, timestamp
   - User agent, screen size
   - Language, timezone
   - UTM parameters
   - Session ID (from sessionStorage)
   - Visitor ID (from localStorage)
   ↓
3. Event Queued for Batching
   - Added to in-memory queue
   - Flushed when batch size reached (10 events)
   - Or after flush interval (5 seconds)
   ↓
4. POST /api/v1/track/batch
   - Headers: X-API-Key
   - Body: { events: [...] }
   ↓
5. API Gateway → Lambda
   ↓
6. Rate Limiting Check
   - Redis: Check requests/hour for API key
   - If exceeded: Return 429 Too Many Requests
   ↓
7. API Key Validation
   - Query: SELECT * FROM api_keys WHERE key_prefix = ?
   - bcrypt.compare(provided_key, key_hash)
   - Update last_used_at
   ↓
8. Event Processing (for each event)
   a. Parse User Agent (browser, OS, device type)
   b. Hash IP Address (SHA-256)
   c. GeoIP Lookup (country, city)
   d. Validate custom_data size (<5KB)
   ↓
9. Database Write
   - INSERT INTO events (partitioned table)
   - Automatic partition creation if needed
   - Trigger updates session tracking
   ↓
10. Response
    - 201 Created
    - { event_ids: [...], processed: 10, failed: 0 }
```

### Analytics Query Flow

```
1. User Opens Dashboard
   ↓
2. GET /api/v1/projects/:id/analytics?startDate=...&endDate=...
   - Headers: Authorization: Bearer JWT_TOKEN
   ↓
3. API Gateway → Lambda
   ↓
4. JWT Validation
   - Verify signature
   - Check expiration
   - Extract user_id
   ↓
5. Check Cache (Redis)
   - Key: analytics:{project_id}:{start}:{end}:{granularity}
   - If hit: Return cached data (TTL: 5 minutes)
   ↓
6. Database Query (if cache miss)
   a. Check analytics_daily table
      - Fast query on pre-aggregated data
      - Covers date range
   b. If recent data needed, query events table
      - Partition pruning (only query relevant months)
      - Aggregate on-the-fly
   ↓
7. Data Processing
   - Combine daily aggregates + recent data
   - Calculate metrics (bounce rate, avg session duration)
   - Format response
   ↓
8. Cache Result (Redis)
   - Set key with TTL (5 minutes)
   ↓
9. Response
   - 200 OK
   - { summary: {...}, timeseries: [...], top_pages: [...], ... }
```

### Daily Aggregation Flow

```
1. Cron Job Trigger (Daily at 02:00 UTC)
   ↓
2. POST /api/v1/aggregation/daily/all
   - Internal endpoint (admin only)
   ↓
3. For Each Project:
   a. Query events for yesterday
      - partition: events_YYYY_MM
      - WHERE timestamp >= yesterday_start AND timestamp < today_start
   b. Calculate Metrics
      - Pageviews: COUNT(*)
      - Unique Visitors: COUNT(DISTINCT ip_hash)
      - Sessions: COUNT(DISTINCT session_id)
      - Bounce Rate: (single-page sessions / total sessions) * 100
      - Avg Session Duration: AVG(session_end - session_start)
   c. Calculate Top Lists
      - Top Pages: GROUP BY url ORDER BY COUNT(*) DESC LIMIT 10
      - Top Referrers: GROUP BY referrer ORDER BY COUNT(*) DESC LIMIT 10
      - Top Countries: GROUP BY country ORDER BY COUNT(*) DESC LIMIT 10
      - Device Breakdown: GROUP BY device_type
   d. Insert/Update analytics_daily
      - ON CONFLICT (project_id, date) DO UPDATE
   ↓
4. Partition Maintenance
   - Create future partitions (6 months ahead)
   - Drop old partitions (older than 12 months)
   - VACUUM ANALYZE on each partition
   ↓
5. Cache Invalidation
   - Clear Redis cache for affected date ranges
```

## Security Architecture

### Authentication Flow

**JWT-Based Authentication**:

```
1. User Login
   ↓
2. POST /auth/login (Pay Service)
   - Email, password
   ↓
3. Pay Service Validates Credentials
   ↓
4. JWT Token Issued
   - Payload: { user_id, email, roles, exp }
   - Signature: HMAC-SHA256(payload, JWT_SECRET)
   ↓
5. Client Stores Token (localStorage)
   ↓
6. Subsequent Requests
   - Headers: Authorization: Bearer JWT_TOKEN
   ↓
7. Server Validates Token
   - Verify signature
   - Check expiration
   - Extract user_id
   ↓
8. User Attached to Request
   - req.user = decoded_token
```

**API Key Authentication**:

```
1. API Key Generation
   - Generate random key: ap_${randomBytes(32).toString('hex')}
   - Hash key: bcrypt.hash(key, 10)
   - Store: key_hash, key_prefix (first 8 chars)
   ↓
2. Client Stores Full Key
   - Environment variable or config
   ↓
3. Tracking Request
   - Headers: X-API-Key: ap_abc123...
   ↓
4. Server Validates Key
   a. Extract key_prefix (first 8 chars)
   b. Query: SELECT * FROM api_keys WHERE key_prefix = 'ap_abc12'
   c. bcrypt.compare(provided_key, key_hash)
   d. Check is_active = true
   e. Update last_used_at
   ↓
5. Request Allowed/Denied
```

### Security Features

**Input Validation**:
- Express-validator for all endpoints
- Payload size limits (10MB default, 100KB for tracking)
- SQL injection prevention (parameterized queries)
- XSS prevention (input sanitization)

**Rate Limiting**:
- Redis-backed rate limiter
- 10,000 requests/hour per API key (tracking)
- Standard limits for management APIs
- DDoS protection via API Gateway throttling

**Encryption**:
- **In Transit**: TLS 1.2+ (CloudFront, API Gateway)
- **At Rest**:
  - RDS: KMS encryption
  - S3: AES-256
  - Secrets Manager: KMS encryption

**IP Hashing**:
```typescript
import crypto from 'crypto';

function hashIp(ip: string): string {
  return crypto
    .createHash('sha256')
    .update(ip + process.env.IP_SALT)
    .digest('hex');
}
```

**CORS**:
```typescript
app.use(cors({
  origin: process.env.CORS_ORIGIN,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key']
}));
```

## Performance Optimizations

### Caching Strategy

**Redis Cache**:

```typescript
// Cache analytics results
const cacheKey = `analytics:${projectId}:${startDate}:${endDate}:${granularity}`;

// Try cache first
let data = await redis.get(cacheKey);

if (!data) {
  // Query database
  data = await getAnalyticsFromDb(params);

  // Cache result (5 minutes)
  await redis.setex(cacheKey, 300, JSON.stringify(data));
}

return JSON.parse(data);
```

**Cache Invalidation**:
- Automatic expiration (TTL: 5 minutes for analytics)
- Manual invalidation on data updates
- Cache warming for popular queries

**In-Memory Fallback**:
```typescript
// If Redis unavailable, use in-memory LRU cache
const memoryCache = new LRUCache({ max: 100, maxAge: 300000 });
```

### Database Optimizations

**Connection Pooling**:
```typescript
const pool = new Pool({
  host: process.env.DATABASE_HOST,
  port: 5432,
  user: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_NAME,
  min: 2,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000
});
```

**Query Optimizations**:
- Partition pruning (queries only relevant partitions)
- Index usage (EXPLAIN ANALYZE for all queries)
- Materialized views for complex aggregations
- Query result pagination (limit + offset)

**Daily Aggregation**:
- Pre-compute metrics for fast dashboard loads
- Store in `analytics_daily` table
- Query aggregates instead of raw events

### Lambda Optimizations

**Cold Start Reduction**:
- Provisioned concurrency (if needed)
- Minimize dependencies
- Use Lambda layers for shared code
- Keep handler function small

**Memory Allocation**:
- 512 MB (balance between cost and performance)
- Monitor and adjust based on actual usage

**Timeout Configuration**:
- 30 seconds (sufficient for most queries)
- Longer timeout for aggregation jobs

## Scalability

### Horizontal Scaling

**Lambda Auto-Scaling**:
- Concurrent executions: 1000 (default account limit)
- Reserved concurrency: 100 (guaranteed availability)
- Burst concurrency: 500-3000 (region-dependent)

**RDS Scaling**:
- Vertical: Upgrade instance type (db.t3.micro → db.t3.small → db.m5.large)
- Read replicas: Add read replicas for read-heavy workloads
- Aurora Serverless: Migrate to Aurora for automatic scaling

**CloudFront Scaling**:
- Automatic global distribution
- Edge locations: 400+ worldwide
- No configuration needed

### Vertical Scaling

**Lambda**: Increase memory (128MB → 10240MB)

**RDS**: Upgrade instance class
- db.t3.micro (1 vCPU, 1GB RAM)
- db.t3.small (2 vCPU, 2GB RAM)
- db.t3.medium (2 vCPU, 4GB RAM)
- db.m5.large (2 vCPU, 8GB RAM)
- db.r5.xlarge (4 vCPU, 32GB RAM)

### Data Partitioning

**Time-based Partitioning**:
- Events partitioned by month
- 12-month retention (configurable)
- Automatic partition creation
- Automatic partition pruning

**Multi-tenancy**:
- Projects isolated by `project_id`
- API keys scoped to projects
- No cross-project data access

## Disaster Recovery

### Backup Strategy

**RDS**:
- Automated daily snapshots (7 day retention)
- Manual snapshots (permanent)
- Point-in-time recovery (up to 5 minutes)

**S3**:
- Versioning enabled
- Cross-region replication (optional)

**Terraform State**:
- S3 backend with versioning
- State locking (DynamoDB)

### Recovery Procedures

**Database Recovery**:
```bash
# Restore from snapshot
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier analytics-pulse-restored \
  --db-snapshot-identifier analytics-pulse-backup-20250115
```

**Infrastructure Recovery**:
```bash
# Re-apply Terraform
cd terraform
terraform init
terraform apply
```

---

**Next Steps**:
- [Performance Guide](./PERFORMANCE.md) - Detailed performance tuning
- [Partition Strategy](./PARTITION_STRATEGY.md) - Database partitioning details
- [Deployment Guide](./DEPLOYMENT.md) - Infrastructure deployment

**Architecture Questions**: [GitHub Discussions](https://github.com/Jeffrey-Keyser/Analytics-Pulse/discussions)
