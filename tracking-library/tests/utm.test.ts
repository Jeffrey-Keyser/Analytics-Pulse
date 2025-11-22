/**
 * Tests for UTM parameter extraction and storage
 */

import { extractUTMParams, storeUTMParams, getStoredUTMParams, UTMParams } from '../src/utils';

// Mock browser APIs
const mockLocalStorage: Record<string, string> = {};
const mockSessionStorage: Record<string, string> = {};

(global as any).window = {
  location: {
    href: 'https://example.com/page?utm_source=google&utm_medium=cpc&utm_campaign=summer_sale',
  },
};

(global as any).sessionStorage = {
  getItem: (key: string) => mockSessionStorage[key] || null,
  setItem: (key: string, value: string) => {
    mockSessionStorage[key] = value;
  },
  clear: () => {
    Object.keys(mockSessionStorage).forEach(key => delete mockSessionStorage[key]);
  },
};

describe('UTM Parameter Extraction', () => {
  beforeEach(() => {
    mockSessionStorage['_ap_utm_params'] = '';
    (global as any).sessionStorage.clear();
  });

  test('should extract UTM parameters from URL', () => {
    const url = 'https://example.com/page?utm_source=google&utm_medium=cpc&utm_campaign=summer_sale&utm_term=shoes&utm_content=ad1';
    const params = extractUTMParams(url);

    expect(params).not.toBeNull();
    expect(params?.utm_source).toBe('google');
    expect(params?.utm_medium).toBe('cpc');
    expect(params?.utm_campaign).toBe('summer_sale');
    expect(params?.utm_term).toBe('shoes');
    expect(params?.utm_content).toBe('ad1');
  });

  test('should extract partial UTM parameters', () => {
    const url = 'https://example.com/page?utm_source=facebook&utm_campaign=spring_promo';
    const params = extractUTMParams(url);

    expect(params).not.toBeNull();
    expect(params?.utm_source).toBe('facebook');
    expect(params?.utm_campaign).toBe('spring_promo');
    expect(params?.utm_medium).toBeUndefined();
    expect(params?.utm_term).toBeUndefined();
    expect(params?.utm_content).toBeUndefined();
  });

  test('should return null when no UTM parameters present', () => {
    const url = 'https://example.com/page?foo=bar';
    const params = extractUTMParams(url);

    expect(params).toBeNull();
  });

  test('should handle URLs with special characters', () => {
    const url = 'https://example.com/page?utm_source=google&utm_campaign=black%20friday&utm_content=banner%201';
    const params = extractUTMParams(url);

    expect(params).not.toBeNull();
    expect(params?.utm_source).toBe('google');
    expect(params?.utm_campaign).toBe('black friday');
    expect(params?.utm_content).toBe('banner 1');
  });

  test('should extract UTM parameters from window.location by default', () => {
    const params = extractUTMParams();

    expect(params).not.toBeNull();
    expect(params?.utm_source).toBe('google');
    expect(params?.utm_medium).toBe('cpc');
    expect(params?.utm_campaign).toBe('summer_sale');
  });

  test('should handle invalid URLs gracefully', () => {
    const params = extractUTMParams('not a url');

    expect(params).toBeNull();
  });
});

describe('UTM Parameter Storage', () => {
  beforeEach(() => {
    (global as any).sessionStorage.clear();
  });

  test('should store UTM parameters in sessionStorage', () => {
    const params: UTMParams = {
      utm_source: 'google',
      utm_medium: 'cpc',
      utm_campaign: 'test_campaign',
    };

    storeUTMParams(params);

    const stored = mockSessionStorage['_ap_utm_params'];
    expect(stored).toBeDefined();

    const parsed = JSON.parse(stored);
    expect(parsed.utm_source).toBe('google');
    expect(parsed.utm_medium).toBe('cpc');
    expect(parsed.utm_campaign).toBe('test_campaign');
  });

  test('should not store null UTM parameters', () => {
    storeUTMParams(null);

    const stored = mockSessionStorage['_ap_utm_params'];
    expect(stored).toBeUndefined();
  });

  test('should retrieve stored UTM parameters', () => {
    const params: UTMParams = {
      utm_source: 'facebook',
      utm_campaign: 'social_campaign',
    };

    storeUTMParams(params);
    const retrieved = getStoredUTMParams();

    expect(retrieved).not.toBeNull();
    expect(retrieved?.utm_source).toBe('facebook');
    expect(retrieved?.utm_campaign).toBe('social_campaign');
  });

  test('should return null when no parameters stored', () => {
    const retrieved = getStoredUTMParams();

    expect(retrieved).toBeNull();
  });

  test('should handle corrupted sessionStorage gracefully', () => {
    mockSessionStorage['_ap_utm_params'] = 'invalid json';

    const retrieved = getStoredUTMParams();

    expect(retrieved).toBeNull();
  });
});

describe('UTM Parameter Integration', () => {
  beforeEach(() => {
    (global as any).sessionStorage.clear();
  });

  test('should support first-touch attribution pattern', () => {
    // First visit with UTM parameters
    const firstParams = extractUTMParams(
      'https://example.com?utm_source=google&utm_campaign=first'
    );
    storeUTMParams(firstParams);

    // Subsequent visit without UTM parameters
    const secondParams = extractUTMParams('https://example.com/page2');

    // Should still have original parameters
    const stored = getStoredUTMParams();
    expect(stored?.utm_source).toBe('google');
    expect(stored?.utm_campaign).toBe('first');
    expect(secondParams).toBeNull();
  });

  test('should handle parameter updates', () => {
    // First visit
    const firstParams: UTMParams = {
      utm_source: 'google',
      utm_campaign: 'summer',
    };
    storeUTMParams(firstParams);

    // New visit with different parameters
    const secondParams: UTMParams = {
      utm_source: 'facebook',
      utm_campaign: 'fall',
    };
    storeUTMParams(secondParams);

    // Should have updated parameters
    const stored = getStoredUTMParams();
    expect(stored?.utm_source).toBe('facebook');
    expect(stored?.utm_campaign).toBe('fall');
  });
});
