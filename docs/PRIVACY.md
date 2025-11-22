# Privacy Policy & Data Handling

Analytics-Pulse privacy practices and data handling documentation.

## Table of Contents

- [Overview](#overview)
- [Privacy-First Design](#privacy-first-design)
- [Data Collection](#data-collection)
- [Data Storage](#data-storage)
- [Data Processing](#data-processing)
- [Data Retention](#data-retention)
- [Data Access & Control](#data-access--control)
- [Compliance](#compliance)
- [Security Measures](#security-measures)
- [Third-Party Services](#third-party-services)
- [User Rights](#user-rights)
- [Privacy Policy Template](#privacy-policy-template)

## Overview

Analytics-Pulse is built with privacy as a fundamental principle, not an afterthought. Unlike traditional analytics platforms, Analytics-Pulse:

- ✅ **Does NOT use cookies**
- ✅ **Does NOT track users across websites**
- ✅ **Does NOT sell or share data with third parties**
- ✅ **Does NOT create user profiles**
- ✅ **Does NOT collect personal information**
- ✅ **Respects Do Not Track (DNT) browser settings**
- ✅ **Hashes IP addresses before storage**
- ✅ **Provides anonymous visitor tracking**

## Privacy-First Design

### No Cookies

Analytics-Pulse uses `localStorage` and `sessionStorage` instead of cookies:

**Benefits**:
- No cookie consent banners required
- Not affected by cookie blockers
- GDPR/CCPA friendly
- Simplified compliance

**Implementation**:
```javascript
// Session ID (cleared when tab closes)
sessionStorage.setItem('analytics-pulse-session-id', uuid());

// Visitor ID (persistent, but anonymous)
localStorage.setItem('analytics-pulse-visitor-id', uuid());
```

### Anonymous Identifiers

**Visitor ID**:
- Random UUID (e.g., `550e8400-e29b-41d4-a716-446655440000`)
- Generated client-side
- Stored in `localStorage`
- Cannot be linked to personal information
- No cross-site tracking

**Session ID**:
- Random UUID
- Generated per browser session
- Stored in `sessionStorage`
- Cleared when tab closes
- Used to group pageviews into sessions

### Do Not Track (DNT) Respect

Analytics-Pulse respects browser DNT settings by default:

```javascript
if (navigator.doNotTrack === '1') {
  // No events sent
  // No data stored
  // User not tracked
  console.log('Do Not Track enabled, analytics disabled');
  return;
}
```

**User Control**: Users can enable DNT in their browser settings.

### IP Address Hashing

IP addresses are hashed (SHA-256) before storage:

**Process**:
1. Client sends request (IP: `192.168.1.1`)
2. Server receives IP address
3. Server hashes IP: `SHA-256(IP + salt)` → `a4f3e1b2c...`
4. Hashed IP stored in database
5. Original IP never stored

**Result**: Cannot reverse-engineer original IP from hash.

**Code**:
```typescript
import crypto from 'crypto';

function hashIp(ip: string): string {
  const salt = process.env.IP_SALT || 'default-salt';
  return crypto
    .createHash('sha256')
    .update(ip + salt)
    .digest('hex');
}
```

### No Cross-Site Tracking

- Each project has its own API key
- Data is project-scoped
- No tracking across different domains
- No user profiles spanning multiple websites

## Data Collection

### What We Collect

Analytics-Pulse collects only the minimum data necessary for web analytics:

#### Automatically Collected

**Page Information**:
- URL (page being viewed)
- Referrer (where visitor came from)
- UTM parameters (campaign tracking)

**Browser Information**:
- User agent string (browser name, version, OS)
- Screen dimensions (width, height)
- Viewport dimensions (visible area)
- Language preference (e.g., "en-US")
- Timezone (e.g., "America/New_York")

**Session Information**:
- Session ID (anonymous UUID)
- Visitor ID (anonymous UUID)
- Timestamp

**Geographic Information** (derived from IP):
- Country (e.g., "United States")
- City (e.g., "New York")
- **NOT collected**: Precise coordinates, street address, ZIP code

#### Custom Events (Optional)

**Developer-Defined Properties**:
- Event name (e.g., "button_click", "purchase")
- Custom properties (up to 5KB per event)
- Developer controls what data is sent

**Example**:
```javascript
analytics.track('purchase', {
  order_id: 'ORD-12345',
  total: 299.99,
  currency: 'USD'
  // Developer should NOT send: email, name, address, phone, etc.
});
```

### What We DO NOT Collect

Analytics-Pulse does **NOT** collect:

❌ Personal Information:
- Names
- Email addresses
- Phone numbers
- Physical addresses
- Social security numbers
- Credit card numbers

❌ Sensitive Data:
- Passwords
- Form input values
- Keystroke data
- Mouse movements (except for custom events if developer chooses)
- Clipboard contents
- File uploads

❌ Precise Location:
- GPS coordinates
- Street addresses
- ZIP/postal codes
- Geofencing data

❌ Device Identifiers:
- MAC addresses
- IMEI numbers
- Device serial numbers
- Advertising IDs (IDFA, GAID)

❌ Biometric Data:
- Fingerprints
- Facial recognition
- Voice patterns

❌ Financial Information:
- Bank account numbers
- Payment card details
- Transaction histories (unless sent via custom events)

## Data Storage

### Where Data Is Stored

**Primary Storage**: Amazon RDS PostgreSQL
- Region: Configurable (default: us-east-1)
- Encryption: AES-256 at rest (KMS)
- Backups: Automated daily (7-day retention)
- Multi-AZ: Enabled (production)

**Cache Storage**: Redis (optional)
- Purpose: Temporary caching of analytics results
- TTL: 5 minutes
- No persistent storage
- In-memory only

**Session Storage**: PostgreSQL (connect-pg-simple)
- Purpose: User authentication sessions
- Encryption: At rest (KMS)
- TTL: 24 hours (default)

### Data Isolation

**Multi-Tenancy**:
- Each project has unique `project_id`
- API keys scoped to individual projects
- Database queries filtered by `project_id`
- No cross-project data access

**Access Control**:
- User can only access their own projects
- API keys only track events for their project
- Role-based access control (coming soon)

## Data Processing

### Server-Side Processing

**User Agent Parsing**:
```
User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36

Parsed to:
- browser: "Chrome"
- browser_version: "120.0.0.0"
- os: "Windows"
- os_version: "10"
- device_type: "desktop"
```

**GeoIP Lookup**:
```
IP Address: 192.168.1.1

Looked up to:
- country: "United States"
- country_code: "US"
- city: "New York"

IP Address is then hashed and discarded.
```

**UTM Parameter Extraction**:
```
URL: https://example.com/?utm_source=google&utm_medium=cpc&utm_campaign=spring_sale

Extracted to:
{
  "utm_source": "google",
  "utm_medium": "cpc",
  "utm_campaign": "spring_sale"
}
```

### Client-Side Processing

**Session Management**:
- Session ID generated client-side
- Stored in `sessionStorage` (cleared on tab close)
- 30-minute inactivity timeout
- New session created after timeout

**Event Batching**:
- Events queued in memory
- Sent in batches (up to 10 events)
- Reduces network requests
- Improves performance

**Data Minimization**:
- Only necessary fields sent to server
- No form input values captured
- No sensitive data included
- Developer controls custom properties

## Data Retention

### Event Data

**Retention Period**: 12 months (configurable)

**Partitioning Strategy**:
- Monthly partitions (e.g., `events_2025_01`)
- Automatic partition creation
- Automatic partition deletion after retention period

**Example**:
```sql
-- January 2025 partition (created automatically)
CREATE TABLE events_2025_01 PARTITION OF events
  FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');

-- Dropped after 12 months (January 2026)
DROP TABLE events_2025_01;
```

### Aggregated Data

**Retention Period**: Indefinite (or configurable)

**Daily Aggregates**:
- Pre-computed daily metrics stored in `analytics_daily` table
- Retained even after raw events are deleted
- Enables long-term trend analysis
- Smaller storage footprint

**Example**:
```
Raw Events (January 2025): Deleted after 12 months
Aggregated Data (January 2025): Retained indefinitely
```

### User Data

**Authentication Sessions**:
- Retention: 24 hours (default)
- Automatically expired and deleted

**Email Preferences**:
- Retention: Until user unsubscribes or project is deleted
- Can be deleted on request

## Data Access & Control

### User Rights

**Right to Access**:
- View all data collected for your projects
- Export data in CSV or JSON format
- API access to all data

**Right to Rectification**:
- Update project settings
- Modify email preferences
- Correct inaccurate data

**Right to Erasure** ("Right to be Forgotten"):
- Delete individual projects (cascades to all events)
- Delete API keys
- Unsubscribe from email reports
- Request account deletion

**Right to Data Portability**:
- Export analytics data (CSV, JSON)
- Export custom events
- Export campaign data
- No vendor lock-in

**Right to Object**:
- Disable tracking (revoke API keys)
- Opt out of email reports
- Respect DNT settings

### Data Export

**Export Analytics**:
```bash
GET /api/v1/projects/:id/analytics/export?format=csv&startDate=2025-01-01&endDate=2025-01-31
```

**Export Events**:
```bash
GET /api/v1/projects/:id/events/export?format=json&startDate=2025-01-01&endDate=2025-01-31
```

**Export Campaigns**:
```bash
GET /api/v1/projects/:id/campaigns/export?format=csv&startDate=2025-01-01&endDate=2025-01-31
```

### Data Deletion

**Delete Project** (deletes all associated data):
```bash
DELETE /api/v1/projects/:id
```

**Cascading Deletion**:
- All events for the project
- All API keys
- All goals
- All email preferences
- All daily aggregates

**Immediate and Permanent**: Cannot be undone.

## Compliance

### GDPR (General Data Protection Regulation)

Analytics-Pulse is designed for GDPR compliance:

✅ **Lawful Basis**: Legitimate interest (website analytics)

✅ **Data Minimization**: Collect only necessary data

✅ **Purpose Limitation**: Data used only for analytics

✅ **Storage Limitation**: 12-month retention by default

✅ **Integrity & Confidentiality**: Encryption at rest and in transit

✅ **Accountability**: Documented privacy practices

✅ **Rights of Data Subjects**:
- Right to access
- Right to rectification
- Right to erasure
- Right to data portability
- Right to object

✅ **No Cross-Border Data Transfer** (single-region deployment)

### CCPA (California Consumer Privacy Act)

Analytics-Pulse complies with CCPA:

✅ **No Sale of Personal Information**: We never sell data

✅ **Right to Know**: Users can access all data

✅ **Right to Delete**: Users can delete all data

✅ **Right to Opt-Out**: Users can disable tracking (DNT)

✅ **Non-Discrimination**: No penalties for exercising rights

### ePrivacy Directive (Cookie Law)

✅ **No Cookies**: Uses `localStorage` instead

✅ **No Consent Required**: Anonymous analytics, no personal data

✅ **DNT Respect**: Honors Do Not Track settings

### HIPAA (Healthcare)

⚠️ **Not HIPAA Compliant**: Analytics-Pulse is not designed for protected health information (PHI). Do not use for healthcare applications that process PHI.

### PCI DSS (Payment Card Industry)

⚠️ **Not PCI Compliant**: Never send credit card data via custom events.

## Security Measures

### Encryption

**In Transit**:
- TLS 1.2+ for all HTTPS connections
- CloudFront CDN (automatic SSL)
- API Gateway (HTTPS only)

**At Rest**:
- RDS: AES-256 encryption (AWS KMS)
- S3: AES-256 encryption
- Secrets Manager: KMS encryption

### Access Control

**Authentication**:
- JWT tokens for management APIs
- API keys (bcrypt-hashed) for tracking
- Session management (database-backed)

**Authorization**:
- Project-level access control
- API keys scoped to projects
- Role-based access (coming soon)

### API Security

**Rate Limiting**:
- 10,000 requests/hour per API key
- Prevents abuse and DoS attacks
- Redis-backed rate limiter

**Input Validation**:
- Express-validator for all endpoints
- Payload size limits (10MB max)
- SQL injection prevention (parameterized queries)
- XSS prevention (input sanitization)

**CORS**:
- Configured origins only
- Credentials allowed for authenticated requests
- Preflight request handling

### Infrastructure Security

**Network Isolation**:
- VPC with private subnets
- Lambda in VPC (access to RDS only)
- Security groups (least privilege)
- No public RDS access

**Monitoring & Logging**:
- CloudWatch Logs (all API requests)
- CloudTrail (infrastructure changes)
- Automated security scanning (AWS Inspector)

**Incident Response**:
- Automated alerts (CloudWatch Alarms)
- Incident response plan
- Regular security audits

## Third-Party Services

Analytics-Pulse uses the following third-party services:

### AWS (Amazon Web Services)

**Services Used**:
- Lambda (compute)
- RDS PostgreSQL (database)
- S3 (storage)
- CloudFront (CDN)
- API Gateway (API hosting)
- Route 53 (DNS)
- ACM (SSL certificates)
- SES (email sending)
- Secrets Manager (credentials)
- CloudWatch (monitoring)

**Data Shared**: All data stored on AWS infrastructure

**Privacy Policy**: https://aws.amazon.com/privacy/

**DPA Available**: Yes (AWS GDPR Data Processing Addendum)

### GitHub (Optional, for CI/CD)

**Services Used**:
- GitHub Actions (deployment automation)
- GitHub Container Registry (Docker images)

**Data Shared**: Source code, build artifacts

**Privacy Policy**: https://docs.github.com/en/site-policy/privacy-policies/github-privacy-statement

### Pay Service (Authentication, Optional)

**Services Used**:
- User authentication
- Session management

**Data Shared**: Email address (for login)

**Privacy Policy**: https://pay.jeffreykeyser.net/privacy

### No Analytics/Tracking on Analytics-Pulse

Unlike other analytics platforms, Analytics-Pulse:
- ❌ Does NOT use Google Analytics
- ❌ Does NOT use third-party tracking pixels
- ❌ Does NOT embed social media widgets
- ❌ Does NOT use advertising networks

## User Rights

### How to Exercise Your Rights

**Access Your Data**:
1. Log in to Analytics-Pulse dashboard
2. Navigate to Projects → Export
3. Download data in CSV or JSON format

**Delete Your Data**:
1. Log in to Analytics-Pulse dashboard
2. Navigate to Projects → Settings
3. Click "Delete Project" (danger zone)
4. Confirm deletion

**Opt Out of Tracking**:
- Enable Do Not Track (DNT) in your browser
- Or revoke API keys for your project

**Unsubscribe from Emails**:
- Click "Unsubscribe" link in email footer
- Or disable email reports in project settings

**Request Account Deletion**:
- Contact: privacy@yourdomain.com
- Include: Email address, project IDs
- Response time: 30 days

### Data Breach Notification

In the event of a data breach:

1. **Investigation** (within 24 hours)
   - Identify scope of breach
   - Contain the breach
   - Assess risk to users

2. **Notification** (within 72 hours)
   - Email all affected users
   - Report to supervisory authority (if required)
   - Public disclosure (if large-scale)

3. **Remediation**
   - Implement fixes
   - Enhanced monitoring
   - Post-incident review

## Privacy Policy Template

### For Your Website

If you use Analytics-Pulse on your website, include this in your privacy policy:

---

**Website Analytics**

We use Analytics-Pulse, a privacy-focused web analytics platform, to understand how visitors use our website. Analytics-Pulse collects anonymous usage data to help us improve our site.

**Data Collected**:
- Pages you visit on our site
- How you arrived at our site (referrer)
- Your browser type and operating system
- Your approximate location (country and city)
- Your screen size and language preference

**Data NOT Collected**:
- We do NOT collect your name, email, or any personal information
- We do NOT use cookies or track you across different websites
- We do NOT sell or share your data with third parties
- Your IP address is hashed before storage and cannot be reversed

**Privacy Features**:
- Anonymous visitor tracking (random identifiers)
- No cookies or persistent tracking
- Do Not Track (DNT) respected
- GDPR and CCPA compliant

**Your Choices**:
- Enable "Do Not Track" in your browser to opt out
- Analytics-Pulse does not use cookies, so no cookie consent is required

**Analytics Provider**: Analytics-Pulse (self-hosted)
**Data Retention**: 12 months
**Data Location**: [Your AWS Region, e.g., United States (us-east-1)]

For more information about Analytics-Pulse privacy practices, visit: [Link to this PRIVACY.md]

---

## Contact

**Privacy Questions**: privacy@yourdomain.com

**Data Protection Officer** (if applicable): dpo@yourdomain.com

**Security Issues**: security@yourdomain.com

## Changes to This Policy

This privacy policy may be updated from time to time. Major changes will be announced via:
- Email notification
- Dashboard announcement
- GitHub releases

Last Updated: January 2025

---

**Summary**: Analytics-Pulse is built for privacy. We collect only what's necessary, store data securely, respect user rights, and comply with privacy regulations. Your data is yours, and we never sell it.
