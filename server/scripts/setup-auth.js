#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

console.log("🔐 ServerlessWebTemplate Authentication Setup");
console.log("============================================\n");

// Generate secure random secrets
function generateSecret(length = 64) {
  return crypto.randomBytes(length).toString("hex");
}

// Check if .env file exists
const envPath = path.join(__dirname, "..", ".env");
const envExamplePath = path.join(__dirname, "..", ".env.example");

if (!fs.existsSync(envPath)) {
  if (fs.existsSync(envExamplePath)) {
    console.log("📋 Copying .env.example to .env...");
    fs.copyFileSync(envExamplePath, envPath);
    console.log("✅ Created .env file from template\n");
  } else {
    console.error("❌ .env.example file not found");
    process.exit(1);
  }
}

// Read current .env file
let envContent = fs.readFileSync(envPath, "utf8");

// Generate secrets if they don't exist or are placeholder values
const sessionSecret = generateSecret(32);
const jwtSecret = generateSecret(32);

console.log("🔑 Generating secure secrets...");

// Update SESSION_SECRET if it's empty or a placeholder
if (
  envContent.includes(
    "SESSION_SECRET=your-session-secret-here-change-this-in-production"
  ) ||
  (envContent.includes("SESSION_SECRET=") &&
    !envContent.includes("SESSION_SECRET=" + sessionSecret))
) {
  envContent = envContent.replace(
    /SESSION_SECRET=.*/,
    `SESSION_SECRET=${sessionSecret}`
  );
  console.log("✅ Generated SESSION_SECRET");
}

// Update JWT_SECRET if it's empty or a placeholder
if (
  envContent.includes(
    "JWT_SECRET=your-jwt-secret-here-change-this-in-production"
  ) ||
  (envContent.includes("JWT_SECRET=") &&
    !envContent.includes("JWT_SECRET=" + jwtSecret))
) {
  envContent = envContent.replace(/JWT_SECRET=.*/, `JWT_SECRET=${jwtSecret}`);
  console.log("✅ Generated JWT_SECRET");
}

// Write updated .env file
fs.writeFileSync(envPath, envContent);

console.log("\n📝 Authentication Configuration Checklist:");
console.log("==========================================");

// Check configuration
const envLines = envContent.split("\n");
const config = {};

envLines.forEach((line) => {
  if (line.includes("=") && !line.startsWith("#")) {
    const [key, value] = line.split("=");
    config[key.trim()] = value.trim();
  }
});

// Validate configuration
const checks = [
  {
    key: "NODE_ENV",
    required: false,
    check: (value) => ["development", "production", "test"].includes(value),
    message: "Should be development, production, or test",
    default: "development",
  },
  {
    key: "PAY_SERVICE_URL",
    required: true,
    check: (value) => value && value.match(/^https?:\/\//),
    message: "Must be a valid HTTP/HTTPS URL",
    default: "https://pay.jeffreykeyser.net",
  },
  {
    key: "ORIGIN_BASE_URL",
    required: true,
    check: (value) => value && value.length > 0,
    message: "Must be set for CORS configuration",
    default: "http://localhost:3000",
  },
  {
    key: "SESSION_SECRET",
    required: true,
    check: (value) => value && value.length >= 32,
    message: "Should be at least 32 characters long",
    default: null,
  },
  {
    key: "JWT_SECRET",
    required: true,
    check: (value) => value && value.length >= 32,
    message: "Should be at least 32 characters long",
    default: null,
  },
];

let allValid = true;

checks.forEach(({ key, required, check, message, default: defaultValue }) => {
  const value = config[key];
  const isValid = check(value);
  const status = isValid ? "✅" : required ? "❌" : "⚠️";

  console.log(`${status} ${key}: ${isValid ? "OK" : message}`);

  if (!isValid && defaultValue) {
    console.log(`   Default: ${defaultValue}`);
  }

  if (!isValid && required) {
    allValid = false;
  }
});

console.log("\n🗄️  Database Configuration:");
console.log("===========================");

const dbChecks = [
  "DATABASE_HOST",
  "DATABASE_NAME",
  "DATABASE_USER",
  "DATABASE_PASSWORD",
];

dbChecks.forEach((key) => {
  const value = config[key];
  const isSet = value && value.length > 0 && !value.includes("your_");
  console.log(
    `${isSet ? "✅" : "⚠️"} ${key}: ${
      isSet ? "Configured" : "Needs configuration"
    }`
  );
});

console.log("\n🚀 Next Steps:");
console.log("==============");

if (!allValid) {
  console.log(
    "❌ Please fix the configuration issues above before starting the server."
  );
} else {
  console.log("✅ Authentication configuration looks good!");
}

console.log("\n1. Update database configuration in .env file");
console.log("2. Set ORIGIN_BASE_URL to your frontend URL");
console.log("3. Configure PAY_SERVICE_URL if using a different Pay service");
console.log("4. Run: npm run dev");

console.log("\n📚 For detailed setup instructions, see:");
console.log("   - AUTHENTICATION_SETUP.md");
console.log("   - README.md");

console.log("\n🔍 To test authentication:");
console.log("   - Public route: curl http://localhost:3001/health");
console.log("   - Protected route: curl http://localhost:3001/v1/auth/me");

if (!allValid) {
  process.exit(1);
}
