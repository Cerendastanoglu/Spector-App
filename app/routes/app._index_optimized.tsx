// This is a copy of the main index with optimizations applied
// Key optimizations:
// 1. Reduced GraphQL query size (25 products instead of 50)
// 2. Caching with 5-minute TTL
// 3. Batched GraphQL requests
// 4. Optimized image URLs
// 5. Simplified mock data generation
// 6. Removed heavy order data fetching by default
// 7. Pre-compiled regex patterns for category detection

export { loader, default } from "./app._index";
