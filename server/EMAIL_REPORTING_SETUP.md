# Email Reporting System Setup

This document provides comprehensive guidance for setting up and using the Analytics Pulse email reporting system.

## Overview

The email reporting system automatically sends scheduled analytics reports to users via email. It supports:
- **Daily Reports**: Sent every day at 9:00 AM UTC
- **Weekly Reports**: Sent every Monday at 9:00 AM UTC
- **Monthly Reports**: Sent on the 1st of each month at 9:00 AM UTC
- **Test Reports**: Send on-demand to test email configuration

## Prerequisites

### 1. AWS SES Configuration

The system uses AWS SES (Simple Email Service) for sending emails. You must:

1. **Verify your sending domain or email address in AWS SES:**
   ```bash
   aws ses verify-email-identity --email-address noreply@example.com
   ```

2. **For production use, move out of SES Sandbox:**
   - Request production access in AWS SES console
   - This allows sending to any email address (not just verified ones)

3. **Set up SPF, DKIM, and DMARC records** for your domain to improve deliverability

### 2. Environment Variables

Add the following variables to your `.env` file:

```bash
# Email Service Configuration
EMAIL_ENABLED=true                           # Enable/disable email sending
EMAIL_FROM_ADDRESS=noreply@example.com       # From email (must be verified in SES)
EMAIL_FROM_NAME=Analytics Pulse              # Display name in emails
AWS_SES_REGION=us-east-1                     # AWS SES region
APP_BASE_URL=https://analytics.example.com   # Base URL for unsubscribe links

# Optional: Disable email reporting cron jobs
# ENABLE_EMAIL_REPORTING=false
```

### 3. Database Schema

Deploy the email reporting schema:

```bash
cd server/db
./deploy.sh
```

This creates the following tables:
- `email_preferences` - User email notification preferences
- `email_reports` - History of sent reports

## API Endpoints

### 1. Get Email Preferences

```bash
GET /api/v1/projects/{projectId}/email-preferences
```

Returns the current user's email preferences for the project.

### 2. Update Email Preferences

```bash
PUT /api/v1/projects/{projectId}/email-preferences
Content-Type: application/json

{
  "dailyReportEnabled": true,
  "weeklyReportEnabled": false,
  "monthlyReportEnabled": false,
  "dailyReportTime": "09:00:00",
  "timezone": "America/New_York"
}
```

Creates or updates email preferences. All fields are optional.

**Available Options:**
- `dailyReportEnabled` (boolean): Enable daily reports
- `weeklyReportEnabled` (boolean): Enable weekly reports
- `monthlyReportEnabled` (boolean): Enable monthly reports
- `dailyReportTime` (string): Time to send daily reports (HH:MM:SS format)
- `weeklyReportDay` (integer): Day of week for weekly reports (0=Sunday, 1=Monday, etc.)
- `weeklyReportTime` (string): Time to send weekly reports
- `monthlyReportDay` (integer): Day of month for monthly reports (1-28)
- `monthlyReportTime` (string): Time to send monthly reports
- `timezone` (string): User's timezone (e.g., "America/New_York", "Europe/London")

### 3. Send Test Report

```bash
POST /api/v1/projects/{projectId}/email-preferences/test
```

Sends a test email report to the current user immediately.

### 4. Get Report History

```bash
GET /api/v1/projects/{projectId}/email-preferences/reports?limit=20&offset=0
```

Returns history of sent email reports for the current user and project.

### 5. Unsubscribe

```bash
GET /api/v1/unsubscribe?token={unsubscribe_token}
```

Unsubscribe from all email reports using the token from the email footer.

## Email Template

Reports include:
- **Summary Metrics**: Pageviews, visitors, sessions, bounce rate, avg session duration
- **Top Pages**: Top 5 pages by pageviews
- **Top Referrers**: Top 5 traffic sources
- **Device Breakdown**: Desktop/mobile/tablet distribution
- **Top Countries**: Geographic distribution of visitors

## Cron Job Schedules

The system automatically starts three cron jobs when the server starts:

| Report Type | Schedule | Cron Expression | Description |
|------------|----------|-----------------|-------------|
| Daily | 9:00 AM UTC daily | `0 9 * * *` | Previous day's data |
| Weekly | 9:00 AM UTC on Mondays | `0 9 * * 1` | Last 7 days |
| Monthly | 9:00 AM UTC on 1st of month | `0 9 1 * *` | Last 30 days |

### Disabling Cron Jobs

To disable automatic email report sending:

```bash
# In .env file
ENABLE_EMAIL_REPORTING=false

# Or disable all email functionality
EMAIL_ENABLED=false
```

## Manual Report Sending

You can manually trigger reports from code:

```typescript
import emailReportingService from './services/emailReporting';

// Send a test report
await emailReportingService.sendTestReport(projectId, 'user@example.com');

// Manually trigger daily reports for all active users
await emailReportingService.sendDailyReports();

// Manually trigger weekly reports
await emailReportingService.sendWeeklyReports();

// Manually trigger monthly reports
await emailReportingService.sendMonthlyReports();
```

Or from cron functions:

```typescript
import { runDailyReportsNow, runWeeklyReportsNow, runMonthlyReportsNow } from './cron/emailReporting';

// Manually run daily reports
const results = await runDailyReportsNow();
console.log(`Sent: ${results.sent}, Failed: ${results.failed}`);
```

## Monitoring

### Check Email Report Status

Monitor report sending in the logs:

```bash
# Look for email reporting logs
grep "EmailReportingService" logs/app.log

# Look for cron job logs
grep "Cron.*email" logs/app.log
```

### Database Queries

```sql
-- Check active email preferences
SELECT user_email, daily_report_enabled, weekly_report_enabled, monthly_report_enabled
FROM email_preferences
WHERE is_active = true;

-- Check recent report sends
SELECT report_type, status, recipient_email, sent_at, error_message
FROM email_reports
ORDER BY created_at DESC
LIMIT 20;

-- Check report send statistics
SELECT
  report_type,
  status,
  COUNT(*) as count
FROM email_reports
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY report_type, status;
```

## Troubleshooting

### Emails Not Sending

1. **Check EMAIL_ENABLED is true** in `.env`
2. **Verify SES email/domain** is verified in AWS
3. **Check AWS credentials** have SES permissions
4. **Review error logs** in `email_reports` table
5. **Test AWS SES** manually:
   ```bash
   aws ses send-email \
     --from noreply@example.com \
     --destination ToAddresses=test@example.com \
     --message "Subject={Data=Test},Body={Text={Data=Test}}"
   ```

### Emails Going to Spam

1. **Set up SPF, DKIM, and DMARC** DNS records
2. **Move out of SES Sandbox** for production
3. **Use a verified domain** (not @gmail.com)
4. **Monitor bounce rates** in AWS SES console

### Wrong Schedule/Timezone

1. **Server runs in UTC** - all cron times are UTC
2. **User timezone** in preferences is for future features
3. **Adjust cron schedules** in `server/cron/emailReporting.ts` if needed

## Security Considerations

- **Unsubscribe tokens** are randomly generated and unique per user/project
- **IP addresses** are hashed and never included in emails
- **No PII** is stored beyond the user's email address
- **Reports are only sent** to verified authenticated users
- **Duplicate prevention** prevents accidental double-sends within 20 hours

## Future Enhancements

Potential improvements for the email reporting system:

- [ ] Custom report scheduling per user timezone
- [ ] Custom report content selection (choose which metrics to include)
- [ ] PDF attachment option for reports
- [ ] Anomaly detection alerts (traffic spikes/drops)
- [ ] Goal completion notifications
- [ ] Custom report templates
- [ ] Multi-project digest emails
- [ ] Slack/Discord integration for notifications

## Related Files

- **Schema**: `server/db/schema/007_create_email_reporting.sql`
- **DAL**: `server/dal/emailPreferences.ts`, `server/dal/emailReports.ts`
- **Services**: `server/services/emailReporting.ts`, `server/services/email.ts`
- **Templates**: `server/templates/email/analyticsReport.ts`
- **Routes**: `server/routes/emailPreferences.ts`
- **Controller**: `server/controllers/emailPreferences.ts`
- **Cron Jobs**: `server/cron/emailReporting.ts`
- **Types**: `server/types/models.ts`
