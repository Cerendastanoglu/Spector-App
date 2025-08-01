/**
 * Minimal entry client - optimized for <10KB bundle size
 * By default, Remix includes everything in entry bundle
 * This optimized version defers non-critical initialization
 */

import { RemixBrowser } from "@remix-run/react";
import { startTransition, StrictMode } from "react";
import { hydrateRoot } from "react-dom/client";

// Minimal initialization - only critical path
function hydrate() {
  startTransition(() => {
    hydrateRoot(
      document,
      <StrictMode>
        <RemixBrowser />
      </StrictMode>
    );
  });
}

// Check if DOM is ready
if (typeof requestIdleCallback === "function") {
  // Use idle callback for better performance
  requestIdleCallback(hydrate);
} else {
  // Fallback for browsers without requestIdleCallback
  setTimeout(hydrate, 1);
}

// Defer non-critical initialization to keep bundle small
setTimeout(() => {
  // Preload critical resources when idle
  if ('serviceWorker' in navigator) {
    // Service worker registration (if you have one)
    // navigator.serviceWorker.register('/sw.js');
  }
  
  // Preload critical chunks when browser is idle
  if (typeof requestIdleCallback === "function") {
    requestIdleCallback(() => {
      // Preload Polaris styles when idle
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'style';
      link.href = 'https://cdn.shopify.com/static/fonts/inter/v4/styles.css';
      document.head.appendChild(link);
    });
  }
}, 100);

// Performance monitoring (deferred)
setTimeout(() => {
  // Only in production and when performance API is available
  if (typeof performance !== 'undefined' && performance.getEntriesByType) {
    // Monitor critical metrics
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    if (navigation) {
      const loadTime = navigation.loadEventEnd - navigation.loadEventStart;
      if (loadTime > 0) {
        console.log(`Page load time: ${loadTime}ms`);
      }
    }
  }
}, 2000);
