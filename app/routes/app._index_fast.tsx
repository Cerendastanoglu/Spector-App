import { useState, useEffect } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, Form } from "@remix-run/react";
import {
  Page,
  Layout,
  Text,
  Card,
  Button,
  BlockStack,
  InlineStack,
  Badge,
  Icon,
  Spinner,
} from "@shopify/polaris";
import {
  AlertTriangleIcon,
  InventoryIcon,
  RefreshIcon,
} from "@shopify/polaris-icons";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import { authenticateSession } from "../utils/session-auth.server";
import { 
  getVisibilitySettings, 
  updateVisibilitySettings 
} from "../services/storefront-visibility.server";
import { 
  cache, 
  batchGraphQLRequests, 
  transformProductData, 
  measurePerformance,
  createOptimizedResponse 
} from "../utils/performance";

export const loader = async (args: LoaderFunctionArgs) => {
  // Use optimized session token authentication for maximum speed
  const { admin } = await authenticateSession(args);
  
  // Check cache first for maximum performance
  const cacheKey = 'fast-dashboard-data';
  const cachedData = cache.get(cacheKey);
  if (cachedData) {
    console.log('Returning cached fast dashboard data');
    return createOptimizedResponse(cachedData);
  }

  try {
    // Minimal GraphQL requests for fastest loading
    const [shopData, productsData] = await measurePerformance(async () => {
      const queries = [
        {
          query: `#graphql
            query getShop {
              shop {
                email
                name
                myshopifyDomain
              }
            }`
        },
        {
          query: `#graphql
            query getProducts {
              products(first: 15) {
                edges {
                  node {
                    id
                    title
                    status
                    variants(first: 1) {
                      edges {
                        node {
                          inventoryQuantity
                          id
                        }
                      }
                    }
                  }
                }
              }
            }`
        }
      ];
      
      return await batchGraphQLRequests(admin, queries);
    }, 'Fast GraphQL batch requests');

    // Process data with minimal overhead
    const shopInfo = (await shopData)?.data?.shop || {};
    const products = (await productsData)?.data?.products?.edges?.map(({ node }: any) => ({
      id: node.id,
      name: node.title,
      status: node.status,
      stock: node.variants?.edges?.[0]?.node?.inventoryQuantity || 0,
    })) || [];

    const responseData = {
      products,
      shopInfo,
      visibilitySettings: getVisibilitySettings()
    };

    // Cache for 10 minutes for fast loading
    cache.set(cacheKey, responseData, 600000);
    
    return createOptimizedResponse(responseData);
    
  } catch (error) {
    console.error('Fast loader error:', error);
    return createOptimizedResponse({
      products: [],
      shopInfo: {},
      visibilitySettings: getVisibilitySettings()
    });
  }
};

export default function FastDashboard() {
  const { products, shopInfo } = useLoaderData<typeof loader>();
  const [isLoading, setIsLoading] = useState(false);

  // Calculate basic metrics
  const outOfStock = products.filter((p: any) => p.stock === 0).length;
  const lowStock = products.filter((p: any) => p.stock > 0 && p.stock <= 5).length;
  const totalProducts = products.length;

  const handleRefresh = () => {
    setIsLoading(true);
    window.location.reload();
  };

  return (
    <Page>
      <TitleBar title="Spector - Fast Dashboard" />
      
      {/* Minimal Header */}
      <div style={{ 
        background: '#f8fafc',
        padding: '1rem',
        marginBottom: '1rem',
        borderRadius: '8px',
        border: '1px solid #e2e8f0'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <Icon source={InventoryIcon} tone="info" />
            <div>
              <Text as="h1" variant="headingLg" fontWeight="bold">
                Spector - Fast Mode
              </Text>
              <Text as="p" variant="bodyMd" tone="subdued">
                Optimized for speed - {shopInfo.name}
              </Text>
            </div>
          </div>
          
          <Button
            onClick={handleRefresh}
            variant="primary"
            size="medium"
            icon={RefreshIcon}
            loading={isLoading}
          >
            {isLoading ? 'Loading...' : 'Refresh'}
          </Button>
        </div>
      </div>

      <Layout>
        <Layout.Section>
          {/* Quick Stats */}
          <Card>
            <BlockStack gap="400">
              <Text as="h2" variant="headingMd" fontWeight="semibold">
                Inventory Overview
              </Text>
              
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '1rem'
              }}>
                <div style={{
                  textAlign: 'center',
                  padding: '1rem',
                  background: outOfStock > 0 ? '#fef2f2' : '#f0fdf4',
                  borderRadius: '8px',
                  border: `1px solid ${outOfStock > 0 ? '#fecaca' : '#86efac'}`
                }}>
                  <Text as="p" variant="headingLg" fontWeight="bold" 
                        tone={outOfStock > 0 ? 'critical' : 'success'}>
                    {outOfStock}
                  </Text>
                  <Text as="p" variant="bodySm" tone="subdued">
                    Out of Stock
                  </Text>
                </div>
                
                <div style={{
                  textAlign: 'center',
                  padding: '1rem',
                  background: lowStock > 0 ? '#fffbeb' : '#f0fdf4',
                  borderRadius: '8px',
                  border: `1px solid ${lowStock > 0 ? '#fcd34d' : '#86efac'}`
                }}>
                  <Text as="p" variant="headingLg" fontWeight="bold">
                    {lowStock}
                  </Text>
                  <Text as="p" variant="bodySm" tone="subdued">
                    Low Stock
                  </Text>
                </div>
                
                <div style={{
                  textAlign: 'center',
                  padding: '1rem',
                  background: '#eff6ff',
                  borderRadius: '8px',
                  border: '1px solid #93c5fd'
                }}>
                  <Text as="p" variant="headingLg" fontWeight="bold">
                    {totalProducts}
                  </Text>
                  <Text as="p" variant="bodySm" tone="subdued">
                    Total Products
                  </Text>
                </div>
              </div>
            </BlockStack>
          </Card>

          {/* Product List */}
          <Card>
            <BlockStack gap="400">
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <Text as="h2" variant="headingMd" fontWeight="semibold">
                  Products ({products.length})
                </Text>
                <InlineStack gap="200">
                  <Badge tone="critical">{`${outOfStock} Critical`}</Badge>
                  <Badge tone="warning">{`${lowStock} Low`}</Badge>
                </InlineStack>
              </div>
              
              {products.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem' }}>
                  <Text as="p" variant="bodyLg" tone="subdued">
                    No products found
                  </Text>
                </div>
              ) : (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                  gap: '1rem'
                }}>
                  {products.map((product: any) => (
                    <div
                      key={product.id}
                      style={{
                        padding: '1rem',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        background: product.stock === 0 ? '#fef2f2' : 
                                   product.stock <= 5 ? '#fffbeb' : '#ffffff'
                      }}
                    >
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                      }}>
                        <div style={{ flex: 1 }}>
                          <Text as="p" variant="bodyMd" fontWeight="medium">
                            {product.name}
                          </Text>
                          <Text as="p" variant="bodySm" tone="subdued">
                            Stock: {product.stock} units
                          </Text>
                        </div>
                        
                        <div style={{ marginLeft: '1rem' }}>
                          {product.stock === 0 && (
                            <Badge tone="critical">Out of Stock</Badge>
                          )}
                          {product.stock > 0 && product.stock <= 5 && (
                            <Badge tone="warning">Low Stock</Badge>
                          )}
                          {product.stock > 5 && (
                            <Badge tone="success">In Stock</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
      
      {/* Footer */}
      <div style={{
        textAlign: 'center',
        padding: '1rem',
        marginTop: '2rem',
        borderTop: '1px solid #e2e8f0'
      }}>
        <Text as="p" variant="bodySm" tone="subdued">
          Fast Mode - Optimized for speed. Switch to full dashboard for advanced features.
        </Text>
      </div>
    </Page>
  );
}
