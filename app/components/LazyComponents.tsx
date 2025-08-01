import { Suspense, lazy } from 'react';
import { Spinner } from '@shopify/polaris';

/**
 * Lazy loading utilities for keeping the entry bundle tiny
 * Components are loaded only when needed, reducing initial bundle size
 */

// Lazy load heavy components that exist and are properly exported
export const LazyProductTracker = lazy(() => 
  import('./ProductTracker').then(module => ({ default: module.ProductTracker }))
);

export const LazyInventoryHistory = lazy(() => 
  import('./InventoryHistory').then(module => ({ default: module.InventoryHistory }))
);

// Minimal loading fallback component
const MinimalSpinner = () => (
  <div style={{ 
    display: 'flex', 
    justifyContent: 'center', 
    alignItems: 'center', 
    height: '60px',
    background: 'transparent'
  }}>
    <Spinner accessibilityLabel="Loading..." size="small" />
  </div>
);

// Wrapper component for lazy loading with minimal fallback
interface LazyWrapperProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const LazyWrapper = ({ children, fallback = <MinimalSpinner /> }: LazyWrapperProps) => (
  <Suspense fallback={fallback}>
    {children}
  </Suspense>
);

// Critical path components that should stay in main bundle
export { ClientErrorFilter } from './ClientErrorFilter';
export { ErrorBoundary } from './ErrorBoundary';
export { InstantAlerts } from './InstantAlerts';

// Hook for dynamically importing components based on user interaction
export const useLazyComponent = () => {
  const loadComponent = async (componentName: string) => {
    switch (componentName) {
      case 'productTracker':
        return import('./ProductTracker');
      case 'inventoryHistory':
        return import('./InventoryHistory');
      default:
        throw new Error(`Component ${componentName} not found`);
    }
  };

  return { loadComponent };
};

// Preload components when user hovers (prefetch strategy)
export const preloadComponent = (componentName: string) => {
  const mouseEnterHandler = () => {
    switch (componentName) {
      case 'productTracker':
        import('./ProductTracker');
        break;
      case 'inventoryHistory':
        import('./InventoryHistory');
        break;
    }
  };

  return { onMouseEnter: mouseEnterHandler };
};
