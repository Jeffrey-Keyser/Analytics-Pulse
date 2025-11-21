#!/bin/bash

# Docker Development Environment Stop Script
# This script stops the Docker development environment for ServerlessWebTemplate

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}🛑 Stopping ServerlessWebTemplate Docker Development Environment${NC}"
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker is not installed.${NC}"
    exit 1
fi

# Determine docker-compose command
if docker compose version &> /dev/null 2>&1; then
    COMPOSE_CMD="docker compose"
else
    COMPOSE_CMD="docker-compose"
fi

# Stop containers
echo -e "${YELLOW}📦 Stopping Docker containers...${NC}"
$COMPOSE_CMD -f docker-compose.dev.yml stop
echo ""

# Optionally remove containers (keeps volumes)
read -p "Remove containers (data will be preserved)? [y/N] " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}🗑️  Removing containers...${NC}"
    $COMPOSE_CMD -f docker-compose.dev.yml rm -f
    echo ""
fi

echo -e "${GREEN}✅ ServerlessWebTemplate Docker Development Environment stopped${NC}"
echo ""
echo "ℹ️  Database data is preserved in Docker volumes"
echo "  To completely remove all data, run: ./scripts/docker-dev-reset.sh"
echo "  To restart, run: ./scripts/docker-dev.sh"
echo ""
