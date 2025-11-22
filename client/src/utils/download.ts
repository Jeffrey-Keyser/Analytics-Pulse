/**
 * Download utility functions for file exports
 */

import { format as formatDate } from 'date-fns';
import { ExportFormat, DataType } from '../models/export';

/**
 * Triggers a browser download for a given Blob
 * @param blob - The Blob to download
 * @param filename - The filename for the download
 */
export function downloadBlob(blob: Blob, filename: string): void {
  // Create a URL for the blob
  const url = window.URL.createObjectURL(blob);

  // Create a temporary anchor element
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;

  // Append to body, click, and remove
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Clean up the URL object
  window.URL.revokeObjectURL(url);
}

/**
 * Generates a filename for export downloads
 * @param dataType - Type of data being exported
 * @param format - Export format (csv or json)
 * @param startDate - Optional start date for the export
 * @param endDate - Optional end date for the export
 * @returns A formatted filename with timestamp
 */
export function generateExportFilename(
  dataType: DataType,
  format: ExportFormat,
  startDate?: string,
  endDate?: string
): string {
  const timestamp = formatDate(new Date(), 'yyyy-MM-dd_HHmmss');
  const dateRange = startDate && endDate ? `_${startDate}_to_${endDate}` : '';

  return `analytics-pulse_${dataType}${dateRange}_${timestamp}.${format}`;
}

/**
 * Handles the complete export download process
 * @param blob - The Blob to download
 * @param dataType - Type of data being exported
 * @param format - Export format (csv or json)
 * @param startDate - Optional start date for the export
 * @param endDate - Optional end date for the export
 */
export function handleExportDownload(
  blob: Blob,
  dataType: DataType,
  format: ExportFormat,
  startDate?: string,
  endDate?: string
): void {
  const filename = generateExportFilename(dataType, format, startDate, endDate);
  downloadBlob(blob, filename);
}
