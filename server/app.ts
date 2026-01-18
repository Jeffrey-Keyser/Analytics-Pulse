import {
  createServerlessApp,
  createServerlessAppSync,
  createDatabaseHealthCheck,
  ServerConfig,
  ServerlessAppResult,
} from "@jeffrey-keyser/express-server-factory";
import type { Handler } from "aws-lambda";
import type { Application } from "express";

// Routes
import indexRouter from "./routes/index";
import v1Router from "./routes/versions/v1";

// Versioning middleware
import { versionNegotiation, legacyRedirect, validateVersion } from "./middleware/versioning";

// Configuration
import config from "./config/env";

// Log important configuration for debugging
const packageInfo = require("../package.json");
console.log("=== SERVER CONFIGURATION ===");
console.log("SERVICE:", "Analytics-Pulse");
console.log("VERSION:", packageInfo.version);
console.log("NODE_ENV:", config.NODE_ENV);
console.log("PORT:", config.PORT);
console.log("ORIGIN_BASE_URL:", config.ORIGIN_BASE_URL);
console.log("PAY_SERVICE_URL:", config.PAY_SERVICE_URL);
console.log("===============================");

// Database connection for session store and health checks
import pool from "./db/connection";

// Auth middleware imports
const { setupPayAuth } = require("@jeffrey-keyser/pay-auth-integration/server");

// Cron jobs (auto-start on import)
import "./cron/partitionMaintenance";
import "./cron/emailReporting";

// Validate Pay service configuration
if (!config.PAY_SERVICE_URL) {
  console.warn(
    "⚠️  PAY_SERVICE_URL not configured. Using default Pay service URL."
  );
}

// Configure Pay authentication with comprehensive error handling
let payAuthSetup;
try {
  const authConfig = {
    payUrl: config.PAY_SERVICE_URL || "https://pay.jeffreykeyser.net",
    debug: config.NODE_ENV === "development",
    cache: config.NODE_ENV === "production",
    enableAdminEndpoints: false,
    authPath: "/auth",
    publicRoutes: [
      "/health",
      "/api/v1",
      "/api/v1/diagnostics",
      "/api/v1/diagnostics/detailed",
      "/v1/diagnostics", // Legacy route (will redirect)
      "/v1/diagnostics/detailed", // Legacy route (will redirect)
      "/api/v1/track", // Event tracking endpoints (uses API key auth)
      "/api/v1/track/event",
      "/api/v1/track/batch",
      "/api/v1/errors", // Error reporting endpoints (uses API key auth)
      "/api/v1/errors/batch",
      "/api-docs",
      "/swagger-ui",
      "/",
      "/ping",
    ],
  };

  console.log("🔐 Configuring Pay authentication...");
  console.log("   Pay Service URL:", authConfig.payUrl);
  console.log("   Debug Mode:", authConfig.debug);
  console.log("   Cache Enabled:", authConfig.cache);
  console.log(
    "   Public Routes:",
    authConfig.publicRoutes.length,
    "configured"
  );

  payAuthSetup = setupPayAuth(authConfig);

  console.log("✅ Pay authentication configured successfully");
} catch (error) {
  const errorMessage = error instanceof Error ? error.message : "Unknown error";
  console.error("❌ Failed to configure Pay authentication:", errorMessage);
  console.error(
    "   Please check your Pay service configuration and network connectivity."
  );
  throw new Error(`Pay authentication setup failed: ${errorMessage}`);
}

// Create database health check
const databaseHealthCheck = createDatabaseHealthCheck(pool);

// Server configuration
const serverConfig: ServerConfig = {
  preset: "production",

  environment: {
    nodeEnv: config.NODE_ENV,
    port: config.PORT,
    trustProxy: config.NODE_ENV === "production",
  },

  middleware: {
    cors: {
      origin: config.CORS_ALLOWED_ORIGINS.split(",").map(url => url.trim()),
      credentials: true,
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
    },
    logger: {
      format: "dev",
    },
    json: {},
    urlencoded: { extended: true },
    cookieParser: {},
    session:
      config.NODE_ENV !== "test"
        ? {
            secret: config.SESSION_SECRET,
            store: "database",
            database: {
              pool: pool,
              tableName: "user_sessions",
              schemaName: "public",
              ttl: 24 * 60 * 60, // 24 hours in seconds
            },
            cookie: {
              secure: config.NODE_ENV === "production",
              httpOnly: true,
              maxAge: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
              sameSite: "lax",
            },
            resave: false,
            saveUninitialized: false,
          }
        : false,
  },

  auth: {
    enabled: true,
    provider: payAuthSetup.middleware,
  },

  healthCheck: {
    enabled: true,
    path: "/health",
    serviceName: "Analytics-Pulse API",
    version: "1.0.0",
    checks: {
      database: databaseHealthCheck,
    },
  },

  swagger: {
    enabled: config.NODE_ENV !== "test",
    title: "Analytics-Pulse API",
    version: "1.0.0",
    description:
      "Privacy-focused analytics platform API. Provides endpoints for managing analytics projects, API keys, event tracking, and analytics data retrieval. Dashboard endpoints use Bearer token authentication, while tracking endpoints use API key authentication.",
    apiPaths: ["./routes/**/*.ts", "./app.ts"],
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description: "JWT token for dashboard/management endpoints (e.g., /api/v1/projects, /api/v1/projects/:projectId/api-keys)",
      },
      apiKeyAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "API Key",
        description: "API key for tracking endpoints (format: ap_xxxxxxxxxxxxx). Provide as 'Authorization: Bearer ap_xxxxxxxxxxxxx' or as 'api_key' query parameter. Generate keys via POST /api/v1/projects/:projectId/api-keys",
      },
    },
// Note: tags are defined via @swagger JSDoc comments in route files
    // The tags property is not supported in express-server-factory v2.0.0
    servers: [
      {
        url: `http://localhost:${config.PORT}`,
        description: "Development server",
      },
    ],
  },

  routes: [
    { path: "/", router: indexRouter },
    { path: "/api/v1", router: v1Router },
    { path: "/auth", router: payAuthSetup.routes },
  ],

  errorHandling: {
    includeStackTrace: config.NODE_ENV === "development",
    logger: (error, req) => {
      console.error(`Error on ${req.method} ${req.path}:`, error);
    },
  },

  // Custom middleware for versioning and test environment
  customMiddleware: {
    before: [
      // Version negotiation - adds API-Version header
      versionNegotiation,
      // Legacy route redirects - /v1/* -> /api/v1/*
      legacyRedirect,
      // Version validation - ensures requested version is supported
      validateVersion([1]),
      // Test session mock (only in test environment)
      ...(config.NODE_ENV === "test"
        ? [
            (req: any, res: any, next: any) => {
              req.session = {
                id: "test-session-id",
                cookie: {},
                regenerate: (callback: any) => callback && callback(),
                destroy: (callback: any) => callback && callback(),
                reload: (callback: any) => callback && callback(),
                save: (callback: any) => callback && callback(),
                touch: () => {},
              };
              next();
            },
          ]
        : []),
    ],
  },
};

// =============================================================================
// ASYNC APP INITIALIZATION (v2.0.0)
// =============================================================================

// Cache for Lambda warm starts
let cachedApp: ServerlessAppResult | null = null;

/**
 * Initialize the application asynchronously.
 * Uses caching to optimize Lambda warm starts.
 */
async function initializeApp(): Promise<ServerlessAppResult> {
  if (cachedApp) {
    return cachedApp;
  }

  cachedApp = await createServerlessApp(serverConfig);
  return cachedApp;
}

/**
 * Lambda handler with async initialization.
 * Caches the app instance for subsequent warm start invocations.
 */
export const handler: Handler = async (event: any, context: any, callback: any) => {
  const app = await initializeApp();
  return app.lambdaHandler(event, context, callback);
};

/**
 * Get the Express app instance asynchronously.
 * Use this for local development server startup.
 */
export async function getExpressApp(): Promise<Application> {
  const app = await initializeApp();
  return app.express;
}

// =============================================================================
// SYNC EXPORTS FOR BACKWARD COMPATIBILITY
// =============================================================================

// For test environment and backward compatibility, create a sync version
// This avoids breaking existing imports that expect synchronous access
const syncApp = createServerlessAppSync(serverConfig);

// Export Express app for local development (sync for backward compat)
export const expressApp = syncApp.express;

// Default export for compatibility
export default syncApp.express;
