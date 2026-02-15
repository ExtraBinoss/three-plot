#!/bin/bash

# release.sh - Automate library versioning and tagging

# Ensure we are on main/master
BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [[ "$BRANCH" != "main" && "$BRANCH" != "master" ]]; then
  echo "❌ Error: You must be on main or master branch to release."
  exit 1
fi

# Check for unstaged changes
if [[ -n $(git status -s) ]]; then
  echo "⚠️ Warning: You have uncommitted changes. Please commit or stash them first."
  exit 1
fi

# Get current version
CURRENT_VERSION=$(node -p "require('./package.json').version")
echo "📦 Current version is: $CURRENT_VERSION"

# Ask for new version
echo "🔢 Enter new version (e.g., 1.0.1):"
read NEW_VERSION

if [[ -z "$NEW_VERSION" ]]; then
  echo "❌ Error: Version cannot be empty."
  exit 1
fi

# Update package.json
echo "📝 Updating package.json to v$NEW_VERSION..."
npm version $NEW_VERSION --no-git-tag-version

# Commit and Tag
echo "💾 Committing and Tagging..."
git add package.json package-lock.json
git commit -m "chore: release v$NEW_VERSION"
git tag -a "v$NEW_VERSION" -m "v$NEW_VERSION"

# Push
echo "🚀 Pushing to GitHub (this will trigger the NPM Publish workflow)..."
git push origin $BRANCH
git push origin "v$NEW_VERSION"

echo "✅ Done! v$NEW_VERSION is on its way to NPM."
