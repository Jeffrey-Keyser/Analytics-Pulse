import {
  createServerlessApp,
  createDatabaseHealthCheck,
  ServerConfig,
} from "@jeffrey-keyser/express-server-factory";

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
console.log("SERVICE:", "ServerlessWebTemplate");
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
    serviceName: "Myrrs API",
    version: "1.0.0",
    checks: {
      database: databaseHealthCheck,
    },
  },

  swagger: {
    enabled: config.NODE_ENV !== "test",
    title: "ServerlessWebTemplate API",
    version: "1.0.0",
    description:
      "API documentation for the ServerlessWebTemplate backend services.",
    apiPaths: ["./routes/**/*.ts", "./app.ts"],
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
      },
    },
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

// Create the serverless app
const app = createServerlessApp(serverConfig);

// Export Lambda handler
export const handler = app.lambdaHandler;

// Export Express app for local development
export const expressApp = app.express;

// Default export for compatibility
export default app.express;
