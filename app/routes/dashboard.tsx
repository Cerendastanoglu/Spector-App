import { json } from "@remix-run/node";
import { Link } from "@remix-run/react";
import {
  Card,
  BlockStack,
  InlineStack,
  Text,
  Button,
  Icon,
} from "@shopify/polaris";
import {
  InventoryIcon,
  AlertTriangleIcon,
} from "@shopify/polaris-icons";

export const loader = async () => {
  return json({});
};

export default function PublicDashboard() {
  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: '#f6f6f7',
      padding: '2rem 1rem'
    }}>
      <div style={{ 
        maxWidth: '1200px', 
        margin: '0 auto',
        backgroundColor: 'white',
        borderRadius: '8px',
        padding: '2rem',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <h1 style={{ 
            fontSize: '2.5rem', 
            fontWeight: 'bold', 
            marginBottom: '1rem',
            color: '#202223'
          }}>
            Spector
          </h1>
          <p style={{ 
            color: '#6D7175',
            fontSize: '1.2rem',
            marginBottom: '2rem'
          }}>
            Professional tools for tracking inventory, forecasting stockouts, and optimizing product performance
          </p>
        </div>

        {/* Features Grid */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
          gap: '2rem',
          marginBottom: '3rem'
        }}>
          {/* Product Tracker Card */}
          <Card>
            <BlockStack gap="300">
              <InlineStack align="space-between" blockAlign="center">
                <Text as="h3" variant="headingMd">
                  Product Tracker
                </Text>
                <Icon source={AlertTriangleIcon} tone="subdued" />
              </InlineStack>
              
              <Text as="p" variant="bodyMd" tone="subdued">
                Track stale products and get AI-powered suggestions for clearance sales and bundle promotions
              </Text>
              
              <Button 
                url="/product-tracker"
                variant="primary"
                size="large"
              >
                Open Product Tracker
              </Button>
            </BlockStack>
          </Card>

          {/* Admin Dashboard Card */}
          <Card>
            <BlockStack gap="300">
              <InlineStack align="space-between" blockAlign="center">
                <Text as="h3" variant="headingMd">
                  Admin Dashboard
                </Text>
                <Icon source={InventoryIcon} tone="subdued" />
              </InlineStack>
              
              <Text as="p" variant="bodyMd" tone="subdued">
                Full inventory management with real-time alerts, email notifications, and sales forecasting
              </Text>
              
              <Button 
                url="/app"
                variant="secondary"
                size="large"
              >
                Admin Login Required
              </Button>
            </BlockStack>
          </Card>
        </div>

        {/* Info Section */}
        <div style={{ 
          backgroundColor: '#f8f9fa', 
          padding: '2rem', 
          borderRadius: '8px',
          textAlign: 'center'
        }}>
          <Text as="h3" variant="headingMd" fontWeight="medium">
            About This Tool
          </Text>
          <div style={{ marginTop: '1rem' }}>
            <Text as="p" variant="bodyMd" tone="subdued">
              This inventory management suite provides both public and admin tools for managing your product inventory. 
              The Product Tracker is available to everyone, while the Admin Dashboard requires authentication for 
              accessing sensitive store data and configuration settings.
            </Text>
          </div>
        </div>
      </div>
    </div>
  );
}
