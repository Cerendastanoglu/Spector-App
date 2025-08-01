import { useState } from "react";
import type { LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import {
  Page,
  Layout,
  Text,
  Card,
  Button,
  BlockStack,
  InlineStack,
  Badge,
  Banner,
  EmptyState,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticateSession } from "../utils/session-auth.server";
import { LazyWrapper, LazyProductTracker, LazyInventoryHistory, preloadComponent } from "../components/LazyComponents";

interface Product {
  id: string;
  title: string;
  handle: string;
  totalInventory: number;
  status: string;
  createdAt: string;
  vendor: string;
  productType: string;
  featuredImage?: {
    url: string;
    altText?: string;
  };
}

interface LoaderData {
  products: Product[];
  shop: {
    name: string;
    email: string;
  };
  totalProducts: number;
  outOfStock: number;
  lowStock: number;
}

export const loader = async (args: LoaderFunctionArgs) => {
  const { admin } = await authenticateSession(args);
  
  try {
    // Minimal query for fastest loading - only essential data
    const [shopData, productsData] = await Promise.all([
      admin.graphql(`
        query getShop {
          shop {
            email
            name
          }
        }
      `),
      admin.graphql(`
        query getProducts($first: Int!) {
          products(first: $first) {
            edges {
              node {
                id
                title
                handle
                status
                totalInventory
                createdAt
                vendor
                productType
                featuredImage {
                  url
                  altText
                }
              }
            }
          }
        }
      `, {
        variables: { first: 15 } // Very limited for fast loading
      })
    ]);

    const shop = (await shopData.json()).data.shop;
    const products = (await productsData.json()).data.products.edges.map((edge: any) => edge.node);
    
    // Quick calculations
    const outOfStock = products.filter((p: Product) => p.totalInventory === 0).length;
    const lowStock = products.filter((p: Product) => p.totalInventory > 0 && p.totalInventory <= 5).length;

    return {
      products,
      shop,
      totalProducts: products.length,
      outOfStock,
      lowStock
    };
  } catch (error) {
    console.error('Loader error:', error);
    return {
      products: [],
      shop: { name: 'Shop', email: '' },
      totalProducts: 0,
      outOfStock: 0,
      lowStock: 0
    };
  }
};

export default function MinimalDashboard() {
  const { products, shop, totalProducts, outOfStock, lowStock } = useLoaderData<LoaderData>();
  const [showAdvanced, setShowAdvanced] = useState(false);

  return (
    <Page>
      <TitleBar title="Spector - Fast Dashboard" />
      
      {/* Minimal critical UI - loads immediately */}
      <Layout>
        <Layout.Section>
          <BlockStack gap="400">
            {/* Essential metrics only */}
            <Card>
              <BlockStack gap="300">
                <Text as="h2" variant="headingMd">Quick Overview</Text>
                <InlineStack gap="400" wrap={false}>
                  <div style={{ textAlign: 'center', flex: 1 }}>
                    <Text as="p" variant="headingLg" fontWeight="bold">{totalProducts}</Text>
                    <Text as="p" variant="bodySm" tone="subdued">Total Products</Text>
                  </div>
                  <div style={{ textAlign: 'center', flex: 1 }}>
                    <Text as="p" variant="headingLg" fontWeight="bold" tone="critical">{outOfStock}</Text>
                    <Text as="p" variant="bodySm" tone="subdued">Out of Stock</Text>
                  </div>
                  <div style={{ textAlign: 'center', flex: 1 }}>
                    <Text as="p" variant="headingLg" fontWeight="bold">{lowStock}</Text>
                    <Text as="p" variant="bodySm" tone="subdued">Low Stock</Text>
                  </div>
                </InlineStack>
              </BlockStack>
            </Card>

            {/* Quick actions - load heavy components on demand */}
            <Card>
              <BlockStack gap="300">
                <Text as="h2" variant="headingMd">Quick Actions</Text>
                <InlineStack gap="200" wrap>
                  <Button 
                    onClick={() => setShowAdvanced(true)}
                    {...preloadComponent('productTracker')}
                  >
                    View Full Tracker
                  </Button>
                  <Button 
                    variant="secondary"
                    onClick={() => setShowAdvanced(true)}
                    {...preloadComponent('inventoryHistory')}
                  >
                    View History
                  </Button>
                </InlineStack>
              </BlockStack>
            </Card>

            {/* Status overview */}
            {(outOfStock > 0 || lowStock > 0) && (
              <Banner tone="warning">
                <Text as="p">
                  You have {outOfStock} products out of stock and {lowStock} products with low stock.
                </Text>
              </Banner>
            )}
          </BlockStack>
        </Layout.Section>
        
        {/* Lazy-loaded advanced features */}
        {showAdvanced && (
          <Layout.Section>
            <BlockStack gap="400">
              <Card>
                <Text as="h2" variant="headingMd">Advanced Features Loading...</Text>
                <Text as="p">Full product tracker and inventory history will load here.</Text>
                <Button onClick={() => setShowAdvanced(false)}>Hide Advanced</Button>
              </Card>
            </BlockStack>
          </Layout.Section>
        )}
        
        {/* Minimal product list if no products */}
        {products.length === 0 && (
          <Layout.Section>
            <EmptyState
              heading="No products found"
              action={{
                content: "Add products to your store",
                url: `https://${shop.name}.myshopify.com/admin/products/new`,
                external: true
              }}
              image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
            >
              <Text as="p">
                Start tracking inventory by adding products to your Shopify store.
              </Text>
            </EmptyState>
          </Layout.Section>
        )}
      </Layout>
    </Page>
  );
}
