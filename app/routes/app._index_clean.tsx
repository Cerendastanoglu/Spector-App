import { useState } from "react";
import type { LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, useSearchParams } from "@remix-run/react";
import {
  Page,
  Layout,
  Text,
  Card,
  Button,
  BlockStack,
  InlineStack,
  TextField,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";

interface Product {
  id: string;
  name: string;
  stock: number;
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin } = await authenticate.admin(request);

  const response = await admin.graphql(
    `#graphql
      query getProducts {
        products(first: 50) {
          edges {
            node {
              id
              title
              totalInventory
              variants(first: 1) {
                edges {
                  node {
                    inventoryQuantity
                  }
                }
              }
            }
          }
        }
      }`
  );

  const responseJson = await response.json();
  return {
    products: responseJson.data.products.edges.map(({ node }: any) => ({
      id: node.id,
      name: node.title,
      stock: node.variants.edges[0]?.node.inventoryQuantity || 0
    }))
  };
};

export default function Index() {
  const { products } = useLoaderData<typeof loader>();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Get threshold from URL params, default to 5
  const getThresholdFromParams = () => {
    const thresholdParam = searchParams.get("threshold");
    return thresholdParam ? parseInt(thresholdParam, 10) : 5;
  };

  const [inventoryThreshold, setInventoryThreshold] = useState(getThresholdFromParams());

  const handleThresholdChange = (value: string) => {
    const numValue = parseInt(value, 10) || 5;
    setInventoryThreshold(numValue);
    
    // Update URL params to persist threshold
    const newSearchParams = new URLSearchParams(searchParams);
    newSearchParams.set("threshold", numValue.toString());
    setSearchParams(newSearchParams);
  };

  // Categorize products
  const lowStockProducts = products
    .filter((product: Product) => product.stock > 0 && product.stock <= inventoryThreshold)
    .sort((a: Product, b: Product) => {
      // First by name alphabetically, then by stock (lowest first)
      if (a.name.localeCompare(b.name) === 0) {
        return a.stock - b.stock;
      }
      return a.name.localeCompare(b.name);
    });

  const zeroStockProducts = products
    .filter((product: Product) => product.stock === 0)
    .sort((a: Product, b: Product) => a.name.localeCompare(b.name));

  const handleProductClick = (productId: string) => {
    // Extract numeric ID from Shopify's gid format
    const numericId = productId.split('/').pop();
    if (numericId) {
      alert(`Product ID: ${numericId}\nNavigate to Products in your admin to find this product.`);
    }
  };

  return (
    <Page>
      <TitleBar title="Spector" />
      <BlockStack gap="500">
        <Layout>
          <Layout.Section variant="oneThird">
            <Card>
              <BlockStack gap="200">
                <Text as="h2" variant="headingMd">
                  Inventory Threshold
                </Text>
                <TextField
                  label=""
                  type="number"
                  value={inventoryThreshold.toString()}
                  onChange={handleThresholdChange}
                  autoComplete="off"
                />
              </BlockStack>
            </Card>
          </Layout.Section>
          <Layout.Section>
            <InlineStack gap="400" align="start">
              <Card>
                <BlockStack gap="200">
                  <Text as="h2" variant="headingMd">
                    Low Stock Products
                  </Text>
                  <BlockStack gap="100">
                    {lowStockProducts.map((product: Product) => {
                      return (
                        <Button
                          key={product.id}
                          onClick={() => handleProductClick(product.id)}
                          variant="plain"
                          textAlign="left"
                          fullWidth
                        >
                          {product.name} — {product.stock.toString()}
                        </Button>
                      );
                    })}
                    {lowStockProducts.length === 0 && (
                      <Text as="p" variant="bodyMd">No low stock products</Text>
                    )}
                  </BlockStack>
                </BlockStack>
              </Card>
              <Card>
                <BlockStack gap="200">
                  <Text as="h2" variant="headingMd">
                    Zero Stock Products
                  </Text>
                  <BlockStack gap="100">
                    {zeroStockProducts.map((product: Product) => {
                      return (
                        <Button
                          key={product.id}
                          onClick={() => handleProductClick(product.id)}
                          variant="plain"
                          textAlign="left"
                          fullWidth
                        >
                          {product.name}
                        </Button>
                      );
                    })}
                    {zeroStockProducts.length === 0 && (
                      <Text as="p" variant="bodyMd">No zero stock products</Text>
                    )}
                  </BlockStack>
                </BlockStack>
              </Card>
            </InlineStack>
          </Layout.Section>
        </Layout>
      </BlockStack>
    </Page>
  );
}
