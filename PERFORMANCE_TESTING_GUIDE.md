# Shopify App Store Performance Testing & Compliance

## 🎯 Overview

This comprehensive testing suite ensures your Shopify app meets the strict **App Store performance requirements**:

- **Maximum 10-point decrease** in Lighthouse performance scores
- **Weighted testing**: Home (17%), Product (40%), Collection (43%)
- **All categories**: Performance, Accessibility, Best Practices, SEO

## 🚀 Quick Start

### 1. **Setup Testing Environment**

```bash
# Navigate to performance testing directory
cd performance-testing

# Install dependencies
npm install

# Make scripts executable
chmod +x run-performance-test.sh
```

### 2. **Run Manual Test**

```bash
# Replace with your development store domain
node performance-tester.js your-test-store

# Or use the automated script
./run-performance-test.sh your-test-store
```

### 3. **Automated CI/CD Testing**

The GitHub Actions workflow automatically:
- Tests on every PR and push to main
- Runs weekly performance audits  
- Comments on PRs with results
- Fails builds if performance requirements aren't met

## 📊 Understanding Results

### ✅ **Passing Example**
```
🎯 OVERALL RESULT: ✅ PASSED
Weighted Performance Score Change: -8 points
Requirement: Maximum -10 points allowed

✅ Home Page (Weight: 17%): 95 → 89 (-6)
✅ Product Page (Weight: 40%): 90 → 82 (-8)  
✅ Collection Page (Weight: 43%): 88 → 80 (-8)
```

### ❌ **Failing Example**
```
🎯 OVERALL RESULT: ❌ FAILED
Weighted Performance Score Change: -15 points
Requirement: Maximum -10 points allowed

❌ Home Page (Weight: 17%): 95 → 85 (-10)
❌ Product Page (Weight: 40%): 90 → 75 (-15)
❌ Collection Page (Weight: 43%): 88 → 70 (-18)
```

## 🔧 Implementation Guide

### **Your Current Optimizations**

✅ **Session Tokens**: Implemented App Bridge session tokens
✅ **Bundle Optimization**: Entry bundle reduced to ~4.4KB
✅ **Lazy Loading**: Non-critical components load on demand
✅ **Performance Caching**: 5-minute TTL cache system
✅ **GraphQL Optimization**: Batched requests, reduced queries

### **Expected Performance Impact**

Based on your optimizations:
- **Session Tokens**: +2-4 performance points (eliminates OAuth redirects)
- **Bundle Size**: +3-5 performance points (faster initial load)
- **Caching**: +1-3 performance points (faster subsequent loads)
- **GraphQL**: +1-2 performance points (reduced network overhead)

**Estimated Total Impact**: **+7 to +14 points improvement** 🎉

## 🧪 Testing Methodology

### **Test Pages Required**

1. **Home Page** (17% weight)
   - `https://your-store.myshopify.com/`
   - Tests: App Bridge loading, initial JavaScript execution

2. **Product Page** (40% weight)  
   - `https://your-store.myshopify.com/products/test-product`
   - Tests: Most critical - highest weight in scoring

3. **Collection Page** (43% weight)
   - `https://your-store.myshopify.com/collections/all`
   - Tests: Highest weight - most important for score

### **Metrics Evaluated**

- **Performance**: Core Web Vitals, loading times
- **Accessibility**: Screen reader compatibility, ARIA
- **Best Practices**: Security, modern standards
- **SEO**: Meta tags, structured data

## 📁 Output Files

After testing, you'll get:

```
reports_20250801_143022/
├── performance-summary.json      # Complete results
├── performance-results.csv       # Spreadsheet data  
├── baseline-home-detailed.json   # Detailed home baseline
├── baseline-product-detailed.json # Detailed product baseline
├── baseline-collection-detailed.json # Detailed collection baseline
├── with-app-home-detailed.json   # Detailed home with app
├── with-app-product-detailed.json # Detailed product with app
└── with-app-collection-detailed.json # Detailed collection with app
```

## 🚀 CI/CD Integration

### **GitHub Actions Workflow**

Located at `.github/workflows/performance-testing.yml`:

- **Triggers**: Push, PR, weekly schedule, manual dispatch
- **Environment**: Ubuntu with Chrome headless
- **Outputs**: Detailed reports, PR comments, build status
- **Artifacts**: 30-day retention for reports

### **Usage in CI**

```yaml
# Trigger manual test
gh workflow run performance-testing.yml -f shop_domain=your-test-store

# Check latest results
gh run list --workflow=performance-testing.yml
```

## 💡 Optimization Strategies

### **If Your App Fails Testing**

1. **Bundle Size Optimization**
   ```bash
   # Check current bundle sizes
   npm run build
   cd build/client/assets
   ls -la *.js *.css
   ```

2. **Critical Path Analysis**
   - Inline critical CSS (<50KB)
   - Defer non-critical JavaScript
   - Use lazy loading for heavy components

3. **Network Optimization**
   - Minimize GraphQL queries
   - Implement proper caching headers
   - Use CDN for static assets

4. **App Bridge Optimization**
   - Ensure session tokens are working
   - Minimize OAuth redirects
   - Optimize iframe communication

## 📈 Monitoring & Maintenance

### **Regular Testing Schedule**

- **Before each release**: Prevent regressions
- **Weekly automated**: Catch environment changes
- **After major updates**: Verify optimizations

### **Performance Budgets**

Set alerts for:
- Entry bundle size >10KB
- CSS bundle size >50KB  
- Performance score drop >5 points
- Lighthouse failures

## 🆘 Troubleshooting

### **Common Issues**

1. **Test Pages Don't Exist**
   ```bash
   # Verify pages are accessible
   curl -f https://your-store.myshopify.com/products/test-product
   ```

2. **Chrome Launch Failures**
   ```bash
   # Install Chrome in CI
   sudo apt-get update
   sudo apt-get install google-chrome-stable
   ```

3. **Network Timeouts**
   ```bash
   # Increase timeout in performance-tester.js
   const result = await lighthouse(url, {
     ...options,
     timeout: 60000  // Increase to 60 seconds
   });
   ```

### **Debug Mode**

```bash
# Run with detailed logging
DEBUG=lighthouse* node performance-tester.js your-store
```

## 🎉 Success Checklist

- [ ] Entry bundle <10KB JavaScript
- [ ] CSS bundle <50KB  
- [ ] Session tokens implemented
- [ ] Lazy loading for non-critical features
- [ ] Performance tests passing (-10 points max)
- [ ] CI/CD pipeline configured
- [ ] Regular monitoring in place

## 📞 Support

- **Performance Issues**: Check detailed Lighthouse reports
- **CI/CD Problems**: Review GitHub Actions logs
- **Optimization Help**: Consult Shopify performance docs
- **Bundle Analysis**: Use Vite bundle analyzer

**Remember**: Shopify's App Store performance requirements are **non-negotiable**. Plan for optimization early in development! 🚀
