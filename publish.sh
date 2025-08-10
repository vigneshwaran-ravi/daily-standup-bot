#!/bin/bash

# Daily Standup Bot - Publish Script
# Usage: ./publish.sh [patch|minor|major]

set -e  # Exit on any error

echo "🚀 Daily Standup Bot - Publishing Extension"

# Check if version type is provided
VERSION_TYPE=${1:-patch}

if [[ ! "$VERSION_TYPE" =~ ^(patch|minor|major)$ ]]; then
    echo "❌ Error: Version type must be patch, minor, or major"
    echo "Usage: ./publish.sh [patch|minor|major]"
    exit 1
fi

echo "📦 Bumping version ($VERSION_TYPE)..."
npm version $VERSION_TYPE --no-git-tag-version

# Get the new version
NEW_VERSION=$(node -p "require('./package.json').version")
echo "✅ Version bumped to $NEW_VERSION"

echo "🔨 Building extension..."
npm run build

echo "📦 Packaging extension..."
npx vsce package

echo "📤 Publishing to VS Code Marketplace..."
npx vsce publish

echo "🎉 Successfully published Daily Standup Bot v$NEW_VERSION!"
echo "📋 Extension ID: daily-standup-bot"
echo "🔗 Check it out: https://marketplace.visualstudio.com/items?itemName=vigneshwaran-ravi.daily-standup-bot" 