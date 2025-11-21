#!/bin/bash

# Docker Development Environment Startup Script
# This script starts the Docker development environment for ServerlessWebTemplate

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Starting ServerlessWebTemplate Docker Development Environment${NC}"
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker is not installed. Please install Docker first.${NC}"
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo -e "${RED}❌ Docker Compose is not installed. Please install Docker Compose first.${NC}"
    exit 1
fi

# Determine docker-compose command
if docker compose version &> /dev/null 2>&1; then
    COMPOSE_CMD="docker compose"
else
    COMPOSE_CMD="docker-compose"
fi

# Check if .env.docker exists, if not copy from example
if [ ! -f .env.docker ]; then
    echo -e "${YELLOW}📋 Creating .env.docker from .env.docker.example${NC}"
    cp .env.docker.example .env.docker
    echo -e "${GREEN}✅ Created .env.docker${NC}"
    echo -e "${YELLOW}⚠️  Please edit .env.docker and set your GITHUB_TOKEN${NC}"
    echo ""
fi

# Load .env.docker if it exists
if [ -f .env.docker ]; then
    set -a
    source .env.docker
    set +a
fi

# Check if GITHUB_TOKEN is set
if [ -z "$GITHUB_TOKEN" ] || [ "$GITHUB_TOKEN" = "your_github_token_here" ]; then
    echo -e "${RED}❌ GITHUB_TOKEN is not set${NC}"
    echo ""
    echo "Docker build requires a GitHub Personal Access Token to install private packages."
    echo ""
    echo "Please set your GITHUB_TOKEN:"
    echo "  1. Create a token at: https://github.com/settings/tokens"
    echo "  2. Token needs 'read:packages' scope"
    echo "  3. Set the token:"
    echo "     - Export it: export GITHUB_TOKEN=your_token_here"
    echo "     - Or add it to .env.docker file"
    echo ""
    exit 1
fi

# Stop any existing containers
echo -e "${YELLOW}🛑 Stopping any existing containers...${NC}"
$COMPOSE_CMD -f docker-compose.dev.yml down 2>/dev/null || true
echo ""

# Build images if needed
echo -e "${YELLOW}🔨 Building Docker images...${NC}"
$COMPOSE_CMD -f docker-compose.dev.yml build
echo ""

# Start containers
echo -e "${YELLOW}🐳 Starting Docker containers...${NC}"
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
echo -e "${GREEN}✨ ServerlessWebTemplate Docker Development Environment is ready!${NC}"
echo ""
echo "📚 Access the applications:"
echo "  Frontend: http://localhost:3002"
echo "  Backend:  http://localhost:3001"
echo "  Database: localhost:5432 (template_dev)"
echo ""
echo "📝 View logs:"
echo "  All services:  docker-compose -f docker-compose.dev.yml logs -f"
echo "  Backend only:  docker-compose -f docker-compose.dev.yml logs -f backend"
echo "  Frontend only: docker-compose -f docker-compose.dev.yml logs -f frontend"
echo ""
echo "🛑 To stop the environment:"
echo "  ./scripts/docker-dev-stop.sh"
echo ""
