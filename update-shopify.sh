#!/bin/bash

echo "🔄 Updating Shopify App Configuration for 'Spector'"
echo "=================================================="

# Navigate to the project directory
cd /Users/cerendastanoglu/spector 2>/dev/null || cd /Users/cerendastanoglu/low-stock-alert-app

echo "📁 Current directory: $(pwd)"

# Check current app info
echo "ℹ️  Current app configuration:"
shopify app info

echo ""
echo "🔗 Updating app configuration..."

# Use the current configuration (this will sync the name from shopify.app.toml)
shopify app config use

echo ""
echo "✅ Configuration updated!"

# Deploy the changes to reflect the new name
echo "🚀 Deploying changes to Shopify..."
shopify app deploy

echo ""
echo "✅ App successfully renamed to 'Spector' and deployed!"
echo "📝 The app name in your Shopify Partners dashboard will now show as 'Spector'"
