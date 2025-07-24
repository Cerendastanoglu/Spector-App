// Instructions for integrating real Shopify product data
// 
// To use real Shopify products in the Product Tracker, follow these steps:

/*
1. Get your Shopify Storefront Access Token:
   - Go to your Shopify Admin → Apps → Manage private apps
   - Create a private app or use existing one
   - Enable Storefront API access
   - Copy the Storefront access token

2. Replace the mock data in product-tracker.public.tsx with this real data fetcher:

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const STOREFRONT_API_URL = `https://YOUR_SHOP_NAME.myshopify.com/api/2023-07/graphql.json`;
  const STOREFRONT_ACCESS_TOKEN = process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN;

  const query = `
    query getProducts {
      products(first: 50) {
        edges {
          node {
            id
            title
            createdAt
            variants(first: 5) {
              edges {
                node {
                  id
                  inventoryQuantity
                  price
                }
              }
            }
            productType
          }
        }
      }
    }
  `;

  try {
    const response = await fetch(STOREFRONT_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Storefront-Access-Token': STOREFRONT_ACCESS_TOKEN,
      },
      body: JSON.stringify({ query }),
    });

    const data = await response.json();
    
    const products = data.data.products.edges.map(({ node }) => ({
      id: node.id,
      name: node.title,
      stock: node.variants.edges[0]?.node.inventoryQuantity || 0,
      createdAt: node.createdAt,
      lastSoldDate: null, // Would need order data to calculate this
      salesVelocity: { daily: 0, weekly: 0, monthly: 0 }, // Would need order data
      price: parseFloat(node.variants.edges[0]?.node.price || '0'),
      category: node.productType || 'Uncategorized'
    }));

    return json({ products });
  } catch (error) {
    console.error('Error fetching products:', error);
    // Fallback to mock data if real data fails
    return json({ products: MOCK_PRODUCTS });
  }
};

3. Add environment variable to your .env file:
   SHOPIFY_STOREFRONT_ACCESS_TOKEN=your_storefront_token_here

4. For sales velocity data, you would need to:
   - Use the Admin API to get order data (requires authentication)
   - Or implement a background job to periodically calculate and store sales data
   - Or use Shopify Analytics API

5. For public access without any authentication:
   - The Storefront API is designed for public access
   - Only shows published products
   - Safe to use on public pages
*/

// Example environment setup for .env file:
const ENV_EXAMPLE = `
# Add to your .env file:
SHOPIFY_STOREFRONT_ACCESS_TOKEN=your_storefront_access_token_here
SHOPIFY_SHOP_DOMAIN=your-shop-name.myshopify.com
`;

export default ENV_EXAMPLE;
