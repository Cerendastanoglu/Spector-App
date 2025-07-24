import { useEffect } from 'react';

export function ClientErrorFilter() {
  useEffect(() => {
    // Only run in browser
    if (typeof window === 'undefined') return;

    // Filter out known Shopify internal errors from console
    const originalConsoleError = console.error;

    const errorFilter = (...args: any[]) => {
      const message = args.join(' ');
      
      // Filter out known Shopify internal errors
      const shopifyInternalErrors = [
        'SendBeacon failed',
        'shopify-app-bridge',
        'Navigation was aborted',
        'The user aborted a request',
        'WebSocket connection to',
        'argus.shopifycloud.com',
        'WebSocket is closed before the connection is established'
      ];
      
      const isShopifyInternalError = shopifyInternalErrors.some(errorPattern => 
        message.toLowerCase().includes(errorPattern.toLowerCase())
      );
      
      // Only log non-Shopify internal errors
      if (!isShopifyInternalError) {
        originalConsoleError.apply(console, args);
      }
    };

    // Apply the filter
    console.error = errorFilter;

    // Handle unhandled promise rejections
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const message = event.reason?.message || event.reason || '';
      
      // Filter out Shopify internal errors
      const isShopifyInternalError = 
        message.includes('SendBeacon failed') ||
        message.includes('shopify') ||
        message.includes('Navigation was aborted') ||
        message.includes('WebSocket connection to') ||
        message.includes('argus.shopifycloud.com');
        
      if (isShopifyInternalError) {
        event.preventDefault(); // Prevent the error from being logged
      }
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    // Cleanup on unmount
    return () => {
      console.error = originalConsoleError;
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  return null; // This component doesn't render anything
}
