import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import {
  validateConfig as validateDatabaseConfig,
  type DatabaseConfig,
} from "@jeffrey-keyser/database-base-config";

// Detect if running in Docker container
const isDocker = fs.existsSync("/.dockerenv") || process.env.RUNNING_IN_DOCKER === "true";

// Load appropriate .env file based on environment
if (isDocker) {
  const dockerEnvPath = path.join(__dirname, "..", ".env.docker");
  if (fs.existsSync(dockerEnvPath)) {
    console.log("🐳 Loading Docker environment configuration from .env.docker");
    dotenv.config({ path: dockerEnvPath });
  } else {
    console.warn("⚠️  Docker environment detected but .env.docker not found, falling back to .env");
    dotenv.config();
  }
} else {
  dotenv.config();
}

interface AppConfig {
  NODE_ENV: "development" | "production" | "test";
  PORT: number;
  DATABASE_HOST: string;
  DATABASE_NAME: string;
  DATABASE_USER: string;
  DATABASE_PASSWORD: string;
  DATABASE_PORT: number;
  DATABASE_SSL: string;
  DATABASE_POOL_MAX: string;
  DATABASE_POOL_MIN: string;
  DATABASE_POOL_ACQUIRE_TIMEOUT: string;
  DATABASE_POOL_IDLE_TIMEOUT: string;
  ORIGIN_BASE_URL: string;
  CORS_ALLOWED_ORIGINS: string;
  SESSION_SECRET: string;
  JWT_SECRET: string;
  IP_HASH_SALT: string;
  PAY_SERVICE_URL: string;
  // Optional fields - not validated as required
  PAY_SERVICE_TOKEN?: string;
  REDIS_URL?: string;
  REDIS_HOST?: string;
  REDIS_PORT: number;
  REDIS_PASSWORD?: string;
  REDIS_DB: number;
  ENABLE_QUERY_MONITORING: boolean;
  SLOW_QUERY_THRESHOLD_MS: number;
  databaseConfig: DatabaseConfig;
}

function validateAndLoadConfig(): AppConfig {
  const nodeEnv = process.env.NODE_ENV;
  if (!nodeEnv || !["development", "production", "test"].includes(nodeEnv)) {
    throw new Error(
      "NODE_ENV must be set to development, production, or test."
    );
  }

  const portString = process.env.PORT || "3001";
  const port = parseInt(portString, 10);
  if (isNaN(port)) {
    throw new Error("PORT must be a valid number.");
  }

  // Validate database configuration using the package
  // Support both DATABASE_* and DB_* prefixed environment variables
  // Map DB_SSLMODE to DATABASE_SSL (convert "require" to "true", "disable" to "false")
  const dbSslMode = process.env.DB_SSLMODE || process.env.DATABASE_SSLMODE;
  const databaseSsl = dbSslMode === "require" || dbSslMode === "verify-ca" || dbSslMode === "verify-full"
    ? "true"
    : dbSslMode === "disable"
    ? "false"
    : process.env.DATABASE_SSL || (nodeEnv === "production" ? "true" : "false");

  const databaseConfig = validateDatabaseConfig({
    DATABASE_HOST: process.env.DATABASE_HOST || process.env.DB_HOST,
    DATABASE_NAME: process.env.DATABASE_NAME || process.env.DB_NAME,
    DATABASE_USER: process.env.DATABASE_USER || process.env.DB_USER,
    DATABASE_PASSWORD: process.env.DATABASE_PASSWORD || process.env.DB_PASSWORD,
    DATABASE_PORT: process.env.DATABASE_PORT || process.env.DB_PORT,
    DATABASE_SSL: databaseSsl,
    DATABASE_POOL_MAX: "5",
    DATABASE_POOL_MIN: "0",
    DATABASE_POOL_ACQUIRE_TIMEOUT: "30000",
    DATABASE_POOL_IDLE_TIMEOUT: "10000",
  });

  const config: AppConfig = {
    NODE_ENV: nodeEnv as AppConfig["NODE_ENV"],
    PORT: port,
    DATABASE_HOST: databaseConfig.host,
    DATABASE_NAME: databaseConfig.database,
    DATABASE_USER: databaseConfig.user,
    DATABASE_PASSWORD: databaseConfig.password,
    DATABASE_PORT: databaseConfig.port,
    DATABASE_SSL: databaseConfig.ssl ? "true" : "false",
    DATABASE_POOL_MAX: process.env.DATABASE_POOL_MAX || "20",
    DATABASE_POOL_MIN: process.env.DATABASE_POOL_MIN || "2",
    DATABASE_POOL_ACQUIRE_TIMEOUT: process.env.DATABASE_POOL_ACQUIRE_TIMEOUT || "30000",
    DATABASE_POOL_IDLE_TIMEOUT: process.env.DATABASE_POOL_IDLE_TIMEOUT || "10000",
    ORIGIN_BASE_URL: process.env.ORIGIN_BASE_URL || "",
    CORS_ALLOWED_ORIGINS: process.env.CORS_ALLOWED_ORIGINS || process.env.ORIGIN_BASE_URL || "http://localhost:3000",
    SESSION_SECRET: process.env.SESSION_SECRET || "",
    JWT_SECRET: process.env.JWT_SECRET || "",
    IP_HASH_SALT: process.env.IP_HASH_SALT || "",
    PAY_SERVICE_URL:
      process.env.PAY_SERVICE_URL || "https://pay.jeffreykeyser.net",
    PAY_SERVICE_TOKEN: process.env.PAY_SERVICE_TOKEN,
    REDIS_URL: process.env.REDIS_URL,
    REDIS_HOST: process.env.REDIS_HOST,
    REDIS_PORT: parseInt(process.env.REDIS_PORT || "6379", 10),
    REDIS_PASSWORD: process.env.REDIS_PASSWORD,
    REDIS_DB: parseInt(process.env.REDIS_DB || "0", 10),
    ENABLE_QUERY_MONITORING: process.env.ENABLE_QUERY_MONITORING !== "false",
    SLOW_QUERY_THRESHOLD_MS: parseInt(process.env.SLOW_QUERY_THRESHOLD_MS || "100", 10),
    databaseConfig,
  };

  // Define required fields for validation
  // Note: PAY_SERVICE_TOKEN and databaseConfig are explicitly excluded (optional)
  const requiredFields: Array<
    keyof Omit<
      AppConfig,
      "databaseConfig" | "PAY_SERVICE_TOKEN"
    >
  > = ["ORIGIN_BASE_URL", "CORS_ALLOWED_ORIGINS", "SESSION_SECRET", "JWT_SECRET", "IP_HASH_SALT", "PAY_SERVICE_URL"];

  // Validate required fields
  for (const field of requiredFields) {
    if (
      config[field] === undefined ||
      config[field] === null ||
      config[field] === ""
    ) {
      throw new Error(
        `Missing required environment variable: ${String(field)}\n\n` +
        `Fix: Run ./setup-project.sh (auto-generates secrets)\n` +
        `Or:  openssl rand -base64 32`
      );
    }
  }

  // Validate secrets aren't placeholder values
  if (config.SESSION_SECRET === "CHANGE_ME" || config.JWT_SECRET === "CHANGE_ME" || config.IP_HASH_SALT === "CHANGE_ME") {
    throw new Error(
      `SESSION_SECRET, JWT_SECRET, or IP_HASH_SALT still set to placeholder value.\n\n` +
      `Fix: Run ./setup-project.sh (auto-generates secrets)\n` +
      `Or:  openssl rand -base64 32`
    );
  }

  // Validate Pay service URL format
  if (config.PAY_SERVICE_URL && !config.PAY_SERVICE_URL.match(/^https?:\/\//)) {
    throw new Error("PAY_SERVICE_URL must be a valid HTTP/HTTPS URL");
  }

  // Validate session secret strength in production
  if (nodeEnv === "production" && config.SESSION_SECRET.length < 32) {
    console.warn(
      "⚠️  SESSION_SECRET should be at least 32 characters long in production"
    );
  }

  // Validate JWT secret strength in production
  if (nodeEnv === "production" && config.JWT_SECRET.length < 32) {
    console.warn(
      "⚠️  JWT_SECRET should be at least 32 characters long in production"
    );
  }

  // Validate IP hash salt strength in production
  if (nodeEnv === "production" && config.IP_HASH_SALT.length < 32) {
    console.warn(
      "⚠️  IP_HASH_SALT should be at least 32 characters long in production"
    );
  }

  return config;
}

const config = validateAndLoadConfig();
export default config;
