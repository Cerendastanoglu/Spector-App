import type { LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  BlockStack,
  InlineStack,
  Text,
  Button,
  Badge,
  Icon,
  Divider,
  Banner,
  List,
} from "@shopify/polaris";
import {
  QuestionCircleIcon,
  EmailIcon,
  ExternalIcon,
  InventoryIcon,
  AlertTriangleIcon,
  CalendarIcon,
  SettingsIcon,
  CartIcon,
  NotificationIcon,
} from "@shopify/polaris-icons";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);
  return null;
};

export default function Help() {
  return (
    <Page>
      <TitleBar title="Help & Documentation" />
      
      {/* Header */}
      <div style={{ 
        background: '#1f2937',
        padding: '2rem',
        marginBottom: '1.5rem',
        borderRadius: '8px',
        color: 'white'
      }}>
        <InlineStack gap="400" blockAlign="center">
          <div style={{
            width: '60px',
            height: '60px',
            backgroundColor: 'rgba(255, 255, 255, 0.2)',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '2px solid rgba(255, 255, 255, 0.3)'
          }}>
            <Icon source={QuestionCircleIcon} tone="base" />
          </div>
          
          <BlockStack gap="100">
            <Text as="h1" variant="heading2xl" fontWeight="bold" tone="inherit">
              Spector Documentation
            </Text>
            <Text as="p" variant="bodyLg" tone="inherit" fontWeight="medium">
              Complete guide to managing your inventory with intelligent alerts and forecasting
            </Text>
          </BlockStack>
        </InlineStack>
      </div>

      <Layout>
        <Layout.Section>
          <BlockStack gap="600">
            
            {/* Quick Start Guide */}
            <Card>
              <BlockStack gap="400">
                <InlineStack gap="300" blockAlign="center">
                  <Icon source={InventoryIcon} tone="base" />
                  <Text as="h2" variant="headingLg" fontWeight="semibold">
                    Quick Start Guide
                  </Text>
                </InlineStack>
                
                <BlockStack gap="300">
                  <Text as="h3" variant="headingMd" fontWeight="medium">
                    Getting Started in 3 Easy Steps
                  </Text>
                  
                  <Card background="bg-surface-secondary" padding="400">
                    <BlockStack gap="300">
                      <InlineStack gap="200" blockAlign="center">
                        <Badge tone="info">Step 1</Badge>
                        <Text as="h4" variant="headingSm" fontWeight="medium">
                          Set Your Inventory Threshold
                        </Text>
                      </InlineStack>
                      <Text as="p" variant="bodyMd">
                        Navigate to the main dashboard and adjust the inventory threshold to match your business needs. 
                        This determines when products are considered "low stock."
                      </Text>
                    </BlockStack>
                  </Card>
                  
                  <Card background="bg-surface-secondary" padding="400">
                    <BlockStack gap="300">
                      <InlineStack gap="200" blockAlign="center">
                        <Badge tone="warning">Step 2</Badge>
                        <Text as="h4" variant="headingSm" fontWeight="medium">
                          Configure Email Notifications
                        </Text>
                      </InlineStack>
                      <Text as="p" variant="bodyMd">
                        Set up email alerts to receive automatic notifications when products reach low stock levels. 
                        Test your settings to ensure proper delivery.
                      </Text>
                    </BlockStack>
                  </Card>
                  
                  <Card background="bg-surface-secondary" padding="400">
                    <BlockStack gap="300">
                      <InlineStack gap="200" blockAlign="center">
                        <Badge tone="success">Step 3</Badge>
                        <Text as="h4" variant="headingSm" fontWeight="medium">
                          Monitor & Manage
                        </Text>
                      </InlineStack>
                      <Text as="p" variant="bodyMd">
                        Use the forecasting tools to predict stockouts and the inventory history to track all changes. 
                        Click on any product to manage it directly in Shopify Admin.
                      </Text>
                    </BlockStack>
                  </Card>
                </BlockStack>
              </BlockStack>
            </Card>

            {/* Features Overview */}
            <Card>
              <BlockStack gap="400">
                <InlineStack gap="300" blockAlign="center">
                  <Icon source={CartIcon} tone="base" />
                  <Text as="h2" variant="headingLg" fontWeight="semibold">
                    Features Overview
                  </Text>
                </InlineStack>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
                  <Card background="bg-surface-secondary" padding="400">
                    <BlockStack gap="200">
                      <InlineStack gap="200" blockAlign="center">
                        <Icon source={AlertTriangleIcon} tone="critical" />
                        <Text as="h3" variant="headingMd" fontWeight="medium">
                          Real-time Alerts
                        </Text>
                      </InlineStack>
                      <Text as="p" variant="bodyMd">
                        Get instant notifications when products fall below your threshold. 
                        View low stock and out-of-stock products at a glance.
                      </Text>
                    </BlockStack>
                  </Card>
                  
                  <Card background="bg-surface-secondary" padding="400">
                    <BlockStack gap="200">
                      <InlineStack gap="200" blockAlign="center">
                        <Icon source={CalendarIcon} tone="info" />
                        <Text as="h3" variant="headingMd" fontWeight="medium">
                          AI Forecasting
                        </Text>
                      </InlineStack>
                      <Text as="p" variant="bodyMd">
                        Predict when products will run out based on real sales data. 
                        Get advance warnings to reorder before stockouts occur.
                      </Text>
                    </BlockStack>
                  </Card>
                  
                  <Card background="bg-surface-secondary" padding="400">
                    <BlockStack gap="200">
                      <InlineStack gap="200" blockAlign="center">
                        <Icon source={NotificationIcon} tone="success" />
                        <Text as="h3" variant="headingMd" fontWeight="medium">
                          Email Notifications
                        </Text>
                      </InlineStack>
                      <Text as="p" variant="bodyMd">
                        Automated email alerts sent to your shop's email address. 
                        Never miss a low stock situation again.
                      </Text>
                    </BlockStack>
                  </Card>
                  
                  <Card background="bg-surface-secondary" padding="400">
                    <BlockStack gap="200">
                      <InlineStack gap="200" blockAlign="center">
                        <Icon source={InventoryIcon} tone="base" />
                        <Text as="h3" variant="headingMd" fontWeight="medium">
                          Inventory History
                        </Text>
                      </InlineStack>
                      <Text as="p" variant="bodyMd">
                        Complete timeline of all inventory changes with detailed logs. 
                        Track who changed what and when for full transparency.
                      </Text>
                    </BlockStack>
                  </Card>
                </div>
              </BlockStack>
            </Card>

            {/* Understanding Forecasts */}
            <Card>
              <BlockStack gap="400">
                <InlineStack gap="300" blockAlign="center">
                  <Icon source={CalendarIcon} tone="base" />
                  <Text as="h2" variant="headingLg" fontWeight="semibold">
                    Understanding Forecasts
                  </Text>
                </InlineStack>
                
                <BlockStack gap="300">
                  <Text as="p" variant="bodyMd">
                    Our AI-powered forecasting system analyzes your real sales data to predict when products will run out of stock.
                  </Text>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
                    <Card background="bg-surface-critical" padding="300">
                      <InlineStack gap="200" blockAlign="center">
                        <Badge tone="critical">Critical</Badge>
                        <Text as="span" variant="bodyMd" fontWeight="medium">
                          ≤3 days to stockout
                        </Text>
                      </InlineStack>
                      <Text as="p" variant="bodySm" tone="subdued">
                        Immediate action required. Reorder now to avoid stockouts.
                      </Text>
                    </Card>
                    
                    <Card background="bg-surface-warning" padding="300">
                      <InlineStack gap="200" blockAlign="center">
                        <Badge tone="warning">Warning</Badge>
                        <Text as="span" variant="bodyMd" fontWeight="medium">
                          4-7 days to stockout
                        </Text>
                      </InlineStack>
                      <Text as="p" variant="bodySm" tone="subdued">
                        Start planning your reorder. Consider lead times from suppliers.
                      </Text>
                    </Card>
                    
                    <Card background="bg-surface-success" padding="300">
                      <InlineStack gap="200" blockAlign="center">
                        <Badge tone="success">Safe</Badge>
                        <Text as="span" variant="bodyMd" fontWeight="medium">
                          8+ days of stock
                        </Text>
                      </InlineStack>
                      <Text as="p" variant="bodySm" tone="subdued">
                        Healthy stock levels. Monitor for any sudden sales spikes.
                      </Text>
                    </Card>
                  </div>
                </BlockStack>
              </BlockStack>
            </Card>

            {/* Troubleshooting */}
            <Card>
              <BlockStack gap="400">
                <InlineStack gap="300" blockAlign="center">
                  <Icon source={SettingsIcon} tone="base" />
                  <Text as="h2" variant="headingLg" fontWeight="semibold">
                    Troubleshooting
                  </Text>
                </InlineStack>
                
                <BlockStack gap="300">
                  <Text as="h3" variant="headingMd" fontWeight="medium">
                    Common Issues & Solutions
                  </Text>
                  
                  <Card background="bg-surface-secondary" padding="400">
                    <BlockStack gap="200">
                      <Text as="h4" variant="headingSm" fontWeight="medium">
                        📧 Not receiving email notifications?
                      </Text>
                      <List type="bullet">
                        <List.Item>Check your spam/junk folder</List.Item>
                        <List.Item>Verify your shop's email address is correct</List.Item>
                        <List.Item>Use the "Test Email" button to verify delivery</List.Item>
                        <List.Item>Ensure email notifications are enabled in settings</List.Item>
                      </List>
                    </BlockStack>
                  </Card>
                  
                  <Card background="bg-surface-secondary" padding="400">
                    <BlockStack gap="200">
                      <Text as="h4" variant="headingSm" fontWeight="medium">
                        📊 Forecasts seem inaccurate?
                      </Text>
                      <List type="bullet">
                        <List.Item>Forecasts are based on recent sales data (last 30 days)</List.Item>
                        <List.Item>New products may have limited data for accurate predictions</List.Item>
                        <List.Item>Seasonal variations can affect forecast accuracy</List.Item>
                        <List.Item>Use forecasts as guidance, not absolute predictions</List.Item>
                      </List>
                    </BlockStack>
                  </Card>
                  
                  <Card background="bg-surface-secondary" padding="400">
                    <BlockStack gap="200">
                      <Text as="h4" variant="headingSm" fontWeight="medium">
                        🔄 Data not updating?
                      </Text>
                      <List type="bullet">
                        <List.Item>Use the reload button in the header to refresh data</List.Item>
                        <List.Item>Data syncs automatically but may have a few minutes delay</List.Item>
                        <List.Item>Check your internet connection</List.Item>
                        <List.Item>Try refreshing your browser page</List.Item>
                      </List>
                    </BlockStack>
                  </Card>
                </BlockStack>
              </BlockStack>
            </Card>

            {/* Best Practices */}
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingLg" fontWeight="semibold">
                  Best Practices
                </Text>
                
                <BlockStack gap="300">
                  <Card background="bg-surface-secondary" padding="400">
                    <BlockStack gap="200">
                      <Text as="h3" variant="headingMd" fontWeight="medium">
                        💡 Setting Optimal Thresholds
                      </Text>
                      <List type="bullet">
                        <List.Item>Consider your supplier lead times when setting thresholds</List.Item>
                        <List.Item>Account for seasonal demand variations</List.Item>
                        <List.Item>Set lower thresholds for fast-moving items</List.Item>
                        <List.Item>Review and adjust thresholds regularly based on performance</List.Item>
                      </List>
                    </BlockStack>
                  </Card>
                  
                  <Card background="bg-surface-secondary" padding="400">
                    <BlockStack gap="200">
                      <Text as="h3" variant="headingMd" fontWeight="medium">
                        📈 Using Inventory History
                      </Text>
                      <List type="bullet">
                        <List.Item>Review history regularly to identify patterns</List.Item>
                        <List.Item>Look for unusual inventory changes that might indicate issues</List.Item>
                        <List.Item>Use the data to improve your reordering processes</List.Item>
                        <List.Item>Track which products have the most inventory changes</List.Item>
                      </List>
                    </BlockStack>
                  </Card>
                </BlockStack>
              </BlockStack>
            </Card>

            {/* Related Resources */}
            <Card>
              <BlockStack gap="400">
                <InlineStack gap="300" blockAlign="center">
                  <Icon source={ExternalIcon} tone="base" />
                  <Text as="h2" variant="headingLg" fontWeight="semibold">
                    Related Shopify Resources
                  </Text>
                </InlineStack>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
                  <Card background="bg-surface-secondary" padding="400">
                    <BlockStack gap="300">
                      <Text as="h3" variant="headingMd" fontWeight="medium">
                        📚 Shopify Documentation
                      </Text>
                      <BlockStack gap="200">
                        <Button
                          url="https://help.shopify.com/en/manual/products/inventory"
                          external
                          variant="plain"
                          icon={ExternalIcon}
                        >
                          Managing Inventory
                        </Button>
                        <Button
                          url="https://help.shopify.com/en/manual/products/inventory/getting-started-with-inventory"
                          external
                          variant="plain"
                          icon={ExternalIcon}
                        >
                          Getting Started with Inventory
                        </Button>
                        <Button
                          url="https://help.shopify.com/en/manual/products/inventory/inventory-csv"
                          external
                          variant="plain"
                          icon={ExternalIcon}
                        >
                          Inventory CSV Import/Export
                        </Button>
                      </BlockStack>
                    </BlockStack>
                  </Card>
                  
                  <Card background="bg-surface-secondary" padding="400">
                    <BlockStack gap="300">
                      <Text as="h3" variant="headingMd" fontWeight="medium">
                        🛍️ Product Management
                      </Text>
                      <BlockStack gap="200">
                        <Button
                          url="https://help.shopify.com/en/manual/products"
                          external
                          variant="plain"
                          icon={ExternalIcon}
                        >
                          Product Management Guide
                        </Button>
                        <Button
                          url="https://help.shopify.com/en/manual/products/variants"
                          external
                          variant="plain"
                          icon={ExternalIcon}
                        >
                          Product Variants
                        </Button>
                        <Button
                          url="https://help.shopify.com/en/manual/products/inventory/inventory-tracking"
                          external
                          variant="plain"
                          icon={ExternalIcon}
                        >
                          Inventory Tracking
                        </Button>
                      </BlockStack>
                    </BlockStack>
                  </Card>
                </div>
              </BlockStack>
            </Card>

            {/* Contact Support */}
            <Card>
              <BlockStack gap="400">
                <InlineStack gap="300" blockAlign="center">
                  <Icon source={EmailIcon} tone="base" />
                  <Text as="h2" variant="headingLg" fontWeight="semibold">
                    Need Additional Help?
                  </Text>
                </InlineStack>
                
                <Banner title="Get personalized support" tone="info">
                  <p>
                    Our support team is here to help you get the most out of Spector. 
                    Whether you need help with setup, configuration, or have questions about features, we're ready to assist.
                  </p>
                </Banner>
                
                <InlineStack gap="300" align="center">
                  <Button
                    onClick={() => window.open('mailto:ceren@cerensatelier.art?subject=Spector - Support Request', '_blank')}
                    variant="primary"
                    size="large"
                    icon={EmailIcon}
                  >
                    Contact Support
                  </Button>
                  <Text as="p" variant="bodyMd" tone="subdued">
                    Response time: Usually within 24 hours
                  </Text>
                </InlineStack>
              </BlockStack>
            </Card>

          </BlockStack>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
