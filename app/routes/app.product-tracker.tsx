import type { LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { Page, Layout, Card } from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import { ProductTracker } from "../components/ProductTracker";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin } = await authenticate.admin(request);

  // Get products with creation dates and sales data
  const response = await admin.graphql(
    `#graphql
      query getProductsForTracking {
        products(first: 50) {
          edges {
            node {
              id
              title
              createdAt
              totalInventory
              variants(first: 1) {
                edges {
                  node {
                    inventoryQuantity
                    price
                    id
                  }
                }
              }
            }
          }
        }
      }`
  );

  const responseJson = await response.json();
  const products = responseJson.data.products.edges.map(({ node }: any) => ({
    id: node.id,
    name: node.title,
    stock: node.variants.edges[0]?.node.inventoryQuantity || 0,
    createdAt: node.createdAt,
    price: parseFloat(node.variants.edges[0]?.node.price || "0"),
    variantId: node.variants.edges[0]?.node.id
  }));

  return {
    products
  };
};

export default function ProductTrackerPage() {
  const { products } = useLoaderData<typeof loader>();

  return (
    <>
      <TitleBar title="Product Tracker" />
      <Page fullWidth>
        <Layout>
          <Layout.Section>
            <ProductTracker products={products} />
          </Layout.Section>
        </Layout>
      </Page>
    </>
  );
}
