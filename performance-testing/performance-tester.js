const lighthouse = require('lighthouse').default;
const chromeLauncher = require('chrome-launcher');
const fs = require('fs-extra');
const path = require('path');

/**
 * Shopify App Performance Testing Suite
 * Tests performance impact according to Shopify App Store requirements
 */

class ShopifyPerformanceTester {
  constructor(shopDomain, options = {}) {
    this.shopDomain = shopDomain;
    this.options = {
      chromeFlags: ['--headless', '--no-sandbox', '--disable-gpu'],
      logLevel: 'info',
      output: 'json',
      onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
      ...options
    };
    this.results = {
      baseline: {},
      withApp: {},
      comparison: {}
    };
  }

  /**
   * Run complete performance test suite
   */
  async runCompleteTest() {
    console.log('🚀 Starting Shopify App Performance Testing...');
    
    try {
      // 1. Test baseline performance (before app installation)
      console.log('📊 Testing baseline performance...');
      this.results.baseline = await this.testAllPages('baseline');
      
      console.log('⏳ Please install your app now and press Enter to continue...');
      await this.waitForInput();
      
      // 2. Test with app installed
      console.log('📊 Testing performance with app installed...');
      this.results.withApp = await this.testAllPages('with-app');
      
      // 3. Generate comparison report
      this.results.comparison = this.compareResults();
      
      // 4. Save results
      await this.saveResults();
      
      // 5. Generate report
      this.generateReport();
      
      return this.results;
    } catch (error) {
      console.error('❌ Testing failed:', error);
      throw error;
    }
  }

  /**
   * Test all required Shopify pages
   */
  async testAllPages(testType) {
    const pages = this.getTestPages();
    const results = {};

    for (const [pageType, url] of Object.entries(pages)) {
      console.log(`Testing ${pageType}: ${url}`);
      results[pageType] = await this.runLighthouseTest(url, `${testType}-${pageType}`);
      
      // Wait between tests to avoid overwhelming the server
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    return results;
  }

  /**
   * Get test pages according to Shopify requirements
   */
  getTestPages() {
    return {
      // Home page (17% weight)
      home: `https://${this.shopDomain}.myshopify.com/`,
      
      // Product page (40% weight) - use a representative product
      product: `https://${this.shopDomain}.myshopify.com/products/test-product`,
      
      // Collection page (43% weight) - use main collection
      collection: `https://${this.shopDomain}.myshopify.com/collections/all`
    };
  }

  /**
   * Run Lighthouse test for a single URL
   */
  async runLighthouseTest(url, testName) {
    const chrome = await chromeLauncher.launch({
      chromeFlags: this.options.chromeFlags
    });
    
    try {
      const result = await lighthouse(url, {
        ...this.options,
        port: chrome.port
      });

      const report = result.lhr;
      
      // Extract key metrics
      const metrics = {
        performance: Math.round(report.categories.performance.score * 100),
        accessibility: Math.round(report.categories.accessibility.score * 100),
        bestPractices: Math.round(report.categories['best-practices'].score * 100),
        seo: Math.round(report.categories.seo.score * 100),
        firstContentfulPaint: report.audits['first-contentful-paint'].numericValue,
        largestContentfulPaint: report.audits['largest-contentful-paint'].numericValue,
        totalBlockingTime: report.audits['total-blocking-time'].numericValue,
        cumulativeLayoutShift: report.audits['cumulative-layout-shift'].numericValue,
        speedIndex: report.audits['speed-index'].numericValue,
        timeToInteractive: report.audits['interactive'].numericValue
      };

      // Save detailed report
      await fs.ensureDir('reports');
      await fs.writeJSON(
        path.join('reports', `${testName}-detailed.json`),
        report,
        { spaces: 2 }
      );

      console.log(`✅ ${testName} - Performance: ${metrics.performance}%`);
      
      return metrics;
    } finally {
      await chrome.kill();
    }
  }

  /**
   * Compare baseline vs with-app results
   */
  compareResults() {
    const comparison = {};
    const pages = ['home', 'product', 'collection'];
    const weights = { home: 0.17, product: 0.40, collection: 0.43 };

    for (const page of pages) {
      const baseline = this.results.baseline[page];
      const withApp = this.results.withApp[page];
      
      comparison[page] = {
        performance: {
          baseline: baseline.performance,
          withApp: withApp.performance,
          difference: withApp.performance - baseline.performance,
          passed: (withApp.performance - baseline.performance) >= -10
        },
        accessibility: {
          baseline: baseline.accessibility,
          withApp: withApp.accessibility,
          difference: withApp.accessibility - baseline.accessibility
        },
        bestPractices: {
          baseline: baseline.bestPractices,
          withApp: withApp.bestPractices,
          difference: withApp.bestPractices - baseline.bestPractices
        },
        seo: {
          baseline: baseline.seo,
          withApp: withApp.seo,
          difference: withApp.seo - baseline.seo
        }
      };
    }

    // Calculate weighted performance score
    let weightedBaseline = 0;
    let weightedWithApp = 0;
    
    for (const page of pages) {
      weightedBaseline += this.results.baseline[page].performance * weights[page];
      weightedWithApp += this.results.withApp[page].performance * weights[page];
    }

    comparison.weighted = {
      baseline: Math.round(weightedBaseline),
      withApp: Math.round(weightedWithApp),
      difference: Math.round(weightedWithApp - weightedBaseline),
      passed: (weightedWithApp - weightedBaseline) >= -10
    };

    return comparison;
  }

  /**
   * Generate human-readable report
   */
  generateReport() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 SHOPIFY APP PERFORMANCE REPORT');
    console.log('='.repeat(60));

    const { comparison } = this.results;

    // Overall result
    const overallPassed = comparison.weighted.passed;
    console.log(`\n🎯 OVERALL RESULT: ${overallPassed ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`Weighted Performance Score Change: ${comparison.weighted.difference > 0 ? '+' : ''}${comparison.weighted.difference} points`);
    console.log(`Requirement: Maximum -10 points allowed`);

    // Page-by-page breakdown
    console.log('\n📄 PAGE-BY-PAGE BREAKDOWN:');
    
    const pages = [
      { name: 'Home Page', key: 'home', weight: '17%' },
      { name: 'Product Page', key: 'product', weight: '40%' },
      { name: 'Collection Page', key: 'collection', weight: '43%' }
    ];

    for (const page of pages) {
      const data = comparison[page.key];
      const status = data.performance.passed ? '✅' : '❌';
      
      console.log(`\n${status} ${page.name} (Weight: ${page.weight})`);
      console.log(`  Performance: ${data.performance.baseline} → ${data.performance.withApp} (${data.performance.difference > 0 ? '+' : ''}${data.performance.difference})`);
      console.log(`  Accessibility: ${data.accessibility.baseline} → ${data.accessibility.withApp} (${data.accessibility.difference > 0 ? '+' : ''}${data.accessibility.difference})`);
      console.log(`  Best Practices: ${data.bestPractices.baseline} → ${data.bestPractices.withApp} (${data.bestPractices.difference > 0 ? '+' : ''}${data.bestPractices.difference})`);
      console.log(`  SEO: ${data.seo.baseline} → ${data.seo.withApp} (${data.seo.difference > 0 ? '+' : ''}${data.seo.difference})`);
    }

    // Recommendations
    console.log('\n💡 RECOMMENDATIONS:');
    if (overallPassed) {
      console.log('✅ Your app meets Shopify App Store performance requirements!');
    } else {
      console.log('❌ Your app needs optimization to meet Shopify requirements:');
      
      if (comparison.weighted.difference < -10) {
        console.log(`  • Reduce performance impact by ${Math.abs(comparison.weighted.difference + 10)} points`);
      }
      
      for (const page of pages) {
        if (!comparison[page.key].performance.passed) {
          console.log(`  • Optimize ${page.name.toLowerCase()} performance (currently ${comparison[page.key].performance.difference} points impact)`);
        }
      }
    }

    console.log('\n📁 Detailed reports saved in ./reports/ directory');
    console.log('='.repeat(60));
  }

  /**
   * Save all results to files
   */
  async saveResults() {
    await fs.ensureDir('reports');
    
    // Save summary results
    await fs.writeJSON('reports/performance-summary.json', this.results, { spaces: 2 });
    
    // Save CSV for easy analysis
    const csvData = this.generateCSV();
    await fs.writeFile('reports/performance-results.csv', csvData);
    
    console.log('💾 Results saved to reports/ directory');
  }

  /**
   * Generate CSV for spreadsheet analysis
   */
  generateCSV() {
    const headers = [
      'Page', 'Weight', 'Test Type',
      'Performance', 'Accessibility', 'Best Practices', 'SEO',
      'FCP (ms)', 'LCP (ms)', 'TBT (ms)', 'CLS', 'SI (ms)', 'TTI (ms)'
    ];

    const rows = [headers.join(',')];
    const pages = [
      { name: 'Home', key: 'home', weight: '17%' },
      { name: 'Product', key: 'product', weight: '40%' },
      { name: 'Collection', key: 'collection', weight: '43%' }
    ];

    for (const page of pages) {
      // Baseline row
      const baseline = this.results.baseline[page.key];
      rows.push([
        page.name, page.weight, 'Baseline',
        baseline.performance, baseline.accessibility, baseline.bestPractices, baseline.seo,
        Math.round(baseline.firstContentfulPaint), Math.round(baseline.largestContentfulPaint),
        Math.round(baseline.totalBlockingTime), baseline.cumulativeLayoutShift.toFixed(3),
        Math.round(baseline.speedIndex), Math.round(baseline.timeToInteractive)
      ].join(','));

      // With app row
      const withApp = this.results.withApp[page.key];
      rows.push([
        page.name, page.weight, 'With App',
        withApp.performance, withApp.accessibility, withApp.bestPractices, withApp.seo,
        Math.round(withApp.firstContentfulPaint), Math.round(withApp.largestContentfulPaint),
        Math.round(withApp.totalBlockingTime), withApp.cumulativeLayoutShift.toFixed(3),
        Math.round(withApp.speedIndex), Math.round(withApp.timeToInteractive)
      ].join(','));
    }

    return rows.join('\n');
  }

  /**
   * Wait for user input
   */
  waitForInput() {
    return new Promise((resolve) => {
      const readline = require('readline');
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });
      
      rl.question('', () => {
        rl.close();
        resolve();
      });
    });
  }
}

module.exports = ShopifyPerformanceTester;

// CLI usage
if (require.main === module) {
  const shopDomain = process.argv[2];
  
  if (!shopDomain) {
    console.error('Usage: node performance-tester.js <shop-domain>');
    console.error('Example: node performance-tester.js my-test-store');
    process.exit(1);
  }

  const tester = new ShopifyPerformanceTester(shopDomain);
  tester.runCompleteTest().catch(console.error);
}
