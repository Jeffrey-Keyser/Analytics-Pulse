/**
 * Utility functions for the Analytics Pulse tracking library
 */

/**
 * Generate a random UUID v4
 */
export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Get or create a visitor ID stored in localStorage
 */
export function getVisitorId(): string {
  const STORAGE_KEY = '_ap_visitor_id';

  try {
    let visitorId = localStorage.getItem(STORAGE_KEY);

    if (!visitorId) {
      visitorId = generateUUID();
      localStorage.setItem(STORAGE_KEY, visitorId);
    }

    return visitorId;
  } catch (_error) {
    // localStorage might be unavailable (private browsing, etc.)
    // Generate a temporary ID for this session
    return generateUUID();
  }
}

/**
 * Get or create a session ID stored in sessionStorage
 */
export function getSessionId(): string {
  const STORAGE_KEY = '_ap_session_id';

  try {
    let sessionId = sessionStorage.getItem(STORAGE_KEY);

    if (!sessionId) {
      sessionId = generateUUID();
      sessionStorage.setItem(STORAGE_KEY, sessionId);
    }

    return sessionId;
  } catch (_error) {
    // sessionStorage might be unavailable
    return generateUUID();
  }
}

/**
 * Check if Do Not Track is enabled in the browser
 */
export function isDoNotTrackEnabled(): boolean {
  const { navigator } = window;
  const dnt = navigator.doNotTrack || (navigator as any).msDoNotTrack;

  return dnt === '1' || dnt === 'yes';
}

/**
 * Get current page URL (without query params for privacy)
 */
export function getPageUrl(includeQueryParams = false): string {
  const { location } = window;

  if (includeQueryParams) {
    return location.href;
  }

  return `${location.protocol}//${location.host}${location.pathname}`;
}

/**
 * Get referrer URL
 */
export function getReferrer(): string {
  return document.referrer || '';
}

/**
 * Get screen dimensions
 */
export function getScreenDimensions(): { width: number; height: number } {
  return {
    width: window.screen.width,
    height: window.screen.height,
  };
}

/**
 * Get user agent string
 */
export function getUserAgent(): string {
  return navigator.userAgent;
}

/**
 * Check if the given URL is an outbound link (external domain)
 */
export function isOutboundLink(url: string, currentDomain: string): boolean {
  try {
    const linkUrl = new URL(url, window.location.href);
    return linkUrl.hostname !== currentDomain && linkUrl.protocol.startsWith('http');
  } catch (_error) {
    return false;
  }
}

/**
 * Debounce function to limit rapid event firing
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };

    if (timeout !== null) {
      clearTimeout(timeout);
    }

    timeout = setTimeout(later, wait);
  };
}

/**
 * Deep merge two objects
 */
export function deepMerge<T extends Record<string, any>>(
  target: T,
  source: Partial<T>
): T {
  const output = { ...target };

  for (const key in source) {
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      const sourceValue = source[key];
      const targetValue = output[key];

      if (
        sourceValue &&
        typeof sourceValue === 'object' &&
        !Array.isArray(sourceValue) &&
        targetValue &&
        typeof targetValue === 'object' &&
        !Array.isArray(targetValue)
      ) {
        output[key] = deepMerge(targetValue, sourceValue);
      } else {
        output[key] = sourceValue as T[Extract<keyof T, string>];
      }
    }
  }

  return output;
}

/**
 * UTM parameter interface
 */
export interface UTMParams {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
}

/**
 * Extract UTM parameters from URL
 * @param url - URL to extract UTM parameters from (defaults to current page)
 * @returns Object with UTM parameters or null if none found
 */
export function extractUTMParams(url?: string): UTMParams | null {
  try {
    const urlObj = url ? new URL(url, window.location.href) : new URL(window.location.href);
    const params = new URLSearchParams(urlObj.search);

    const utmParams: UTMParams = {};
    let hasParams = false;

    // Extract UTM parameters
    const utmKeys: Array<keyof UTMParams> = [
      'utm_source',
      'utm_medium',
      'utm_campaign',
      'utm_term',
      'utm_content'
    ];

    for (const key of utmKeys) {
      const value = params.get(key);
      if (value) {
        utmParams[key] = value;
        hasParams = true;
      }
    }

    return hasParams ? utmParams : null;
  } catch (_error) {
    return null;
  }
}

/**
 * Store UTM parameters in sessionStorage for attribution
 * This allows attribution to persist across pageviews within the same session
 */
export function storeUTMParams(utmParams: UTMParams | null): void {
  const STORAGE_KEY = '_ap_utm_params';

  try {
    if (utmParams) {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(utmParams));
    }
  } catch (_error) {
    // sessionStorage might be unavailable
  }
}

/**
 * Get stored UTM parameters from sessionStorage
 */
export function getStoredUTMParams(): UTMParams | null {
  const STORAGE_KEY = '_ap_utm_params';

  try {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (_error) {
    // sessionStorage might be unavailable or invalid JSON
  }

  return null;
}
