// Performance optimization utilities
import { json } from "@remix-run/node";

// Simple in-memory cache with TTL
class SimpleCache {
  private cache = new Map<string, { data: any; expires: number }>();

  set(key: string, data: any, ttlMs: number = 300000) { // 5 minutes default
    this.cache.set(key, {
      data,
      expires: Date.now() + ttlMs
    });
  }

  get(key: string): any | null {
    const item = this.cache.get(key);
    if (!item) return null;
    
    if (Date.now() > item.expires) {
      this.cache.delete(key);
      return null;
    }
    
    return item.data;
  }

  clear() {
    this.cache.clear();
  }
}

export const cache = new SimpleCache();

// Debounce utility for expensive operations
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(null, args), wait);
  };
}

// Throttle utility for rate limiting
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func.apply(null, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

// Batch GraphQL requests
export async function batchGraphQLRequests(admin: any, queries: Array<{query: string, variables?: any}>) {
  const results = await Promise.allSettled(
    queries.map(({ query, variables }) => 
      admin.graphql(query, variables ? { variables } : undefined)
    )
  );
  
  return results.map(async (result, index) => {
    if (result.status === 'fulfilled') {
      try {
        return await result.value.json();
      } catch (error) {
        console.warn(`Failed to parse GraphQL response for query ${index}:`, error);
        return null;
      }
    } else {
      console.warn(`GraphQL query ${index} failed:`, result.reason);
      return null;
    }
  });
}

// Optimize images for faster loading
export function optimizeImageUrl(url: string | null, width: number = 120, height: number = 120): string | null {
  if (!url) return null;
  
  // For Shopify images, add optimization parameters
  if (url.includes('shopify.com') || url.includes('cdn.shopify.com')) {
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}width=${width}&height=${height}&crop=center&format=webp`;
  }
  
  return url;
}

// Lightweight product data transformer
export function transformProductData(node: any): any {
  return {
    id: node.id,
    name: node.title,
    handle: node.handle,
    status: node.status,
    stock: node.variants?.edges?.[0]?.node?.inventoryQuantity || 0,
    variantId: node.variants?.edges?.[0]?.node?.id,
    image: optimizeImageUrl(node.featuredMedia?.image?.url),
    imageAlt: node.featuredMedia?.image?.altText || node.title
  };
}

// Chunked processing for large datasets
export function processInChunks<T, R>(
  array: T[],
  chunkSize: number,
  processor: (chunk: T[]) => R[]
): R[] {
  const results: R[] = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    const chunk = array.slice(i, i + chunkSize);
    results.push(...processor(chunk));
  }
  return results;
}

// Create optimized JSON response with compression hints
export function createOptimizedResponse(data: any) {
  return json(data, {
    headers: {
      'Cache-Control': 'public, max-age=300', // 5 minute cache
      'Vary': 'Accept-Encoding',
    }
  });
}

// Measure performance of async operations
export async function measurePerformance<T>(
  operation: () => Promise<T>,
  label: string
): Promise<T> {
  const start = performance.now();
  try {
    const result = await operation();
    const end = performance.now();
    console.log(`${label} took ${(end - start).toFixed(2)}ms`);
    return result;
  } catch (error) {
    const end = performance.now();
    console.error(`${label} failed after ${(end - start).toFixed(2)}ms:`, error);
    throw error;
  }
}
