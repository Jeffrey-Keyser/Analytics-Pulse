#!/bin/bash

set -e  # Exit immediately on error

# Change to server directory to run commands
cd ..

LOG_FILE="./db/migration_log.txt"

echo "Starting database deployment using @jeffrey-keyser/database-base-config..." | tee $LOG_FILE

# Run SQL migration files (if they exist)
if [ -d "./db/migrations" ] && [ "$(ls -A ./db/migrations/*.sql 2>/dev/null)" ]; then
  echo "Running SQL migration files..." | tee -a $LOG_FILE
  npx db-deploy directory ./db/migrations --export-logs ./db/migration_log.txt 2>&1 | tee -a $LOG_FILE
fi

# Use package CLI to run SQL schema files
if [ -d "./db/schema" ] && [ "$(ls -A ./db/schema/*.sql 2>/dev/null)" ]; then
  echo "Running SQL schema files..." | tee -a $LOG_FILE
  npx db-deploy directory ./db/schema --export-logs ./db/migration_log.txt 2>&1 | tee -a $LOG_FILE
fi

if [ -d "./db/stored_procedures" ] && [ "$(ls -A ./db/stored_procedures/*.sql 2>/dev/null)" ]; then
  echo "Running stored procedures..." | tee -a $LOG_FILE
  npx db-deploy directory ./db/stored_procedures --export-logs ./db/migration_log.txt 2>&1 | tee -a $LOG_FILE
fi

# Create session tables using package CLI
echo "Creating session tables..." | tee -a $LOG_FILE
# Use the schema from environment variable if available
SCHEMA="${DATABASE_SCHEMA:-public}"
npx db-deploy session-tables --schema $SCHEMA --table user_sessions 2>&1 | tee -a $LOG_FILE

# Run SQL seed files if in development environment
if [ "$NODE_ENV" = "development" ] && [ -d "./db/seeders" ] && [ "$(ls -A ./db/seeders/*.sql 2>/dev/null)" ]; then
  echo "Running SQL seed files (development only)..." | tee -a $LOG_FILE
  npx db-deploy directory ./db/seeders --export-logs ./db/migration_log.txt 2>&1 | tee -a $LOG_FILE
fi

echo "Database deployment completed successfully!" | tee -a $LOG_FILE