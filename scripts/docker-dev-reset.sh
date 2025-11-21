#!/bin/bash

# Docker Development Environment Reset Script
# This script completely resets the Docker development environment
# WARNING: This will delete all data in the development database!

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${RED}⚠️  WARNING: Docker Development Environment Reset${NC}"
echo ""
echo "This will:"
echo "  • Stop all containers"
echo "  • Remove all containers"
echo "  • Delete the PostgreSQL data volume (ALL DATA WILL BE LOST)"
echo "  • Rebuild all images"
echo ""

# Confirm reset
read -p "Are you sure you want to reset everything? [y/N] " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}❌ Reset cancelled${NC}"
    exit 0
fi

# Double confirmation for data deletion
echo ""
echo -e "${RED}⚠️  This will DELETE ALL DATA in the development database!${NC}"
read -p "Type 'RESET' to confirm: " confirm
if [ "$confirm" != "RESET" ]; then
    echo -e "${YELLOW}❌ Reset cancelled${NC}"
    exit 0
fi

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

# Stop and remove everything
echo -e "${YELLOW}🛑 Stopping containers...${NC}"
$COMPOSE_CMD -f docker-compose.dev.yml down -v 2>/dev/null || true
echo ""

# Remove the specific volume
echo -e "${YELLOW}🗑️  Removing database volume...${NC}"
docker volume rm serverless-template-postgres-data 2>/dev/null || true
echo ""

# Clean up dangling images
echo -e "${YELLOW}🧹 Cleaning up dangling images...${NC}"
docker image prune -f
echo ""

# Rebuild images
echo -e "${YELLOW}🔨 Rebuilding Docker images...${NC}"
$COMPOSE_CMD -f docker-compose.dev.yml build --no-cache
echo ""

# Start fresh environment
echo -e "${YELLOW}🚀 Starting fresh environment...${NC}"
$COMPOSE_CMD -f docker-compose.dev.yml up -d
echo ""

# Wait for services to be ready
echo -e "${YELLOW}⏳ Waiting for services to be ready...${NC}"

# Wait for PostgreSQL
echo -n "  PostgreSQL: "
for i in {1..30}; do
    if $COMPOSE_CMD -f docker-compose.dev.yml exec -T postgres pg_isready -U template_user -d template_dev &>/dev/null; then
        echo -e "${GREEN}Ready${NC}"
        break
    fi
    echo -n "."
    sleep 1
done

# Wait for backend
echo -n "  Backend: "
for i in {1..30}; do
    if curl -s http://localhost:3001/health &>/dev/null; then
        echo -e "${GREEN}Ready${NC}"
        break
    fi
    echo -n "."
    sleep 1
done

# Wait for frontend
echo -n "  Frontend: "
for i in {1..30}; do
    if curl -s http://localhost:3002 &>/dev/null; then
        echo -e "${GREEN}Ready${NC}"
        break
    fi
    echo -n "."
    sleep 1
done

echo ""
echo -e "${GREEN}✨ ServerlessWebTemplate Docker Development Environment has been reset!${NC}"
echo ""
echo "📚 Fresh environment is ready at:"
echo "  Frontend: http://localhost:3002"
echo "  Backend:  http://localhost:3001"
echo "  Database: localhost:5432 (template_dev)"
echo ""
echo "The database has been initialized with a clean schema."
echo ""
