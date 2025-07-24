import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { Page, Layout, Card, Text, BlockStack } from "@shopify/polaris";
import { getLogsWithSQL } from "../services/inventory-test.server";
import { InventoryHistory } from "../components/InventoryHistory";

export async function loader({ request }: LoaderFunctionArgs) {
  // Completely public route - no authentication whatsoever
  const url = new URL(request.url);
  const shop = url.searchParams.get("shop") || "default-shop";

  try {
    // Get initial data for the page using SQL
    const logs = await getLogsWithSQL(shop);
    const logsArray = Array.isArray(logs) ? logs : [];

    return json({
      logs: logsArray.map((log: any) => ({
        ...log,
        timestamp: log.timestamp?.toISOString?.() || new Date().toISOString(),
      })) || [],
      total: logsArray.length,
      hasMore: false,
      stats: {
        totalChanges: logsArray.length,
        changesByType: {},
        changesBySource: {},
        topProducts: [],
        recentActivity: logsArray.filter((log: any) => 
          new Date(log.timestamp) > new Date(Date.now() - 24 * 60 * 60 * 1000)
        ).length,
      },
      shop,
    });
  } catch (error) {
    console.error("Error loading inventory history page:", error);
    return json({
      logs: [],
      total: 0,
      hasMore: false,
      stats: {
        totalChanges: 0,
        changesByType: {},
        changesBySource: {},
        topProducts: [],
        recentActivity: 0,
      },
      shop,
    });
  }
}

export default function PublicInventoryHistoryPage() {
  const { logs, total, hasMore, stats, shop } = useLoaderData<typeof loader>();

  return (
    <html>
      <head>
        <title>Inventory History Logs</title>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <link
          rel="stylesheet"
          href="https://unpkg.com/@shopify/polaris@latest/build/esm/styles.css"
        />
      </head>
      <body>
        <div style={{ padding: "20px" }}>
          <Page>
            <div style={{ marginBottom: "24px" }}>
              <Text as="h1" variant="headingXl">
                Inventory History Logs
              </Text>
              <Text as="p" variant="bodyMd" tone="subdued">
                Shop: {shop}
              </Text>
            </div>
            <Layout>
              <Layout.Section>
                <BlockStack gap="500">
                  {/* Summary Statistics */}
                  <Card>
                    <BlockStack gap="400">
                      <Text as="h2" variant="headingMd">
                        Activity Summary
                      </Text>
                      <Layout>
                        <Layout.Section variant="oneThird">
                          <Card>
                            <BlockStack gap="200">
                              <Text as="h3" variant="headingSm" tone="subdued">
                                Total Changes
                              </Text>
                              <Text as="p" variant="headingLg">
                                {stats.totalChanges.toLocaleString()}
                              </Text>
                            </BlockStack>
                          </Card>
                        </Layout.Section>
                        <Layout.Section variant="oneThird">
                          <Card>
                            <BlockStack gap="200">
                              <Text as="h3" variant="headingSm" tone="subdued">
                                Recent Activity (24h)
                              </Text>
                              <Text as="p" variant="headingLg">
                                {stats.recentActivity.toLocaleString()}
                              </Text>
                            </BlockStack>
                          </Card>
                        </Layout.Section>
                        <Layout.Section variant="oneThird">
                          <Card>
                            <BlockStack gap="200">
                              <Text as="h3" variant="headingSm" tone="subdued">
                                Top Products
                              </Text>
                              <Text as="p" variant="headingLg">
                                {stats.topProducts.length}
                              </Text>
                            </BlockStack>
                          </Card>
                        </Layout.Section>
                      </Layout>
                    </BlockStack>
                  </Card>

                  {/* Inventory History Table */}
                  <InventoryHistory
                    initialLogs={logs}
                    initialTotal={total}
                    initialHasMore={hasMore}
                    shop={shop}
                    isPublic={true}
                  />
                </BlockStack>
              </Layout.Section>
            </Layout>
          </Page>
        </div>
        <script src="https://unpkg.com/@shopify/polaris@latest/build/umd/index.js"></script>
      </body>
    </html>
  );
}
