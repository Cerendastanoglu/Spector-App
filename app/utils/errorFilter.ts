// Only run in browser environment
if (typeof window !== 'undefined') {
  // Filter out known Shopify internal errors from console
  const originalConsoleError = console.error;

  console.error = (...args: any[]) => {
    const message = args.join(' ');
    
    // Filter out known Shopify internal errors
    const shopifyInternalErrors = [
      'SendBeacon failed',
      'shopify-app-bridge',
      'Navigation was aborted',
      'The user aborted a request'
    ];
    
    const isShopifyInternalError = shopifyInternalErrors.some(errorPattern => 
      message.toLowerCase().includes(errorPattern.toLowerCase())
    );
    
    // Only log non-Shopify internal errors
    if (!isShopifyInternalError) {
      originalConsoleError.apply(console, args);
    }
  };

  // Handle unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    const message = event.reason?.message || event.reason || '';
    
    // Filter out Shopify internal errors
    const isShopifyInternalError = 
      message.includes('SendBeacon failed') ||
      message.includes('shopify') ||
      message.includes('Navigation was aborted');
      
    if (isShopifyInternalError) {
      event.preventDefault(); // Prevent the error from being logged
    }
  });
}

export {};
