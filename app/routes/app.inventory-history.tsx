import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { Page, Layout, Card, Text, BlockStack } from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import { getLogsWithSQL } from "../services/inventory-test.server";
import { InventoryHistory } from "../components/InventoryHistory";

export async function loader({ request }: LoaderFunctionArgs) {
  // Check if this is a public access request
  const url = new URL(request.url);
  const isPublic = url.searchParams.get("public") === "true";
  const shop = url.searchParams.get("shop") || "default-shop";

  // Skip authentication for public access
  if (!isPublic) {
    await authenticate.admin(request);
  }

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

export default function InventoryHistoryPage() {
  const { logs, total, hasMore, stats, shop } = useLoaderData<typeof loader>();

  return (
    <Page>
      <TitleBar title="Inventory History Logs" />
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
                          Most Active Product
                        </Text>
                        <Text as="p" variant="bodyMd">
                          {(stats.topProducts as any)?.[0]?.productTitle || "No data"}
                        </Text>
                        {(stats.topProducts as any)?.[0] && (
                          <Text as="p" variant="bodySm" tone="subdued">
                            {(stats.topProducts as any)[0].changeCount} changes
                          </Text>
                        )}
                      </BlockStack>
                    </Card>
                  </Layout.Section>
                </Layout>
              </BlockStack>
            </Card>

            {/* Change Type Breakdown */}
            {Object.keys(stats.changesByType).length > 0 && (
              <Card>
                <BlockStack gap="400">
                  <Text as="h2" variant="headingMd">
                    Change Types
                  </Text>
                  <Layout>
                    {Object.entries(stats.changesByType as Record<string, number>).map(([type, count]) => (
                      <Layout.Section key={type} variant="oneThird">
                        <Card>
                          <BlockStack gap="200">
                            <Text as="h3" variant="headingSm" tone="subdued">
                              {type.replace('_', ' ')}
                            </Text>
                            <Text as="p" variant="headingMd">
                              {count.toLocaleString()}
                            </Text>
                          </BlockStack>
                        </Card>
                      </Layout.Section>
                    ))}
                  </Layout>
                </BlockStack>
              </Card>
            )}

            {/* Inventory History Table */}
            <InventoryHistory
              initialLogs={logs}
              initialTotal={total}
              initialHasMore={hasMore}
              shop={shop}
            />
          </BlockStack>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
