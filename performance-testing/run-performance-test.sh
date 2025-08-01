#!/bin/bash

# Shopify App Performance Testing CI/CD Script
# Usage: ./run-performance-test.sh <shop-domain> [environment]

set -e

SHOP_DOMAIN=$1
ENVIRONMENT=${2:-development}
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
REPORT_DIR="reports_${TIMESTAMP}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}🚀 Starting Shopify App Performance Testing${NC}"
echo -e "Shop Domain: ${SHOP_DOMAIN}"
echo -e "Environment: ${ENVIRONMENT}"
echo -e "Timestamp: ${TIMESTAMP}"

# Validate input
if [ -z "$SHOP_DOMAIN" ]; then
    echo -e "${RED}❌ Error: Shop domain is required${NC}"
    echo -e "Usage: ./run-performance-test.sh <shop-domain> [environment]"
    exit 1
fi

# Check if required tools are installed
command -v node >/dev/null 2>&1 || { 
    echo -e "${RED}❌ Error: Node.js is required but not installed${NC}"
    exit 1 
}

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}📦 Installing dependencies...${NC}"
    npm install
fi

# Create reports directory
mkdir -p "${REPORT_DIR}"

# Function to run performance test
run_performance_test() {
    echo -e "${YELLOW}🧪 Running performance test...${NC}"
    
    # Set environment variables for CI
    export CHROME_BIN=$(which google-chrome-stable || which chromium-browser || which chromium || echo "")
    export PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
    
    # Run the test
    if node performance-tester.js "${SHOP_DOMAIN}"; then
        echo -e "${GREEN}✅ Performance test completed successfully${NC}"
        
        # Move reports to timestamped directory
        if [ -d "reports" ]; then
            mv reports/* "${REPORT_DIR}/" 2>/dev/null || true
            rmdir reports 2>/dev/null || true
        fi
        
        # Parse results
        parse_results
        
        return 0
    else
        echo -e "${RED}❌ Performance test failed${NC}"
        return 1
    fi
}

# Function to parse and display results
parse_results() {
    SUMMARY_FILE="${REPORT_DIR}/performance-summary.json"
    
    if [ -f "$SUMMARY_FILE" ]; then
        echo -e "${YELLOW}📊 Performance Test Results:${NC}"
        
        # Extract key metrics using jq if available, otherwise use grep
        if command -v jq >/dev/null 2>&1; then
            WEIGHTED_DIFF=$(jq -r '.comparison.weighted.difference' "$SUMMARY_FILE")
            PASSED=$(jq -r '.comparison.weighted.passed' "$SUMMARY_FILE")
            
            echo -e "Weighted Performance Change: ${WEIGHTED_DIFF} points"
            
            if [ "$PASSED" = "true" ]; then
                echo -e "${GREEN}🎯 RESULT: PASSED ✅${NC}"
                echo -e "Your app meets Shopify App Store requirements!"
            else
                echo -e "${RED}🎯 RESULT: FAILED ❌${NC}"
                echo -e "Your app needs optimization to meet Shopify requirements"
                echo -e "Performance impact: ${WEIGHTED_DIFF} points (limit: -10 points)"
            fi
        else
            echo -e "Results saved to: ${REPORT_DIR}/"
            echo -e "Install 'jq' for detailed result parsing"
        fi
    else
        echo -e "${YELLOW}⚠️  Summary file not found, check detailed reports${NC}"
    fi
}

# Function to upload results (for CI environments)
upload_results() {
    if [ "$ENVIRONMENT" = "ci" ] || [ "$ENVIRONMENT" = "production" ]; then
        echo -e "${YELLOW}📤 Uploading results...${NC}"
        
        # Example: Upload to S3, artifact storage, etc.
        # aws s3 cp "${REPORT_DIR}" "s3://your-bucket/performance-reports/${TIMESTAMP}/" --recursive
        
        # Or create a tarball for artifact storage
        tar -czf "performance-report-${TIMESTAMP}.tar.gz" "${REPORT_DIR}"
        echo -e "${GREEN}📦 Results packaged: performance-report-${TIMESTAMP}.tar.gz${NC}"
    fi
}

# Function to send notifications
send_notifications() {
    local result=$1
    
    if [ "$ENVIRONMENT" = "ci" ] || [ "$ENVIRONMENT" = "production" ]; then
        if [ "$result" = "0" ]; then
            echo -e "${GREEN}✅ Sending success notification...${NC}"
            # Add webhook/notification logic here
            # curl -X POST "https://hooks.slack.com/..." -d "{'text':'Performance test passed!'}"
        else
            echo -e "${RED}❌ Sending failure notification...${NC}"
            # Add webhook/notification logic here
            # curl -X POST "https://hooks.slack.com/..." -d "{'text':'Performance test failed!'}"
        fi
    fi
}

# Main execution
main() {
    echo -e "${YELLOW}🔍 Pre-flight checks...${NC}"
    
    # Check if shop is accessible
    if curl -s -f "https://${SHOP_DOMAIN}.myshopify.com/" > /dev/null; then
        echo -e "${GREEN}✅ Shop is accessible${NC}"
    else
        echo -e "${RED}❌ Shop is not accessible: ${SHOP_DOMAIN}.myshopify.com${NC}"
        exit 1
    fi
    
    # Run the test
    if run_performance_test; then
        upload_results
        send_notifications 0
        echo -e "${GREEN}🎉 Performance testing completed successfully!${NC}"
        exit 0
    else
        upload_results
        send_notifications 1
        echo -e "${RED}💥 Performance testing failed!${NC}"
        exit 1
    fi
}

# Handle script interruption
trap 'echo -e "${YELLOW}⚠️  Test interrupted${NC}"; exit 130' INT

# Run main function
main "$@"
