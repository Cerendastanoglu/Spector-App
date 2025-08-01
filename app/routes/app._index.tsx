import { useState, useEffect } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, useSearchParams, Form, useActionData } from "@remix-run/react";
import {
  Page,
  Layout,
  Text,
  Card,
  Button,
  BlockStack,
  InlineStack,
  TextField,
  Badge,
  Icon,
  Banner,
  EmptyState,
  Modal,
  FormLayout,
  Checkbox,
  DataTable,
  Select,
  Tooltip,
  Collapsible,
  Spinner,
} from "@shopify/polaris";
import {
  AlertTriangleIcon,
  CheckboxIcon,
  InventoryIcon,
  EmailIcon,
  CalendarIcon,
  GiftCardIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ClockIcon,
  InfoIcon,
  ViewIcon,
  HideIcon,
  RefreshIcon,
} from "@shopify/polaris-icons";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import { authenticateSession } from "../utils/session-auth.server";
import { 
  getVisibilitySettings, 
  updateVisibilitySettings 
} from "../services/storefront-visibility.server";
import { 
  cache, 
  batchGraphQLRequests, 
  transformProductData, 
  measurePerformance,
  createOptimizedResponse 
} from "../utils/performance";

export const loader = async (args: LoaderFunctionArgs) => {
  // Use optimized session token authentication for maximum speed
  const { admin } = await authenticateSession(args);
  
  // Check cache first for maximum performance
  const cacheKey = 'fast-dashboard-data';
  const cachedData = cache.get(cacheKey);
  if (cachedData) {
    console.log('Returning cached fast dashboard data');
    return createOptimizedResponse(cachedData);
  }

  try {
    // Minimal GraphQL requests for fastest loading
    const [shopData, productsData] = await measurePerformance(async () => {
      const queries = [
        {
          query: `#graphql
            query getShop {
              shop {
                email
                name
                myshopifyDomain
              }
            }`
        },
        {
          query: `#graphql
            query getProducts {
              products(first: 15) {
                edges {
                  node {
                    id
                    title
                    status
                    variants(first: 1) {
                      edges {
                        node {
                          inventoryQuantity
                          id
                        }
                      }
                    }
                  }
                }
              }
            }`
        }
      ];
      
      return await batchGraphQLRequests(admin, queries);
    }, 'Fast GraphQL batch requests');

    // Process data with minimal overhead
    const shopInfo = (await shopData)?.data?.shop || {};
    const products = (await productsData)?.data?.products?.edges?.map(({ node }: any) => ({
      id: node.id,
      name: node.title,
      status: node.status,
      stock: node.variants?.edges?.[0]?.node?.inventoryQuantity || 0,
    })) || [];

    const responseData = {
      products,
      shopInfo,
      visibilitySettings: getVisibilitySettings()
    };

    // Cache for 10 minutes for fast loading
    cache.set(cacheKey, responseData, 600000);
    
    return createOptimizedResponse(responseData);
    
  } catch (error) {
    console.error('Fast loader error:', error);
    return createOptimizedResponse({
      products: [],
      shopInfo: {},
      visibilitySettings: getVisibilitySettings()
    });
  }
};

export default function Dashboard() {
  const { products, shopInfo } = useLoaderData<typeof loader>();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedView, setSelectedView] = useState('stock-management');
  const [showStockAlert, setShowStockAlert] = useState(true);
  const [showNotificationSettings, setShowNotificationSettings] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('out-of-stock');
  const [sortBy, setSortBy] = useState('stock-asc');

  // Calculate basic metrics
  const outOfStock = products.filter((p: any) => p.stock === 0).length;
  const lowStock = products.filter((p: any) => p.stock > 0 && p.stock <= 5).length;
  const totalProducts = products.length;

  const handleRefresh = () => {
    setIsLoading(true);
    window.location.reload();
  };

  const handleViewChange = (view: string) => {
    setSelectedView(view);
  };

  const dismissAlert = () => {
    setShowStockAlert(false);
  };

  const toggleNotificationSettings = () => {
    setShowNotificationSettings(!showNotificationSettings);
  };

  // Filter and sort products
  const filteredAndSortedProducts = products
    .filter((product: any) => {
      const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesFilter = 
        (filterStatus === 'out-of-stock' && product.stock === 0) ||
        (filterStatus === 'low-stock' && product.stock > 0 && product.stock <= 5);
      
      return matchesSearch && matchesFilter;
    })
    .sort((a: any, b: any) => {
      switch (sortBy) {
        case 'stock-asc':
          return a.stock - b.stock;
        case 'stock-desc':
          return b.stock - a.stock;
        case 'name-asc':
          return a.name.localeCompare(b.name);
        case 'name-desc':
          return b.name.localeCompare(a.name);
        default:
          return 0;
      }
    });

  // For compatibility with existing code
  const filteredProducts = filteredAndSortedProducts;

  return (
    <Page>
      <TitleBar title="Spector - Inventory Management Dashboard" />
      
      {/* Stock Alert Notification Bar */}
      {showStockAlert && (outOfStock > 0 || lowStock > 0) && (
        <div style={{ marginBottom: '1rem' }}>
          <Banner
            title="Inventory Alerts"
            tone={outOfStock > 0 ? "critical" : "warning"}
            onDismiss={dismissAlert}
          >
            <BlockStack gap="200">
              {outOfStock > 0 && (
                <Text as="p" variant="bodyMd">
                  <strong>{outOfStock} products</strong> are completely out of stock and need immediate restocking.
                </Text>
              )}
              {lowStock > 0 && (
                <Text as="p" variant="bodyMd">
                  <strong>{lowStock} products</strong> are running low on inventory (5 units or less).
                </Text>
              )}
            </BlockStack>
          </Banner>
        </div>
      )}

      {/* Main Header */}
      <Card>
        <div style={{ padding: '1.5rem' }}>
          <BlockStack gap="400">
            {/* Top Row - Logo, Title, Actions */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '1rem'
            }}>
              {/* Left: Logo and Title */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontWeight: 'bold',
                  fontSize: '1.2rem'
                }}>
                  S
                </div>
                <div>
                  <Text as="h1" variant="headingLg" fontWeight="bold">
                    Spector Dashboard
                  </Text>
                  <Text as="p" variant="bodyMd" tone="subdued">
                    {shopInfo.name} • Inventory Management
                  </Text>
                </div>
              </div>

              {/* Right: Action Buttons */}
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <Button
                  variant="primary"
                  icon={EmailIcon}
                  onClick={toggleNotificationSettings}
                  pressed={showNotificationSettings}
                  tone="critical"
                >
                  Notification Settings
                </Button>
                <Button
                  onClick={handleRefresh}
                  variant="primary"
                  icon={RefreshIcon}
                  loading={isLoading}
                >
                  {isLoading ? 'Refreshing...' : 'Refresh'}
                </Button>
              </div>
            </div>

            {/* Bottom Row - Navigation Buttons */}
            <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '1rem' }}>
              <InlineStack gap="200">
                <Button
                  variant={selectedView === 'stock-management' ? 'primary' : 'tertiary'}
                  onClick={() => handleViewChange('stock-management')}
                  size="large"
                  icon={selectedView === 'stock-management' ? ChevronUpIcon : ChevronDownIcon}
                >
                  Stock Management
                </Button>
                <Button
                  variant={selectedView === 'forecasting' ? 'primary' : 'tertiary'}
                  onClick={() => handleViewChange('forecasting')}
                  size="large"
                  icon={selectedView === 'forecasting' ? ChevronUpIcon : ChevronDownIcon}
                >
                  Smart Forecasting
                </Button>
                <Button
                  variant={selectedView === 'product-tracker' ? 'primary' : 'tertiary'}
                  onClick={() => handleViewChange('product-tracker')}
                  size="large"
                  icon={selectedView === 'product-tracker' ? ChevronUpIcon : ChevronDownIcon}
                >
                  Product Tracker
                </Button>
                <Button
                  variant={selectedView === 'inventory-history' ? 'primary' : 'tertiary'}
                  onClick={() => handleViewChange('inventory-history')}
                  size="large"
                  icon={selectedView === 'inventory-history' ? ChevronUpIcon : ChevronDownIcon}
                >
                  History & Analytics
                </Button>
              </InlineStack>
            </div>
          </BlockStack>
        </div>
      </Card>

      {/* Notification Settings Panel */}
      {showNotificationSettings && (
        <div style={{ marginTop: '1rem' }}>
          <Card>
            <Collapsible
              open={showNotificationSettings}
              id="notification-settings"
              transition={{duration: '200ms', timingFunction: 'ease-in-out'}}
            >
              <div style={{ padding: '1.5rem', borderTop: '2px solid #dc2626' }}>
                <BlockStack gap="400">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text as="h2" variant="headingMd" fontWeight="semibold">
                      Notification Settings
                    </Text>
                    <Button variant="tertiary" onClick={toggleNotificationSettings}>
                      Close
                    </Button>
                  </div>
                  
                  <Layout>
                    <Layout.Section variant="oneThird">
                      <Card>
                        <div style={{ padding: '1rem' }}>
                          <BlockStack gap="300">
                            <div style={{ textAlign: 'center' }}>
                              <Icon source={EmailIcon} />
                              <Text as="h3" variant="headingSm" fontWeight="medium">
                                Email Alerts
                              </Text>
                            </div>
                            <BlockStack gap="200">
                              <Checkbox label="Out of stock alerts" checked />
                              <Checkbox label="Low stock warnings" checked />
                              <Checkbox label="Daily reports" />
                            </BlockStack>
                            <Button variant="primary" fullWidth size="slim">
                              Configure Email
                            </Button>
                          </BlockStack>
                        </div>
                      </Card>
                    </Layout.Section>

                    <Layout.Section variant="oneThird">
                      <Card>
                        <div style={{ padding: '1rem' }}>
                          <BlockStack gap="300">
                            <div style={{ textAlign: 'center' }}>
                              <Icon source={ViewIcon} />
                              <Text as="h3" variant="headingSm" fontWeight="medium">
                                Slack Integration
                              </Text>
                            </div>
                            <div style={{ textAlign: 'center', padding: '1rem', background: '#f8fafc', borderRadius: '6px' }}>
                              <Text as="p" variant="bodySm" tone="subdued">
                                Not connected
                              </Text>
                            </div>
                            <Button variant="primary" fullWidth size="slim">
                              Connect Slack
                            </Button>
                          </BlockStack>
                        </div>
                      </Card>
                    </Layout.Section>

                    <Layout.Section variant="oneThird">
                      <Card>
                        <div style={{ padding: '1rem' }}>
                          <BlockStack gap="300">
                            <div style={{ textAlign: 'center' }}>
                              <Icon source={InfoIcon} />
                              <Text as="h3" variant="headingSm" fontWeight="medium">
                                Thresholds
                              </Text>
                            </div>
                            <BlockStack gap="200">
                              <TextField
                                label="Low Stock"
                                type="number"
                                value="5"
                                onChange={() => {}}
                                autoComplete="off"
                                size="slim"
                              />
                              <TextField
                                label="Critical"
                                type="number"
                                value="0"
                                onChange={() => {}}
                                autoComplete="off"
                                size="slim"
                              />
                            </BlockStack>
                            <Button variant="primary" fullWidth size="slim">
                              Save Changes
                            </Button>
                          </BlockStack>
                        </div>
                      </Card>
                    </Layout.Section>
                  </Layout>
                </BlockStack>
              </div>
            </Collapsible>
          </Card>
        </div>
      )}

      {/* Main Content */}
      <div style={{ marginTop: '1.5rem' }}>
        {selectedView === 'stock-management' && (
          <Card>
            <div style={{ padding: '1.5rem' }}>
              <BlockStack gap="500">
                {/* Section Header - Properly Aligned */}
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'flex-start',
                  gap: '0.75rem',
                  paddingBottom: '0.5rem',
                  borderBottom: '2px solid #f1f5f9',
                  width: '100%'
                }}>
                  <Text as="h2" variant="headingLg" fontWeight="bold" alignment="start">
                    Stock Management
                  </Text>
                  <div style={{ marginLeft: 'auto' }}>
                    <Badge tone="info" size="medium">{`${filteredProducts.length} items`}</Badge>
                  </div>
                </div>

                {/* Enhanced Filters and Search */}
                <Card roundedAbove="sm">
                  <div style={{ padding: '1.25rem' }}>
                    <BlockStack gap="400">
                      <Text as="h3" variant="headingMd" fontWeight="medium">
                        Filters & Search
                      </Text>
                      
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: '2fr 1fr 1fr auto',
                        gap: '1rem',
                        alignItems: 'flex-end'
                      }}>
                        <TextField
                          label="Search products"
                          placeholder="Search by product name or SKU..."
                          value={searchQuery}
                          onChange={setSearchQuery}
                          autoComplete="off"
                          clearButton
                          onClearButtonClick={() => setSearchQuery('')}
                        />
                        
                        <Select
                          label="Filter by status"
                          options={[
                            {label: 'Out of Stock Only', value: 'out-of-stock'},
                            {label: 'Low Stock (≤5)', value: 'low-stock'},
                          ]}
                          value={filterStatus}
                          onChange={setFilterStatus}
                        />
                        
                        <Select
                          label="Sort by"
                          options={[
                            {label: 'Stock Level (Low to High)', value: 'stock-asc'},
                            {label: 'Stock Level (High to Low)', value: 'stock-desc'},
                            {label: 'Product Name (A-Z)', value: 'name-asc'},
                            {label: 'Product Name (Z-A)', value: 'name-desc'},
                          ]}
                          value={sortBy}
                          onChange={setSortBy}
                        />
                        
                        <Button variant="primary" icon={RefreshIcon}>
                          Apply
                        </Button>
                      </div>

                      {/* Filter Results Summary */}
                      <div style={{
                        display: 'flex',
                        gap: '0.75rem',
                        alignItems: 'center',
                        padding: '0.75rem',
                        backgroundColor: '#f8fafc',
                        borderRadius: '6px',
                        borderLeft: '3px solid #0ea5e9'
                      }}>
                        <Text as="p" variant="bodyMd" fontWeight="medium">
                          Results: <strong>{filteredProducts.length}</strong> of <strong>{products.length}</strong> products
                        </Text>
                        {outOfStock > 0 && (
                          <Badge tone="critical" size="small">{`${outOfStock} Critical`}</Badge>
                        )}
                        {lowStock > 0 && (
                          <Badge tone="warning" size="small">{`${lowStock} Low Stock`}</Badge>
                        )}
                        {searchQuery && (
                          <Badge tone="info" size="small">{`"${searchQuery}"`}</Badge>
                        )}
                      </div>
                    </BlockStack>
                  </div>
                </Card>
                
                {/* Compact Product List */}
                <Card roundedAbove="sm">
                  <div style={{ padding: '0' }}>
                    {filteredProducts.map((product: any, index: number) => (
                      <div 
                        key={product.id} 
                        style={{
                          position: 'relative',
                          padding: '1rem 1.5rem',
                          borderBottom: index < filteredProducts.length - 1 ? '1px solid #f1f5f9' : 'none',
                          borderLeft: `3px solid ${
                            product.stock === 0 ? '#dc2626' : 
                            product.stock <= 5 ? '#f59e0b' : '#16a34a'
                          }`,
                          cursor: 'pointer',
                          transition: 'all 0.2s ease-in-out',
                        }}
                        onMouseEnter={(e) => {
                          const bg = product.stock === 0 ? '#fef2f2' : 
                                    product.stock <= 5 ? '#fffbeb' : '#f0fdf4';
                          e.currentTarget.style.backgroundColor = bg;
                          e.currentTarget.style.transform = 'translateX(4px)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent';
                          e.currentTarget.style.transform = 'translateX(0)';
                        }}
                      >
                        <div style={{ 
                          display: 'grid',
                          gridTemplateColumns: '2fr auto 1fr auto auto',
                          gap: '1rem',
                          alignItems: 'center'
                        }}>
                          {/* Product Info */}
                          <div style={{ minWidth: 0 }}>
                            <Text as="h3" variant="bodyLg" fontWeight="semibold" truncate>
                              {product.name}
                            </Text>
                            <Text as="p" variant="bodySm" tone="subdued">
                              SKU: {product.id}
                            </Text>
                          </div>
                          
                          {/* Stock Count */}
                          <div style={{ 
                            textAlign: 'center',
                            minWidth: '80px'
                          }}>
                            <Text as="p" variant="headingSm" fontWeight="bold">
                              {product.stock}
                            </Text>
                            <Text as="p" variant="bodySm" tone="subdued">
                              units
                            </Text>
                          </div>
                          
                          {/* Status Badge */}
                          <div style={{ textAlign: 'center' }}>
                            {product.stock === 0 && (
                              <Badge tone="critical">Out of Stock</Badge>
                            )}
                            {product.stock > 0 && product.stock <= 5 && (
                              <Badge tone="warning">Low Stock</Badge>
                            )}
                            {product.stock > 5 && (
                              <Badge tone="success">In Stock</Badge>
                            )}
                          </div>
                          
                          {/* Quick Actions */}
                          <div style={{ 
                            display: 'flex', 
                            gap: '0.25rem',
                            justifyContent: 'flex-end'
                          }}>
                            <Tooltip content="View in storefront">
                              <Button size="micro" variant="tertiary" icon={ViewIcon} />
                            </Tooltip>
                            <Tooltip content="Edit in Shopify Admin">
                              <Button size="micro" variant="tertiary" icon={InfoIcon} />
                            </Tooltip>
                          </div>
                          
                          {/* Priority Indicator */}
                          <div style={{ width: '4px' }}>
                            {product.stock === 0 && (
                              <div style={{
                                width: '4px',
                                height: '100%',
                                backgroundColor: '#dc2626',
                                borderRadius: '2px'
                              }} />
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>

                {filteredProducts.length === 0 && (
                  <Card>
                    <div style={{ padding: '3rem', textAlign: 'center' }}>
                      <EmptyState
                        heading="No products found"
                        image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                        action={{
                          content: 'Clear Filters',
                          onAction: () => {
                            setSearchQuery('');
                            setFilterStatus('all');
                          }
                        }}
                      >
                        <Text as="p" variant="bodyMd" tone="subdued">
                          {searchQuery || filterStatus !== 'all'
                            ? "Try adjusting your search or filter criteria"
                            : "No products available"}
                        </Text>
                      </EmptyState>
                    </div>
                  </Card>
                )}
              </BlockStack>
            </div>
          </Card>
        )}

        {selectedView === 'forecasting' && (
          <Card>
            <div style={{ padding: '1.5rem' }}>
              <BlockStack gap="500">
                {/* Section Header - Properly Aligned */}
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'flex-start',
                  gap: '0.75rem',
                  paddingBottom: '0.5rem',
                  borderBottom: '2px solid #f1f5f9',
                  width: '100%'
                }}>
                  <Text as="h2" variant="headingLg" fontWeight="bold" alignment="start">
                    Smart Forecasting
                  </Text>
                  <div style={{ marginLeft: 'auto' }}>
                    <Badge tone="attention" size="medium">Coming Soon</Badge>
                  </div>
                </div>
                
                <Card>
                  <div style={{ padding: '4rem 2rem', textAlign: 'center' }}>
                    <BlockStack gap="500">
                      <div style={{
                        width: '80px',
                        height: '80px',
                        background: '#f0f9ff',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto',
                        border: '2px solid #0ea5e9'
                      }}>
                        <Icon source={CalendarIcon} />
                      </div>
                      <BlockStack gap="300">
                        <Text as="h2" variant="headingLg" fontWeight="bold">
                          Smart Inventory Forecasting
                        </Text>
                        <Text as="p" variant="bodyLg" tone="subdued">
                          AI-powered predictions coming soon! Get insights on demand patterns, 
                          seasonal trends, and optimal reorder points.
                        </Text>
                      </BlockStack>
                      <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                        <Button variant="primary" size="large">
                          Join Beta Waitlist
                        </Button>
                        <Button variant="secondary" size="large">
                          Learn More
                        </Button>
                      </div>
                    </BlockStack>
                  </div>
                </Card>
              </BlockStack>
            </div>
          </Card>
        )}

        {selectedView === 'product-tracker' && (
          <Card>
            <div style={{ padding: '1.5rem' }}>
              <BlockStack gap="500">
                {/* Section Header - Properly Aligned */}
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'flex-start',
                  gap: '0.75rem',
                  paddingBottom: '0.5rem',
                  borderBottom: '2px solid #f1f5f9',
                  width: '100%'
                }}>
                  <Text as="h2" variant="headingLg" fontWeight="bold" alignment="start">
                    Product Tracker
                  </Text>
                  <div style={{ marginLeft: 'auto' }}>
                    <Badge tone="attention" size="medium">Beta Access</Badge>
                  </div>
                </div>
                
                <Card>
                  <div style={{ padding: '4rem 2rem', textAlign: 'center' }}>
                    <BlockStack gap="500">
                      <div style={{
                        width: '80px',
                        height: '80px',
                        background: '#fef3c7',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto',
                        border: '2px solid #f59e0b'
                      }}>
                        <Icon source={GiftCardIcon} />
                      </div>
                      <BlockStack gap="300">
                        <Text as="h2" variant="headingLg" fontWeight="bold">
                          Product Performance Tracker
                        </Text>
                        <Text as="p" variant="bodyLg" tone="subdued">
                          Track sales velocity, identify top performers, and spot slow-moving inventory.
                          Advanced analytics dashboard coming soon!
                        </Text>
                      </BlockStack>
                      <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                        <Button variant="primary" size="large">
                          Get Early Access
                        </Button>
                        <Button variant="secondary" size="large">
                          View Demo
                        </Button>
                      </div>
                    </BlockStack>
                  </div>
                </Card>
              </BlockStack>
            </div>
          </Card>
        )}

        {selectedView === 'inventory-history' && (
          <Card>
            <div style={{ padding: '1.5rem' }}>
              <BlockStack gap="500">
                {/* Section Header - Properly Aligned */}
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'flex-start',
                  gap: '0.75rem',
                  paddingBottom: '0.5rem',
                  borderBottom: '2px solid #f1f5f9',
                  width: '100%'
                }}>
                  <Text as="h2" variant="headingLg" fontWeight="bold" alignment="start">
                    History & Analytics
                  </Text>
                  <div style={{ marginLeft: 'auto' }}>
                    <Badge tone="attention" size="medium">In Development</Badge>
                  </div>
                </div>
                
                <Card>
                  <div style={{ padding: '4rem 2rem', textAlign: 'center' }}>
                    <BlockStack gap="500">
                      <div style={{
                        width: '80px',
                        height: '80px',
                        background: '#f3e8ff',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto',
                        border: '2px solid #8b5cf6'
                      }}>
                        <Icon source={ClockIcon} />
                      </div>
                      <BlockStack gap="300">
                        <Text as="h2" variant="headingLg" fontWeight="bold">
                          History & Analytics
                        </Text>
                        <Text as="p" variant="bodyLg" tone="subdued">
                          Comprehensive inventory history with detailed logs, stock movements, 
                          and audit trails. Advanced reporting features in development.
                        </Text>
                      </BlockStack>
                      <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                        <Button variant="primary" size="large">
                          Preview Features
                        </Button>
                        <Button variant="secondary" size="large">
                          Request Demo
                        </Button>
                      </div>
                    </BlockStack>
                  </div>
                </Card>
              </BlockStack>
            </div>
          </Card>
        )}
      </div>
    </Page>
  );
}
