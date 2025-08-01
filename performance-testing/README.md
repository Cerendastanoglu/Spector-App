# Shopify App Store Performance Testing

## 📊 Shopify Requirements

**Critical**: Apps must not reduce Lighthouse performance scores by more than **10 points**

**Page Weights**:
- Home Page: **17%**
- Product Page: **40%** 
- Collection Page: **43%**

## 🚀 Quick Start

### 1. Setup Testing Environment

```bash
cd performance-testing
npm install
```

### 2. Run Performance Test

```bash
# Replace 'your-test-store' with your development store domain
node performance-tester.js your-test-store
```

### 3. Testing Process

1. **Baseline Test**: Script tests store performance BEFORE app installation
2. **Install App**: Manually install your app when prompted
3. **With-App Test**: Script tests store performance AFTER app installation  
4. **Analysis**: Automatic comparison and pass/fail report

## 📋 Test Pages

The script automatically tests these pages (as per Shopify requirements):

- **Home**: `https://your-store.myshopify.com/`
- **Product**: `https://your-store.myshopify.com/products/test-product`
- **Collection**: `https://your-store.myshopify.com/collections/all`

**Note**: Make sure these pages exist in your test store!

## 📊 Sample Report

```
============================================================
📊 SHOPIFY APP PERFORMANCE REPORT
============================================================

🎯 OVERALL RESULT: ✅ PASSED
Weighted Performance Score Change: -8 points
Requirement: Maximum -10 points allowed

📄 PAGE-BY-PAGE BREAKDOWN:

✅ Home Page (Weight: 17%)
  Performance: 95 → 89 (-6)
  Accessibility: 100 → 100 (+0)
  Best Practices: 95 → 95 (+0)
  SEO: 100 → 100 (+0)

✅ Product Page (Weight: 40%)
  Performance: 90 → 82 (-8)
  Accessibility: 95 → 95 (+0)
  Best Practices: 90 → 90 (+0)
  SEO: 95 → 95 (+0)

✅ Collection Page (Weight: 43%)
  Performance: 88 → 80 (-8)
  Accessibility: 100 → 100 (+0)
  Best Practices: 95 → 95 (+0)
  SEO: 100 → 100 (+0)

💡 RECOMMENDATIONS:
✅ Your app meets Shopify App Store performance requirements!
```

## 🔧 Advanced Usage

### Custom Test Configuration

```javascript
const tester = new ShopifyPerformanceTester('your-store', {
  chromeFlags: ['--headless', '--no-sandbox'],
  onlyCategories: ['performance', 'accessibility'],
  // Add more Lighthouse options
});

await tester.runCompleteTest();
```

### Testing Specific URLs

```javascript
// Customize test pages
const customTester = new ShopifyPerformanceTester('your-store');
customTester.getTestPages = () => ({
  home: 'https://your-store.myshopify.com/',
  product: 'https://your-store.myshopify.com/products/specific-product',
  collection: 'https://your-store.myshopify.com/collections/specific-collection'
});
```

## 📁 Output Files

After testing, you'll find these files in the `reports/` directory:

- **performance-summary.json**: Complete test results
- **performance-results.csv**: Spreadsheet-friendly data
- **baseline-*.json**: Detailed Lighthouse reports for baseline tests
- **with-app-*.json**: Detailed Lighthouse reports for with-app tests

## 🎯 Optimization Tips

If your app fails the performance test:

### 1. **Minimize JavaScript Impact**
- Keep entry bundle <10KB
- Use lazy loading for non-critical features
- Defer non-essential scripts

### 2. **Optimize CSS**
- Critical CSS inline (<50KB)
- Defer non-critical styles
- Remove unused CSS

### 3. **Reduce Network Requests**
- Bundle and minify assets
- Use CDN for static resources
- Implement proper caching

### 4. **App Bridge Optimization**
- Use session tokens (not cookies)
- Minimize OAuth redirects
- Optimize GraphQL queries

## 🚨 Common Issues

### Test Store Setup
- Ensure test pages exist and are accessible
- Use a representative product for testing
- Test with realistic data (not empty store)

### Network Conditions
- Run tests on stable internet connection
- Test multiple times for consistency
- Consider running tests at different times

### Browser Configuration
- Use headless Chrome for consistent results
- Disable browser extensions during testing
- Clear cache between tests

## 📈 Continuous Integration

### GitHub Actions Example

```yaml
name: Performance Testing
on: [push, pull_request]

jobs:
  performance:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: cd performance-testing && npm install
      - run: cd performance-testing && node performance-tester.js ${{ secrets.TEST_STORE_DOMAIN }}
      - uses: actions/upload-artifact@v3
        with:
          name: performance-reports
          path: performance-testing/reports/
```

## 🔄 Regular Testing Schedule

**Recommended testing frequency**:
- **Before each release**: Ensure no performance regressions
- **Weekly**: During active development
- **Monthly**: For stable apps with minimal changes

## 📞 Support

If you need help with performance optimization:

1. Review the detailed Lighthouse reports in `reports/`
2. Check the optimization tips above
3. Consider consulting Shopify's performance documentation
4. Use browser DevTools for detailed analysis

Remember: **Shopify's 10-point rule is strict** - plan for optimization early in development!
