import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, Link } from "@remix-run/react";
import { ProductTracker } from "../components/ProductTracker";
import {
  Button,
  InlineStack,
  Text,
  Icon,
  BlockStack,
} from "@shopify/polaris";
import {
  ArrowLeftIcon,
  HomeIcon,
  InventoryIcon,
  AlertTriangleIcon,
} from "@shopify/polaris-icons";

// Public route - no authentication required
export const loader = async ({ request }: LoaderFunctionArgs) => {
  // TODO: Replace with real Shopify Storefront API call
  // For demonstration, using realistic product data that represents actual store products
  
  const products = [
    {
      id: "gid://shopify/Product/1",
      name: "Organic Cotton T-Shirt - Navy",
      stock: 3,
      createdAt: "2024-03-15",
      lastSoldDate: "2025-01-18",
      salesVelocity: { daily: 0.2, weekly: 1.4, monthly: 6 },
      price: 29.99,
      category: "Clothing"
    },
    {
      id: "gid://shopify/Product/2", 
      name: "Bluetooth Wireless Earbuds",
      stock: 0,
      createdAt: "2024-02-01",
      lastSoldDate: "2024-12-28",
      salesVelocity: { daily: 0.8, weekly: 5.6, monthly: 24 },
      price: 79.99,
      category: "Electronics"
    },
    {
      id: "gid://shopify/Product/3",
      name: "Handcrafted Ceramic Mug",
      stock: 12,
      createdAt: "2024-01-10",
      lastSoldDate: "2024-11-22",
      salesVelocity: { daily: 0.1, weekly: 0.7, monthly: 3 },
      price: 18.50,
      category: "Home & Garden"
    },
    {
      id: "gid://shopify/Product/4",
      name: "Premium Coffee Blend - Dark Roast",
      stock: 8,
      createdAt: "2024-06-20",
      lastSoldDate: "2025-01-15",
      salesVelocity: { daily: 0.4, weekly: 2.8, monthly: 12 },
      price: 24.99,
      category: "Food & Beverage"
    },
    {
      id: "gid://shopify/Product/5",
      name: "Vintage Leather Wallet",
      stock: 2,
      createdAt: "2024-04-05",
      lastSoldDate: "2024-10-30",
      salesVelocity: { daily: 0.05, weekly: 0.35, monthly: 1.5 },
      price: 89.99,
      category: "Accessories"
    },
    {
      id: "gid://shopify/Product/6",
      name: "Eco-Friendly Water Bottle",
      stock: 25,
      createdAt: "2024-07-12",
      lastSoldDate: "2025-01-20",
      salesVelocity: { daily: 0.3, weekly: 2.1, monthly: 9 },
      price: 34.99,
      category: "Lifestyle"
    },
    {
      id: "gid://shopify/Product/7",
      name: "Silk Scarf - Floral Pattern",
      stock: 1,
      createdAt: "2024-01-25",
      lastSoldDate: "2024-08-15",
      salesVelocity: { daily: 0.02, weekly: 0.14, monthly: 0.6 },
      price: 149.99,
      category: "Fashion"
    },
    {
      id: "gid://shopify/Product/8",
      name: "Smart Fitness Tracker",
      stock: 6,
      createdAt: "2024-09-01",
      lastSoldDate: "2025-01-12",
      salesVelocity: { daily: 0.15, weekly: 1.05, monthly: 4.5 },
      price: 199.99,
      category: "Electronics"
    },
    {
      id: "gid://shopify/Product/9",
      name: "Artisan Soap Set - Lavender",
      stock: 18,
      createdAt: "2024-05-22",
      lastSoldDate: "2024-09-10",
      salesVelocity: { daily: 0.08, weekly: 0.56, monthly: 2.4 },
      price: 32.00,
      category: "Beauty & Personal Care"
    },
    {
      id: "gid://shopify/Product/10",
      name: "Wooden Cutting Board - Bamboo",
      stock: 4,
      createdAt: "2024-08-30",
      lastSoldDate: "2024-11-05",
      salesVelocity: { daily: 0.12, weekly: 0.84, monthly: 3.6 },
      price: 45.99,
      category: "Kitchen & Dining"
    }
  ];

  // Return as JSON response for the component
  return json({ products });
};

export default function PublicProductTracker() {
  const { products } = useLoaderData<typeof loader>();

  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: '#f6f6f7',
      padding: '2rem 1rem'
    }}>
      {/* Add styles to prevent icon flash */}
      <style dangerouslySetInnerHTML={{
        __html: `
          .Polaris-Icon svg {
            width: 20px !important;
            height: 20px !important;
          }
          .Polaris-Button__Icon .Polaris-Icon svg {
            width: 16px !important;
            height: 16px !important;
          }
        `
      }} />
      
      <div style={{ 
        maxWidth: '1200px', 
        margin: '0 auto',
        backgroundColor: 'white',
        borderRadius: '8px',
        padding: '2rem',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
      }}>
        {/* Navigation Header */}
        <div style={{ marginBottom: '2rem' }}>
          <InlineStack gap="300" blockAlign="center" wrap={false}>
            <Button
              onClick={() => window.location.href = '/dashboard'}
              icon={ArrowLeftIcon}
              variant="tertiary"
              size="medium"
            >
              Back to Dashboard
            </Button>
            
            <div style={{ flex: 1 }}>
              <InlineStack gap="200" blockAlign="center">
                <Icon source={HomeIcon} tone="subdued" />
                <Text as="span" variant="bodyMd" tone="subdued">
                  Dashboard
                </Text>
                <Text as="span" variant="bodyMd" tone="subdued">→</Text>
                <Text as="span" variant="bodyMd" fontWeight="medium">
                  Product Tracker
                </Text>
              </InlineStack>
            </div>
          </InlineStack>
        </div>

        {/* Header with Logo and Title */}
        <div style={{ 
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          padding: '2rem',
          marginBottom: '2rem',
          borderRadius: '8px',
          color: 'white'
        }}>
          <InlineStack gap="400" blockAlign="center">
            {/* Logo Placeholder */}
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
              <Icon source={InventoryIcon} tone="base" />
            </div>
            
            {/* Title and Subtitle */}
            <BlockStack gap="100">
              <Text as="h1" variant="heading2xl" fontWeight="bold" tone="inherit">
                Spector
              </Text>
              <Text as="p" variant="bodyLg" tone="inherit" fontWeight="medium">
                Product Performance Tracker - AI-powered insights & optimization
              </Text>
            </BlockStack>
            
            {/* Status Indicators */}
            <div style={{ marginLeft: 'auto' }}>
              <InlineStack gap="200">
                <div style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.15)',
                  padding: '0.5rem 1rem',
                  borderRadius: '20px',
                  border: '1px solid rgba(255, 255, 255, 0.2)'
                }}>
                  <InlineStack gap="100" blockAlign="center">
                    <div style={{
                      width: '8px',
                      height: '8px',
                      backgroundColor: '#10b981',
                      borderRadius: '50%'
                    }}></div>
                    <Text as="span" variant="bodySm" tone="inherit" fontWeight="medium">
                      Public Access
                    </Text>
                  </InlineStack>
                </div>
                
                <div style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.15)',
                  padding: '0.5rem 1rem',
                  borderRadius: '20px',
                  border: '1px solid rgba(255, 255, 255, 0.2)'
                }}>
                  <InlineStack gap="100" blockAlign="center">
                    <Icon source={AlertTriangleIcon} tone="base" />
                    <Text as="span" variant="bodySm" tone="inherit" fontWeight="medium">
                      {products.length} Products
                    </Text>
                  </InlineStack>
                </div>
              </InlineStack>
            </div>
          </InlineStack>
        </div>
        
        <ProductTracker products={products} isPublic={true} />
        
        {/* Footer Navigation */}
        <div style={{ 
          marginTop: '3rem', 
          padding: '1.5rem',
          borderTop: '1px solid #e5e5e5',
          textAlign: 'center'
        }}>
          <InlineStack gap="300" align="center">
            <Link to="/app">
              <Button
                variant="primary"
                size="large"
              >
                Return to Dashboard
              </Button>
            </Link>
            <Text as="p" variant="bodySm" tone="subdued">
              Access more inventory management tools from the main dashboard
            </Text>
          </InlineStack>
        </div>
      </div>
    </div>
  );
}
