/**
 * CSV Converter Utility
 * Converts JSON arrays to CSV format with proper escaping
 */

/**
 * Escape CSV special characters
 * - Wraps values containing commas, quotes, or newlines in double quotes
 * - Escapes internal double quotes by doubling them
 */
function escapeCsvValue(value: any): string {
  if (value === null || value === undefined) {
    return '';
  }

  // Convert to string
  let str = String(value);

  // Check if value needs to be quoted
  const needsQuoting = str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r');

  if (needsQuoting) {
    // Escape double quotes by doubling them
    str = str.replace(/"/g, '""');
    // Wrap in quotes
    return `"${str}"`;
  }

  return str;
}

/**
 * Flatten nested objects into dot notation
 * Example: { user: { name: 'John' } } => { 'user.name': 'John' }
 */
function flattenObject(obj: any, prefix: string = ''): Record<string, any> {
  const flattened: Record<string, any> = {};

  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const value = obj[key];
      const newKey = prefix ? `${prefix}.${key}` : key;

      if (value !== null && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
        // Recursively flatten nested objects
        Object.assign(flattened, flattenObject(value, newKey));
      } else if (Array.isArray(value)) {
        // Convert arrays to JSON string
        flattened[newKey] = JSON.stringify(value);
      } else {
        flattened[newKey] = value;
      }
    }
  }

  return flattened;
}

/**
 * Extract all unique keys from an array of objects (including nested keys)
 */
function extractKeys(data: any[]): string[] {
  const keysSet = new Set<string>();

  data.forEach(item => {
    const flattened = flattenObject(item);
    Object.keys(flattened).forEach(key => keysSet.add(key));
  });

  return Array.from(keysSet);
}

/**
 * Convert JSON array to CSV format
 *
 * @param data - Array of objects to convert
 * @param headers - Optional array of header names. If not provided, headers are extracted from data
 * @returns CSV string
 */
export function convertToCSV(data: any[], headers?: string[]): string {
  if (!data || data.length === 0) {
    return headers ? headers.join(',') + '\n' : '';
  }

  // Extract headers if not provided
  const csvHeaders = headers || extractKeys(data);

  // Build CSV header row
  const headerRow = csvHeaders.map(escapeCsvValue).join(',');

  // Build CSV data rows
  const dataRows = data.map(item => {
    const flattened = flattenObject(item);
    return csvHeaders
      .map(header => escapeCsvValue(flattened[header]))
      .join(',');
  });

  return [headerRow, ...dataRows].join('\n');
}

/**
 * Convert analytics data to CSV format with custom headers
 */
export function convertAnalyticsToCSV(analyticsData: {
  summary: any;
  time_series: any[];
  top_pages: any[];
  top_referrers: any[];
  breakdowns: {
    devices: any[];
    browsers: any[];
    operating_systems: any[];
    countries: any[];
  };
}): string {
  const sections: string[] = [];

  // Summary section
  sections.push('=== SUMMARY ===');
  sections.push(convertToCSV([analyticsData.summary]));
  sections.push('');

  // Time series section
  sections.push('=== TIME SERIES ===');
  sections.push(convertToCSV(analyticsData.time_series));
  sections.push('');

  // Top pages section
  sections.push('=== TOP PAGES ===');
  sections.push(convertToCSV(analyticsData.top_pages));
  sections.push('');

  // Top referrers section
  sections.push('=== TOP REFERRERS ===');
  sections.push(convertToCSV(analyticsData.top_referrers));
  sections.push('');

  // Device breakdown
  sections.push('=== DEVICE BREAKDOWN ===');
  sections.push(convertToCSV(analyticsData.breakdowns.devices));
  sections.push('');

  // Browser breakdown
  sections.push('=== BROWSER BREAKDOWN ===');
  sections.push(convertToCSV(analyticsData.breakdowns.browsers));
  sections.push('');

  // OS breakdown
  sections.push('=== OS BREAKDOWN ===');
  sections.push(convertToCSV(analyticsData.breakdowns.operating_systems));
  sections.push('');

  // Country distribution
  sections.push('=== COUNTRY DISTRIBUTION ===');
  sections.push(convertToCSV(analyticsData.breakdowns.countries));

  return sections.join('\n');
}
