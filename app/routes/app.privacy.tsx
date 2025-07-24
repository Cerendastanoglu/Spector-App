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
  Icon,
  Divider,
} from "@shopify/polaris";
import {
  LockIcon,
  ExternalIcon,
  HomeIcon,
} from "@shopify/polaris-icons";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);
  return null;
};

export default function Privacy() {
  return (
    <Page>
      <TitleBar title="Privacy Policy" />
      
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
            <Icon source={LockIcon} tone="base" />
          </div>
          
          <BlockStack gap="100">
            <Text as="h1" variant="heading2xl" fontWeight="bold" tone="inherit">
              Privacy Policy
            </Text>
            <Text as="p" variant="bodyLg" tone="inherit" fontWeight="medium">
              Spector - Data Protection and Privacy
            </Text>
          </BlockStack>
          
          <div style={{ marginLeft: 'auto' }}>
            <Button
              onClick={() => window.open('/app', '_self')}
              variant="primary"
              icon={HomeIcon}
            >
              Back to Dashboard
            </Button>
          </div>
        </InlineStack>
      </div>

      <Layout>
        <Layout.Section>
          <BlockStack gap="600">
            
            {/* Last Updated */}
            <Card>
              <Text as="p" variant="bodyMd" tone="subdued">
                <strong>Last Updated:</strong> July 23, 2025
              </Text>
            </Card>

            {/* Introduction */}
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingLg" fontWeight="semibold">
                  1. Introduction
                </Text>
                <Text as="p" variant="bodyMd">
                  This Privacy Policy describes how Spector ("we," "us," or "our") collects, uses, and protects information when you use our inventory management application for Shopify stores.
                </Text>
                <Text as="p" variant="bodyMd">
                  We are committed to protecting your privacy and ensuring the security of your data. This policy explains what information we collect, how we use it, and your rights regarding your data.
                </Text>
              </BlockStack>
            </Card>

            {/* Information We Collect */}
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingLg" fontWeight="semibold">
                  2. Information We Collect
                </Text>
                <Text as="p" variant="bodyMd">
                  To provide our inventory management services, we collect the following types of information:
                </Text>
                
                <BlockStack gap="300">
                  <Text as="h3" variant="headingMd" fontWeight="semibold">
                    Shopify Store Data
                  </Text>
                  <BlockStack gap="200">
                    <Text as="p" variant="bodyMd">• <strong>Product Information:</strong> Product names, descriptions, variants, and inventory levels</Text>
                    <Text as="p" variant="bodyMd">• <strong>Order Data:</strong> Historical order information for sales forecasting</Text>
                    <Text as="p" variant="bodyMd">• <strong>Store Information:</strong> Shop name, email address, and basic store settings</Text>
                    <Text as="p" variant="bodyMd">• <strong>Inventory Levels:</strong> Current and historical inventory quantities</Text>
                  </BlockStack>
                </BlockStack>

                <BlockStack gap="300">
                  <Text as="h3" variant="headingMd" fontWeight="semibold">
                    App Usage Data
                  </Text>
                  <BlockStack gap="200">
                    <Text as="p" variant="bodyMd">• Email notification preferences and settings</Text>
                    <Text as="p" variant="bodyMd">• Alert thresholds and configuration</Text>
                    <Text as="p" variant="bodyMd">• App interaction logs for support purposes</Text>
                  </BlockStack>
                </BlockStack>
              </BlockStack>
            </Card>

            {/* How We Use Information */}
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingLg" fontWeight="semibold">
                  3. How We Use Your Information
                </Text>
                <Text as="p" variant="bodyMd">
                  We use the collected information solely to provide and improve our services:
                </Text>
                <BlockStack gap="200">
                  <Text as="p" variant="bodyMd">• <strong>Inventory Monitoring:</strong> Track stock levels and generate stock alerts</Text>
                  <Text as="p" variant="bodyMd">• <strong>Sales Forecasting:</strong> Analyze historical data to predict future inventory needs</Text>
                  <Text as="p" variant="bodyMd">• <strong>Email Notifications:</strong> Send alerts about low inventory and stockout predictions</Text>
                  <Text as="p" variant="bodyMd">• <strong>Analytics:</strong> Provide inventory insights and reporting</Text>
                  <Text as="p" variant="bodyMd">• <strong>Support:</strong> Assist with technical issues and app functionality</Text>
                </BlockStack>
              </BlockStack>
            </Card>

            {/* Data Security */}
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingLg" fontWeight="semibold">
                  4. Data Security and Protection
                </Text>
                <Text as="p" variant="bodyMd">
                  We take data security seriously and implement appropriate measures to protect your information:
                </Text>
                <BlockStack gap="200">
                  <Text as="p" variant="bodyMd">• <strong>Encryption:</strong> All data transmission is encrypted using industry-standard protocols</Text>
                  <Text as="p" variant="bodyMd">• <strong>Access Control:</strong> Limited access to data on a need-to-know basis</Text>
                  <Text as="p" variant="bodyMd">• <strong>Data Storage:</strong> Secure storage with regular backups and monitoring</Text>
                  <Text as="p" variant="bodyMd">• <strong>Compliance:</strong> Adherence to Shopify's security requirements and best practices</Text>
                </BlockStack>
              </BlockStack>
            </Card>

            {/* Data Sharing */}
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingLg" fontWeight="semibold">
                  5. Data Sharing and Third Parties
                </Text>
                <Text as="p" variant="bodyMd">
                  We do not sell, trade, or rent your personal information to third parties. We may share information only in the following circumstances:
                </Text>
                <BlockStack gap="200">
                  <Text as="p" variant="bodyMd">• <strong>Shopify Integration:</strong> Data is accessed through Shopify's API as required for app functionality</Text>
                  <Text as="p" variant="bodyMd">• <strong>Service Providers:</strong> Trusted third-party services that help us operate the app (email delivery, hosting)</Text>
                  <Text as="p" variant="bodyMd">• <strong>Legal Requirements:</strong> When required by law or to protect our rights and safety</Text>
                </BlockStack>
                <Text as="p" variant="bodyMd">
                  All third-party services are carefully vetted and required to maintain appropriate data protection standards.
                </Text>
              </BlockStack>
            </Card>

            {/* Data Retention */}
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingLg" fontWeight="semibold">
                  6. Data Retention
                </Text>
                <Text as="p" variant="bodyMd">
                  We retain your data only as long as necessary to provide our services:
                </Text>
                <BlockStack gap="200">
                  <Text as="p" variant="bodyMd">• <strong>Active Use:</strong> Data is retained while the app is installed and active</Text>
                  <Text as="p" variant="bodyMd">• <strong>Historical Data:</strong> Inventory history is kept for analytics and forecasting purposes</Text>
                  <Text as="p" variant="bodyMd">• <strong>App Uninstallation:</strong> Data is deleted within 30 days of app removal</Text>
                  <Text as="p" variant="bodyMd">• <strong>Legal Compliance:</strong> Some data may be retained longer if required by law</Text>
                </BlockStack>
              </BlockStack>
            </Card>

            {/* Your Rights */}
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingLg" fontWeight="semibold">
                  7. Your Rights and Choices
                </Text>
                <Text as="p" variant="bodyMd">
                  You have several rights regarding your data:
                </Text>
                <BlockStack gap="200">
                  <Text as="p" variant="bodyMd">• <strong>Access:</strong> Request information about what data we have collected</Text>
                  <Text as="p" variant="bodyMd">• <strong>Correction:</strong> Request corrections to inaccurate data</Text>
                  <Text as="p" variant="bodyMd">• <strong>Deletion:</strong> Request deletion of your data (subject to legal requirements)</Text>
                  <Text as="p" variant="bodyMd">• <strong>Control:</strong> Manage notification preferences and app settings</Text>
                  <Text as="p" variant="bodyMd">• <strong>Uninstall:</strong> Remove the app at any time to stop data collection</Text>
                </BlockStack>
              </BlockStack>
            </Card>

            {/* Cookies and Tracking */}
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingLg" fontWeight="semibold">
                  8. Cookies and Tracking
                </Text>
                <Text as="p" variant="bodyMd">
                  The app uses minimal tracking technologies:
                </Text>
                <BlockStack gap="200">
                  <Text as="p" variant="bodyMd">• <strong>Session Management:</strong> Necessary cookies for app authentication and functionality</Text>
                  <Text as="p" variant="bodyMd">• <strong>Preferences:</strong> Storage of user settings and configurations</Text>
                  <Text as="p" variant="bodyMd">• <strong>No Analytics:</strong> We do not use third-party analytics or advertising cookies</Text>
                </BlockStack>
              </BlockStack>
            </Card>

            {/* Updates to Privacy Policy */}
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingLg" fontWeight="semibold">
                  9. Updates to This Privacy Policy
                </Text>
                <Text as="p" variant="bodyMd">
                  We may update this Privacy Policy from time to time to reflect changes in our practices or for legal reasons. When we make changes:
                </Text>
                <BlockStack gap="200">
                  <Text as="p" variant="bodyMd">• We will update the "Last Updated" date at the top of this policy</Text>
                  <Text as="p" variant="bodyMd">• Significant changes will be communicated through the app or email</Text>
                  <Text as="p" variant="bodyMd">• Your continued use of the app constitutes acceptance of the updated policy</Text>
                </BlockStack>
              </BlockStack>
            </Card>

            {/* Contact Information */}
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingLg" fontWeight="semibold">
                  10. Contact Us
                </Text>
                <Text as="p" variant="bodyMd">
                  If you have any questions about this Privacy Policy or your data, please contact us:
                </Text>
                <InlineStack gap="300">
                  <Button
                    onClick={() => window.open('mailto:ceren@cerensatelier.art?subject=Privacy Policy Inquiry', '_blank')}
                    variant="primary"
                    icon={ExternalIcon}
                  >
                    Contact Us
                  </Button>
                </InlineStack>
                <Text as="p" variant="bodyMd" tone="subdued">
                  Email: ceren@cerensatelier.art
                </Text>
              </BlockStack>
            </Card>

          </BlockStack>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
