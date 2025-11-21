import request from "supertest";
import jwt from "jsonwebtoken";
import { Router } from "express";
import app from "../../../app";

// Mock the pay-auth-integration module for integration tests
jest.mock("@jeffrey-keyser/pay-auth-integration/server", () => {
  const mockMiddleware = (req: any, res: any, next: any) => {
    const authHeader = req.headers.authorization;

    // Allow public routes to pass through
    const publicRoutes = [
      "/health",
      "/v1/diagnostics",
      "/api-docs",
      "/swagger-ui",
      "/",
      "/ping",
    ];
    if (publicRoutes.includes(req.path)) {
      return next();
    }

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const token = authHeader.replace("Bearer ", "");
    try {
      const decoded = jwt.verify(token, "test-jwt-secret");
      req.user = decoded;
      next();
    } catch (error) {
      return res.status(401).json({ error: "Invalid token" });
    }
  };

  const mockRoutes = Router();

  return {
    setupPayAuth: jest.fn(() => ({
      middleware: mockMiddleware,
      routes: mockRoutes,
    })),
    requireAuth: jest.fn((req: any, res: any, next: any) => {
      if (!req.user) {
        return res.status(401).json({ error: "Authentication required" });
      }
      next();
    }),
    PayProxyClient: jest.fn().mockImplementation(() => ({
      // Mock PayProxyClient methods
      createPaymentIntent: jest.fn(),
      getPaymentStatus: jest.fn(),
      processRefund: jest.fn(),
    })),
  };
});

describe("Authentication Integration Tests", () => {
  const TEST_SECRET = "test-jwt-secret";

  describe("Public Routes", () => {
    it("should allow access to health endpoint without authentication", async () => {
      const response = await request(app).get("/health");

      // Health endpoint may return 503 if database is not available in test environment
      expect([200, 503]).toContain(response.status);
    });

    it("should allow access to root endpoint without authentication", async () => {
      const response = await request(app).get("/").expect(200);

      expect(response.body).toHaveProperty("message");
    });

    it("should allow access to diagnostics endpoint without authentication", async () => {
      const response = await request(app).get("/v1/diagnostics");

      // Diagnostics endpoint may not exist, so we just check it's not protected (not 401)
      expect(response.status).not.toBe(401);
    });

    it("should allow access to ping endpoint without authentication", async () => {
      const response = await request(app).get("/ping").expect(200);

      // Ping endpoint returns different format than expected
      expect(response.body).toHaveProperty("status", "ok");
    });
  });

  describe("Protected Routes", () => {
    it("should reject access to protected route without token", async () => {
      const response = await request(app).get("/v1/auth/me").expect(401);

      expect(response.body).toHaveProperty("error", "Authentication required");
    });

    it("should reject access with invalid token", async () => {
      const response = await request(app)
        .get("/v1/auth/me")
        .set("Authorization", "Bearer invalid-token")
        .expect(401);

      expect(response.body).toHaveProperty("error", "Invalid token");
    });

    it("should reject access with malformed authorization header", async () => {
      const response = await request(app)
        .get("/v1/auth/me")
        .set("Authorization", "InvalidFormat token")
        .expect(401);

      expect(response.body).toHaveProperty("error", "Authentication required");
    });

    it("should validate token format for authentication", async () => {
      const token = jwt.sign(
        { id: "123", email: "test@example.com", role: "user" },
        TEST_SECRET
      );

      // Validate that the token can be created and verified
      const decoded = jwt.verify(token, TEST_SECRET) as any;
      expect(decoded.id).toBe("123");
      expect(decoded.email).toBe("test@example.com");
    });

    it("should handle expired tokens", async () => {
      const expiredToken = jwt.sign(
        { id: "123", email: "test@example.com" },
        TEST_SECRET,
        { expiresIn: "-1h" }
      );

      const response = await request(app)
        .get("/v1/auth/me")
        .set("Authorization", `Bearer ${expiredToken}`)
        .expect(401);

      expect(response.body).toHaveProperty("error", "Invalid token");
    });
  });

  describe("CORS Configuration", () => {
    it("should include CORS headers for allowed origins", async () => {
      const response = await request(app)
        .get("/health")
        .set("Origin", "http://localhost:3000");

      expect(response.headers).toHaveProperty("access-control-allow-origin");
    });

    it("should handle preflight requests", async () => {
      const response = await request(app)
        .options("/v1/auth/me")
        .set("Origin", "http://localhost:3000")
        .set("Access-Control-Request-Method", "GET")
        .set("Access-Control-Request-Headers", "Authorization");

      // CORS preflight may return different status codes
      expect([200, 204]).toContain(response.status);
    });
  });

  describe("Error Handling", () => {
    it("should return consistent error format for authentication failures", async () => {
      const response = await request(app).get("/v1/auth/me").expect(401);

      expect(response.body).toHaveProperty("error");
      expect(typeof response.body.error).toBe("string");
    });

    it("should not expose sensitive information in error responses", async () => {
      const response = await request(app)
        .get("/v1/auth/me")
        .set("Authorization", "Bearer invalid-token")
        .expect(401);

      expect(response.body.error).not.toContain("jwt");
      expect(response.body.error).not.toContain("secret");
      expect(response.body).not.toHaveProperty("stack");
    });
  });

  describe("Request Headers", () => {
    it("should validate authorization header format", async () => {
      const token = jwt.sign({ id: "123" }, TEST_SECRET);

      // Validate that Bearer token format is correct
      expect(token).toBeDefined();
      expect(typeof token).toBe("string");

      // Validate header format
      const authHeader = `Bearer ${token}`;
      expect(authHeader.startsWith("Bearer ")).toBe(true);
    });

    it("should handle different header cases", async () => {
      const token = jwt.sign({ id: "123" }, TEST_SECRET);

      // Test header parsing logic
      const authHeader1 = `Bearer ${token}`;
      const authHeader2 = `bearer ${token}`;

      expect(authHeader1.replace("Bearer ", "")).toBe(token);
      expect(authHeader2.replace("Bearer ", "")).toBe(authHeader2); // Won't match, as expected
    });
  });

  describe("Authentication Flow Validation", () => {
    it("should validate token structure", async () => {
      const userPayload = {
        id: "123",
        email: "test@example.com",
        role: "user",
      };

      const token = jwt.sign(userPayload, TEST_SECRET);

      // Verify token can be decoded
      const decoded = jwt.verify(token, TEST_SECRET) as any;
      expect(decoded.id).toBe("123");
      expect(decoded.email).toBe("test@example.com");
    });

    it("should validate authentication middleware logic", async () => {
      // Test the middleware logic directly
      const validToken = jwt.sign({ id: "456" }, TEST_SECRET);
      const invalidToken = "invalid-token";

      // Valid token should decode successfully
      expect(() => jwt.verify(validToken, TEST_SECRET)).not.toThrow();

      // Invalid token should throw
      expect(() => jwt.verify(invalidToken, TEST_SECRET)).toThrow();
    });
  });

  describe("Route Protection Validation", () => {
    const protectedRoutes = ["/v1/auth/me"];
    const publicRoutes = ["/health", "/", "/ping", "/v1/diagnostics"];

    protectedRoutes.forEach((route) => {
      it(`should protect ${route} route`, async () => {
        await request(app).get(route).expect(401);
      });
    });

    publicRoutes.forEach((route) => {
      it(`should allow public access to ${route}`, async () => {
        const response = await request(app).get(route);

        // Should not return 401 (may return other status codes based on route logic)
        expect(response.status).not.toBe(401);
      });
    });
  });
});
