import { Request, Response, NextFunction } from 'express';
import {
  versionNegotiation,
  legacyRedirect,
  validateVersion,
  deprecationWarning
} from '../../../middleware/versioning';

describe('Versioning Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;

  beforeEach(() => {
    mockRequest = {
      headers: {},
      path: '/',
      url: '/',
    };
    mockResponse = {
      setHeader: jest.fn(),
      redirect: jest.fn(),
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    nextFunction = jest.fn();
  });

  describe('versionNegotiation', () => {
    it('should set default API version to 1 when no Accept-Version header', () => {
      versionNegotiation(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockRequest.apiVersion).toBe(1);
      expect(mockResponse.setHeader).toHaveBeenCalledWith('API-Version', '1');
      expect(nextFunction).toHaveBeenCalled();
    });

    it('should use version from Accept-Version header', () => {
      mockRequest.headers = { 'accept-version': '2' };

      versionNegotiation(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockRequest.apiVersion).toBe(2);
      expect(mockResponse.setHeader).toHaveBeenCalledWith('API-Version', '2');
      expect(nextFunction).toHaveBeenCalled();
    });

    it('should handle invalid version numbers and default to 1', () => {
      mockRequest.headers = { 'accept-version': 'invalid' };

      versionNegotiation(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockRequest.apiVersion).toBe(1);
      expect(mockResponse.setHeader).toHaveBeenCalledWith('API-Version', '1');
      expect(nextFunction).toHaveBeenCalled();
    });

    it('should reject negative version numbers and default to 1', () => {
      mockRequest.headers = { 'accept-version': '-1' };

      versionNegotiation(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockRequest.apiVersion).toBe(1);
      expect(mockResponse.setHeader).toHaveBeenCalledWith('API-Version', '1');
      expect(nextFunction).toHaveBeenCalled();
    });

    it('should reject zero version number and default to 1', () => {
      mockRequest.headers = { 'accept-version': '0' };

      versionNegotiation(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockRequest.apiVersion).toBe(1);
      expect(mockResponse.setHeader).toHaveBeenCalledWith('API-Version', '1');
      expect(nextFunction).toHaveBeenCalled();
    });
  });

  describe('legacyRedirect', () => {
    it('should redirect /v1/auth/me to /api/v1/auth/me', () => {
      (mockRequest as any).path = '/v1/auth/me';
      (mockRequest as any).url = '/v1/auth/me';

      legacyRedirect(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockResponse.redirect).toHaveBeenCalledWith(301, '/api/v1/auth/me');
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should redirect /v1/diagnostics/detailed to /api/v1/diagnostics/detailed', () => {
      (mockRequest as any).path = '/v1/diagnostics/detailed';
      (mockRequest as any).url = '/v1/diagnostics/detailed';

      legacyRedirect(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockResponse.redirect).toHaveBeenCalledWith(301, '/api/v1/diagnostics/detailed');
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should preserve query parameters in redirect', () => {
      (mockRequest as any).path = '/v1/auth/me';
      (mockRequest as any).url = '/v1/auth/me?include=profile';

      legacyRedirect(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockResponse.redirect).toHaveBeenCalledWith(301, '/api/v1/auth/me?include=profile');
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should not redirect non-legacy routes', () => {
      (mockRequest as any).path = '/api/v1/auth/me';
      (mockRequest as any).url = '/api/v1/auth/me';

      legacyRedirect(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockResponse.redirect).not.toHaveBeenCalled();
      expect(nextFunction).toHaveBeenCalled();
    });

    it('should not redirect root routes', () => {
      (mockRequest as any).path = '/';
      (mockRequest as any).url = '/';

      legacyRedirect(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockResponse.redirect).not.toHaveBeenCalled();
      expect(nextFunction).toHaveBeenCalled();
    });

    it('should not redirect /auth routes', () => {
      (mockRequest as any).path = '/auth/login';
      (mockRequest as any).url = '/auth/login';

      legacyRedirect(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockResponse.redirect).not.toHaveBeenCalled();
      expect(nextFunction).toHaveBeenCalled();
    });
  });

  describe('validateVersion', () => {
    it('should allow supported versions', () => {
      (mockRequest as any).path = '/api/v1/auth/me';
      const middleware = validateVersion([1, 2]);

      middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should reject unsupported versions', () => {
      (mockRequest as any).path = '/api/v3/auth/me';
      const middleware = validateVersion([1, 2]);

      middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'VERSION_NOT_FOUND',
        message: 'API version 3 is not supported',
        supportedVersions: [1, 2],
        requestedVersion: 3
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should allow non-versioned routes', () => {
      (mockRequest as any).path = '/health';
      const middleware = validateVersion([1]);

      middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });
  });

  describe('deprecationWarning', () => {
    it('should add deprecation headers for deprecated versions', () => {
      (mockRequest as any).path = '/api/v1/auth/me';
      const sunsetDate = '2025-12-31T00:00:00Z';
      const migrationUrl = 'https://docs.example.com/migration';
      const middleware = deprecationWarning(1, sunsetDate, migrationUrl);

      middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockResponse.setHeader).toHaveBeenCalledWith('Deprecation', 'true');
      expect(mockResponse.setHeader).toHaveBeenCalledWith('Sunset', sunsetDate);
      expect(mockResponse.setHeader).toHaveBeenCalledWith('Link', `<${migrationUrl}>; rel="deprecation"`);
      expect(nextFunction).toHaveBeenCalled();
    });

    it('should not add deprecation headers for non-deprecated versions', () => {
      (mockRequest as any).path = '/api/v2/auth/me';
      const sunsetDate = '2025-12-31T00:00:00Z';
      const middleware = deprecationWarning(1, sunsetDate);

      middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockResponse.setHeader).not.toHaveBeenCalled();
      expect(nextFunction).toHaveBeenCalled();
    });

    it('should work without migration URL', () => {
      (mockRequest as any).path = '/api/v1/auth/me';
      const sunsetDate = '2025-12-31T00:00:00Z';
      const middleware = deprecationWarning(1, sunsetDate);

      middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockResponse.setHeader).toHaveBeenCalledWith('Deprecation', 'true');
      expect(mockResponse.setHeader).toHaveBeenCalledWith('Sunset', sunsetDate);
      expect(mockResponse.setHeader).toHaveBeenCalledTimes(2);
      expect(nextFunction).toHaveBeenCalled();
    });
  });
});
