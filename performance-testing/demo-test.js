const lighthouse = require('lighthouse');
const chromeLauncher = require('chrome-launcher');

/**
 * Demo Lighthouse test - shows how the performance testing works
 * This tests a public website to demonstrate the functionality
 */

async function runDemoTest() {
  console.log('🚀 Running demo Lighthouse test...');
  console.log('This shows how the Shopify performance test would work\n');

  const chrome = await chromeLauncher.launch({
    chromeFlags: ['--headless', '--no-sandbox', '--disable-gpu']
  });

  try {
    console.log('🔍 Testing a demo website...');
    
    const result = await lighthouse('https://example.com', {
      port: chrome.port,
      onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
      output: 'json'
    });

    const report = result.lhr;
    
    console.log('📊 DEMO RESULTS:');
    console.log('================');
    console.log(`Performance: ${Math.round(report.categories.performance.score * 100)}%`);
    console.log(`Accessibility: ${Math.round(report.categories.accessibility.score * 100)}%`);
    console.log(`Best Practices: ${Math.round(report.categories['best-practices'].score * 100)}%`);
    console.log(`SEO: ${Math.round(report.categories.seo.score * 100)}%`);
    
    console.log('\n✅ Demo test completed successfully!');
    console.log('\n📝 For your Shopify store, replace the URL with:');
    console.log('   - https://your-store.myshopify.com/ (home)');
    console.log('   - https://your-store.myshopify.com/products/test-product');
    console.log('   - https://your-store.myshopify.com/collections/all');
    
  } catch (error) {
    console.error('❌ Demo test failed:', error.message);
  } finally {
    await chrome.kill();
  }
}

runDemoTest().catch(console.error);
