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
  FileIcon,
  ExternalIcon,
  HomeIcon,
} from "@shopify/polaris-icons";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);
  return null;
};

export default function Terms() {
  return (
    <Page>
      <TitleBar title="Terms of Service" />
      
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
            <Icon source={FileIcon} tone="base" />
          </div>
          
          <BlockStack gap="100">
            <Text as="h1" variant="heading2xl" fontWeight="bold" tone="inherit">
              Terms of Service
            </Text>
            <Text as="p" variant="bodyLg" tone="inherit" fontWeight="medium">
              Spector - Terms and Conditions
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
                  Welcome to Spector ("the App"). These Terms of Service ("Terms") govern your use of our inventory management application designed for Shopify merchants. By installing, accessing, or using the App, you agree to be bound by these Terms.
                </Text>
                <Text as="p" variant="bodyMd">
                  The App is developed and maintained by Ceren's Atelier Art ("we," "us," or "our"). If you disagree with any part of these Terms, please do not use the App.
                </Text>
              </BlockStack>
            </Card>

            {/* App Description */}
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingLg" fontWeight="semibold">
                  2. App Description and Features
                </Text>
                <Text as="p" variant="bodyMd">
                  Spector provides the following features:
                </Text>
                <BlockStack gap="200">
                  <Text as="p" variant="bodyMd">• Real-time inventory monitoring and stock alerts</Text>
                  <Text as="p" variant="bodyMd">• AI-powered sales forecasting and stockout predictions</Text>
                  <Text as="p" variant="bodyMd">• Email notifications for inventory management</Text>
                  <Text as="p" variant="bodyMd">• Inventory history tracking and analytics</Text>
                  <Text as="p" variant="bodyMd">• Integration with Shopify admin for product management</Text>
                </BlockStack>
              </BlockStack>
            </Card>

            {/* User Responsibilities */}
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingLg" fontWeight="semibold">
                  3. User Responsibilities
                </Text>
                <Text as="p" variant="bodyMd">
                  By using the App, you agree to:
                </Text>
                <BlockStack gap="200">
                  <Text as="p" variant="bodyMd">• Provide accurate and up-to-date information</Text>
                  <Text as="p" variant="bodyMd">• Use the App only for legitimate business purposes</Text>
                  <Text as="p" variant="bodyMd">• Comply with all applicable laws and Shopify's Terms of Service</Text>
                  <Text as="p" variant="bodyMd">• Not attempt to reverse engineer, modify, or distribute the App</Text>
                  <Text as="p" variant="bodyMd">• Verify inventory levels before making business decisions</Text>
                </BlockStack>
              </BlockStack>
            </Card>

            {/* Data and Privacy */}
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingLg" fontWeight="semibold">
                  4. Data and Privacy
                </Text>
                <Text as="p" variant="bodyMd">
                  The App accesses and processes certain data from your Shopify store to provide its services:
                </Text>
                <BlockStack gap="200">
                  <Text as="p" variant="bodyMd">• Product information and inventory levels</Text>
                  <Text as="p" variant="bodyMd">• Order data for sales forecasting</Text>
                  <Text as="p" variant="bodyMd">• Shop information for notifications</Text>
                </BlockStack>
                <Text as="p" variant="bodyMd">
                  We are committed to protecting your data. Please refer to our Privacy Policy for detailed information about how we collect, use, and protect your data.
                </Text>
              </BlockStack>
            </Card>

            {/* Disclaimers */}
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingLg" fontWeight="semibold">
                  5. Disclaimers and Limitations
                </Text>
                <Text as="p" variant="bodyMd">
                  <strong>Important:</strong> The App provides estimates and predictions based on available data. You acknowledge that:
                </Text>
                <BlockStack gap="200">
                  <Text as="p" variant="bodyMd">• Inventory data may not reflect real-time changes</Text>
                  <Text as="p" variant="bodyMd">• Sales forecasts are estimates and should be used as guidance only</Text>
                  <Text as="p" variant="bodyMd">• You are responsible for verifying actual inventory levels</Text>
                  <Text as="p" variant="bodyMd">• The App is provided "as is" without warranties of any kind</Text>
                </BlockStack>
              </BlockStack>
            </Card>

            {/* Limitation of Liability */}
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingLg" fontWeight="semibold">
                  6. Limitation of Liability
                </Text>
                <Text as="p" variant="bodyMd">
                  To the maximum extent permitted by law, we shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including but not limited to:
                </Text>
                <BlockStack gap="200">
                  <Text as="p" variant="bodyMd">• Loss of profits or business opportunities</Text>
                  <Text as="p" variant="bodyMd">• Inventory shortages or overstocking</Text>
                  <Text as="p" variant="bodyMd">• Data loss or corruption</Text>
                  <Text as="p" variant="bodyMd">• Service interruptions</Text>
                </BlockStack>
              </BlockStack>
            </Card>

            {/* Termination */}
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingLg" fontWeight="semibold">
                  7. Termination
                </Text>
                <Text as="p" variant="bodyMd">
                  You may terminate your use of the App at any time by uninstalling it from your Shopify store. We reserve the right to terminate or suspend access to the App at our discretion, with or without notice, for conduct that we believe violates these Terms or is harmful to other users or us.
                </Text>
              </BlockStack>
            </Card>

            {/* Updates to Terms */}
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingLg" fontWeight="semibold">
                  8. Updates to Terms
                </Text>
                <Text as="p" variant="bodyMd">
                  We may update these Terms from time to time. When we do, we will update the "Last Updated" date at the top of this page. Your continued use of the App after any changes constitutes acceptance of the new Terms.
                </Text>
              </BlockStack>
            </Card>

            {/* Governing Law */}
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingLg" fontWeight="semibold">
                  9. Governing Law
                </Text>
                <Text as="p" variant="bodyMd">
                  These Terms shall be governed by and construed in accordance with applicable laws. Any disputes arising from these Terms or your use of the App shall be subject to the exclusive jurisdiction of the competent courts.
                </Text>
              </BlockStack>
            </Card>

            {/* Contact Information */}
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingLg" fontWeight="semibold">
                  10. Contact Information
                </Text>
                <Text as="p" variant="bodyMd">
                  If you have any questions about these Terms, please contact us:
                </Text>
                <InlineStack gap="300">
                  <Button
                    onClick={() => window.open('mailto:ceren@cerensatelier.art?subject=Terms of Service Inquiry', '_blank')}
                    variant="primary"
                    icon={ExternalIcon}
                  >
                    Contact Us
                  </Button>
                </InlineStack>
              </BlockStack>
            </Card>

          </BlockStack>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
