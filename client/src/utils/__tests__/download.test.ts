/**
 * Tests for download utility functions
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { downloadBlob, generateExportFilename, handleExportDownload } from '../download';

describe('downloadBlob', () => {
  let createObjectURLSpy: ReturnType<typeof vi.fn>;
  let revokeObjectURLSpy: ReturnType<typeof vi.fn>;
  let appendChildSpy: ReturnType<typeof vi.fn>;
  let removeChildSpy: ReturnType<typeof vi.fn>;
  let clickSpy: ReturnType<typeof vi.fn>;
  let mockLink: HTMLAnchorElement;

  beforeEach(() => {
    // Mock URL methods
    createObjectURLSpy = vi.fn().mockReturnValue('blob:mock-url');
    revokeObjectURLSpy = vi.fn();
    global.URL.createObjectURL = createObjectURLSpy;
    global.URL.revokeObjectURL = revokeObjectURLSpy;

    // Mock link click
    clickSpy = vi.fn();
    mockLink = document.createElement('a');
    mockLink.click = clickSpy;

    // Mock DOM methods after creating the element
    appendChildSpy = vi.spyOn(document.body, 'appendChild').mockImplementation(() => mockLink);
    removeChildSpy = vi.spyOn(document.body, 'removeChild').mockImplementation(() => mockLink);

    vi.spyOn(document, 'createElement').mockReturnValue(mockLink);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should create a URL for the blob', () => {
    const blob = new Blob(['test data'], { type: 'text/csv' });
    const filename = 'test.csv';

    downloadBlob(blob, filename);

    expect(createObjectURLSpy).toHaveBeenCalledWith(blob);
  });

  it('should create download link with correct filename', () => {
    const blob = new Blob(['test data'], { type: 'text/csv' });
    const filename = 'analytics-export.csv';

    downloadBlob(blob, filename);

    expect(mockLink.download).toBe(filename);
  });

  it('should set the blob URL as the link href', () => {
    const blob = new Blob(['test data'], { type: 'text/csv' });
    const filename = 'test.csv';

    downloadBlob(blob, filename);

    expect(mockLink.href).toBe('blob:mock-url');
  });

  it('should trigger download by clicking the link', () => {
    const blob = new Blob(['test data'], { type: 'text/csv' });
    const filename = 'test.csv';

    downloadBlob(blob, filename);

    expect(clickSpy).toHaveBeenCalledTimes(1);
  });

  it('should append link to document body', () => {
    const blob = new Blob(['test data'], { type: 'text/csv' });
    const filename = 'test.csv';

    downloadBlob(blob, filename);

    expect(appendChildSpy).toHaveBeenCalledWith(mockLink);
  });

  it('should clean up link after download', () => {
    const blob = new Blob(['test data'], { type: 'text/csv' });
    const filename = 'test.csv';

    downloadBlob(blob, filename);

    expect(removeChildSpy).toHaveBeenCalledWith(mockLink);
  });

  it('should revoke object URL after download', () => {
    const blob = new Blob(['test data'], { type: 'text/csv' });
    const filename = 'test.csv';

    downloadBlob(blob, filename);

    expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:mock-url');
  });

  it('should perform operations in correct order', () => {
    const blob = new Blob(['test data'], { type: 'text/csv' });
    const filename = 'test.csv';

    downloadBlob(blob, filename);

    const callOrder = [
      createObjectURLSpy,
      appendChildSpy,
      clickSpy,
      removeChildSpy,
      revokeObjectURLSpy,
    ];

    // Verify all functions were called
    callOrder.forEach((spy) => {
      expect(spy).toHaveBeenCalled();
    });
  });

  it('should handle different blob types', () => {
    const jsonBlob = new Blob(['{"data": "test"}'], { type: 'application/json' });
    const filename = 'test.json';

    downloadBlob(jsonBlob, filename);

    expect(createObjectURLSpy).toHaveBeenCalledWith(jsonBlob);
    expect(mockLink.download).toBe(filename);
  });
});

describe('generateExportFilename', () => {
  it('should generate filename with correct format for CSV', () => {
    const filename = generateExportFilename('analytics', 'csv');

    expect(filename).toMatch(/^analytics-pulse_analytics_\d{4}-\d{2}-\d{2}_\d{6}\.csv$/);
  });

  it('should generate filename with correct format for JSON', () => {
    const filename = generateExportFilename('events', 'json');

    expect(filename).toMatch(/^analytics-pulse_events_\d{4}-\d{2}-\d{2}_\d{6}\.json$/);
  });

  it('should include data type in filename', () => {
    const analyticsFilename = generateExportFilename('analytics', 'csv');
    const eventsFilename = generateExportFilename('events', 'csv');
    const campaignsFilename = generateExportFilename('campaigns', 'csv');

    expect(analyticsFilename).toContain('analytics');
    expect(eventsFilename).toContain('events');
    expect(campaignsFilename).toContain('campaigns');
  });

  it('should include timestamp in filename', () => {
    const filename = generateExportFilename('analytics', 'csv');

    // Should contain a timestamp in the correct format
    expect(filename).toMatch(/_\d{4}-\d{2}-\d{2}_\d{6}\./);
  });

  it('should include date range when provided', () => {
    const filename = generateExportFilename('analytics', 'csv', '2024-01-01', '2024-01-31');

    expect(filename).toContain('_2024-01-01_to_2024-01-31_');
  });

  it('should handle missing date range', () => {
    const filename = generateExportFilename('analytics', 'csv');

    // Should not contain any date range pattern
    expect(filename).not.toMatch(/_\d{4}-\d{2}-\d{2}_to_\d{4}-\d{2}-\d{2}_/);
    // Should contain the data type immediately followed by timestamp
    expect(filename).toMatch(/analytics-pulse_analytics_\d{4}-\d{2}-\d{2}_\d{6}\.csv/);
  });

  it('should handle partial date range (only start date)', () => {
    const filename = generateExportFilename('analytics', 'csv', '2024-01-01');

    // Should not include date range if endDate is missing
    expect(filename).not.toContain('2024-01-01_to_');
  });

  it('should handle partial date range (only end date)', () => {
    const filename = generateExportFilename('analytics', 'csv', undefined, '2024-01-31');

    // Should not include date range if startDate is missing
    expect(filename).not.toContain('_to_2024-01-31');
  });

  it('should generate complete filename with all components', () => {
    const filename = generateExportFilename('events', 'json', '2024-01-01', '2024-01-15');

    // Check format: analytics-pulse_events_2024-01-01_to_2024-01-15_YYYY-MM-DD_HHMMSS.json
    expect(filename).toMatch(/^analytics-pulse_events_2024-01-01_to_2024-01-15_\d{4}-\d{2}-\d{2}_\d{6}\.json$/);
  });

  it('should use correct file extension based on format', () => {
    const csvFilename = generateExportFilename('analytics', 'csv');
    const jsonFilename = generateExportFilename('analytics', 'json');

    expect(csvFilename).toMatch(/\.csv$/);
    expect(jsonFilename).toMatch(/\.json$/);
  });

  it('should generate unique filenames for different data types', () => {
    const analyticsFilename = generateExportFilename('analytics', 'csv', '2024-01-01', '2024-01-31');
    const eventsFilename = generateExportFilename('events', 'csv', '2024-01-01', '2024-01-31');
    const campaignsFilename = generateExportFilename('campaigns', 'csv', '2024-01-01', '2024-01-31');

    expect(analyticsFilename).not.toBe(eventsFilename);
    expect(eventsFilename).not.toBe(campaignsFilename);
    expect(analyticsFilename).not.toBe(campaignsFilename);
  });

  it('should generate different filenames at different times', async () => {
    const filename1 = generateExportFilename('analytics', 'csv');

    // Wait enough to ensure different timestamp (1+ second for different timestamp)
    await new Promise(resolve => setTimeout(resolve, 1100));

    const filename2 = generateExportFilename('analytics', 'csv');

    // Filenames should be different due to different timestamps
    expect(filename1).not.toBe(filename2);
  });
});

describe('handleExportDownload', () => {
  let createObjectURLSpy: ReturnType<typeof vi.fn>;
  let revokeObjectURLSpy: ReturnType<typeof vi.fn>;
  let appendChildSpy: ReturnType<typeof vi.fn>;
  let removeChildSpy: ReturnType<typeof vi.fn>;
  let clickSpy: ReturnType<typeof vi.fn>;
  let mockLink: HTMLAnchorElement;

  beforeEach(() => {
    // Mock URL methods
    createObjectURLSpy = vi.fn().mockReturnValue('blob:mock-url');
    revokeObjectURLSpy = vi.fn();
    global.URL.createObjectURL = createObjectURLSpy;
    global.URL.revokeObjectURL = revokeObjectURLSpy;

    // Mock link click
    clickSpy = vi.fn();
    mockLink = document.createElement('a');
    mockLink.click = clickSpy;

    // Mock DOM methods after creating the element
    appendChildSpy = vi.spyOn(document.body, 'appendChild').mockImplementation(() => mockLink);
    removeChildSpy = vi.spyOn(document.body, 'removeChild').mockImplementation(() => mockLink);

    vi.spyOn(document, 'createElement').mockReturnValue(mockLink);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should call downloadBlob with correct parameters', () => {
    const blob = new Blob(['test data'], { type: 'text/csv' });

    handleExportDownload(blob, 'analytics', 'csv', '2024-01-01', '2024-01-31');

    expect(mockLink.download).toMatch(/^analytics-pulse_analytics_2024-01-01_to_2024-01-31_\d{4}-\d{2}-\d{2}_\d{6}\.csv$/);
    expect(createObjectURLSpy).toHaveBeenCalledWith(blob);
    expect(clickSpy).toHaveBeenCalled();
  });

  it('should generate filename using generateExportFilename', () => {
    const blob = new Blob(['test data'], { type: 'text/csv' });

    handleExportDownload(blob, 'events', 'json', '2024-01-01', '2024-01-15');

    expect(mockLink.download).toMatch(/^analytics-pulse_events_2024-01-01_to_2024-01-15_\d{4}-\d{2}-\d{2}_\d{6}\.json$/);
  });

  it('should handle exports without date range', () => {
    const blob = new Blob(['test data'], { type: 'text/csv' });

    handleExportDownload(blob, 'analytics', 'csv');

    expect(mockLink.download).toMatch(/^analytics-pulse_analytics_\d{4}-\d{2}-\d{2}_\d{6}\.csv$/);
  });

  it('should trigger complete download flow', () => {
    const blob = new Blob(['test data'], { type: 'text/csv' });

    handleExportDownload(blob, 'analytics', 'csv');

    // Verify complete download flow
    expect(createObjectURLSpy).toHaveBeenCalledWith(blob);
    expect(appendChildSpy).toHaveBeenCalledWith(mockLink);
    expect(clickSpy).toHaveBeenCalled();
    expect(removeChildSpy).toHaveBeenCalledWith(mockLink);
    expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:mock-url');
  });

  it('should handle different data types', () => {
    const blob = new Blob(['test data'], { type: 'application/json' });

    handleExportDownload(blob, 'campaigns', 'json', '2024-01-01', '2024-01-31');

    expect(mockLink.download).toContain('campaigns');
    expect(mockLink.download).toMatch(/\.json$/);
  });

  it('should work with CSV format', () => {
    const blob = new Blob(['header1,header2\nvalue1,value2'], { type: 'text/csv' });

    handleExportDownload(blob, 'events', 'csv', '2024-01-01', '2024-01-31');

    expect(mockLink.download).toMatch(/\.csv$/);
    expect(createObjectURLSpy).toHaveBeenCalledWith(blob);
  });

  it('should work with JSON format', () => {
    const blob = new Blob(['{"data": []}'], { type: 'application/json' });

    handleExportDownload(blob, 'analytics', 'json', '2024-01-01', '2024-01-31');

    expect(mockLink.download).toMatch(/\.json$/);
    expect(createObjectURLSpy).toHaveBeenCalledWith(blob);
  });

  it('should handle large blobs', () => {
    const largeData = 'x'.repeat(1000000); // 1MB of data
    const blob = new Blob([largeData], { type: 'text/csv' });

    handleExportDownload(blob, 'analytics', 'csv');

    expect(createObjectURLSpy).toHaveBeenCalledWith(blob);
    expect(clickSpy).toHaveBeenCalled();
  });

  it('should clean up resources after download', () => {
    const blob = new Blob(['test data'], { type: 'text/csv' });

    handleExportDownload(blob, 'analytics', 'csv');

    // Verify cleanup
    expect(removeChildSpy).toHaveBeenCalledWith(mockLink);
    expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:mock-url');
  });
});
