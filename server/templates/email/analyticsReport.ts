import { ReportData, ReportType } from '../../types/models';

export interface AnalyticsReportTemplateData {
  projectName: string;
  reportType: ReportType;
  startDate: string;
  endDate: string;
  reportData: ReportData;
  unsubscribeUrl: string;
  appUrl: string;
}

/**
 * Generate HTML email template for analytics reports
 */
export function generateAnalyticsReportHtml(data: AnalyticsReportTemplateData): string {
  const {
    projectName,
    reportType,
    startDate,
    endDate,
    reportData,
    unsubscribeUrl,
    appUrl
  } = data;

  const { summary, topPages, topReferrers, devices, countries } = reportData;

  // Format numbers with commas
  const formatNumber = (num: number): string => {
    return num.toLocaleString('en-US');
  };

  // Format percentage
  const formatPercentage = (num: number): string => {
    return num.toFixed(1) + '%';
  };

  // Format duration (seconds to readable format)
  const formatDuration = (seconds: number): string => {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round(seconds % 60);
    return `${minutes}m ${remainingSeconds}s`;
  };

  // Generate top pages table rows
  const topPagesRows = topPages
    ?.slice(0, 5)
    .map(
      page => `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; font-size: 14px;">
          <div style="color: #111827; font-weight: 500; word-break: break-all;">
            ${page.url.length > 60 ? page.url.substring(0, 60) + '...' : page.url}
          </div>
        </td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right; color: #374151; font-size: 14px;">
          ${formatNumber(page.pageviews)}
        </td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right; color: #374151; font-size: 14px;">
          ${formatNumber(page.uniqueVisitors)}
        </td>
      </tr>
    `
    )
    .join('') || '<tr><td colspan="3" style="padding: 12px; text-align: center; color: #6b7280;">No data available</td></tr>';

  // Generate top referrers table rows
  const topReferrersRows = topReferrers
    ?.slice(0, 5)
    .map(
      referrer => `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; font-size: 14px;">
          <div style="color: #111827; font-weight: 500; word-break: break-all;">
            ${referrer.referrer === '(direct)' ? 'Direct / None' : referrer.referrer.length > 60 ? referrer.referrer.substring(0, 60) + '...' : referrer.referrer}
          </div>
        </td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right; color: #374151; font-size: 14px;">
          ${formatNumber(referrer.sessions)}
        </td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right; color: #374151; font-size: 14px;">
          ${formatNumber(referrer.uniqueVisitors)}
        </td>
      </tr>
    `
    )
    .join('') || '<tr><td colspan="3" style="padding: 12px; text-align: center; color: #6b7280;">No data available</td></tr>';

  // Generate device breakdown
  const devicesList = devices
    ?.slice(0, 3)
    .map(
      device => `
      <div style="margin-bottom: 8px;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
          <span style="color: #374151; font-size: 14px; text-transform: capitalize;">${device.deviceType}</span>
          <span style="color: #111827; font-weight: 600; font-size: 14px;">${formatPercentage(device.percentage)}</span>
        </div>
        <div style="background-color: #e5e7eb; height: 8px; border-radius: 4px; overflow: hidden;">
          <div style="background-color: #2563eb; height: 100%; width: ${device.percentage}%;"></div>
        </div>
      </div>
    `
    )
    .join('') || '<div style="color: #6b7280; font-size: 14px;">No data available</div>';

  // Generate countries list
  const countriesList = countries
    ?.slice(0, 5)
    .map(
      country => `
      <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
        <span style="color: #374151; font-size: 14px;">${country.country}</span>
        <span style="color: #111827; font-weight: 600; font-size: 14px;">${formatNumber(country.visitors)} (${formatPercentage(country.percentage)})</span>
      </div>
    `
    )
    .join('') || '<div style="color: #6b7280; font-size: 14px; padding: 8px 0;">No data available</div>';

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${projectName} - ${reportType.charAt(0).toUpperCase() + reportType.slice(1)} Analytics Report</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td style="padding: 40px 20px;">
        <!-- Main Container -->
        <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">

          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); padding: 32px 24px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">
                📊 Analytics Report
              </h1>
              <p style="margin: 12px 0 0 0; color: #dbeafe; font-size: 16px; font-weight: 500;">
                ${projectName}
              </p>
              <p style="margin: 8px 0 0 0; color: #bfdbfe; font-size: 14px;">
                ${startDate} - ${endDate}
              </p>
            </td>
          </tr>

          <!-- Summary Metrics -->
          <tr>
            <td style="padding: 32px 24px; background-color: #f9fafb;">
              <h2 style="margin: 0 0 20px 0; color: #111827; font-size: 20px; font-weight: 600;">
                Summary
              </h2>
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="width: 50%; padding: 16px; background-color: #ffffff; border-radius: 8px; border: 1px solid #e5e7eb;">
                    <div style="color: #6b7280; font-size: 13px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">
                      Pageviews
                    </div>
                    <div style="color: #111827; font-size: 28px; font-weight: 700;">
                      ${formatNumber(summary.pageviews)}
                    </div>
                  </td>
                  <td style="width: 16px;"></td>
                  <td style="width: 50%; padding: 16px; background-color: #ffffff; border-radius: 8px; border: 1px solid #e5e7eb;">
                    <div style="color: #6b7280; font-size: 13px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">
                      Visitors
                    </div>
                    <div style="color: #111827; font-size: 28px; font-weight: 700;">
                      ${formatNumber(summary.uniqueVisitors)}
                    </div>
                  </td>
                </tr>
                <tr><td colspan="3" style="height: 16px;"></td></tr>
                <tr>
                  <td style="width: 50%; padding: 16px; background-color: #ffffff; border-radius: 8px; border: 1px solid #e5e7eb;">
                    <div style="color: #6b7280; font-size: 13px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">
                      Sessions
                    </div>
                    <div style="color: #111827; font-size: 28px; font-weight: 700;">
                      ${formatNumber(summary.sessions)}
                    </div>
                  </td>
                  <td style="width: 16px;"></td>
                  <td style="width: 50%; padding: 16px; background-color: #ffffff; border-radius: 8px; border: 1px solid #e5e7eb;">
                    <div style="color: #6b7280; font-size: 13px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">
                      Bounce Rate
                    </div>
                    <div style="color: #111827; font-size: 28px; font-weight: 700;">
                      ${formatPercentage(summary.bounceRate)}
                    </div>
                  </td>
                </tr>
                <tr><td colspan="3" style="height: 16px;"></td></tr>
                <tr>
                  <td colspan="3" style="padding: 16px; background-color: #ffffff; border-radius: 8px; border: 1px solid #e5e7eb;">
                    <div style="color: #6b7280; font-size: 13px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">
                      Avg. Session Duration
                    </div>
                    <div style="color: #111827; font-size: 28px; font-weight: 700;">
                      ${formatDuration(summary.avgSessionDuration)}
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Top Pages -->
          <tr>
            <td style="padding: 32px 24px;">
              <h2 style="margin: 0 0 16px 0; color: #111827; font-size: 20px; font-weight: 600;">
                Top Pages
              </h2>
              <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
                <thead>
                  <tr style="background-color: #f9fafb;">
                    <th style="padding: 12px; text-align: left; color: #6b7280; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #e5e7eb;">
                      Page
                    </th>
                    <th style="padding: 12px; text-align: right; color: #6b7280; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #e5e7eb;">
                      Views
                    </th>
                    <th style="padding: 12px; text-align: right; color: #6b7280; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #e5e7eb;">
                      Visitors
                    </th>
                  </tr>
                </thead>
                <tbody>
                  ${topPagesRows}
                </tbody>
              </table>
            </td>
          </tr>

          <!-- Top Referrers -->
          <tr>
            <td style="padding: 0 24px 32px 24px;">
              <h2 style="margin: 0 0 16px 0; color: #111827; font-size: 20px; font-weight: 600;">
                Top Referrers
              </h2>
              <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
                <thead>
                  <tr style="background-color: #f9fafb;">
                    <th style="padding: 12px; text-align: left; color: #6b7280; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #e5e7eb;">
                      Source
                    </th>
                    <th style="padding: 12px; text-align: right; color: #6b7280; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #e5e7eb;">
                      Sessions
                    </th>
                    <th style="padding: 12px; text-align: right; color: #6b7280; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #e5e7eb;">
                      Visitors
                    </th>
                  </tr>
                </thead>
                <tbody>
                  ${topReferrersRows}
                </tbody>
              </table>
            </td>
          </tr>

          <!-- Device & Location Breakdown -->
          <tr>
            <td style="padding: 0 24px 32px 24px;">
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="width: 50%; vertical-align: top; padding: 20px; background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px;">
                    <h3 style="margin: 0 0 16px 0; color: #111827; font-size: 16px; font-weight: 600;">
                      Device Breakdown
                    </h3>
                    ${devicesList}
                  </td>
                  <td style="width: 16px;"></td>
                  <td style="width: 50%; vertical-align: top; padding: 20px; background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px;">
                    <h3 style="margin: 0 0 16px 0; color: #111827; font-size: 16px; font-weight: 600;">
                      Top Countries
                    </h3>
                    ${countriesList}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- CTA Button -->
          <tr>
            <td style="padding: 0 24px 32px 24px; text-align: center;">
              <a href="${appUrl}" style="display: inline-block; padding: 14px 32px; background-color: #2563eb; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px; box-shadow: 0 2px 4px rgba(37, 99, 235, 0.2);">
                View Full Dashboard
              </a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px; background-color: #f9fafb; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0 0 12px 0; color: #6b7280; font-size: 13px; line-height: 1.6; text-align: center;">
                This is your ${reportType} analytics report for <strong>${projectName}</strong>.
                <br>You're receiving this because you enabled ${reportType} email reports.
              </p>
              <p style="margin: 0; text-align: center;">
                <a href="${unsubscribeUrl}" style="color: #9ca3af; font-size: 12px; text-decoration: underline;">
                  Unsubscribe from these emails
                </a>
              </p>
            </td>
          </tr>

        </table>

        <!-- Spacer -->
        <div style="height: 20px;"></div>

        <!-- Email Client Info -->
        <p style="margin: 0; text-align: center; color: #9ca3af; font-size: 12px;">
          © ${new Date().getFullYear()} Analytics Pulse. All rights reserved.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

/**
 * Generate plain text version of analytics report
 */
export function generateAnalyticsReportText(data: AnalyticsReportTemplateData): string {
  const {
    projectName,
    reportType,
    startDate,
    endDate,
    reportData,
    unsubscribeUrl,
    appUrl
  } = data;

  const { summary, topPages, topReferrers, devices, countries } = reportData;

  const formatNumber = (num: number): string => num.toLocaleString('en-US');
  const formatPercentage = (num: number): string => num.toFixed(1) + '%';
  const formatDuration = (seconds: number): string => {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round(seconds % 60);
    return `${minutes}m ${remainingSeconds}s`;
  };

  let text = `
📊 ANALYTICS REPORT
${projectName}
${reportType.toUpperCase()} REPORT: ${startDate} - ${endDate}

===============================================

SUMMARY
-------
Pageviews:              ${formatNumber(summary.pageviews)}
Unique Visitors:        ${formatNumber(summary.uniqueVisitors)}
Sessions:               ${formatNumber(summary.sessions)}
Bounce Rate:            ${formatPercentage(summary.bounceRate)}
Avg. Session Duration:  ${formatDuration(summary.avgSessionDuration)}

===============================================

TOP PAGES
---------
`;

  topPages?.slice(0, 5).forEach((page, i) => {
    text += `${i + 1}. ${page.url}\n   ${formatNumber(page.pageviews)} views | ${formatNumber(page.uniqueVisitors)} visitors\n\n`;
  });

  text += `
===============================================

TOP REFERRERS
-------------
`;

  topReferrers?.slice(0, 5).forEach((ref, i) => {
    const source = ref.referrer === '(direct)' ? 'Direct / None' : ref.referrer;
    text += `${i + 1}. ${source}\n   ${formatNumber(ref.sessions)} sessions | ${formatNumber(ref.uniqueVisitors)} visitors\n\n`;
  });

  text += `
===============================================

DEVICE BREAKDOWN
----------------
`;

  devices?.slice(0, 3).forEach(device => {
    text += `${device.deviceType}: ${formatPercentage(device.percentage)} (${formatNumber(device.count)})\n`;
  });

  text += `
===============================================

TOP COUNTRIES
-------------
`;

  countries?.slice(0, 5).forEach((country, i) => {
    text += `${i + 1}. ${country.country}: ${formatNumber(country.visitors)} (${formatPercentage(country.percentage)})\n`;
  });

  text += `
===============================================

View Full Dashboard: ${appUrl}

---

This is your ${reportType} analytics report for ${projectName}.
You're receiving this because you enabled ${reportType} email reports.

Unsubscribe: ${unsubscribeUrl}

© ${new Date().getFullYear()} Analytics Pulse. All rights reserved.
  `.trim();

  return text;
}
