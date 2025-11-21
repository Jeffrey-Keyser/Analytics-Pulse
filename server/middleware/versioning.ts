import { Request, Response, NextFunction } from 'express';

// Extend Express Request type to include apiVersion
declare global {
  namespace Express {
    interface Request {
      apiVersion?: number;
    }
  }
}

/**
 * Version negotiation middleware
 *
 * Reads the Accept-Version header and sets req.apiVersion
 * Adds API-Version response header
 * Defaults to version 1 if not specified
 *
 * @example
 * // Client sends:
 * Accept-Version: 1
 *
 * // Response includes:
 * API-Version: 1
 */
export function versionNegotiation(req: Request, res: Response, next: NextFunction): void {
  // Read version from header
  const acceptVersion = req.headers['accept-version'];

  // Parse version number (default to 1)
  let version = 1;
  if (acceptVersion) {
    const parsed = parseInt(acceptVersion.toString(), 10);
    if (!isNaN(parsed) && parsed > 0) {
      version = parsed;
    }
  }

  // Set version on request for use in routes
  req.apiVersion = version;

  // Add API-Version to response headers
  res.setHeader('API-Version', version.toString());

  next();
}

/**
 * Legacy route redirect middleware
 *
 * Redirects old route patterns to new versioned routes:
 * - /v1/auth/* -> /api/v1/auth/*
 * - /v1/diagnostics/* -> /api/v1/diagnostics/*
 *
 * Uses 301 (Permanent Redirect) for SEO and caching benefits
 * Preserves query parameters and HTTP method intent
 */
export function legacyRedirect(req: Request, res: Response, next: NextFunction): void {
  const path = req.path;

  // Check if this is a legacy route pattern
  if (path.startsWith('/v1/')) {
    // Extract the part after /v1/
    const remainder = path.substring(4); // Remove '/v1/'

    // Build new path with /api/v1/ prefix
    const newPath = `/api/v1/${remainder}`;

    // Preserve query parameters
    const queryString = req.url.includes('?')
      ? req.url.substring(req.url.indexOf('?'))
      : '';

    // Perform 301 redirect
    return res.redirect(301, `${newPath}${queryString}`);
  }

  // Not a legacy route, continue
  next();
}

/**
 * Version validator middleware
 *
 * Validates that the requested API version is supported
 * Returns 404 with helpful message if version is not found
 *
 * @param supportedVersions - Array of supported version numbers
 */
export function validateVersion(supportedVersions: number[]) {
  return (req: Request, res: Response, next: NextFunction): void | any => {
    // Extract version from URL path (e.g., /api/v1/ -> 1)
    const match = req.path.match(/^\/api\/v(\d+)\//);

    if (match) {
      const requestedVersion = parseInt(match[1], 10);

      if (!supportedVersions.includes(requestedVersion)) {
        return res.status(404).json({
          error: 'VERSION_NOT_FOUND',
          message: `API version ${requestedVersion} is not supported`,
          supportedVersions: supportedVersions,
          requestedVersion: requestedVersion
        });
      }
    }

    next();
  };
}

/**
 * Deprecation warning middleware
 *
 * Adds deprecation headers for versions that will be sunset
 * Useful for communicating to clients that they should migrate
 *
 * @param version - The deprecated version number
 * @param sunsetDate - ISO date string when version will be removed
 * @param migrationUrl - URL with migration guide
 */
export function deprecationWarning(version: number, sunsetDate: string, migrationUrl?: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    // Check if this request is for the deprecated version
    const match = req.path.match(/^\/api\/v(\d+)\//);

    if (match && parseInt(match[1], 10) === version) {
      // Add deprecation headers
      res.setHeader('Deprecation', 'true');
      res.setHeader('Sunset', sunsetDate);

      if (migrationUrl) {
        res.setHeader('Link', `<${migrationUrl}>; rel="deprecation"`);
      }
    }

    next();
  };
}
