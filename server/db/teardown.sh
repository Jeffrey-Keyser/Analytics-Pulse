#!/bin/bash

set -e  # Exit immediately on error

# Change to server directory to run commands
cd ..

LOG_FILE="./db/teardown_log.txt"

echo "WARNING: This will execute teardown scripts and delete all data!" | tee $LOG_FILE
echo "Note: This script runs SQL teardown files. There is no automatic rollback of migrations." | tee -a $LOG_FILE

# Prompt for confirmation
read -p "Are you sure you want to teardown the database? (yes/no): " confirm
if [ "$confirm" != "yes" ]; then
  echo "Teardown cancelled." | tee -a $LOG_FILE
  exit 0
fi

# Run any SQL teardown files using package CLI
if [ -d "./db/teardown" ] && [ "$(ls -A ./db/teardown/*.sql 2>/dev/null)" ]; then
  echo "Running SQL teardown files..." | tee -a $LOG_FILE
  npx db-deploy directory ./db/teardown --export-logs ./db/teardown_log.txt 2>&1 | tee -a $LOG_FILE
else
  echo "No teardown files found in ./db/teardown/" | tee -a $LOG_FILE
  echo "To teardown your database, create SQL files in ./db/teardown/ that drop tables/schemas" | tee -a $LOG_FILE
fi

echo "Database teardown completed!" | tee -a $LOG_FILE
echo "WARNING: All tables and data specified in teardown scripts have been removed." | tee -a $LOG_FILE