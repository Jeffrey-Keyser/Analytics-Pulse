#!/bin/bash
set -e
echo "📦 Deploying $(basename $(pwd))..."

git pull origin main

echo "🔧 Building server..."
cd server
npm install
npm run build 2>/dev/null || true
cd ..

echo "🎨 Building client..."
cd client
npm install
npm run build 2>/dev/null || true
cd ..

echo "🔄 Restarting services..."
sudo systemctl restart analytics-pulse
sudo systemctl restart analytics-pulse-frontend
echo "✅ analytics-pulse deployed!"
