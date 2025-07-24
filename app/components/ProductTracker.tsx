import { useState, useEffect } from "react";
import { useFetcher } from "@remix-run/react";
import {
  Card,
  BlockStack,
  InlineStack,
  Text,
  Button,
  Badge,
  Icon,
  Banner,
  DataTable,
  Select,
  Tooltip,
  Modal,
  List,
  Divider,
} from "@shopify/polaris";
import {
  ClockIcon,
  AlertTriangleIcon,
  PackageIcon,
  DiscountIcon,
  ChartVerticalIcon,
  InfoIcon,
} from "@shopify/polaris-icons";

interface Product {
  id: string;
  name: string;
  stock: number;
  createdAt: string;
  lastSoldDate?: string;
  salesVelocity?: {
    daily: number;
    weekly: number;
    monthly: number;
  };
  price?: number;
  category?: string;
}

interface StaleProduct extends Product {
  daysInStore: number;
  daysSinceLastSale: number;
  stalenessLevel: 'fresh' | 'aging' | 'stale' | 'critical';
  suggestions: ProductSuggestion[];
}

interface ProductSuggestion {
  type: 'discount' | 'bundle' | 'reposition' | 'seasonal' | 'marketing';
  title: string;
  description: string;
  urgency: 'low' | 'medium' | 'high';
  expectedImpact: string;
  actionSteps: string[];
}

interface ProductTrackerProps {
  products?: Product[];
  isPublic?: boolean;
}

export function ProductTracker({ products = [], isPublic = false }: ProductTrackerProps) {
  const [staleProducts, setStaleProducts] = useState<StaleProduct[]>([]);
  const [stalenessThreshold, setStalenessThreshold] = useState('30');
  const [selectedProduct, setSelectedProduct] = useState<StaleProduct | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [lastAnalysis, setLastAnalysis] = useState<Date>(new Date());
  
  const fetcher = useFetcher();

  // Generate AI-powered suggestions for stale products
  const generateProductSuggestions = (product: StaleProduct): ProductSuggestion[] => {
    const suggestions: ProductSuggestion[] = [];
    const threshold = parseInt(stalenessThreshold);
    
    // Discount/Clearance suggestions
    if (product.daysSinceLastSale > threshold) {
      const discountPercentage = Math.min(50, Math.floor(product.daysSinceLastSale / 10) * 5 + 15);
      suggestions.push({
        type: 'discount',
        title: `${discountPercentage}% Clearance Sale`,
        description: `Product hasn't sold in ${product.daysSinceLastSale} days. Implement graduated discount to move inventory.`,
        urgency: product.daysSinceLastSale > threshold * 2 ? 'high' : 'medium',
        expectedImpact: `Could increase sales velocity by 200-400%`,
        actionSteps: [
          `Start with ${Math.floor(discountPercentage/2)}% discount`,
          `Increase to ${discountPercentage}% if no sales in 7 days`,
          `Feature in "Clearance" section`,
          `Send email to previous customers`
        ]
      });
    }

    // Bundle suggestions
    const bundleSuggestions = getBundleSuggestions(product);
    suggestions.push(...bundleSuggestions);

    // Seasonal/Marketing suggestions
    if (product.daysInStore > 60) {
      suggestions.push({
        type: 'seasonal',
        title: 'Seasonal Repositioning',
        description: 'Long-term inventory may benefit from seasonal marketing angle or use case expansion.',
        urgency: 'medium',
        expectedImpact: 'New customer segments, 30-60% sales increase',
        actionSteps: [
          'Research seasonal trends for this product category',
          'Create seasonal landing page',
          'Update product description with seasonal benefits',
          'Run targeted ads for seasonal keywords'
        ]
      });
    }

    // Marketing repositioning
    if (product.salesVelocity && product.salesVelocity.daily < 0.1) {
      suggestions.push({
        type: 'marketing',
        title: 'Product Positioning Review',
        description: 'Low sales velocity suggests product positioning or description may need optimization.',
        urgency: 'medium',
        expectedImpact: 'Better conversion rates, clearer value proposition',
        actionSteps: [
          'Analyze competitor product descriptions',
          'A/B test new product titles',
          'Add customer reviews and social proof',
          'Improve product photography',
          'Highlight unique selling points'
        ]
      });
    }

    // Inventory management
    if (product.stock > 20 && product.daysSinceLastSale > threshold) {
      suggestions.push({
        type: 'reposition',
        title: 'Inventory Liquidation Strategy',
        description: 'High stock levels with poor sales velocity require immediate action to prevent dead inventory.',
        urgency: 'high',
        expectedImpact: 'Recover inventory investment, free up warehouse space',
        actionSteps: [
          'Create "Buy 2 Get 1 Free" promotion',
          'Offer to wholesale/bulk buyers',
          'Consider donation for tax benefits',
          'Use as customer acquisition loss leader'
        ]
      });
    }

    return suggestions.sort((a, b) => {
      const urgencyWeight = { high: 3, medium: 2, low: 1 };
      return urgencyWeight[b.urgency] - urgencyWeight[a.urgency];
    });
  };

  // Generate bundle suggestions based on product category and complementary items
  const getBundleSuggestions = (product: StaleProduct): ProductSuggestion[] => {
    const suggestions: ProductSuggestion[] = [];
    
    // Find potential bundle partners (simplified logic)
    const potentialBundles = [
      'Starter Kit Bundle - Pair with popular bestsellers',
      'Complete Solution Bundle - Add complementary accessories',
      'Beginner\'s Bundle - Combine with tutorial/guide products',
      'Seasonal Bundle - Group with seasonal items',
      'Value Pack Bundle - Multiple quantities at discount'
    ];

    const randomBundle = potentialBundles[Math.floor(Math.random() * potentialBundles.length)];
    
    suggestions.push({
      type: 'bundle',
      title: randomBundle,
      description: `Create attractive bundle to move slow-selling inventory while increasing average order value.`,
      urgency: 'medium',
      expectedImpact: '40-80% increase in product movement',
      actionSteps: [
        'Identify 2-3 complementary products',
        'Price bundle at 15-25% discount vs individual items',
        'Create appealing bundle name and description',
        'Feature bundle prominently on homepage',
        'Promote via email and social media'
      ]
    });

    return suggestions;
  };

  // Analyze product staleness
  const analyzeProductStaleness = () => {
    const threshold = parseInt(stalenessThreshold);
    const now = new Date();
    
    // Use provided products (from props) or fall back to mock data
    const productList = products.length > 0 ? products : [
      {
        id: "1",
        name: "Vintage Leather Jacket",
        stock: 15,
        createdAt: "2024-08-15",
        lastSoldDate: "2024-12-20",
        salesVelocity: { daily: 0.05, weekly: 0.35, monthly: 1.5 },
        price: 299.99,
        category: "Fashion"
      },
      {
        id: "2", 
        name: "Summer Beach Towel Set",
        stock: 42,
        createdAt: "2024-06-01",
        lastSoldDate: "2024-09-15",
        salesVelocity: { daily: 0.02, weekly: 0.14, monthly: 0.6 },
        price: 49.99,
        category: "Home"
      },
      {
        id: "3",
        name: "Wireless Headphones Pro",
        stock: 8,
        createdAt: "2024-05-10",
        lastSoldDate: "2025-01-10",
        salesVelocity: { daily: 0.3, weekly: 2.1, monthly: 9 },
        price: 199.99,
        category: "Electronics"
      },
      {
        id: "4",
        name: "Artisan Coffee Blend",
        stock: 25,
        createdAt: "2024-04-20",
        lastSoldDate: "2024-11-30",
        salesVelocity: { daily: 0.08, weekly: 0.56, monthly: 2.4 },
        price: 24.99,
        category: "Food"
      }
    ];

    const analyzed = productList.map(product => {
      const createdDate = new Date(product.createdAt);
      const lastSaleDate = product.lastSoldDate ? new Date(product.lastSoldDate) : createdDate;
      
      const daysInStore = Math.floor((now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
      const daysSinceLastSale = Math.floor((now.getTime() - lastSaleDate.getTime()) / (1000 * 60 * 60 * 24));
      
      let stalenessLevel: 'fresh' | 'aging' | 'stale' | 'critical';
      if (daysSinceLastSale <= threshold / 2) stalenessLevel = 'fresh';
      else if (daysSinceLastSale <= threshold) stalenessLevel = 'aging';
      else if (daysSinceLastSale <= threshold * 2) stalenessLevel = 'stale';
      else stalenessLevel = 'critical';

      const staleProduct: StaleProduct = {
        ...product,
        daysInStore,
        daysSinceLastSale,
        stalenessLevel,
        suggestions: []
      };

      staleProduct.suggestions = generateProductSuggestions(staleProduct);
      return staleProduct;
    });

    // Filter to show only aging, stale, or critical products
    const filtered = analyzed.filter(p => p.stalenessLevel !== 'fresh');
    setStaleProducts(filtered);
    setLastAnalysis(new Date());
  };

  // Initial analysis
  useEffect(() => {
    analyzeProductStaleness();
  }, [stalenessThreshold]);

  const getStalenessColor = (level: string) => {
    switch (level) {
      case 'fresh': return 'success';
      case 'aging': return 'warning';
      case 'stale': return 'critical';
      case 'critical': return 'critical';
      default: return 'info';
    }
  };

  const getStalenessIcon = (level: string) => {
    switch (level) {
      case 'fresh': return ChartVerticalIcon;
      case 'aging': return ClockIcon;
      case 'stale': return AlertTriangleIcon;
      case 'critical': return AlertTriangleIcon;
      default: return InfoIcon;
    }
  };

  const tableRows = staleProducts.map(product => [
    product.name,
    <Badge key={product.id} tone={getStalenessColor(product.stalenessLevel)} size="small">
      {product.stalenessLevel.toUpperCase()}
    </Badge>,
    `${product.daysInStore} days`,
    `${product.daysSinceLastSale} days`,
    `${product.stock} units`,
    product.price ? `$${product.price}` : 'N/A',
    <Button
      key={`btn-${product.id}`}
      size="slim"
      onClick={() => {
        setSelectedProduct(product);
        setShowSuggestions(true);
      }}
    >
      View Suggestions ({product.suggestions.length.toString()})
    </Button>
  ]);

  return (
    <Card>
      <BlockStack gap="400">
        {/* Header */}
        <InlineStack align="space-between" blockAlign="center">
          <BlockStack gap="100">
            <Text variant="headingLg" as="h2">
              Product Tracker & Stale Inventory Alerts
            </Text>
            <Text variant="bodyMd" as="p" tone="subdued">
              Track product age and get AI-powered suggestions for moving stale inventory
            </Text>
          </BlockStack>
          <InlineStack gap="200">
            <Select
              label="Staleness threshold"
              labelHidden
              options={[
                { label: '15 days', value: '15' },
                { label: '30 days', value: '30' },
                { label: '45 days', value: '45' },
                { label: '60 days', value: '60' },
                { label: '90 days', value: '90' }
              ]}
              value={stalenessThreshold}
              onChange={setStalenessThreshold}
            />
            <Button onClick={analyzeProductStaleness} variant="primary">
              Refresh Analysis
            </Button>
          </InlineStack>
        </InlineStack>

        {/* Summary Banner */}
        {staleProducts.length > 0 && (
          <Banner tone="warning">
            <Text as="p">
              Found {staleProducts.length} products that haven't sold in {stalenessThreshold}+ days. 
              Review AI-powered suggestions to boost sales through discounts, bundles, and repositioning.
            </Text>
          </Banner>
        )}

        {/* Analytics Summary */}
        <InlineStack gap="400" wrap={true}>
          <Card background="bg-surface-warning">
            <BlockStack gap="200">
              <InlineStack gap="200" blockAlign="center">
                <Icon source={ClockIcon} tone="warning" />
                <Text variant="headingSm" as="h3">Aging Products</Text>
              </InlineStack>
              <Text variant="headingXl" as="p">
                {staleProducts.filter(p => p.stalenessLevel === 'aging').length}
              </Text>
              <Text variant="bodySm" as="p" tone="subdued">
                Products approaching staleness threshold
              </Text>
            </BlockStack>
          </Card>

          <Card background="bg-surface-critical">
            <BlockStack gap="200">
              <InlineStack gap="200" blockAlign="center">
                <Icon source={AlertTriangleIcon} tone="critical" />
                <Text variant="headingSm" as="h3">Stale Products</Text>
              </InlineStack>
              <Text variant="headingXl" as="p">
                {staleProducts.filter(p => ['stale', 'critical'].includes(p.stalenessLevel)).length}
              </Text>
              <Text variant="bodySm" as="p" tone="subdued">
                Products requiring immediate action
              </Text>
            </BlockStack>
          </Card>

          <Card>
            <BlockStack gap="200">
              <InlineStack gap="200" blockAlign="center">
                <Icon source={DiscountIcon} />
                <Text variant="headingSm" as="h3">Potential Revenue</Text>
              </InlineStack>
              <Text variant="headingXl" as="p">
                ${staleProducts.reduce((total, p) => total + (p.price || 0) * p.stock, 0).toFixed(0)}
              </Text>
              <Text variant="bodySm" as="p" tone="subdued">
                Tied up in stale inventory
              </Text>
            </BlockStack>
          </Card>
        </InlineStack>

        {/* Product Table */}
        {staleProducts.length > 0 ? (
          <DataTable
            columnContentTypes={['text', 'text', 'text', 'text', 'numeric', 'text', 'text']}
            headings={[
              'Product Name',
              'Status',
              'Days in Store',
              'Days Since Last Sale',
              'Stock Level',
              'Price',
              'Actions'
            ]}
            rows={tableRows}
            sortable={[true, true, true, true, true, true, false]}
          />
        ) : (
          <Card>
            <BlockStack gap="200" inlineAlign="center">
              <Icon source={ChartVerticalIcon} tone="success" />
              <Text variant="headingMd" as="p">All Products Moving Well!</Text>
              <Text variant="bodyMd" as="p" tone="subdued">
                No products have been stale for more than {stalenessThreshold} days.
              </Text>
            </BlockStack>
          </Card>
        )}

        <Text variant="bodySm" as="p" tone="subdued">
          Last analysis: {lastAnalysis.toLocaleString()} • Threshold: {stalenessThreshold} days without sales
        </Text>
      </BlockStack>

      {/* Suggestions Modal */}
      {selectedProduct && (
        <Modal
          open={showSuggestions}
          onClose={() => setShowSuggestions(false)}
          title={`AI Suggestions: ${selectedProduct.name}`}
          primaryAction={{
            content: 'Close',
            onAction: () => setShowSuggestions(false)
          }}
          size="large"
        >
          <Modal.Section>
            <BlockStack gap="400">
              {/* Product Overview */}
              <Card>
                <BlockStack gap="300">
                  <Text variant="headingMd" as="h3">Product Analysis</Text>
                  <InlineStack gap="400" wrap={true}>
                    <Text as="p"><strong>Days in store:</strong> {selectedProduct.daysInStore}</Text>
                    <Text as="p"><strong>Days since last sale:</strong> {selectedProduct.daysSinceLastSale}</Text>
                    <Text as="p"><strong>Current stock:</strong> {selectedProduct.stock} units</Text>
                    <Text as="p"><strong>Tied up value:</strong> ${((selectedProduct.price || 0) * selectedProduct.stock).toFixed(2)}</Text>
                  </InlineStack>
                </BlockStack>
              </Card>

              {/* AI Suggestions */}
              <BlockStack gap="300">
                <Text variant="headingMd" as="h3">AI-Powered Action Plan</Text>
                {selectedProduct.suggestions.map((suggestion, index) => (
                  <Card key={index}>
                    <BlockStack gap="300">
                      <InlineStack gap="200" blockAlign="center">
                        <Icon source={
                          suggestion.type === 'discount' ? DiscountIcon :
                          suggestion.type === 'bundle' ? PackageIcon :
                          ChartVerticalIcon
                        } />
                        <Text variant="headingSm" as="h4">{suggestion.title}</Text>
                        <Badge tone={
                          suggestion.urgency === 'high' ? 'critical' :
                          suggestion.urgency === 'medium' ? 'warning' : 'info'
                        } size="small">
                          {`${suggestion.urgency.toUpperCase()} PRIORITY`}
                        </Badge>
                      </InlineStack>
                      
                      <Text as="p">{suggestion.description}</Text>
                      
                      <Banner tone="info">
                        <Text as="p"><strong>Expected Impact:</strong> {suggestion.expectedImpact}</Text>
                      </Banner>
                      
                      <BlockStack gap="200">
                        <Text variant="bodyMd" as="p" fontWeight="medium">Action Steps:</Text>
                        <List type="number">
                          {suggestion.actionSteps.map((step, stepIndex) => (
                            <List.Item key={stepIndex}>{step}</List.Item>
                          ))}
                        </List>
                      </BlockStack>
                    </BlockStack>
                  </Card>
                ))}
              </BlockStack>
            </BlockStack>
          </Modal.Section>
        </Modal>
      )}
    </Card>
  );
}
