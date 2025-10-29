#!/bin/bash

# Test recording script for Screator UI
# This script launches the Playwright Inspector for recording test interactions

echo "🎬 Starting Playwright Test Recording for Electron App..."
echo "================================================"
echo ""
echo "Instructions:"
echo "1. The Electron app will launch with Playwright Inspector"
echo "2. Use the Inspector to interact with the app"
echo "3. Your actions will be recorded as test code"
echo "4. Copy the generated code to create new tests"
echo ""
echo "Press any key to start..."
read -n 1 -s

# Change to screator-ui directory
cd "$(dirname "$0")"

# Make sure dependencies are installed
if [ ! -d "node_modules/@playwright" ]; then
    echo "📦 Installing Playwright dependencies..."
    npm install
fi

# Build the Angular app first
echo "🔨 Building Angular app..."
npm run build

# Launch Playwright in recording mode
echo "🎥 Launching Playwright Inspector..."
echo ""
PWDEBUG=1 npx playwright test --headed --project=electron

echo ""
echo "✅ Recording session ended"
