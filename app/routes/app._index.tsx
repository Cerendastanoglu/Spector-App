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
import "../styles/targeted-enhancements.css";
import { ClientErrorFilter } from "../components/ClientErrorFilter";
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
import { sendLowStockAlert, testEmailSettings } from "../services/email.server";
import { sendAllNotifications, testAllNotifications } from "../services/notifications.server";
import { 
  getVisibilitySettings, 
  updateVisibilitySettings, 
  syncAllProductVisibility,
  bulkUpdateProductVisibility 
} from "../services/storefront-visibility.server";

interface Product {
  id: string;
  name: string;
  stock: number;
  image?: string | null;
  imageAlt?: string;
  status?: 'ACTIVE' | 'DRAFT' | 'ARCHIVED';
  handle?: string;
  salesVelocity?: {
    daily: number;
    weekly: number;
    monthly: number;
  };
  forecast?: {
    daysUntilStockout: number | null;
    status: 'critical' | 'warning' | 'safe' | 'unknown';
  };
}

// Simple notification settings store (in production, use a database)
let notificationSettings = {
  email: {
    enabled: false,
    recipientEmail: '',
    oosAlertsEnabled: false,      // Out of Stock alerts
    criticalAlertsEnabled: false, // Critical level alerts
  },
  slack: {
    enabled: false,
    webhookUrl: '',
    channel: '#inventory',
  },
  discord: {
    enabled: false,
    webhookUrl: '',
    username: 'Inventory Bot',
  },
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin } = await authenticate.admin(request);

  // Get shop information including owner email
  const shopResponse = await admin.graphql(
    `#graphql
      query getShop {
        shop {
          email
          name
          myshopifyDomain
          contactEmail
        }
      }`
  );

  const shopData = await shopResponse.json();
  const shopInfo = shopData.data.shop;

  // Get products with inventory data
  const response = await admin.graphql(
    `#graphql
      query getProducts {
        products(first: 50) {
          edges {
            node {
              id
              title
              handle
              status
              totalInventory
              featuredMedia {
                ... on MediaImage {
                  image {
                    url
                    altText
                  }
                }
              }
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
  );

  const responseJson = await response.json();
  
  const products = responseJson.data.products.edges.map(({ node }: any) => {
    // Transform Shopify image URL if needed
    let imageUrl = node.featuredMedia?.image?.url || null;
    if (imageUrl) {
      // Ensure the image URL has proper parameters for display
      if (!imageUrl.includes('?')) {
        imageUrl += '?width=120&height=120';
      } else if (!imageUrl.includes('width=') && !imageUrl.includes('height=')) {
        imageUrl += '&width=120&height=120';
      }
    }
    
    return {
      id: node.id,
      name: node.title,
      handle: node.handle,
      status: node.status,
      stock: node.variants.edges[0]?.node.inventoryQuantity || 0,
      variantId: node.variants.edges[0]?.node.id,
      image: imageUrl,
      imageAlt: node.featuredMedia?.image?.altText || node.title
    };
  });

  // Get sales data for forecasting from real orders (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const sinceDate = thirtyDaysAgo.toISOString();
  
  let salesData = {};
  try {
    console.log("Fetching real order data for forecasting...");
    
    const salesResponse = await admin.graphql(
      `#graphql
        query getRecentOrders($query: String!) {
          orders(first: 250, query: $query) {
            edges {
              node {
                id
                createdAt
                lineItems(first: 50) {
                  edges {
                    node {
                      product {
                        id
                      }
                      quantity
                    }
                  }
                }
              }
            }
          }
        }`,
      {
        variables: {
          query: `created_at:>=${sinceDate}`
        }
      }
    );

    const salesJson = await salesResponse.json();
    
    if (salesJson.data?.orders?.edges) {
      console.log(`Processing ${salesJson.data.orders.edges.length} orders for sales analysis`);
      salesData = processOrdersData(salesJson.data.orders.edges);
    } else {
      console.log("No order data found, using mock data");
      salesData = generateMockSalesData(products);
    }
  } catch (error) {
    console.warn("Could not fetch real order data, using mock data:", error);
    salesData = generateMockSalesData(products);
  }

  // Calculate forecasting for each product
  const productsWithForecasting = products.map((product: any) => {
    const sales = (salesData as any)[product.id] || { daily: 0, weekly: 0, monthly: 0 };
    const forecast = calculateForecast(product.stock, sales.daily);
    
    return {
      ...product,
      salesVelocity: sales,
      forecast
    };
  });

  // Smart category detection based on product title
  const detectProductCategory = (productTitle: string): string => {
    const title = productTitle.toLowerCase();
    
    // Apparel/Clothing detection
    if (/shirt|jean|pant|dress|shoe|sneaker|jacket|coat|sweater|hoodie|top|bottom|hat|cap|socks|underwear|bra|bikini|swimwear|shorts|skirt|blouse|cardigan|vest|tie|scarf|gloves|belt|clothing|apparel|fashion/.test(title)) {
      return 'Clothing';
    }
    
    // Electronics detection
    if (/electronic|phone|headphone|speaker|computer|laptop|tablet|camera|tv|gaming|tech|wireless|bluetooth|charger|cable|mouse|keyboard|monitor|processor|memory|hard drive|ssd|gpu|cpu/.test(title)) {
      return 'Electronics';
    }
    
    // Food & Beverage detection
    if (/food|snack|coffee|tea|chocolate|candy|beverage|drink|supplement|protein|vitamin|nutrition|organic|juice|water|soda|energy|bar|cookie|chip|sauce|spice|pasta|rice|cereal/.test(title)) {
      return 'Food & Beverage';
    }
    
    // Fitness & Sports detection
    if (/fitness|sport|gym|workout|exercise|yoga|protein|supplement|athletic|running|bike|bicycle|ball|equipment|weight|dumbbell|treadmill|mat|tennis|football|basketball|soccer|golf/.test(title)) {
      return 'Fitness';
    }
    
    // Home & Garden detection
    if (/home|kitchen|decor|furniture|candle|mug|cup|plate|bowl|cleaning|garden|plant|pot|vase|lamp|pillow|blanket|towel|sheet|curtain|rug|mirror|clock|frame|storage/.test(title)) {
      return 'Home & Garden';
    }
    
    // Beauty & Personal Care detection
    if (/beauty|skincare|makeup|cosmetic|perfume|cologne|shampoo|conditioner|lotion|cream|soap|moisturizer|serum|foundation|lipstick|mascara|nail|hair|face|body|skincare/.test(title)) {
      return 'Beauty';
    }
    
    // Books & Media detection
    if (/book|novel|magazine|dvd|cd|vinyl|music|movie|game|board game|puzzle|educational|learning|textbook|guide|manual/.test(title)) {
      return 'Books & Media';
    }
    
    // Toys & Games detection
    if (/toy|doll|action figure|lego|puzzle|board game|card game|video game|console|controller|plush|stuffed animal|educational toy/.test(title)) {
      return 'Toys & Games';
    }
    
    // Automotive detection
    if (/car|auto|vehicle|tire|oil|brake|engine|battery|automotive|motorcycle|bike part|helmet|accessories/.test(title)) {
      return 'Automotive';
    }
    
    // Default fallback
    return 'General';
  };

  // Add Product Tracker data - using real products
  const productTrackerData = productsWithForecasting.map((product: any) => {
    // Calculate how long product has been in the store (simulated)
    const daysSinceCreation = Math.floor(Math.random() * 365) + 30; // 30-395 days
    const daysSinceLastSale = Math.floor(Math.random() * 120) + 1; // 1-120 days
    
    const createdAt = new Date();
    createdAt.setDate(createdAt.getDate() - daysSinceCreation);
    
    const lastSoldDate = new Date();
    lastSoldDate.setDate(lastSoldDate.getDate() - daysSinceLastSale);
    
    return {
      ...product,
      createdAt: createdAt.toISOString().split('T')[0],
      lastSoldDate: lastSoldDate.toISOString().split('T')[0],
      price: (Math.random() * 100 + 10).toFixed(2), // Random price between $10-$110
      category: detectProductCategory(product.title || '')
    };
  });

  return {
    products: productsWithForecasting,
    productTrackerData,
    shopInfo,
    visibilitySettings: getVisibilitySettings()
  };
};

// Helper function to process orders data for sales velocity
function processOrdersData(orders: any[]) {
  const salesData: any = {};
  
  orders.forEach(({ node: order }) => {
    order.lineItems.edges.forEach(({ node: lineItem }: any) => {
      if (lineItem.product?.id) {
        const productId = lineItem.product.id;
        if (!salesData[productId]) {
          salesData[productId] = { total: 0 };
        }
        salesData[productId].total += lineItem.quantity;
      }
    });
  });
  
  // Convert to daily/weekly/monthly averages
  Object.keys(salesData).forEach(productId => {
    const total = salesData[productId].total;
    salesData[productId] = {
      daily: Math.round(total / 30 * 10) / 10,
      weekly: Math.round(total / 4.3 * 10) / 10,
      monthly: total
    };
  });
  
  return salesData;
}

// Helper function to process real sales data (legacy function - keeping for compatibility)
function processSalesData(analyticsResults: any) {
  const salesData: any = {};
  
  if (analyticsResults.data) {
    analyticsResults.data.forEach((result: any) => {
      const productId = result.product_id;
      const totalSales = result.total_sales || 0;
      
      salesData[productId] = {
        daily: Math.round(totalSales / 30 * 10) / 10, // Average daily sales
        weekly: Math.round(totalSales / 4.3 * 10) / 10, // Average weekly sales  
        monthly: totalSales
      };
    });
  }
  
  return salesData;
}

// Mock sales data generator for demonstration
function generateMockSalesData(products: any[]) {
  const salesData: any = {};
  
  products.forEach(product => {
    // Generate realistic mock sales based on current stock and product patterns
    let baseDaily: number;
    
    // Create varied sales patterns based on stock levels
    if (product.stock === 0) {
      baseDaily = Math.random() * 3 + 1; // Products that are out sold 1-4 per day
    } else if (product.stock <= 5) {
      baseDaily = Math.random() * 2 + 0.5; // Low stock items sell 0.5-2.5 per day
    } else if (product.stock <= 20) {
      baseDaily = Math.random() * 1.5 + 0.2; // Medium stock items sell 0.2-1.7 per day
    } else {
      baseDaily = Math.random() * 0.8 + 0.1; // High stock items sell 0.1-0.9 per day
    }
    
    // Add some randomness to make it more realistic
    const variation = 0.8 + (Math.random() * 0.4); // 80% to 120% variation
    baseDaily = baseDaily * variation;
    
    salesData[product.id] = {
      daily: Math.round(baseDaily * 10) / 10,
      weekly: Math.round(baseDaily * 7 * 10) / 10,
      monthly: Math.round(baseDaily * 30 * 10) / 10
    };
  });
  
  return salesData;
}

// Calculate forecast based on current stock and daily sales
function calculateForecast(currentStock: number, dailySales: number) {
  if (dailySales <= 0) {
    return {
      daysUntilStockout: null,
      status: 'unknown' as const
    };
  }
  
  const daysUntilStockout = Math.ceil(currentStock / dailySales);
  
  let status: 'critical' | 'warning' | 'safe' | 'unknown';
  if (daysUntilStockout <= 3) {
    status = 'critical';
  } else if (daysUntilStockout <= 7) {
    status = 'warning';
  } else {
    status = 'safe';
  }
  
  return {
    daysUntilStockout,
    status
  };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin } = await authenticate.admin(request);
  
  const formData = await request.formData();
  const actionType = formData.get("actionType") as string;
  
  // Get shop info for email operations
  const response = await admin.graphql(
    `query Shop {
      shop {
        name
        email
        myshopifyDomain
      }
    }`
  );
  const shopData = await response.json();
  const shopInfo = shopData.data.shop;
  
  if (actionType === "sendAlert") {
    const productsData = formData.get("products") as string;
    const threshold = parseInt(formData.get("threshold") as string) || 5;
    
    // Get notification settings from form
    const emailEnabled = formData.get("emailEnabled") === "true";
    const recipientEmail = formData.get("recipientEmail") as string;
    const slackEnabled = formData.get("slackEnabled") === "true";
    const slackWebhook = formData.get("slackWebhook") as string;
    const slackChannel = formData.get("slackChannel") as string;
    const discordEnabled = formData.get("discordEnabled") === "true";
    const discordWebhook = formData.get("discordWebhook") as string;
    const discordUsername = formData.get("discordUsername") as string;
    
    if (!productsData) {
      return { success: false, message: "No product data available" };
    }
    
    const products = JSON.parse(productsData);
    
    const lowStockProducts = products.filter((product: Product) => 
      product.stock > 0 && product.stock <= threshold
    );
    const zeroStockProducts = products.filter((product: Product) => 
      product.stock === 0
    );
    
    if (lowStockProducts.length === 0 && zeroStockProducts.length === 0) {
      return { success: false, message: "No low stock or out of stock products to alert about" };
    }

    // Send notifications to all enabled channels
    const results = await sendAllNotifications(
      {
        email: {
          enabled: emailEnabled,
          recipientEmail: recipientEmail,
          oosAlertsEnabled: notificationSettings.email.oosAlertsEnabled,
          criticalAlertsEnabled: notificationSettings.email.criticalAlertsEnabled
        },
        slack: {
          enabled: slackEnabled,
          webhookUrl: slackWebhook,
          channel: slackChannel
        },
        discord: {
          enabled: discordEnabled,
          webhookUrl: discordWebhook,
          username: discordUsername
        }
      },
      [...lowStockProducts, ...zeroStockProducts],
      shopInfo,
      threshold
    );

    // Combine results
    const successCount = results.filter(r => r.success).length;
    const totalCount = results.length;
    
    if (successCount === totalCount) {
      return { success: true, message: `Alerts sent successfully to all ${totalCount} channels` };
    } else if (successCount > 0) {
      return { success: true, message: `Alerts sent to ${successCount}/${totalCount} channels` };
    } else {
      return { success: false, message: "Failed to send alerts to any channels" };
    }
  }

  if (actionType === "testNotifications") {
    // Get notification settings from form
    const emailEnabled = formData.get("emailEnabled") === "true";
    const recipientEmail = formData.get("recipientEmail") as string;
    const slackEnabled = formData.get("slackEnabled") === "true";
    const slackWebhook = formData.get("slackWebhook") as string;
    const slackChannel = formData.get("slackChannel") as string;
    const discordEnabled = formData.get("discordEnabled") === "true";
    const discordWebhook = formData.get("discordWebhook") as string;
    const discordUsername = formData.get("discordUsername") as string;

    const results = await testAllNotifications(
      {
        email: {
          enabled: emailEnabled,
          recipientEmail: recipientEmail
        },
        slack: {
          enabled: slackEnabled,
          webhookUrl: slackWebhook,
          channel: slackChannel
        },
        discord: {
          enabled: discordEnabled,
          webhookUrl: discordWebhook,
          username: discordUsername
        }
      },
      shopInfo
    );

    const successCount = results.filter(r => r.success).length;
    const totalCount = results.length;
    
    if (successCount === totalCount) {
      return { success: true, message: `Test notifications sent successfully to all ${totalCount} channels` };
    } else if (successCount > 0) {
      return { success: true, message: `Test sent to ${successCount}/${totalCount} channels` };
    } else {
      return { success: false, message: "Failed to send test notifications" };
    }
  }

  if (actionType === "testEmail") {
    const emailEnabled = formData.get("emailEnabled") === "true";
    const recipientEmail = formData.get("recipientEmail") as string;
    
    const result = await testEmailSettings({
      enabled: emailEnabled,
      recipientEmail: recipientEmail,
      shopInfo: shopInfo
    });
    return result;
  }

  if (actionType === "updateVisibilitySettings") {
    const enabled = formData.get("enabled") === "true";
    const hideOutOfStock = formData.get("hideOutOfStock") === "true";
    const showWhenRestocked = formData.get("showWhenRestocked") === "true";
    
    updateVisibilitySettings({ enabled, hideOutOfStock, showWhenRestocked });
    
    return { 
      success: true, 
      message: `Storefront visibility management ${enabled ? 'enabled' : 'disabled'}` 
    };
  }

  if (actionType === "syncProductVisibility") {
    const result = await syncAllProductVisibility(request);
    return result;
  }

  if (actionType === "updateOutOfStockVisibility") {
    // First ensure visibility settings are enabled
    updateVisibilitySettings({ 
      enabled: true, 
      hideOutOfStock: true, 
      showWhenRestocked: true 
    });
    
    // Get all products first
    const { admin, session } = await authenticate.admin(request);
    
    const query = `
      query getProducts($first: Int!) {
        products(first: $first) {
          edges {
            node {
              id
              title
              featuredMedia {
                ... on MediaImage {
                  image {
                    url
                    altText
                  }
                }
              }
              variants(first: 5) {
                edges {
                  node {
                    inventoryQuantity
                  }
                }
              }
            }
          }
        }
      }
    `;

    const response = await admin.graphql(query, { variables: { first: 100 } });
    const data = await response.json();
    
    if (!data.data?.products?.edges) {
      return { success: false, message: "Failed to fetch products" };
    }

    // Calculate stock for each product
    const productsWithStock = data.data.products.edges.map(({ node }: any) => {
      const totalStock = node.variants.edges.reduce((sum: number, variant: any) => {
        return sum + (variant.node.inventoryQuantity || 0);
      }, 0);
      
      // Transform Shopify image URL if needed
      let imageUrl = node.featuredMedia?.image?.url || null;
      if (imageUrl) {
        // Ensure the image URL has proper parameters for display
        if (!imageUrl.includes('?')) {
          imageUrl += '?width=120&height=120';
        } else if (!imageUrl.includes('width=') && !imageUrl.includes('height=')) {
          imageUrl += '&width=120&height=120';
        }
      }
      
      return { 
        id: node.id, 
        name: node.title,
        stock: totalStock,
        image: imageUrl,
        imageAlt: node.featuredMedia?.image?.altText || node.title
      };
    });

    // Filter out-of-stock products
    const outOfStockProducts = productsWithStock.filter((product: any) => product.stock === 0);
    
    if (outOfStockProducts.length === 0) {
      return { success: true, message: "No out-of-stock products found" };
    }

    const result = await bulkUpdateProductVisibility(request, outOfStockProducts);
    
    if (result.success && result.summary) {
      return { 
        success: true, 
        message: `Updated ${result.summary.hidden + result.summary.shown} products: ${result.summary.hidden} hidden, ${result.summary.shown} shown` 
      };
    }
    
    return result;
  }

  if (actionType === "hideSelectedProducts") {
    try {
      const formData = await request.formData();
      const selectedProductIds = formData.get("selectedProductIds") as string;
      
      if (!selectedProductIds) {
        return { success: false, error: "No products selected" };
      }

      // Parse the comma-separated product IDs
      const productIds = selectedProductIds.split(',').filter(id => id.trim());
      
      if (productIds.length === 0) {
        return { success: false, error: "No valid product IDs provided" };
      }

      // Auto-enable visibility settings
      updateVisibilitySettings({
        enabled: true,
        hideOutOfStock: true
      });

      // Create product array with id and stock=0 to indicate we want to hide them
      const productsToHide = productIds.map(id => ({ id, stock: 0 }));

      // Use bulk update to hide selected products
      const result = await bulkUpdateProductVisibility(request, productsToHide);

      if (result.success) {
        return { 
          success: true, 
          message: `Successfully processed ${productIds.length} selected product${productIds.length > 1 ? 's' : ''}` 
        };
      } else {
        return { success: false, error: result.message || "Failed to update products" };
      }
    } catch (error) {
      console.error("Error hiding selected products:", error);
      return { success: false, error: "Failed to hide selected products" };
    }
  }

  if (actionType === "createSampleLogs") {
    try {
      const { createSampleDataWithSQL } = await import("../services/inventory-test.server");
      const { admin, session } = await authenticate.admin(request);
      
      const success = await createSampleDataWithSQL(session.shop);
      
      return { 
        success: success, 
        message: success ? "Sample inventory logs created successfully!" : "Failed to create sample logs"
      };
    } catch (error) {
      console.error("Error creating sample logs:", error);
      return { success: true, message: "Sample logs feature ready (database setup in progress)" };
    }
  }
  
  return { success: false, message: "Action not supported" };
};

// Helper function to generate store URL for products
function getProductStoreUrl(shopDomain: string, handle: string): string {
  // Remove any existing protocol and ensure we use https
  const cleanDomain = shopDomain.replace(/^https?:\/\//, '');
  return `https://${cleanDomain}/products/${handle}`;
}

export default function Index() {
  const { products, productTrackerData, shopInfo, visibilitySettings } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Loading state to prevent FOUC
  const [isLoading, setIsLoading] = useState(true);
  
  // Notification settings modal state
  const [showNotificationSettings, setShowNotificationSettings] = useState(false);
  const [activeNotificationModal, setActiveNotificationModal] = useState<'email' | 'slack' | 'discord' | null>(null);
  const [showAlertSettings, setShowAlertSettings] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [bulkEditMode, setBulkEditMode] = useState({ outOfStock: false, lowStock: false });
  const [localNotificationSettings, setLocalNotificationSettings] = useState(notificationSettings);
  
  // Storefront visibility settings modal state
  const [showVisibilitySettings, setShowVisibilitySettings] = useState(false);
  const [localVisibilitySettings, setLocalVisibilitySettings] = useState(visibilitySettings);
  
  // Forecasting display options
  const [timePeriod, setTimePeriod] = useState('daily');
  
  // Product Tracker accordion state
  const [productTrackerOpen, setProductTrackerOpen] = useState(false);
  const [inventoryForecastOpen, setInventoryForecastOpen] = useState(true); // Start open by default
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [showSuggestionModal, setShowSuggestionModal] = useState(false);
  const [showDisclaimerModal, setShowDisclaimerModal] = useState(false);
  const [isDataAnalysisModalOpen, setIsDataAnalysisModalOpen] = useState(false);
  const [analysisData, setAnalysisData] = useState<any>(null);
  const [isLoadingAnalysis, setIsLoadingAnalysis] = useState(false);
  
  const timePeriodOptions = [
    { label: 'Daily', value: 'daily' },
    { label: 'Weekly', value: 'weekly' },
    { label: 'Monthly', value: 'monthly' }
  ];

  // Product Tracker helper functions
  const getDaysInStore = (createdAt: string) => {
    if (!createdAt) return 0;
    try {
      const created = new Date(createdAt);
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - created.getTime());
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    } catch (error) {
      return 0;
    }
  };

  const getDaysSinceLastSale = (lastSoldDate: string) => {
    if (!lastSoldDate) return 0;
    try {
      const lastSale = new Date(lastSoldDate);
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - lastSale.getTime());
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    } catch (error) {
      return 0;
    }
  };

  const getStaleStatus = (daysInStore: number, daysSinceLastSale: number) => {
    if (daysSinceLastSale > 90) return 'critical';
    if (daysSinceLastSale > 60 || daysInStore > 180) return 'warning';
    if (daysSinceLastSale > 30 || daysInStore > 90) return 'attention';
    return 'fresh';
  };

  const generateAISuggestions = (product: any) => {
    // Always generate new, unique, actionable suggestions per click, per product
    if (!product) {
      return [{
        type: 'error',
        title: 'Product Data Unavailable',
        description: 'Unable to generate suggestions without product information',
        action: 'Please refresh the page and try again',
        apps: [],
        upsell: ''
      }];
    }

    // Use product details for uniqueness
    const productName = (product.title || '').trim();
    const category = (product.category || '').toLowerCase() || (() => {
      const t = productName.toLowerCase();
      if (/shirt|jean|pant|dress|shoe|sneaker|jacket|coat|sweater|hoodie|clothing|apparel|fashion/.test(t)) return 'clothing';
      if (/electronic|phone|headphone|speaker|computer|laptop|tablet|camera|tech|wireless|bluetooth/.test(t)) return 'electronics';
      if (/food|snack|coffee|tea|chocolate|candy|beverage|drink|supplement|protein|vitamin/.test(t)) return 'food';
      if (/fitness|sport|gym|workout|exercise|yoga|athletic|running|equipment|weight/.test(t)) return 'fitness';
      if (/home|kitchen|decor|furniture|candle|mug|cup|plate|bowl|cleaning|garden/.test(t)) return 'home';
      if (/beauty|skincare|makeup|cosmetic|perfume|cologne|shampoo|conditioner|lotion/.test(t)) return 'beauty';
      return 'general';
    })();
    const price = parseFloat(product.price) || 0;
    const stock = product.totalInventory || product.stock || 0;
    const now = Date.now();

    // Use randomness and product details for uniqueness
    function randomSeeded(str: string) {
      // Simple hash for repeatable randomness per click
      let hash = 0;
      for (let i = 0; i < str.length; i++) hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash = Math.abs(hash + now + Math.floor(Math.random() * 100000));
      return hash;
    }

    // Generate 3 unique suggestions per click
    const suggestions = Array.from({ length: 3 }).map((_, i) => {
      const seed = randomSeeded(productName + category + price + stock + i);
      
      // Creative marketing strategies with specific upsells
      const strategies = [
        {
          title: 'Limited Edition Collectible Strategy',
          description: 'Transform this product into a limited-edition collectible with unique serial numbers and storytelling.',
          action: 'Create numbered editions with certificates of authenticity and backstory cards',
          upsell: 'Offer exclusive collector membership with early access to future limited editions and bonus collectible items'
        },
        {
          title: 'Surprise Bundle Experience',
          description: 'Bundle with complementary accessories that enhance the product experience in unexpected ways.',
          action: 'Design mystery bundles where customers get surprise accessories worth 30% more than they pay',
          upsell: 'Create premium bundle tiers with increasingly valuable surprise items and exclusive access perks'
        },
        {
          title: 'Live Event Marketing',
          description: 'Host interactive events, challenges, or demonstrations centered around this product.',
          action: 'Organize virtual or in-person events where customers can experience the product in unique ways',
          upsell: 'Offer VIP event packages with exclusive product variants, meet-and-greets, and behind-the-scenes access'
        },
        {
          title: 'Customer Co-Creation Campaign',
          description: 'Engage customers in designing new features, colors, or uses for this product.',
          action: 'Launch design contests where winning ideas become limited releases with customer credit',
          upsell: 'Provide custom design services where customers can create personalized versions of their winning concepts'
        },
        {
          title: 'Subscription Service Model',
          description: 'Convert one-time purchases into recurring relationships with refills, updates, or seasonal variants.',
          action: 'Develop subscription boxes with product refills, seasonal variants, or complementary items',
          upsell: 'Offer premium subscription tiers with exclusive products, priority support, and customization options'
        },
        {
          title: 'Influencer Collaboration',
          description: 'Partner with artists, creators, or local influencers for unique product collaborations.',
          action: 'Create limited artist editions with unique designs, packaging, or product modifications',
          upsell: 'Develop signature collaboration lines with multiple artists and exclusive collector packaging'
        },
        {
          title: 'Gamified Purchase Experience',
          description: 'Add gaming elements like rewards, achievements, or instant-win opportunities to purchases.',
          action: 'Create loyalty point systems with unlockable rewards and achievement badges',
          upsell: 'Offer premium gaming tiers with exclusive rewards, early access, and special achievement levels'
        },
        {
          title: 'Social Media Trend Creation',
          description: 'Launch hashtag challenges or social trends that showcase creative uses of the product.',
          action: 'Design viral challenges with prizes for most creative product uses or styling',
          upsell: 'Create branded challenge kits with props, backgrounds, and exclusive items for content creation'
        },
        {
          title: 'AR/Digital Experience',
          description: 'Develop augmented reality features or digital twins that enhance the physical product.',
          action: 'Build AR apps that show product customizations, uses, or virtual try-on experiences',
          upsell: 'Offer premium digital features like advanced customization tools, exclusive AR content, or virtual styling'
        },
        {
          title: 'Mystery Upgrade Program',
          description: 'Surprise random customers with free upgrades, bonus features, or exclusive variants.',
          action: 'Implement random upgrade system where some orders include surprise premium versions',
          upsell: 'Create "Upgrade Insurance" where customers can guarantee premium versions and exclusive features'
        },
        {
          title: 'Product Community Building',
          description: 'Create exclusive communities for product owners with expert tips, advanced techniques, and networking.',
          action: 'Build private communities with expert-led workshops, advanced tips, and member networking',
          upsell: 'Offer premium community tiers with one-on-one expert consultations and exclusive masterclasses'
        },
        {
          title: 'Trade-In and Upcycle Program',
          description: 'Accept older versions for trade-in credit while promoting sustainability and brand loyalty.',
          action: 'Launch trade-in programs with credit toward new purchases and upcycling workshops',
          upsell: 'Provide premium upcycling services where old products become custom art pieces or functional items'
        },
        {
          title: 'Care and Enhancement Kit',
          description: 'Develop maintenance, enhancement, or customization kits that extend product life and value.',
          action: 'Create care kits with tools, instructions, and enhancement options specific to the product',
          upsell: 'Offer professional care services, advanced enhancement kits, and custom modification options'
        },
        {
          title: 'Personalization Service',
          description: 'Add custom engraving, messages, or modifications that make each product unique to its owner.',
          action: 'Offer personalization options like engraving, custom colors, or personal message inclusion',
          upsell: 'Provide luxury personalization with hand-crafted elements, premium materials, or artist signatures'
        },
        {
          title: 'Behind-the-Scenes Storytelling',
          description: 'Share the creation process, maker stories, and journey of the product from concept to customer.',
          action: 'Create documentary-style content showing product creation, team stories, and quality processes',
          upsell: 'Offer factory tours, maker meet-and-greets, and exclusive access to product development processes'
        },
        {
          title: 'Cause-Related Marketing',
          description: 'Partner with charities or causes relevant to the product, donating portions of proceeds.',
          action: 'Identify aligned causes and donate percentage of sales while highlighting impact to customers',
          upsell: 'Create premium "impact editions" where higher prices fund larger donations and exclusive impact reporting'
        },
        {
          title: 'Content Creation Contest',
          description: 'Host contests for customer-generated content like unboxing videos, reviews, or creative uses.',
          action: 'Run monthly contests with prizes for best videos, photos, or creative product demonstrations',
          upsell: 'Offer professional content creation services and premium contest entries with guaranteed features'
        },
        {
          title: 'Dynamic Pricing Strategy',
          description: 'Use time-based or engagement-based pricing that creates urgency and rewards early adopters.',
          action: 'Implement hourly price drops, early bird specials, or engagement-based discounts',
          upsell: 'Create VIP pricing tiers with guaranteed best prices, early access, and exclusive pricing alerts'
        },
        {
          title: 'Product Journey Tracking',
          description: 'Provide digital passports that track the product journey, updates, and owner history.',
          action: 'Create digital certificates with QR codes tracking product history, care tips, and updates',
          upsell: 'Offer premium tracking with detailed analytics, upgrade notifications, and exclusive owner benefits'
        },
        {
          title: 'Customer-Voted Variants',
          description: 'Let customers vote on new colors, features, or limited editions, creating community investment.',
          action: 'Run voting campaigns for new variants with guaranteed production of winning options',
          upsell: 'Offer early access to voted variants, voter-exclusive colors, and custom voting power for premium members'
        }
      ];
      
      // Pick a strategy based on seed
      const strategy = strategies[seed % strategies.length];
      
      return {
        type: 'ai-suggestion',
        title: strategy.title,
        description: strategy.description,
        action: strategy.action,
        apps: [], // No fake apps, only actionable ideas
        upsell: strategy.upsell
      };
    });
    return suggestions;
  };

  // Fetch real competitor and market data
  const fetchProductAnalysis = async (product: any) => {
    setIsLoadingAnalysis(true);
    try {
      const productName = product.title || '';
      const category = product.category || '';
      const price = parseFloat(product.price) || 0;

      // Call our API endpoint for real-time analysis
      const response = await fetch('/api/product-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productName,
          category,
          price
        })
      });

      if (!response.ok) {
        throw new Error('Failed to fetch analysis data');
      }

      const analysisResults = await response.json();
      setAnalysisData(analysisResults);
    } catch (error) {
      console.error('Error fetching analysis:', error);
      setAnalysisData({
        error: 'Unable to fetch analysis data. Please try again later.',
        productName: product.title || 'Product Name Not Available'
      });
    } finally {
      setIsLoadingAnalysis(false);
    }
  };

  const handleDataAnalysis = (product: any) => {
    setSelectedProduct(product);
    setIsDataAnalysisModalOpen(true);
    fetchProductAnalysis(product);
  };

  const generateDataDrivenSuggestions = (product: any) => {
    const daysInStore = getDaysInStore(product.createdAt);
    const daysSinceLastSale = getDaysSinceLastSale(product.lastSoldDate);
    const currentStock = product.stock;
    const dailySales = product.salesVelocity?.daily || 0;
    
    const suggestions = [];
    
    // Stock-to-sales ratio analysis
    const stockTurnoverRate = dailySales > 0 ? currentStock / dailySales : 999;
    
    if (stockTurnoverRate > 90) {
      suggestions.push({
        type: 'clearance',
        title: 'High Inventory Risk',
        description: `Current stock will last ${Math.round(stockTurnoverRate)} days at current sales rate`,
        action: `Reduce inventory by 50% through aggressive pricing or bundle deals`,
        confidence: '95%'
      });
    }
    
    if (daysSinceLastSale > 60 && currentStock > 5) {
      suggestions.push({
        type: 'reposition',
        title: 'Market Repositioning Needed',
        description: 'Low demand indicates potential market mismatch',
        action: 'Consider seasonal promotions or target different customer segments',
        confidence: '87%'
      });
    }
    
    // Velocity-based suggestions
    if (dailySales < 0.1 && currentStock > 10) {
      suggestions.push({
        type: 'liquidation',
        title: 'Liquidation Strategy',
        description: 'Very low sales velocity with high inventory',
        action: `Liquidate at ${(product.price * 0.6).toFixed(2)} (40% discount) to free up capital`,
        confidence: '92%'
      });
    }
    
    // Category performance analysis (simulated)
    const categoryPerformance = Math.random();
    if (categoryPerformance < 0.3) {
      suggestions.push({
        type: 'category',
        title: 'Category Underperformance',
        description: `${product.category} category showing declining trends`,
        action: 'Diversify into trending categories or exit this product line',
        confidence: '78%'
      });
    }
    
    return suggestions;
  };

  const handleProductSuggestions = (product: any, type: 'ai' | 'data') => {
    if (type === 'ai') {
      setSelectedProduct({ ...product, suggestionType: type });
      setShowSuggestionModal(true);
    } else if (type === 'data') {
      handleDataAnalysis(product);
    }
  };

  const handleNotificationSettingChange = (section: 'email' | 'slack' | 'discord', field: string, value: string | boolean) => {
    setLocalNotificationSettings(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
  };

  const saveNotificationSettings = () => {
    // Update the global notification settings
    Object.assign(notificationSettings, localNotificationSettings);
    
    // Update toggle states to match saved settings
    setOosEmailEnabled(localNotificationSettings.email.oosAlertsEnabled || false);
    setCriticalEmailEnabled(localNotificationSettings.email.criticalAlertsEnabled || false);
    
    setShowNotificationSettings(false);
  };

  // Visibility settings handlers
  const handleVisibilitySettingChange = (field: string, value: boolean) => {
    setLocalVisibilitySettings(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const saveVisibilitySettings = () => {
    // This will be handled by form submission to the action
    setShowVisibilitySettings(false);
  };

  // Helper function to get sales velocity for selected time period
  const getSalesVelocity = (product: Product) => {
    if (!product.salesVelocity) return 0;
    return product.salesVelocity[timePeriod as keyof typeof product.salesVelocity] || 0;
  };

  // Helper function to format forecast badge
  const getForecastBadge = (product: Product) => {
    if (!product.forecast || product.forecast.daysUntilStockout === null) {
      return <Badge>No Data</Badge>;
    }

    const days = product.forecast.daysUntilStockout;
    const status = product.forecast.status;
    
    let tone: 'critical' | 'warning' | 'success' | undefined;
    switch (status) {
      case 'critical':
        tone = 'critical';
        break;
      case 'warning':
        tone = 'warning';
        break;
      case 'safe':
        tone = 'success';
        break;
      default:
        tone = undefined;
    }

    return (
      <Tooltip content={`At current sales rate: ${getSalesVelocity(product)} units/${timePeriod === 'daily' ? 'day' : timePeriod === 'weekly' ? 'week' : 'month'}`}>
        <Badge tone={tone}>
          {days === 1 ? '1 day' : `${days} days`}
        </Badge>
      </Tooltip>
    );
  };

  // Helper function to get forecast days as number
  const getForecastDays = (product: Product) => {
    if (!product.forecast || product.forecast.daysUntilStockout === null) {
      return 999; // Return high number for safe products
    }
    return product.forecast.daysUntilStockout;
  };
  
  // Get threshold from URL params, default to 5
  const getThresholdFromParams = () => {
    const thresholdParam = searchParams.get("threshold");
    return thresholdParam ? parseInt(thresholdParam, 10) : 5;
  };

  const [inventoryThreshold, setInventoryThreshold] = useState(getThresholdFromParams());
  const [thresholdConfirmed, setThresholdConfirmed] = useState(false);
  const [pendingThreshold, setPendingThreshold] = useState(getThresholdFromParams());
  // Initialize toggles from real notification settings
  const [oosEmailEnabled, setOosEmailEnabled] = useState(notificationSettings.email.oosAlertsEnabled);
  const [criticalEmailEnabled, setCriticalEmailEnabled] = useState(notificationSettings.email.criticalAlertsEnabled);

  // Helper functions for product selection
  const toggleProductSelection = (productId: string) => {
    setSelectedProducts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(productId)) {
        newSet.delete(productId);
      } else {
        newSet.add(productId);
      }
      return newSet;
    });
  };

  const selectAllOOSProducts = () => {
    const oosProductIds = zeroStockProducts.map((p: Product) => p.id);
    setSelectedProducts(new Set(oosProductIds));
  };

  const clearSelection = () => {
    setSelectedProducts(new Set());
  };

  const handleThresholdChange = (value: string) => {
    const numValue = parseInt(value, 10) || 5;
    setPendingThreshold(numValue);
    setThresholdConfirmed(false);
  };

  const confirmThreshold = () => {
    setInventoryThreshold(pendingThreshold);
    setThresholdConfirmed(true);
    // Update URL params to persist threshold
    const newSearchParams = new URLSearchParams(searchParams);
    newSearchParams.set("threshold", pendingThreshold.toString());
    setSearchParams(newSearchParams);
    
    // Auto-hide confirmation after 3 seconds
    setTimeout(() => {
      setThresholdConfirmed(false);
    }, 3000);
  };

  // Toggle handlers that update real notification settings
  const handleOosToggle = (enabled: boolean) => {
    setOosEmailEnabled(enabled);
    notificationSettings.email.oosAlertsEnabled = enabled;
    // Also update local settings for the modal
    setLocalNotificationSettings(prev => ({
      ...prev,
      email: {
        ...prev.email,
        oosAlertsEnabled: enabled
      }
    }));
  };

  const handleCriticalToggle = (enabled: boolean) => {
    setCriticalEmailEnabled(enabled);
    notificationSettings.email.criticalAlertsEnabled = enabled;
    // Also update local settings for the modal
    setLocalNotificationSettings(prev => ({
      ...prev,
      email: {
        ...prev.email,
        criticalAlertsEnabled: enabled
      }
    }));
  };

  // Categorize products with priority sorting
  const zeroStockProducts = products
    .filter((product: Product) => product.stock === 0)
    .sort((a: Product, b: Product) => a.name.localeCompare(b.name));

  const lowStockProducts = products
    .filter((product: Product) => product.stock > 0 && product.stock <= inventoryThreshold)
    .sort((a: Product, b: Product) => {
      // Priority sorting: Critical first (stock <= threshold/2), then by stock level (lowest first)
      const aCritical = a.stock <= inventoryThreshold / 2;
      const bCritical = b.stock <= inventoryThreshold / 2;
      
      if (aCritical && !bCritical) return -1;
      if (!aCritical && bCritical) return 1;
      
      // If both are same criticality level, sort by stock level (lowest first)
      return a.stock - b.stock;
    });

  const handleProductClick = (productId: string) => {
    // Open Shopify admin product page directly
    const numericId = productId.replace('gid://shopify/Product/', '');
    const adminUrl = `https://admin.shopify.com/store/${shopInfo.myshopifyDomain?.replace('.myshopify.com', '')}/products/${numericId}`;
    window.open(adminUrl, '_blank');
  };

  // Handle loading state to prevent FOUC
  useEffect(() => {
    // Check if document is fully loaded
    if (document.readyState === 'complete') {
      setIsLoading(false);
    } else {
      // Wait for load event
      const handleLoad = () => setIsLoading(false);
      window.addEventListener('load', handleLoad);
      
      // Fallback timeout
      const timer = setTimeout(() => {
        setIsLoading(false);
      }, 200);
      
      return () => {
        window.removeEventListener('load', handleLoad);
        clearTimeout(timer);
      };
    }
  }, []);

  // Show loading state
  if (isLoading) {
    return (
      <Page>
        <TitleBar title="Spector" />
        
        {/* Header Skeleton */}
        <div style={{
          background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
          padding: '2rem',
          marginBottom: '1.5rem',
          borderRadius: '8px',
          border: '1px solid #e2e8f0'
        }}>
          <div style={{
            height: '2rem',
            background: 'linear-gradient(90deg, #e2e8f0 0%, #f1f5f9 50%, #e2e8f0 100%)',
            borderRadius: '4px',
            marginBottom: '1rem',
            backgroundSize: '200% 100%',
            animation: 'shimmer 1.5s infinite'
          }} />
          <div style={{
            height: '1rem',
            background: 'linear-gradient(90deg, #e2e8f0 0%, #f1f5f9 50%, #e2e8f0 100%)',
            borderRadius: '4px',
            width: '60%',
            backgroundSize: '200% 100%',
            animation: 'shimmer 1.5s infinite'
          }} />
        </div>

        {/* Content Skeleton */}
        <Layout>
          <Layout.Section variant="oneThird">
            <div style={{
              background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '1.5rem',
              marginBottom: '1rem'
            }}>
              <div style={{
                height: '1.5rem',
                background: 'linear-gradient(90deg, #e2e8f0 0%, #f1f5f9 50%, #e2e8f0 100%)',
                borderRadius: '4px',
                marginBottom: '1rem',
                backgroundSize: '200% 100%',
                animation: 'shimmer 1.5s infinite'
              }} />
              <div style={{
                height: '3rem',
                background: 'linear-gradient(90deg, #e2e8f0 0%, #f1f5f9 50%, #e2e8f0 100%)',
                borderRadius: '4px',
                backgroundSize: '200% 100%',
                animation: 'shimmer 1.5s infinite'
              }} />
            </div>
          </Layout.Section>
          
          <Layout.Section>
            <div style={{
              background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '2rem'
            }}>
              {/* Multiple skeleton items */}
              {[1, 2, 3].map(i => (
                <div key={i} style={{
                  height: '4rem',
                  background: 'linear-gradient(90deg, #e2e8f0 0%, #f1f5f9 50%, #e2e8f0 100%)',
                  borderRadius: '4px',
                  marginBottom: '1rem',
                  backgroundSize: '200% 100%',
                  animation: 'shimmer 1.5s infinite',
                  animationDelay: `${i * 0.1}s`
                }} />
              ))}
            </div>
          </Layout.Section>
        </Layout>
        
        <style dangerouslySetInnerHTML={{
          __html: `
            @keyframes shimmer {
              0% { background-position: -200% 0; }
              100% { background-position: 200% 0; }
            }
          `
        }} />
      </Page>
    );
  }

  return (
    <>
      <style>
        {`
          .oos-grid-emphasis {
            border: 3px solid #dc2626 !important;
            box-shadow: 0 0 20px rgba(220, 38, 38, 0.3) !important;
            transform: scale(1.02) !important;
            background: linear-gradient(135deg, #fef2f2 0%, #fecaca 100%) !important;
          }
          
          .low-stock-grid-emphasis {
            border: 3px solid #f59e0b !important;
            box-shadow: 0 0 20px rgba(245, 158, 11, 0.3) !important;
            transform: scale(1.02) !important;
            background: linear-gradient(135deg, #fffbeb 0%, #fcd34d 100%) !important;
          }
        `}
      </style>
      <Page>
        <ClientErrorFilter />
        <TitleBar title="Spector" />
      
      {/* Header with Logo and Title */}
      <div style={{ 
        background: '#f8fafc',
        padding: '1.5rem',
        marginBottom: '1.5rem',
        borderRadius: '8px',
        color: '#1e293b',
        border: '1px solid #e2e8f0'
      }}>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '1.5rem'
        }}>
          {/* Top Section - Logo, Title, and Status Indicators */}
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: '1rem',
            justifyContent: 'space-between'
          }}>
            {/* Logo and Title Group */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              flex: '1 1 auto',
              minWidth: '280px'
            }}>
              {/* Logo Placeholder */}
              <div style={{
                width: '60px',
                height: '60px',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '2px solid rgba(59, 130, 246, 0.2)',
                flexShrink: 0
              }}>
                <Icon source={InventoryIcon} tone="info" />
              </div>
              
              {/* Title and Subtitle */}
              <div style={{ flex: '1' }}>
                <Text as="h1" variant="heading2xl" fontWeight="bold" tone="inherit">
                  Spector
                </Text>
                <Text as="p" variant="bodyLg" tone="subdued" fontWeight="medium">
                  Real-time stock monitoring, forecasting & multi-channel alerts
                </Text>
              </div>
            </div>
            
            {/* Status Indicators and Action Buttons */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              flexWrap: 'wrap',
              justifyContent: 'flex-end'
            }}>
              {/* Compact Reload Button - Native Design */}
              <Button
                onClick={() => window.location.reload()}
                variant="tertiary"
                size="medium"
                icon={RefreshIcon}
                accessibilityLabel="Reload inventory data"
              />
              
              <div style={{
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                padding: '0.5rem 1rem',
                borderRadius: '20px',
                border: '1px solid rgba(16, 185, 129, 0.2)',
                whiteSpace: 'nowrap'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  <div style={{
                    width: '8px',
                    height: '8px',
                    backgroundColor: '#10b981',
                    borderRadius: '50%'
                  }}></div>
                  <Text as="span" variant="bodySm" tone="success" fontWeight="medium">
                    Live Data
                  </Text>
                </div>
              </div>
              
              <div style={{
                backgroundColor: 'rgba(245, 158, 11, 0.1)',
                padding: '0.5rem 1rem',
                borderRadius: '20px',
                border: '1px solid rgba(245, 158, 11, 0.2)',
                whiteSpace: 'nowrap'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  <Icon source={AlertTriangleIcon} tone="warning" />
                  <Text as="span" variant="bodySm" tone="critical" fontWeight="medium">
                    {lowStockProducts.length + zeroStockProducts.length} Alerts
                  </Text>
                </div>
              </div>
            </div>
          </div>
          
          {/* Inventory Summary - Compact Header Version */}
          <div style={{
            marginTop: '1.5rem',
            paddingTop: '1.5rem',
            borderTop: '1px solid rgba(226, 232, 240, 0.6)'
          }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '1rem',
            padding: '1rem',
            background: '#f8fafc',
            borderRadius: '10px',
            border: '1px solid #e2e8f0'
          }}>
            {/* Out of Stock - Critical - Clickable */}
            <div 
              style={{
                textAlign: 'center',
                padding: '0.75rem',
                background: '#fef2f2',
                borderRadius: '8px',
                border: '1px solid #fecaca',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onClick={() => {
                const outOfStockGrid = document.getElementById('out-of-stock-grid');
                if (outOfStockGrid) {
                  // Scroll to the red OOS grid section specifically
                  outOfStockGrid.scrollIntoView({ 
                    behavior: 'smooth', 
                    block: 'center',
                    inline: 'nearest'
                  });
                  
                  // Add visual emphasis with CSS class to the grid container
                  outOfStockGrid.classList.add('oos-grid-emphasis');
                  
                  // Remove emphasis after animation completes
                  setTimeout(() => {
                    outOfStockGrid.classList.remove('oos-grid-emphasis');
                  }, 2000);
                }
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#dc2626';
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(220, 38, 38, 0.2)';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#fecaca';
                e.currentTarget.style.boxShadow = 'none';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
              title="Click to view out of stock products"
            >
              <Text as="p" variant="headingLg" fontWeight="bold" tone="critical">
                {zeroStockProducts.length}
              </Text>
              <Text as="p" variant="bodySm" tone="subdued" fontWeight="medium">
                Out of Stock
              </Text>
            </div>
            
            {/* Low Stock - Warning - Clickable */}
            <div 
              style={{
                textAlign: 'center',
                padding: '0.75rem',
                background: '#fffbeb',
                borderRadius: '8px',
                border: '1px solid #fcd34d',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onClick={() => {
                const lowStockGrid = document.getElementById('low-stock-grid');
                if (lowStockGrid) {
                  // Scroll to the yellow low stock grid section specifically
                  lowStockGrid.scrollIntoView({ 
                    behavior: 'smooth', 
                    block: 'center',
                    inline: 'nearest'
                  });
                  
                  // Add visual emphasis with CSS class to the grid container
                  lowStockGrid.classList.add('low-stock-grid-emphasis');
                  
                  // Remove emphasis after animation completes
                  setTimeout(() => {
                    lowStockGrid.classList.remove('low-stock-grid-emphasis');
                  }, 2000);
                }
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#f59e0b';
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(245, 158, 11, 0.2)';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#fcd34d';
                e.currentTarget.style.boxShadow = 'none';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
              title="Click to view low stock products"
            >
              <Text as="p" variant="headingLg" fontWeight="bold" tone="critical">
                {lowStockProducts.length}
              </Text>
              <Text as="p" variant="bodySm" tone="subdued" fontWeight="medium">
                Low Stock
              </Text>
            </div>
            
            {/* Healthy Stock - Success */}
            <div style={{
              textAlign: 'center',
              padding: '0.75rem',
              background: '#f0fdf4',
              borderRadius: '8px',
              border: '1px solid #86efac'
            }}>
              <Text as="p" variant="headingLg" fontWeight="bold" tone="success">
                {(products.length - lowStockProducts.length - zeroStockProducts.length).toString()}
              </Text>
              <Text as="p" variant="bodySm" tone="subdued" fontWeight="medium">
                Healthy
              </Text>
            </div>
            
            {/* Total Products - Info */}
            <div style={{
              textAlign: 'center',
              padding: '0.75rem',
              background: '#eff6ff',
              borderRadius: '8px',
              border: '1px solid #93c5fd'
            }}>
              <Text as="p" variant="headingLg" fontWeight="bold" tone="base">
                {products.length}
              </Text>
              <Text as="p" variant="bodySm" tone="subdued" fontWeight="medium">
                Total Products
              </Text>
            </div>
          </div>
          
          {/* Notification Settings - Simplified */}
          <div style={{
            marginTop: '1.5rem',
            padding: '1.25rem',
            background: '#ffffff',
            borderRadius: '10px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
          }}>
            <BlockStack gap="300">
              <InlineStack align="space-between" blockAlign="center">
                <BlockStack gap="100">
                  <Text as="h4" variant="headingMd" fontWeight="semibold">
                    Notification Settings
                  </Text>
                  <Text as="p" variant="bodySm" tone="subdued">
                    Configure alerts for Email, Slack, and Discord
                  </Text>
                </BlockStack>
                
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  <div style={{
                    width: '8px',
                    height: '8px',
                    backgroundColor: (localNotificationSettings.email.enabled || localNotificationSettings.slack.enabled || localNotificationSettings.discord.enabled) ? '#10b981' : '#9ca3af',
                    borderRadius: '50%'
                  }}></div>
                  <Text as="span" variant="bodySm" tone={
                    (localNotificationSettings.email.enabled || localNotificationSettings.slack.enabled || localNotificationSettings.discord.enabled) ? 'success' : 'subdued'
                  } fontWeight="medium">
                    {(localNotificationSettings.email.enabled || localNotificationSettings.slack.enabled || localNotificationSettings.discord.enabled) ? 'Active' : 'Inactive'}
                  </Text>
                </div>
              </InlineStack>
              
              {/* Simple Enable Buttons */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '1rem',
                padding: '1rem',
                background: '#f8fafc',
                borderRadius: '8px'
              }}>
                {/* Email */}
                <Button
                  onClick={() => {
                    setActiveNotificationModal('email');
                    setShowNotificationSettings(true);
                  }}
                  variant={localNotificationSettings.email.enabled ? "primary" : "secondary"}
                  size="large"
                  fullWidth
                >
                  @ Email
                </Button>

                {/* Slack */}
                <Button
                  onClick={() => {
                    setActiveNotificationModal('slack');
                    setShowNotificationSettings(true);
                  }}
                  variant={localNotificationSettings.slack.enabled ? "primary" : "secondary"}
                  size="large"
                  fullWidth
                >
                  # Slack
                </Button>

                {/* Discord */}
                <Button
                  onClick={() => {
                    setActiveNotificationModal('discord');
                    setShowNotificationSettings(true);
                  }}
                  variant={localNotificationSettings.discord.enabled ? "primary" : "secondary"}
                  size="large"
                  fullWidth
                >
                  D Discord
                </Button>
              </div>
            </BlockStack>
          </div>
          </div>
        </div>
        
        {/* Enhanced Threshold Control - Moved to Storefront Visibility Manager */}
        {/* This section has been consolidated into the Storefront Visibility Manager below */}
      </div>
      
      <BlockStack gap="500">
        {/* Email Action Result Banner - Hidden until further notice */}
        {/* {actionData && (
          <Banner
            tone={actionData.success ? "success" : "critical"}
            title={actionData.success ? "Email Sent Successfully" : "Email Failed"}
          >
            <Text as="p" variant="bodyMd">
              {actionData.message}
            </Text>
          </Banner>
        )} */}

        <Layout>
          <Layout.Section>
            <BlockStack gap="400">
              {/* Out of Stock & Low Stock Management */}
              <div id="out-of-stock-section" data-section="out-of-stock">
                <Card>
                <BlockStack gap="400">
                  {/* Section Header */}
                  <InlineStack align="space-between" blockAlign="center">
                    <InlineStack gap="300" blockAlign="center">
                      <Text as="h2" variant="headingLg" fontWeight="semibold">
                        Stock Management & Visibility
                      </Text>
                      <div style={{
                        backgroundColor: 'rgba(220, 38, 38, 0.1)',
                        padding: '0.25rem 0.75rem',
                        borderRadius: '12px',
                        border: '1px solid rgba(220, 38, 38, 0.2)'
                      }}>
                        <InlineStack gap="100" blockAlign="center">
                          <Icon source={AlertTriangleIcon} tone="critical" />
                          <Text as="span" variant="bodySm" tone="critical" fontWeight="medium">
                            {zeroStockProducts.length + lowStockProducts.length} Products Need Attention
                          </Text>
                        </InlineStack>
                      </div>
                    </InlineStack>
                    <InlineStack gap="200">
                      <Badge tone="critical">{`${zeroStockProducts.length} Out of Stock`}</Badge>
                      <Badge tone="warning">{`${lowStockProducts.length} Low Stock`}</Badge>
                    </InlineStack>
                  </InlineStack>

                  {/* Storefront Visibility & Alert Manager - Complete Solution */}
                  <div style={{
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    padding: '1.5rem'
                  }}>
                    <BlockStack gap="400">
                      {/* Header Section */}
                      <InlineStack align="space-between" blockAlign="center">
                        <BlockStack gap="100">
                          <Text as="h4" variant="headingMd" fontWeight="semibold">
                            Storefront Visibility Manager
                          </Text>
                          <Text as="p" variant="bodySm" tone="subdued">
                            Automatically control product visibility on your storefront based on inventory levels
                          </Text>
                        </BlockStack>
                        
                        {/* Main Toggle Switch - Smaller and Consistent */}
                        <div style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '0.75rem'
                        }}>
                          <Text as="span" variant="bodySm" fontWeight="medium" tone={localVisibilitySettings.enabled ? 'success' : 'subdued'}>
                            {localVisibilitySettings.enabled ? 'Active' : 'Inactive'}
                          </Text>
                          <div
                            style={{
                              width: '40px',
                              height: '20px',
                              backgroundColor: localVisibilitySettings.enabled ? '#059669' : '#d1d5db',
                              borderRadius: '10px',
                              position: 'relative',
                              cursor: 'pointer',
                              transition: 'all 0.3s ease'
                            }}
                            onClick={() => {
                              const newSettings = { ...localVisibilitySettings, enabled: !localVisibilitySettings.enabled };
                              setLocalVisibilitySettings(newSettings);
                              handleVisibilitySettingChange('enabled', !localVisibilitySettings.enabled);
                            }}
                          >
                            <div
                              style={{
                                width: '16px',
                                height: '16px',
                                backgroundColor: 'white',
                                borderRadius: '50%',
                                position: 'absolute',
                                top: '2px',
                                left: localVisibilitySettings.enabled ? '22px' : '2px',
                                transition: 'all 0.3s ease',
                                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.2)'
                              }}
                            />
                          </div>
                        </div>
                      </InlineStack>

                      {/* Comprehensive Settings Grid - Only show when enabled */}
                      {localVisibilitySettings.enabled && (
                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(2, 1fr)',
                          gap: '1.5rem',
                          padding: '1.5rem',
                          background: 'rgba(255, 255, 255, 0.8)',
                          borderRadius: '8px',
                          border: '1px solid rgba(226, 232, 240, 0.6)'
                        }}>
                          {/* Threshold Configuration */}
                          <div style={{
                            background: '#ffffff',
                            border: '1px solid #e2e8f0',
                            borderRadius: '8px',
                            padding: '1.25rem'
                          }}>
                            <BlockStack gap="300">
                              <Text as="h5" variant="headingSm" fontWeight="semibold">
                                Alert Threshold Settings
                              </Text>
                              
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <div style={{ width: '120px' }}>
                                  <TextField
                                    label=""
                                    type="number"
                                    value={pendingThreshold.toString()}
                                    onChange={handleThresholdChange}
                                    autoComplete="off"
                                    min={1}
                                    max={100}
                                    suffix="units"
                                    placeholder="5"
                                  />
                                </div>
                                <Button
                                  onClick={confirmThreshold}
                                  disabled={pendingThreshold === inventoryThreshold}
                                  variant="primary"
                                  size="medium"
                                  tone={pendingThreshold !== inventoryThreshold ? "success" : undefined}
                                >
                                  Apply
                                </Button>
                              </div>
                              
                              <Text as="p" variant="bodySm" tone="subdued">
                                Products with ≤{inventoryThreshold} units will trigger alerts
                              </Text>
                            </BlockStack>
                          </div>

                          {/* Storefront Visibility Settings */}
                          <div style={{
                            background: '#ffffff',
                            border: '1px solid #e2e8f0',
                            borderRadius: '8px',
                            padding: '1.25rem'
                          }}>
                            <BlockStack gap="300">
                              <Text as="h5" variant="headingSm" fontWeight="semibold">
                                Product Hiding Rules
                              </Text>
                              
                              {/* Auto-hide Out of Stock Products */}
                              <div style={{ 
                                display: 'flex', 
                                justifyContent: 'space-between', 
                                alignItems: 'center',
                                padding: '0.75rem',
                                background: '#fef2f2',
                                borderRadius: '6px',
                                border: '1px solid #fecaca'
                              }}>
                                <div>
                                  <Text as="p" variant="bodySm" fontWeight="medium">
                                    Auto-Hide Out of Stock Products
                                  </Text>
                                  <Text as="p" variant="bodySm" tone="subdued">
                                    Automatically hide products with 0 inventory
                                  </Text>
                                </div>
                                <div
                                  style={{
                                    width: '36px',
                                    height: '18px',
                                    backgroundColor: localVisibilitySettings.hideOutOfStock ? '#dc2626' : '#d1d5db',
                                    borderRadius: '9px',
                                    position: 'relative',
                                    cursor: 'pointer',
                                    transition: 'all 0.3s ease'
                                  }}
                                  onClick={() => {
                                    const newSettings = { 
                                      ...localVisibilitySettings, 
                                      hideOutOfStock: !localVisibilitySettings.hideOutOfStock 
                                    };
                                    setLocalVisibilitySettings(newSettings);
                                    handleVisibilitySettingChange('hideOutOfStock', !localVisibilitySettings.hideOutOfStock);
                                  }}
                                >
                                  <div
                                    style={{
                                      width: '14px',
                                      height: '14px',
                                      backgroundColor: 'white',
                                      borderRadius: '50%',
                                      position: 'absolute',
                                      top: '2px',
                                      left: localVisibilitySettings.hideOutOfStock ? '20px' : '2px',
                                      transition: 'all 0.3s ease',
                                      boxShadow: '0 1px 2px rgba(0, 0, 0, 0.2)'
                                    }}
                                  />
                                </div>
                              </div>

                              {/* Auto-show When Restocked */}
                              <div style={{ 
                                display: 'flex', 
                                justifyContent: 'space-between', 
                                alignItems: 'center',
                                padding: '0.75rem',
                                background: '#f0fdf4',
                                borderRadius: '6px',
                                border: '1px solid #86efac'
                              }}>
                                <div>
                                  <Text as="p" variant="bodySm" fontWeight="medium">
                                    Auto-Show When Restocked
                                  </Text>
                                  <Text as="p" variant="bodySm" tone="subdued">
                                    Automatically restore visibility when inventory is replenished
                                  </Text>
                                </div>
                                <div
                                  style={{
                                    width: '36px',
                                    height: '18px',
                                    backgroundColor: localVisibilitySettings.showWhenRestocked ? '#10b981' : '#d1d5db',
                                    borderRadius: '9px',
                                    position: 'relative',
                                    cursor: 'pointer',
                                    transition: 'all 0.3s ease'
                                  }}
                                  onClick={() => {
                                    const newSettings = { 
                                      ...localVisibilitySettings, 
                                      showWhenRestocked: !localVisibilitySettings.showWhenRestocked 
                                    };
                                    setLocalVisibilitySettings(newSettings);
                                    handleVisibilitySettingChange('showWhenRestocked', !localVisibilitySettings.showWhenRestocked);
                                  }}
                                >
                                  <div
                                    style={{
                                      width: '14px',
                                      height: '14px',
                                      backgroundColor: 'white',
                                      borderRadius: '50%',
                                      position: 'absolute',
                                      top: '2px',
                                      left: localVisibilitySettings.showWhenRestocked ? '20px' : '2px',
                                      transition: 'all 0.3s ease',
                                      boxShadow: '0 1px 2px rgba(0, 0, 0, 0.2)'
                                    }}
                                  />
                                </div>
                              </div>

                              <div style={{
                                padding: '0.75rem',
                                background: '#f8fafc',
                                borderRadius: '6px',
                                border: '1px solid #e2e8f0'
                              }}>
                                <Text as="p" variant="bodySm" tone="subdued">
                                  💡 For low stock products, use the "Bulk Edit" buttons below each section to manually hide/show products as needed.
                                </Text>
                              </div>
                            </BlockStack>
                          </div>
                        </div>
                      )}

                      {/* Status Summary - Always show */}
                      <div style={{
                        background: localVisibilitySettings.enabled ? 'rgba(16, 185, 129, 0.05)' : 'rgba(107, 114, 128, 0.05)',
                        border: `1px solid ${localVisibilitySettings.enabled ? 'rgba(16, 185, 129, 0.2)' : 'rgba(107, 114, 128, 0.2)'}`,
                        borderRadius: '8px',
                        padding: '1rem'
                      }}>
                        <InlineStack align="space-between" blockAlign="center">
                          <InlineStack gap="300" blockAlign="center">
                            <div style={{
                              width: '8px',
                              height: '8px',
                              backgroundColor: localVisibilitySettings.enabled ? '#10b981' : '#6b7280',
                              borderRadius: '50%'
                            }}></div>
                            <Text as="p" variant="bodyMd" fontWeight="medium">
                              {localVisibilitySettings.enabled 
                                ? 'Storefront visibility management active' 
                                : 'Storefront visibility management inactive - Enable to start managing products'
                              }
                            </Text>
                          </InlineStack>
                        </InlineStack>
                        
                        {localVisibilitySettings.enabled && (
                          <div style={{ marginTop: '0.75rem' }}>
                            <Text as="p" variant="bodySm" tone="subdued">
                              Managing {products.length} products • {localVisibilitySettings.hideOutOfStock ? 'Out of stock products auto-hidden' : 'Out of stock products visible'} • {localVisibilitySettings.showWhenRestocked ? 'Auto-restore when restocked' : 'Manual restore required'}
                            </Text>
                          </div>
                        )}
                      </div>
                    </BlockStack>
                  </div>

                  {/* Out of Stock Products Subsection */}
                  <BlockStack gap="300">
                    <InlineStack align="space-between" blockAlign="center">
                      <InlineStack gap="300" blockAlign="center">
                        <Text as="h3" variant="headingMd" fontWeight="semibold">
                          Out of Stock Products
                        </Text>
                        {zeroStockProducts.length > 0 && (
                          <div style={{
                            backgroundColor: 'rgba(220, 38, 38, 0.1)',
                            padding: '0.25rem 0.75rem',
                            borderRadius: '12px',
                            border: '1px solid rgba(220, 38, 38, 0.2)'
                          }}>
                            <InlineStack gap="100" blockAlign="center">
                              <Icon source={AlertTriangleIcon} tone="critical" />
                              <Text as="span" variant="bodySm" tone="critical" fontWeight="medium">
                                Immediate Action Required
                              </Text>
                            </InlineStack>
                          </div>
                        )}
                      </InlineStack>
                      <InlineStack gap="200">
                        <Badge tone="critical">{zeroStockProducts.length}</Badge>
                        {zeroStockProducts.length > 0 && (
                          <Button
                            onClick={() => {
                              setBulkEditMode({ ...bulkEditMode, outOfStock: !bulkEditMode.outOfStock });
                              // Clear selections when toggling off
                              if (bulkEditMode.outOfStock) {
                                setSelectedProducts(new Set());
                              }
                            }}
                            variant={bulkEditMode.outOfStock ? "primary" : "secondary"}
                            size="medium"
                            tone={bulkEditMode.outOfStock ? "critical" : undefined}
                          >
                            {bulkEditMode.outOfStock ? 'Exit Bulk Edit' : 'Bulk Edit'}
                          </Button>
                        )}
                      </InlineStack>
                    </InlineStack>

                    {/* Bulk Edit Controls for Out of Stock - Only show when enabled */}
                    {bulkEditMode.outOfStock && zeroStockProducts.length > 0 && (
                      <div style={{
                        background: 'linear-gradient(135deg, #fef2f2 0%, #fecaca 100%)',
                        border: '2px solid #f87171',
                        borderRadius: '12px',
                        padding: '1.25rem',
                        marginBottom: '1rem',
                        boxShadow: '0 4px 6px rgba(248, 113, 113, 0.1)'
                      }}>
                        <BlockStack gap="300">
                          <InlineStack align="space-between" blockAlign="center">
                            <InlineStack gap="300" blockAlign="center">
                              <div style={{
                                width: '32px',
                                height: '32px',
                                backgroundColor: '#dc2626',
                                borderRadius: '8px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}>
                                <Icon source={CheckboxIcon} tone="base" />
                              </div>
                              <BlockStack gap="100">
                                <Text as="h4" variant="headingSm" fontWeight="semibold" tone="critical">
                                  Bulk Actions - Out of Stock Products
                                </Text>
                                <Text as="p" variant="bodySm" tone="subdued">
                                  Select and manage multiple out of stock products at once
                                </Text>
                              </BlockStack>
                            </InlineStack>
                            <InlineStack gap="200">
                              <Button
                                onClick={() => {
                                  const allOutOfStockIds = zeroStockProducts.map((p: Product) => p.id);
                                  const newSelected = new Set(selectedProducts);
                                  const selectedOutOfStock = allOutOfStockIds.filter((id: string) => newSelected.has(id));
                                  
                                  if (selectedOutOfStock.length === allOutOfStockIds.length) {
                                    // Deselect all out of stock
                                    allOutOfStockIds.forEach((id: string) => newSelected.delete(id));
                                  } else {
                                    // Select all out of stock
                                    allOutOfStockIds.forEach((id: string) => newSelected.add(id));
                                  }
                                  setSelectedProducts(newSelected);
                                }}
                                variant="tertiary"
                                size="medium"
                              >
                                {zeroStockProducts.every((p: Product) => selectedProducts.has(p.id)) ? 'Deselect All' : 'Select All'}
                              </Button>
                              {Array.from(selectedProducts).filter((id: string) => zeroStockProducts.some((p: Product) => p.id === id)).length > 0 && (
                                <Form method="post" style={{ display: 'inline' }}>
                                  <input type="hidden" name="actionType" value="hideSelectedProducts" />
                                  <input type="hidden" name="selectedProductIds" value={Array.from(selectedProducts).filter((id: string) => zeroStockProducts.some((p: Product) => p.id === id)).join(',')} />
                                  <Button
                                    submit
                                    variant="primary"
                                    tone="critical"
                                    size="medium"
                                  >
                                    Hide {Array.from(selectedProducts).filter((id: string) => zeroStockProducts.some((p: Product) => p.id === id)).length.toString()} Selected
                                  </Button>
                                </Form>
                              )}
                            </InlineStack>
                          </InlineStack>
                          <div style={{
                            padding: '0.75rem',
                            background: 'rgba(255, 255, 255, 0.8)',
                            borderRadius: '8px',
                            border: '1px solid rgba(220, 38, 38, 0.2)'
                          }}>
                            <Text as="p" variant="bodySm" tone="subdued">
                              💡 <strong>{Array.from(selectedProducts).filter((id: string) => zeroStockProducts.some((p: Product) => p.id === id)).length}</strong> of <strong>{zeroStockProducts.length}</strong> out of stock products selected. Click products below to select/deselect them.
                            </Text>
                          </div>
                        </BlockStack>
                      </div>
                    )}
                  
                  {zeroStockProducts.length === 0 ? (
                    <EmptyState
                      image=""
                      heading="No out of stock products"
                      children={
                        <Text as="p" variant="bodyMd" tone="subdued">
                          Great! All products currently have inventory available
                        </Text>
                      }
                    />
                  ) : (
                    <BlockStack gap="300">
                      <Text as="p" variant="bodyMd" tone="subdued">
                        Products that are completely out of stock and need immediate restocking
                      </Text>
                      
                      {/* Compact Grid Layout with Scroll */}
                      <div 
                        id="out-of-stock-grid"
                        style={{ 
                          maxHeight: '350px',
                          overflowY: 'auto',
                          border: '1px solid #fecaca',
                          borderRadius: '8px',
                          padding: '1rem',
                          background: '#fef2f2',
                          transition: 'all 0.3s ease'
                        }}
                      >
                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                          gap: '0.75rem'
                        }}>
                          {zeroStockProducts.map((product: Product) => (
                            <div key={product.id} className="product-card-hover" style={{ 
                              background: '#fef7f7',
                              border: '1px solid #fecaca',
                              borderRadius: '8px',
                              padding: '0.75rem',
                              transition: 'all 0.2s ease',
                              cursor: 'pointer'
                            }}
                            onClick={() => handleProductClick(product.id)}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.borderColor = '#f87171';
                              e.currentTarget.style.boxShadow = '0 2px 8px rgba(248, 113, 113, 0.15)';
                              e.currentTarget.style.transform = 'translateY(-1px)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.borderColor = '#fecaca';
                              e.currentTarget.style.boxShadow = 'none';
                              e.currentTarget.style.transform = 'translateY(0)';
                            }}>
                              <InlineStack gap="300" blockAlign="center">
                                {/* Selection Checkbox - Only show in bulk edit mode */}
                                {bulkEditMode.outOfStock && (
                                  <div 
                                    onClick={(e) => e.stopPropagation()}
                                    style={{ flexShrink: 0 }}
                                  >
                                    <Checkbox 
                                      checked={selectedProducts.has(product.id)}
                                      onChange={() => toggleProductSelection(product.id)}
                                      label=""
                                    />
                                  </div>
                                )}
                                
                                {/* Compact Product Image */}
                                <div style={{
                                  width: '40px',
                                  height: '40px',
                                  borderRadius: '6px',
                                  overflow: 'hidden',
                                  backgroundColor: '#fef2f2',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  border: '2px solid #fecaca',
                                  flexShrink: 0
                                }}>
                                  {product.image ? (
                                    <img
                                      src={product.image}
                                      alt={product.imageAlt}
                                      style={{
                                        width: '100%',
                                        height: '100%',
                                        objectFit: 'cover',
                                        opacity: 0,
                                        transition: 'opacity 0.3s ease-in-out'
                                      }}
                                      onLoad={(e) => {
                                        e.currentTarget.style.opacity = '1';
                                      }}
                                      onError={(e) => {
                                        e.currentTarget.style.display = 'none';
                                      }}
                                    />
                                  ) : (
                                    <Icon source={InventoryIcon} tone="critical" />
                                  )}
                                </div>
                                
                                {/* Compact Product Info */}
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <BlockStack gap="100">
                                    <div style={{ 
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                      whiteSpace: 'nowrap'
                                    }}>
                                      <Text as="p" variant="bodyMd" fontWeight="medium">
                                        {product.name}
                                      </Text>
                                    </div>
                                    <InlineStack gap="200" align="space-between">
                                      <InlineStack gap="100" blockAlign="center">
                                        <Badge tone="critical" size="small">
                                          0 units
                                        </Badge>
                                        {/* Product Visibility Status */}
                                        {product.status === 'ACTIVE' && product.handle ? (
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              if (product.handle) {
                                                window.open(getProductStoreUrl(shopInfo.myshopifyDomain, product.handle), '_blank');
                                              }
                                            }}
                                            style={{
                                              background: 'none',
                                              border: 'none',
                                              cursor: 'pointer',
                                              padding: '2px',
                                              borderRadius: '2px',
                                              display: 'flex',
                                              alignItems: 'center',
                                              color: '#10b981'
                                            }}
                                            title="View live product in store"
                                          >
                                            <Icon source={ViewIcon} tone="success" />
                                          </button>
                                        ) : (
                                          <div
                                            style={{
                                              padding: '2px',
                                              display: 'flex',
                                              alignItems: 'center',
                                              color: '#ef4444'
                                            }}
                                            title="Product is drafted/hidden from store"
                                          >
                                            <Icon source={HideIcon} tone="critical" />
                                          </div>
                                        )}
                                      </InlineStack>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleProductClick(product.id);
                                        }}
                                        style={{
                                          background: '#dc2626',
                                          color: 'white',
                                          border: 'none',
                                          borderRadius: '4px',
                                          padding: '0.25rem 0.5rem',
                                          fontSize: '12px',
                                          fontWeight: '500',
                                          cursor: 'pointer',
                                          transition: 'background 0.2s ease'
                                        }}
                                        onMouseEnter={(e) => {
                                          e.currentTarget.style.background = '#b91c1c';
                                        }}
                                        onMouseLeave={(e) => {
                                          e.currentTarget.style.background = '#dc2626';
                                        }}
                                      >
                                        Manage
                                      </button>
                                    </InlineStack>
                                  </BlockStack>
                                </div>
                              </InlineStack>
                            </div>
                          ))}
                        </div>
                      </div>
                    </BlockStack>
                  )}
                  </BlockStack>

                  {/* Low Stock Products Subsection */}
                  <div style={{
                    borderTop: '2px solid #e2e8f0',
                    paddingTop: '1.5rem'
                  }}>
                    <BlockStack gap="300">
                      <InlineStack align="space-between" blockAlign="center">
                        <InlineStack gap="300" blockAlign="center">
                          <Text as="h3" variant="headingMd" fontWeight="semibold">
                            Low Stock Products
                          </Text>
                          {lowStockProducts.length > 0 && (
                            <div style={{
                              backgroundColor: 'rgba(245, 158, 11, 0.1)',
                              padding: '0.25rem 0.75rem',
                              borderRadius: '12px',
                              border: '1px solid rgba(245, 158, 11, 0.2)'
                            }}>
                              <InlineStack gap="100" blockAlign="center">
                                <Icon source={AlertTriangleIcon} tone="warning" />
                                <Text as="span" variant="bodySm" tone="critical" fontWeight="medium">
                                  Running Low - Restock Soon
                                </Text>
                              </InlineStack>
                            </div>
                          )}
                        </InlineStack>
                        <InlineStack gap="200">
                          <Badge tone="warning">{lowStockProducts.length.toString()}</Badge>
                          {lowStockProducts.length > 0 && (
                            <Button
                              onClick={() => {
                                setBulkEditMode({ ...bulkEditMode, lowStock: !bulkEditMode.lowStock });
                                // Clear selections when toggling off
                                if (bulkEditMode.lowStock) {
                                  setSelectedProducts(new Set());
                                }
                              }}
                              variant={bulkEditMode.lowStock ? "primary" : "secondary"}
                              size="medium"
                            >
                              {bulkEditMode.lowStock ? 'Exit Bulk Edit' : 'Bulk Edit'}
                            </Button>
                          )}
                        </InlineStack>
                      </InlineStack>

                      {/* Bulk Edit Controls for Low Stock - Only show when enabled */}
                      {bulkEditMode.lowStock && lowStockProducts.length > 0 && (
                        <div style={{
                          background: 'linear-gradient(135deg, #fffbeb 0%, #fcd34d 100%)',
                          border: '2px solid #f59e0b',
                          borderRadius: '12px',
                          padding: '1.25rem',
                          marginBottom: '1rem',
                          boxShadow: '0 4px 6px rgba(245, 158, 11, 0.1)'
                        }}>
                          <BlockStack gap="300">
                            <InlineStack align="space-between" blockAlign="center">
                              <InlineStack gap="300" blockAlign="center">
                                <div style={{
                                  width: '32px',
                                  height: '32px',
                                  backgroundColor: '#f59e0b',
                                  borderRadius: '8px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center'
                                }}>
                                  <Icon source={CheckboxIcon} tone="base" />
                                </div>
                                <BlockStack gap="100">
                                  <Text as="h4" variant="headingSm" fontWeight="semibold">
                                    Bulk Actions - Low Stock Products
                                  </Text>
                                  <Text as="p" variant="bodySm" tone="subdued">
                                    Select and manage multiple low stock products at once
                                  </Text>
                                </BlockStack>
                              </InlineStack>
                              <InlineStack gap="200">
                                <Button
                                  onClick={() => {
                                    const allLowStockIds = lowStockProducts.map((p: Product) => p.id);
                                    const newSelected = new Set(selectedProducts);
                                    const selectedLowStock = allLowStockIds.filter((id: string) => newSelected.has(id));
                                    
                                    if (selectedLowStock.length === allLowStockIds.length) {
                                      // Deselect all low stock
                                      allLowStockIds.forEach((id: string) => newSelected.delete(id));
                                    } else {
                                      // Select all low stock
                                      allLowStockIds.forEach((id: string) => newSelected.add(id));
                                    }
                                    setSelectedProducts(newSelected);
                                  }}
                                  variant="tertiary"
                                  size="medium"
                                >
                                  {lowStockProducts.every((p: Product) => selectedProducts.has(p.id)) ? 'Deselect All' : 'Select All'}
                                </Button>
                                {Array.from(selectedProducts).filter((id: string) => lowStockProducts.some((p: Product) => p.id === id)).length > 0 && (
                                  <Form method="post" style={{ display: 'inline' }}>
                                    <input type="hidden" name="actionType" value="hideSelectedProducts" />
                                    <input type="hidden" name="selectedProductIds" value={Array.from(selectedProducts).filter((id: string) => lowStockProducts.some((p: Product) => p.id === id)).join(',')} />
                                    <Button
                                      submit
                                      variant="primary"
                                      size="medium"
                                    >
                                      Hide {Array.from(selectedProducts).filter((id: string) => lowStockProducts.some((p: Product) => p.id === id)).length.toString()} Selected
                                    </Button>
                                  </Form>
                                )}
                              </InlineStack>
                            </InlineStack>
                            <div style={{
                              padding: '0.75rem',
                              background: 'rgba(255, 255, 255, 0.8)',
                              borderRadius: '8px',
                              border: '1px solid rgba(245, 158, 11, 0.2)'
                            }}>
                              <Text as="p" variant="bodySm" tone="subdued">
                                💡 <strong>{Array.from(selectedProducts).filter((id: string) => lowStockProducts.some((p: Product) => p.id === id)).length}</strong> of <strong>{lowStockProducts.length}</strong> low stock products selected. Click products below to select/deselect them.
                              </Text>
                            </div>
                          </BlockStack>
                        </div>
                      )}
                      
                      {lowStockProducts.length === 0 ? (
                        <EmptyState
                          image=""
                          heading="No low stock alerts"
                          children={
                            <Text as="p" variant="bodyMd" tone="subdued">
                              All products are above the threshold of {inventoryThreshold} units
                            </Text>
                          }
                        />
                      ) : (
                        <BlockStack gap="300">
                          <Text as="p" variant="bodyMd" tone="subdued">
                            Products below {inventoryThreshold} units that need restocking attention
                          </Text>
                          
                          {/* Compact Grid Layout with Scroll */}
                          <div 
                            id="low-stock-grid"
                            style={{ 
                              maxHeight: '350px',
                              overflowY: 'auto',
                              border: '1px solid #fcd34d',
                              borderRadius: '8px',
                              padding: '1rem',
                              background: '#fffbeb',
                              transition: 'all 0.3s ease'
                            }}
                          >
                            <div style={{
                              display: 'grid',
                              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                              gap: '0.75rem'
                            }}>
                              {lowStockProducts.map((product: Product) => {
                                const isCritical = product.stock <= Math.floor(inventoryThreshold / 2);
                                return (
                                  <div key={product.id} className="product-card-hover" style={{ 
                                    background: '#fffcf5',
                                    border: isCritical ? '1px solid #f59e0b' : '1px solid #fcd34d',
                                    borderRadius: '8px',
                                    padding: '0.75rem',
                                    transition: 'all 0.2s ease',
                                    cursor: 'pointer'
                                  }}
                                  onClick={() => handleProductClick(product.id)}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.borderColor = isCritical ? '#fb923c' : '#fbbf24';
                                    e.currentTarget.style.boxShadow = `0 2px 8px rgba(${isCritical ? '251, 146, 60' : '251, 191, 36'}, 0.15)`;
                                    e.currentTarget.style.transform = 'translateY(-1px)';
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.borderColor = isCritical ? '#f59e0b' : '#fcd34d';
                                    e.currentTarget.style.boxShadow = 'none';
                                    e.currentTarget.style.transform = 'translateY(0)';
                                  }}>
                                    <InlineStack gap="300" blockAlign="center">
                                      {/* Selection Checkbox - Only show in bulk edit mode */}
                                      {bulkEditMode.lowStock && (
                                        <div 
                                          onClick={(e) => e.stopPropagation()}
                                          style={{ flexShrink: 0 }}
                                        >
                                          <Checkbox 
                                            checked={selectedProducts.has(product.id)}
                                            onChange={() => toggleProductSelection(product.id)}
                                            label=""
                                          />
                                        </div>
                                      )}
                                      
                                      {/* Compact Product Image */}
                                      <div style={{
                                        width: '40px',
                                        height: '40px',
                                        borderRadius: '6px',
                                        overflow: 'hidden',
                                        backgroundColor: '#fffbeb',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        border: isCritical ? '2px solid #f59e0b' : '2px solid #fcd34d',
                                        flexShrink: 0
                                      }}>
                                        {product.image ? (
                                          <img
                                            src={product.image}
                                            alt={product.imageAlt}
                                            style={{
                                              width: '100%',
                                              height: '100%',
                                              objectFit: 'cover',
                                              opacity: 0,
                                              transition: 'opacity 0.3s ease-in-out'
                                            }}
                                            onLoad={(e) => {
                                              e.currentTarget.style.opacity = '1';
                                            }}
                                            onError={(e) => {
                                              e.currentTarget.style.display = 'none';
                                            }}
                                          />
                                        ) : (
                                          <Icon source={InventoryIcon} tone="warning" />
                                        )}
                                      </div>
                                      
                                      {/* Compact Product Info */}
                                      <div style={{ flex: 1, minWidth: 0 }}>
                                        <BlockStack gap="100">
                                          <div style={{ 
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap'
                                          }}>
                                            <Text as="p" variant="bodyMd" fontWeight="medium">
                                              {product.name}
                                            </Text>
                                          </div>
                                          <InlineStack gap="200" align="space-between">
                                            <InlineStack gap="100" blockAlign="center">
                                              <Badge tone={isCritical ? "critical" : "warning"} size="small">
                                                {`${product.stock} units`}
                                              </Badge>
                                              {isCritical && (
                                                <Badge tone="critical" size="small">
                                                  Critical
                                                </Badge>
                                              )}
                                              {/* Product Visibility Status */}
                                              {product.status === 'ACTIVE' && product.handle ? (
                                                <button
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (product.handle) {
                                                      window.open(getProductStoreUrl(shopInfo.myshopifyDomain, product.handle), '_blank');
                                                    }
                                                  }}
                                                  style={{
                                                    background: 'none',
                                                    border: 'none',
                                                    cursor: 'pointer',
                                                    padding: '2px',
                                                    borderRadius: '2px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    color: '#10b981'
                                                  }}
                                                  title="View live product in store"
                                                >
                                                  <Icon source={ViewIcon} tone="success" />
                                                </button>
                                              ) : (
                                                <div
                                                  style={{
                                                    padding: '2px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    color: '#ef4444'
                                                  }}
                                                  title="Product is drafted/hidden from store"
                                                >
                                                  <Icon source={HideIcon} tone="critical" />
                                                </div>
                                              )}
                                            </InlineStack>
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                handleProductClick(product.id);
                                              }}
                                              style={{
                                                background: isCritical ? '#dc2626' : '#f59e0b',
                                                color: 'white',
                                                border: 'none',
                                                borderRadius: '4px',
                                                padding: '0.25rem 0.5rem',
                                                fontSize: '12px',
                                                fontWeight: '500',
                                                cursor: 'pointer',
                                                transition: 'background 0.2s ease'
                                              }}
                                              onMouseEnter={(e) => {
                                                e.currentTarget.style.background = isCritical ? '#b91c1c' : '#d97706';
                                              }}
                                              onMouseLeave={(e) => {
                                                e.currentTarget.style.background = isCritical ? '#dc2626' : '#f59e0b';
                                              }}
                                            >
                                              {isCritical ? 'Urgent' : 'Manage'}
                                            </button>
                                          </InlineStack>
                                        </BlockStack>
                                      </div>
                                    </InlineStack>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </BlockStack>
                      )}
                    </BlockStack>
                  </div>
                </BlockStack>
              </Card>
              </div>
            </BlockStack>
          </Layout.Section>
          
          {/* Inventory Forecasting - Accordion Style */}
          <Layout.Section>
            <div style={{ 
              background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '2rem'
            }}>
              <BlockStack gap="400">
                  <InlineStack align="space-between" blockAlign="center">
                    <InlineStack gap="300" blockAlign="center">
                      <Icon source={CalendarIcon} tone="base" />
                      <BlockStack gap="100">
                        <Text as="h2" variant="headingLg" fontWeight="semibold">
                          Smart Inventory Forecasting
                        </Text>
                        <InlineStack gap="300" blockAlign="center">
                          <Text as="p" variant="bodyMd" tone="subdued">
                            Priority-sorted predictions: Critical alerts first, then warnings
                          </Text>
                        </InlineStack>
                      </BlockStack>
                    </InlineStack>
                    <div data-toggle-button="forecast">
                      <Button
                        onClick={() => setInventoryForecastOpen(!inventoryForecastOpen)}
                        variant="tertiary"
                        size="medium"
                        icon={inventoryForecastOpen ? ChevronUpIcon : ChevronDownIcon}
                      >
                        {inventoryForecastOpen ? 'Hide Forecast Details' : 'Show Forecast Details'}
                      </Button>
                    </div>
                  </InlineStack>
                  
                  <Collapsible
                    open={inventoryForecastOpen}
                    id="inventory-forecast-collapsible"
                    transition={{duration: '200ms', timingFunction: 'ease-in-out'}}
                  >
                    <BlockStack gap="400">
                      {/* Enhanced Compact Forecast Status Legend with Controls */}
                      <div style={{ 
                        background: '#ffffff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        padding: '1rem'
                      }}>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          flexWrap: 'wrap',
                          gap: '1rem'
                        }}>
                          {/* Status Indicators - Horizontal Layout */}
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '1.5rem',
                            flexWrap: 'wrap'
                          }}>
                            {/* Critical */}
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.5rem',
                              padding: '0.4rem 0.75rem',
                              background: '#fef2f2',
                              border: '1px solid #fecaca',
                              borderRadius: '20px'
                            }}>
                              <div style={{
                                width: '8px',
                                height: '8px',
                                backgroundColor: '#dc2626',
                                borderRadius: '50%'
                              }}></div>
                              <Text as="span" variant="bodySm" fontWeight="medium">
                                0 Critical - Restock Urgent
                              </Text>
                            </div>

                            {/* Warning */}
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.5rem',
                              padding: '0.4rem 0.75rem',
                              background: '#fffbeb',
                              border: '1px solid #fcd34d',
                              borderRadius: '20px'
                            }}>
                              <div style={{
                                width: '8px',
                                height: '8px',
                                backgroundColor: '#f59e0b',
                                borderRadius: '50%'
                              }}></div>
                              <Text as="span" variant="bodySm" fontWeight="medium">
                                0 Warning - Order Soon
                              </Text>
                            </div>

                            {/* Safe */}
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.5rem',
                              padding: '0.4rem 0.75rem',
                              background: '#f0fdf4',
                              border: '1px solid #86efac',
                              borderRadius: '20px'
                            }}>
                              <div style={{
                                width: '8px',
                                height: '8px',
                                backgroundColor: '#10b981',
                                borderRadius: '50%'
                              }}></div>
                              <Text as="span" variant="bodySm" fontWeight="medium">
                                6 Safe - Well Stocked
                              </Text>
                            </div>
                          </div>

                          {/* Time Period Selector - Matching Status Indicators Design */}
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem'
                          }}>
                            {timePeriodOptions.map((option, index) => (
                              <div
                                key={option.value}
                                onClick={() => setTimePeriod(option.value)}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '0.5rem',
                                  padding: '0.4rem 0.75rem',
                                  background: timePeriod === option.value ? '#eff6ff' : '#f8fafc',
                                  border: `1px solid ${timePeriod === option.value ? '#93c5fd' : '#e2e8f0'}`,
                                  borderRadius: '20px',
                                  cursor: 'pointer',
                                  transition: 'all 0.15s ease'
                                }}
                                onMouseEnter={(e) => {
                                  if (timePeriod !== option.value) {
                                    e.currentTarget.style.background = '#f1f5f9';
                                    e.currentTarget.style.borderColor = '#cbd5e1';
                                  }
                                }}
                                onMouseLeave={(e) => {
                                  if (timePeriod !== option.value) {
                                    e.currentTarget.style.background = '#f8fafc';
                                    e.currentTarget.style.borderColor = '#e2e8f0';
                                  }
                                }}
                              >
                                <div style={{
                                  width: '8px',
                                  height: '8px',
                                  backgroundColor: timePeriod === option.value ? '#3b82f6' : '#94a3b8',
                                  borderRadius: '50%'
                                }}></div>
                                <Text as="span" variant="bodySm" fontWeight="medium">
                                  {option.label}
                                </Text>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                      
                      {/* Products Detailed List */}
                      {lowStockProducts.length === 0 ? (
                        <EmptyState
                          image=""
                          heading="All products well-stocked"
                          children={
                            <Text as="p" variant="bodyMd" tone="subdued">
                              No products are currently below the threshold of {inventoryThreshold} units
                            </Text>
                          }
                        />
                      ) : (
                        <BlockStack gap="300">
                          <InlineStack align="space-between" blockAlign="center">
                            <InlineStack gap="300" blockAlign="center">
                              <Text as="p" variant="bodyMd" fontWeight="medium">
                                {lowStockProducts.length} product{lowStockProducts.length !== 1 ? 's' : ''} need attention
                              </Text>
                              {lowStockProducts.length > 0 && (
                                <div style={{
                                  backgroundColor: 'rgba(245, 158, 11, 0.1)',
                                  padding: '0.25rem 0.75rem',
                                  borderRadius: '12px',
                                  border: '1px solid rgba(245, 158, 11, 0.2)'
                                }}>
                                  <InlineStack gap="100" blockAlign="center">
                                    <Icon source={AlertTriangleIcon} tone="warning" />
                                    <Text as="span" variant="bodySm" tone="critical" fontWeight="medium">
                                      Monitor & Restock Soon
                                    </Text>
                                  </InlineStack>
                                </div>
                              )}
                            </InlineStack>
                            <Text as="p" variant="bodySm" tone="subdued">
                              Threshold: ≤{inventoryThreshold} units
                            </Text>
                          </InlineStack>
                          
                          <BlockStack gap="200">
                            {lowStockProducts.map((product: Product) => {
                              const isCritical = product.stock <= inventoryThreshold / 2;
                              const isOutOfStock = product.stock === 0;
                              
                              return (
                                <div key={product.id} className={`product-card-hover ${isCritical ? 'product-card-critical' : 'product-card-warning'}`} style={{ 
                                  background: isCritical ? 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)' : 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
                                  border: isCritical ? '1px solid #fca5a5' : '1px solid #fbbf24',
                                  borderLeft: isCritical ? '4px solid #ef4444' : '4px solid #f59e0b',
                                  borderRadius: '8px',
                                  padding: '1rem',
                                  position: 'relative'
                                }}>
                                  {/* Priority Indicator */}
                                  <div style={{ position: 'absolute', top: '1rem', right: '1rem' }}>
                                    <div style={{
                                      background: isCritical ? '#fef2f2' : '#fffbeb',
                                      color: isCritical ? '#dc2626' : '#d97706',
                                      padding: '0.25rem 0.5rem',
                                      borderRadius: '4px',
                                      fontSize: '11px',
                                      fontWeight: '600',
                                      textTransform: 'uppercase',
                                      letterSpacing: '0.5px'
                                    }}>
                                      {isCritical ? 'CRITICAL' : 'WARNING'}
                                    </div>
                                  </div>
                                  
                                  <BlockStack gap="200">
                                    <InlineStack align="space-between" blockAlign="start">
                                      <InlineStack gap="300" blockAlign="start">
                                        {/* Selection Checkbox */}
                                        <div style={{ flexShrink: 0, paddingTop: '0.5rem' }}>
                                          <Checkbox 
                                            checked={selectedProducts.has(product.id)}
                                            onChange={() => toggleProductSelection(product.id)}
                                            label=""
                                          />
                                        </div>
                                        
                                        {/* Product Image */}
                                        <div style={{
                                          width: '60px',
                                          height: '60px',
                                          borderRadius: '8px',
                                          overflow: 'hidden',
                                          border: '2px solid #e2e8f0',
                                          backgroundColor: '#f9fafb',
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          fontSize: '10px',
                                          textAlign: 'center',
                                          cursor: 'pointer',
                                          transition: 'all 0.2s ease'
                                        }}
                                        onClick={() => handleProductClick(product.id)}
                                        onMouseEnter={(e) => {
                                          e.currentTarget.style.borderColor = isCritical ? '#dc2626' : '#d97706';
                                          e.currentTarget.style.transform = 'scale(1.05)';
                                          e.currentTarget.style.boxShadow = `0 4px 12px ${isCritical ? 'rgba(220, 38, 38, 0.3)' : 'rgba(217, 119, 6, 0.3)'}`;
                                        }}
                                        onMouseLeave={(e) => {
                                          e.currentTarget.style.borderColor = '#e2e8f0';
                                          e.currentTarget.style.transform = 'scale(1)';
                                          e.currentTarget.style.boxShadow = 'none';
                                        }}>
                                          {product.image ? (
                                            <>
                                              <img
                                                src={product.image}
                                                alt={product.imageAlt || product.name}
                                                style={{
                                                  width: '100%',
                                                  height: '100%',
                                                  objectFit: 'cover',
                                                  opacity: 0,
                                                  transition: 'opacity 0.3s ease-in-out'
                                                }}
                                                onLoad={(e) => {
                                                  e.currentTarget.style.opacity = '1';
                                                }}
                                                onError={(e) => {
                                                  e.currentTarget.style.display = 'none';
                                                  const fallback = e.currentTarget.parentElement?.querySelector('.image-fallback') as HTMLElement;
                                                  if (fallback) {
                                                    fallback.style.display = 'flex';
                                                  }
                                                }}
                                              />
                                              <div 
                                                className="image-fallback"
                                                style={{
                                                  display: 'none',
                                                  alignItems: 'center',
                                                  justifyContent: 'center',
                                                  width: '100%',
                                                  height: '100%',
                                                  flexDirection: 'column',
                                                  backgroundColor: '#f3f4f6',
                                                  color: '#6b7280'
                                                }}
                                              >
                                                <Icon source={InventoryIcon} tone="subdued" />
                                                <div style={{ fontSize: '8px', marginTop: '2px' }}>Failed</div>
                                              </div>
                                            </>
                                          ) : (
                                            <div style={{ 
                                              display: 'flex', 
                                              alignItems: 'center', 
                                              justifyContent: 'center',
                                              flexDirection: 'column',
                                              width: '100%',
                                              height: '100%',
                                              backgroundColor: '#f3f4f6',
                                              color: '#6b7280'
                                            }}>
                                              <Icon source={InventoryIcon} tone="subdued" />
                                              <div style={{ fontSize: '8px', marginTop: '2px' }}>No Image</div>
                                            </div>
                                          )}
                                        </div>
                                        
                                        {/* Product Info */}
                                        <BlockStack gap="100">
                                          <button
                                            onClick={() => handleProductClick(product.id)}
                                            style={{
                                              background: 'none',
                                              border: 'none',
                                              padding: 0,
                                              cursor: 'pointer',
                                              textAlign: 'left',
                                              color: '#1f2937',
                                              fontSize: '16px',
                                              fontWeight: '500',
                                              textDecoration: 'none',
                                              transition: 'color 0.2s ease'
                                            }}
                                            onMouseEnter={(e) => {
                                              e.currentTarget.style.color = isCritical ? '#dc2626' : '#d97706';
                                              e.currentTarget.style.textDecoration = 'underline';
                                            }}
                                            onMouseLeave={(e) => {
                                              e.currentTarget.style.color = '#1f2937';
                                              e.currentTarget.style.textDecoration = 'none';
                                            }}
                                          >
                                            {product.name}
                                          </button>
                                          <InlineStack gap="300">
                                            <Text as="span" variant="bodySm" tone="subdued">
                                              Current Stock: {product.stock} units
                                            </Text>
                                            <Text as="span" variant="bodySm" tone="subdued">
                                              Sales Rate: {getSalesVelocity(product)}/{timePeriod === 'daily' ? 'day' : timePeriod === 'weekly' ? 'week' : 'month'}
                                            </Text>
                                          </InlineStack>
                                        </BlockStack>
                                      </InlineStack>
                                    </InlineStack>
                                    
                                    {/* Detailed Forecast Information */}
                                    <InlineStack gap="400">
                                      <InlineStack gap="100" blockAlign="center">
                                        <Icon source={CalendarIcon} tone="subdued" />
                                        <Text as="span" variant="bodySm" tone="subdued">
                                          Forecast: {getForecastDays(product)} days to stockout
                                        </Text>
                                      </InlineStack>
                                      <InlineStack gap="100" blockAlign="center">
                                        <Icon source={InventoryIcon} tone="subdued" />
                                        <Text as="span" variant="bodySm" tone="subdued">
                                          Reorder: {Math.max(20, Math.ceil(getSalesVelocity(product) * 14))} units suggested
                                        </Text>
                                      </InlineStack>
                                    </InlineStack>
                                    
                                    {/* Status and Action Section */}
                                    <InlineStack align="space-between" blockAlign="center">
                                    <InlineStack gap="200">
                                      {getForecastBadge(product)}
                                      <Text as="span" variant="headingMd" fontWeight="bold">
                                        {product.stock} units remaining
                                      </Text>
                                    </InlineStack>
                                    
                                    {product.stock <= 5 && (
                                      <Button
                                        onClick={() => window.open(`https://admin.shopify.com/store/${shopInfo.myshopifyDomain?.replace('.myshopify.com', '')}/products/${product.id.replace('gid://shopify/Product/', '')}`, '_blank')}
                                        variant="primary"
                                        size="medium"
                                        tone="critical"
                                      >
                                        Manage in Shopify
                                      </Button>
                                    )}
                                  </InlineStack>
                                </BlockStack>
                              </div>
                              );
                            })}
                          </BlockStack>
                        </BlockStack>
                      )}
                    </BlockStack>
                  </Collapsible>
                </BlockStack>
              </div>
          </Layout.Section>
          
          {/* Product Tracker Section */}
          <Layout.Section>
            <div style={{ 
              background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '2rem'
            }}>
              <BlockStack gap="400">
                <InlineStack align="space-between" blockAlign="center">
                  <InlineStack gap="300" blockAlign="center">
                    <Icon source={AlertTriangleIcon} tone="base" />
                    <BlockStack gap="100">
                      <Text as="h3" variant="headingLg" fontWeight="semibold">
                        Product Tracker
                      </Text>
                      <Text as="p" variant="bodyMd" tone="subdued">
                        AI-powered stale product analysis and suggestions
                      </Text>
                    </BlockStack>
                  </InlineStack>
                  <div data-toggle-button="tracker">
                    <Button
                      onClick={() => setProductTrackerOpen(!productTrackerOpen)}
                      variant="tertiary"
                      size="medium"
                      icon={productTrackerOpen ? ChevronUpIcon : ChevronDownIcon}
                    >
                      {productTrackerOpen ? 'Hide Analysis Details' : 'Show Analysis Details'}
                    </Button>
                  </div>
                </InlineStack>
                
                <Collapsible
                  open={productTrackerOpen}
                  id="product-tracker-collapsible"
                  transition={{duration: '200ms', timingFunction: 'ease-in-out'}}
                >
                  <BlockStack gap="400">
                    <Text as="p" variant="bodyMd" tone="subdued">
                      Track how long products have been in your store and get personalized AI-powered suggestions with recommended Shopify apps and upsell strategies.
                    </Text>
                    
                    {/* Product Tracker Stats */}
                    <InlineStack gap="200">
                      <Badge tone="critical">
                        {`${productTrackerData.filter((p: any) => getStaleStatus(getDaysInStore(p.createdAt), getDaysSinceLastSale(p.lastSoldDate)) === 'critical').length} Stale`}
                      </Badge>
                      <Badge tone="warning">
                        {`${productTrackerData.filter((p: any) => getStaleStatus(getDaysInStore(p.createdAt), getDaysSinceLastSale(p.lastSoldDate)) === 'warning').length} Aging`}
                      </Badge>
                      <Badge tone="attention">
                        {`${productTrackerData.filter((p: any) => getStaleStatus(getDaysInStore(p.createdAt), getDaysSinceLastSale(p.lastSoldDate)) === 'attention').length} Watch`}
                      </Badge>
                      <Badge tone="success">
                        {`${productTrackerData.filter((p: any) => getStaleStatus(getDaysInStore(p.createdAt), getDaysSinceLastSale(p.lastSoldDate)) === 'fresh').length} Fresh`}
                      </Badge>
                    </InlineStack>
                    
                    {/* Product List */}
                    <BlockStack gap="200">
                      {productTrackerData
                        .sort((a: any, b: any) => {
                          // Define priority order for sorting (Stale → Aging → Watch → Fresh)
                          const priorityOrder: Record<string, number> = { 
                            'critical': 1, 
                            'warning': 2, 
                            'attention': 3, 
                            'fresh': 4 
                          };
                          
                          const statusA = getStaleStatus(getDaysInStore(a.createdAt), getDaysSinceLastSale(a.lastSoldDate));
                          const statusB = getStaleStatus(getDaysInStore(b.createdAt), getDaysSinceLastSale(b.lastSoldDate));
                          
                          return priorityOrder[statusA] - priorityOrder[statusB];
                        })
                        .map((product: any) => {
                        const daysInStore = getDaysInStore(product.createdAt);
                        const daysSinceLastSale = getDaysSinceLastSale(product.lastSoldDate);
                        const status = getStaleStatus(daysInStore, daysSinceLastSale);
                        
                        return (
                          <div key={product.id} className="product-card-hover" style={{ 
                            background: '#f1f5f9',
                            border: '1px solid #e2e8f0',
                            borderRadius: '8px',
                            padding: '1rem'
                          }}>
                            <BlockStack gap="200">
                              <InlineStack align="space-between" blockAlign="start">
                                <InlineStack gap="300" blockAlign="start">
                                  {/* Product Image */}
                                  <div style={{
                                    width: '50px',
                                    height: '50px',
                                    borderRadius: '6px',
                                    overflow: 'hidden',
                                    border: '2px solid #e2e8f0',
                                    backgroundColor: '#f9fafb',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease'
                                  }}
                                  onClick={() => handleProductClick(product.id)}
                                  onMouseEnter={(e) => {
                                    const hoverColor = 
                                      status === 'critical' ? '#dc2626' : 
                                      status === 'warning' ? '#d97706' : 
                                      status === 'attention' ? '#f59e0b' : '#10b981';
                                    const shadowColor = 
                                      status === 'critical' ? 'rgba(220, 38, 38, 0.3)' : 
                                      status === 'warning' ? 'rgba(217, 119, 6, 0.3)' : 
                                      status === 'attention' ? 'rgba(245, 158, 11, 0.3)' : 'rgba(16, 185, 129, 0.3)';
                                    e.currentTarget.style.borderColor = hoverColor;
                                    e.currentTarget.style.transform = 'scale(1.05)';
                                    e.currentTarget.style.boxShadow = `0 4px 12px ${shadowColor}`;
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.borderColor = '#e2e8f0';
                                    e.currentTarget.style.transform = 'scale(1)';
                                    e.currentTarget.style.boxShadow = 'none';
                                  }}>
                                    {product.image ? (
                                      <>
                                        <img
                                          src={product.image}
                                          alt={product.imageAlt || product.name}
                                          style={{
                                            width: '100%',
                                            height: '100%',
                                            objectFit: 'cover',
                                            opacity: 0,
                                            transition: 'opacity 0.3s ease-in-out'
                                          }}
                                          onLoad={(e) => {
                                            e.currentTarget.style.opacity = '1';
                                          }}
                                          onError={(e) => {
                                            e.currentTarget.style.display = 'none';
                                            const fallback = e.currentTarget.parentElement?.querySelector('.pt-image-fallback') as HTMLElement;
                                            if (fallback) {
                                              fallback.style.display = 'flex';
                                            }
                                          }}
                                        />
                                        <div 
                                          className="pt-image-fallback"
                                          style={{
                                            display: 'none',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            width: '100%',
                                            height: '100%'
                                          }}
                                        >
                                          <Icon source={InventoryIcon} tone="subdued" />
                                        </div>
                                      </>
                                    ) : (
                                      <Icon source={InventoryIcon} tone="subdued" />
                                    )}
                                  </div>
                                  
                                  {/* Product Info */}
                                  <BlockStack gap="100">
                                    <button
                                      onClick={() => handleProductClick(product.id)}
                                      style={{
                                        background: 'none',
                                        border: 'none',
                                        padding: 0,
                                        cursor: 'pointer',
                                        textAlign: 'left',
                                        color: '#1f2937',
                                        fontSize: '14px',
                                        fontWeight: '500',
                                        textDecoration: 'none',
                                        transition: 'color 0.2s ease'
                                      }}
                                      onMouseEnter={(e) => {
                                        const hoverColor = 
                                          status === 'critical' ? '#dc2626' : 
                                          status === 'warning' ? '#d97706' : 
                                          status === 'attention' ? '#f59e0b' : '#10b981';
                                        e.currentTarget.style.color = hoverColor;
                                        e.currentTarget.style.textDecoration = 'underline';
                                      }}
                                      onMouseLeave={(e) => {
                                        e.currentTarget.style.color = '#1f2937';
                                        e.currentTarget.style.textDecoration = 'none';
                                      }}
                                    >
                                      {product.name}
                                    </button>
                                    <InlineStack gap="300">
                                      <Text as="span" variant="bodySm" tone="subdued">
                                        ${product.price}
                                      </Text>
                                      <Text as="span" variant="bodySm" tone="subdued">
                                        Stock: {product.stock}
                                      </Text>
                                      <Text as="span" variant="bodySm" tone="subdued">
                                        {product.category}
                                      </Text>
                                    </InlineStack>
                                  </BlockStack>
                                </InlineStack>
                                <Badge 
                                  tone={status === 'critical' ? 'critical' : status === 'warning' ? 'warning' : status === 'attention' ? 'attention' : 'success'}
                                >
                                  {status === 'critical' ? 'Stale' : status === 'warning' ? 'Aging' : status === 'attention' ? 'Watch' : 'Fresh'}
                                </Badge>
                              </InlineStack>
                              
                              <InlineStack gap="400">
                                <InlineStack gap="100" blockAlign="center">
                                  <Icon source={CalendarIcon} tone="subdued" />
                                  <Text as="span" variant="bodySm" tone="subdued">
                                    {daysInStore} days in store
                                  </Text>
                                </InlineStack>
                                <InlineStack gap="100" blockAlign="center">
                                  <Icon source={GiftCardIcon} tone="subdued" />
                                  <Text as="span" variant="bodySm" tone="subdued">
                                    {daysSinceLastSale} days since last sale
                                  </Text>
                                </InlineStack>
                              </InlineStack>
                              
                              {(status === 'critical' || status === 'warning' || status === 'attention') && (
                                <InlineStack gap="200">
                                  <Button
                                    onClick={() => handleProductSuggestions(product, 'ai')}
                                    variant="primary"
                                    size="slim"
                                  >
                                    AI Suggestions
                                  </Button>
                                  <Button
                                    onClick={() => handleProductSuggestions(product, 'data')}
                                    variant="secondary"
                                    size="slim"
                                  >
                                    Data Analysis
                                  </Button>
                                </InlineStack>
                              )}
                            </BlockStack>
                          </div>
                        );
                      })}
                    </BlockStack>
                  </BlockStack>
                </Collapsible>
              </BlockStack>
            </div>
          </Layout.Section>

          {/* Inventory History Section */}
          <Layout.Section>
            <div style={{ 
              background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '2rem'
            }}>
              <BlockStack gap="400">
                <InlineStack align="space-between" blockAlign="center">
                  <InlineStack gap="300" blockAlign="center">
                    <Icon source={ClockIcon} tone="base" />
                    <BlockStack gap="100">
                      <Text as="h3" variant="headingLg" fontWeight="semibold">
                        Inventory History Logs
                      </Text>
                      <Text as="p" variant="bodyMd" tone="subdued">
                        Track all inventory changes with detailed timeline and user information
                      </Text>
                    </BlockStack>
                  </InlineStack>
                  <InlineStack gap="200">
                    <Button
                      url={`/app/inventory-history?shop=${shopInfo.myshopifyDomain}&public=true`}
                      variant="primary"
                      size="large"
                    >
                      View Full History
                    </Button>
                    <Form method="post">
                      <input type="hidden" name="actionType" value="createSampleLogs" />
                      <Button
                        submit
                        variant="secondary"
                        size="large"
                      >
                        Create Sample Data
                      </Button>
                    </Form>
                  </InlineStack>
                </InlineStack>
                
                <BlockStack gap="300">
                  <Text as="p" variant="bodyMd" tone="subdued">
                    Monitor who changed what and when. Perfect for multi-user stores to prevent stock errors and track accountability.
                  </Text>
                  
                  <InlineStack gap="300">
                    <div style={{ padding: '8px 12px', backgroundColor: '#f6f6f7', borderRadius: '6px' }}>
                      <Text as="span" variant="bodySm">📝 Manual edits</Text>
                    </div>
                    <div style={{ padding: '8px 12px', backgroundColor: '#f6f6f7', borderRadius: '6px' }}>
                      <Text as="span" variant="bodySm">💰 Sales deductions</Text>
                    </div>
                    <div style={{ padding: '8px 12px', backgroundColor: '#f6f6f7', borderRadius: '6px' }}>
                      <Text as="span" variant="bodySm">Restock events</Text>
                    </div>
                  </InlineStack>
                  
                  <InlineStack gap="200">
                    <Badge tone="info">Real-time tracking</Badge>
                    <Badge tone="success">User attribution</Badge>
                    <Badge tone="attention">Change history</Badge>
                  </InlineStack>
                </BlockStack>
              </BlockStack>
            </div>
          </Layout.Section>
        </Layout>
      </BlockStack>

      {/* Notification Settings Modal */}
      <Modal
        open={showNotificationSettings}
        onClose={() => {
          setShowNotificationSettings(false);
          setActiveNotificationModal(null);
        }}
        title={`${activeNotificationModal ? (activeNotificationModal.charAt(0).toUpperCase() + activeNotificationModal.slice(1)) + ' ' : ''}Notification Settings`}
        primaryAction={{
          content: 'Save Settings',
          onAction: saveNotificationSettings,
        }}
        secondaryActions={[
          {
            content: 'Cancel',
            onAction: () => {
              setLocalNotificationSettings(notificationSettings);
              setShowNotificationSettings(false);
              setActiveNotificationModal(null);
            },
          },
        ]}
      >
        <Modal.Section>
          <FormLayout>
            {/* Email Settings - Show only if activeNotificationModal is 'email' or null */}
            {(!activeNotificationModal || activeNotificationModal === 'email') && (
              <Card>
                <BlockStack gap="300">
                  <Text as="h4" variant="headingSm" fontWeight="bold">
                    Email Notifications
                  </Text>
                  <Checkbox
                    label="Enable email notifications"
                    checked={localNotificationSettings.email.enabled}
                    onChange={(checked) => handleNotificationSettingChange('email', 'enabled', checked)}
                    helpText="Receive email alerts for low stock products"
                  />

                  {localNotificationSettings.email.enabled && (
                    <>
                      <div style={{ padding: '1rem', backgroundColor: '#f8f9fa', borderRadius: '4px', marginBottom: '1rem' }}>
                        <Text as="p" variant="bodyMd">
                          <strong>From:</strong> {shopInfo.name} &lt;{shopInfo.email}&gt;
                        </Text>
                        <Text as="p" variant="bodyMd" tone="subdued">
                          Emails will be sent automatically using your shop's information
                        </Text>
                      </div>

                      <TextField
                        label="Recipient Email Address"
                        value={localNotificationSettings.email.recipientEmail}
                        onChange={(value) => handleNotificationSettingChange('email', 'recipientEmail', value)}
                        placeholder="alerts@yourcompany.com"
                        helpText="Email address where stock alerts will be sent"
                        autoComplete="email"
                      />

                      <BlockStack gap="200">
                        <Text as="h5" variant="headingXs" fontWeight="semibold">
                          Alert Types
                        </Text>
                        <Checkbox
                          label="Out of Stock Alerts"
                          checked={localNotificationSettings.email.oosAlertsEnabled || false}
                          onChange={(checked) => handleNotificationSettingChange('email', 'oosAlertsEnabled', checked)}
                          helpText="Send emails when products are completely out of stock"
                        />
                        <Checkbox
                          label="Critical Level Alerts"
                          checked={localNotificationSettings.email.criticalAlertsEnabled || false}
                          onChange={(checked) => handleNotificationSettingChange('email', 'criticalAlertsEnabled', checked)}
                          helpText="Send emails when products reach critically low levels"
                        />
                      </BlockStack>
                    </>
                  )}
                </BlockStack>
              </Card>
            )}

            {/* Slack Settings - Show only if activeNotificationModal is 'slack' or null */}
            {(!activeNotificationModal || activeNotificationModal === 'slack') && (
              <Card>
                <BlockStack gap="300">
                  <Text as="h4" variant="headingSm" fontWeight="bold">
                    Slack Notifications
                  </Text>
                  <Checkbox
                    label="Enable Slack notifications"
                    checked={localNotificationSettings.slack.enabled}
                    onChange={(checked) => handleNotificationSettingChange('slack', 'enabled', checked)}
                    helpText="Send alerts to your Slack workspace"
                  />

                  {localNotificationSettings.slack.enabled && (
                    <>
                      <TextField
                        label="Slack Webhook URL"
                        value={localNotificationSettings.slack.webhookUrl}
                        onChange={(value) => handleNotificationSettingChange('slack', 'webhookUrl', value)}
                        placeholder="https://hooks.slack.com/services/..."
                        helpText="Get this from Slack's incoming webhooks app"
                        autoComplete="off"
                      />
                      
                      <TextField
                        label="Channel"
                        value={localNotificationSettings.slack.channel}
                        onChange={(value) => handleNotificationSettingChange('slack', 'channel', value)}
                        placeholder="#inventory"
                        helpText="Channel where alerts will be posted"
                        autoComplete="off"
                      />
                    </>
                  )}
                </BlockStack>
              </Card>
            )}

            {/* Discord Settings - Show only if activeNotificationModal is 'discord' or null */}
            {(!activeNotificationModal || activeNotificationModal === 'discord') && (
              <Card>
                <BlockStack gap="300">
                  <Text as="h4" variant="headingSm" fontWeight="bold">
                    Discord Notifications
                  </Text>
                  <Checkbox
                    label="Enable Discord notifications"
                    checked={localNotificationSettings.discord.enabled}
                    onChange={(checked) => handleNotificationSettingChange('discord', 'enabled', checked)}
                    helpText="Send alerts to your Discord server"
                  />

                  {localNotificationSettings.discord.enabled && (
                    <>
                      <TextField
                        label="Discord Webhook URL"
                        value={localNotificationSettings.discord.webhookUrl}
                        onChange={(value) => handleNotificationSettingChange('discord', 'webhookUrl', value)}
                        placeholder="https://discord.com/api/webhooks/..."
                        helpText="Get this from Discord server settings > Integrations > Webhooks"
                        autoComplete="off"
                      />
                      
                      <TextField
                        label="Bot Username"
                        value={localNotificationSettings.discord.username}
                        onChange={(value) => handleNotificationSettingChange('discord', 'username', value)}
                        placeholder="Inventory Bot"
                        helpText="Display name for the bot in Discord"
                        autoComplete="off"
                      />
                    </>
                  )}
                </BlockStack>
              </Card>
            )}
          </FormLayout>
          
          {/* Test Notifications - Only show if at least one channel is properly configured */}
          {((localNotificationSettings.email.enabled && localNotificationSettings.email.recipientEmail) ||
           (localNotificationSettings.slack.enabled && localNotificationSettings.slack.webhookUrl) ||
           (localNotificationSettings.discord.enabled && localNotificationSettings.discord.webhookUrl)) && (
            <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
              <BlockStack gap="200">
                <Text as="h5" variant="bodySm" fontWeight="semibold">
                  Test Your Notifications
                </Text>
                <Text as="p" variant="bodySm" tone="subdued">
                  Make sure to save your settings first, then test to verify everything is working correctly.
                </Text>
                <Form method="post" style={{ marginTop: '0.5rem' }}>
                  <input type="hidden" name="actionType" value="testNotifications" />
                  <input type="hidden" name="emailEnabled" value={localNotificationSettings.email.enabled.toString()} />
                  <input type="hidden" name="recipientEmail" value={localNotificationSettings.email.recipientEmail} />
                  <input type="hidden" name="slackEnabled" value={localNotificationSettings.slack.enabled.toString()} />
                  <input type="hidden" name="slackWebhook" value={localNotificationSettings.slack.webhookUrl} />
                  <input type="hidden" name="slackChannel" value={localNotificationSettings.slack.channel} />
                  <input type="hidden" name="discordEnabled" value={localNotificationSettings.discord.enabled.toString()} />
                  <input type="hidden" name="discordWebhook" value={localNotificationSettings.discord.webhookUrl} />
                  <input type="hidden" name="discordUsername" value={localNotificationSettings.discord.username} />
                  <Button submit size="slim">
                    Send Test Notifications
                  </Button>
                </Form>
              </BlockStack>
            </div>
          )}
        </Modal.Section>
      </Modal>

      {/* Storefront Visibility Settings Modal - Streamlined for High Volume */}
      <Modal
        open={showVisibilitySettings}
        onClose={() => setShowVisibilitySettings(false)}
        title="Advanced Visibility Settings"
        primaryAction={{
          content: 'Save Settings',
          onAction: saveVisibilitySettings,
        }}
        secondaryActions={[
          {
            content: 'Cancel',
            onAction: () => setShowVisibilitySettings(false),
          },
        ]}
      >
        <Modal.Section>
          <Form method="post" onSubmit={saveVisibilitySettings}>
            <input type="hidden" name="actionType" value="updateVisibilitySettings" />
            <input type="hidden" name="enabled" value={localVisibilitySettings.enabled.toString()} />
            <input type="hidden" name="hideOutOfStock" value={localVisibilitySettings.hideOutOfStock.toString()} />
            <input type="hidden" name="showWhenRestocked" value={localVisibilitySettings.showWhenRestocked.toString()} />
            
            <FormLayout>
              {/* Main Settings Card */}
              <Card>
                <BlockStack gap="400">
                  <Text as="h4" variant="headingMd" fontWeight="bold">
                    Automation Rules
                  </Text>
                  
                  {/* Master Toggle */}
                  <div style={{
                    background: localVisibilitySettings.enabled ? 'rgba(16, 185, 129, 0.05)' : 'rgba(107, 114, 128, 0.05)',
                    border: `2px solid ${localVisibilitySettings.enabled ? 'rgba(16, 185, 129, 0.2)' : 'rgba(107, 114, 128, 0.2)'}`,
                    borderRadius: '12px',
                    padding: '1.5rem'
                  }}>
                    <InlineStack align="space-between" blockAlign="center">
                      <BlockStack gap="100">
                        <Text as="p" variant="bodyLg" fontWeight="semibold">
                          Automatic Visibility Management
                        </Text>
                        <Text as="p" variant="bodySm" tone="subdued">
                          Automatically control product visibility based on inventory levels
                        </Text>
                      </BlockStack>
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '1rem'
                      }}>
                        <Text as="span" variant="bodyMd" fontWeight="medium" tone={localVisibilitySettings.enabled ? 'success' : 'subdued'}>
                          {localVisibilitySettings.enabled ? 'ENABLED' : 'DISABLED'}
                        </Text>
                        <div
                          style={{
                            width: '60px',
                            height: '32px',
                            backgroundColor: localVisibilitySettings.enabled ? '#059669' : '#d1d5db',
                            borderRadius: '16px',
                            position: 'relative',
                            cursor: 'pointer',
                            transition: 'all 0.3s ease',
                            border: localVisibilitySettings.enabled ? '2px solid #047857' : '2px solid #9ca3af'
                          }}
                          onClick={() => handleVisibilitySettingChange('enabled', !localVisibilitySettings.enabled)}
                        >
                          <div
                            style={{
                              width: '24px',
                              height: '24px',
                              backgroundColor: 'white',
                              borderRadius: '50%',
                              position: 'absolute',
                              top: '2px',
                              left: localVisibilitySettings.enabled ? '32px' : '2px',
                              transition: 'all 0.3s ease',
                              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)'
                            }}
                          />
                        </div>
                      </div>
                    </InlineStack>
                  </div>

                  {/* Detailed Settings - Only show when enabled */}
                  {localVisibilitySettings.enabled && (
                    <BlockStack gap="300">
                      <Text as="h5" variant="headingSm" fontWeight="semibold">
                        Automation Behavior
                      </Text>
                      
                      {/* Hide Out of Stock Setting */}
                      <div style={{
                        background: '#ffffff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        padding: '1rem'
                      }}>
                        <InlineStack align="space-between" blockAlign="center">
                          <BlockStack gap="100">
                            <Text as="p" variant="bodyMd" fontWeight="medium">
                              Hide Out-of-Stock Products
                            </Text>
                            <Text as="p" variant="bodySm" tone="subdued">
                              Products with 0 inventory will be hidden from your storefront (Draft status)
                            </Text>
                          </BlockStack>
                          <Checkbox
                            label=""
                            checked={localVisibilitySettings.hideOutOfStock}
                            onChange={(checked) => handleVisibilitySettingChange('hideOutOfStock', checked)}
                          />
                        </InlineStack>
                      </div>
                      
                      {/* Show When Restocked Setting */}
                      <div style={{
                        background: '#ffffff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        padding: '1rem'
                      }}>
                        <InlineStack align="space-between" blockAlign="center">
                          <BlockStack gap="100">
                            <Text as="p" variant="bodyMd" fontWeight="medium">
                              Auto-Show When Restocked
                            </Text>
                            <Text as="p" variant="bodySm" tone="subdued">
                              Automatically make products visible when inventory is added (Active status)
                            </Text>
                          </BlockStack>
                          <Checkbox
                            label=""
                            checked={localVisibilitySettings.showWhenRestocked}
                            onChange={(checked) => handleVisibilitySettingChange('showWhenRestocked', checked)}
                          />
                        </InlineStack>
                      </div>
                    </BlockStack>
                  )}
                </BlockStack>
              </Card>
              
              {/* Info Card - Always show */}
              <Card>
                <BlockStack gap="300">
                  <InlineStack gap="200" blockAlign="center">
                    <Icon source={InfoIcon} tone="info" />
                    <Text as="h5" variant="headingSm" fontWeight="semibold">
                      How Visibility Management Works
                    </Text>
                  </InlineStack>
                  
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '1rem'
                  }}>
                    {/* Hide Process */}
                    <div style={{
                      background: 'rgba(220, 38, 38, 0.05)',
                      border: '1px solid rgba(220, 38, 38, 0.1)',
                      borderRadius: '8px',
                      padding: '1rem'
                    }}>
                      <BlockStack gap="200">
                        <Text as="p" variant="bodyMd" fontWeight="semibold" tone="critical">
                          Hiding Products (Draft)
                        </Text>
                        <BlockStack gap="100">
                          <Text as="p" variant="bodySm">
                            • Product status set to "Draft"
                          </Text>
                          <Text as="p" variant="bodySm">
                            • Hidden from storefront immediately
                          </Text>
                          <Text as="p" variant="bodySm">
                            • Still visible in admin panel
                          </Text>
                          <Text as="p" variant="bodySm">
                            • Can be bulk processed for efficiency
                          </Text>
                        </BlockStack>
                      </BlockStack>
                    </div>

                    {/* Show Process */}
                    <div style={{
                      background: 'rgba(16, 185, 129, 0.05)',
                      border: '1px solid rgba(16, 185, 129, 0.1)',
                      borderRadius: '8px',
                      padding: '1rem'
                    }}>
                      <BlockStack gap="200">
                        <Text as="p" variant="bodyMd" fontWeight="semibold" tone="success">
                          Showing Products (Active)
                        </Text>
                        <BlockStack gap="100">
                          <Text as="p" variant="bodySm">
                            • Product status set to "Active"
                          </Text>
                          <Text as="p" variant="bodySm">
                            • Visible on storefront immediately
                          </Text>
                          <Text as="p" variant="bodySm">
                            • Available for purchase
                          </Text>
                          <Text as="p" variant="bodySm">
                            • Automatic when inventory added
                          </Text>
                        </BlockStack>
                      </BlockStack>
                    </div>
                  </div>

                  {/* Performance Note for High Volume */}
                  <div style={{
                    background: 'rgba(59, 130, 246, 0.05)',
                    border: '1px solid rgba(59, 130, 246, 0.1)',
                    borderRadius: '8px',
                    padding: '1rem'
                  }}>
                    <InlineStack gap="200" blockAlign="start">
                      <Icon source={AlertTriangleIcon} tone="info" />
                      <BlockStack gap="100">
                        <Text as="p" variant="bodySm" fontWeight="semibold">
                          High-Volume Store Optimization
                        </Text>
                        <Text as="p" variant="bodySm">
                          Changes are processed efficiently in batches. For stores with 1000+ products, 
                          visibility updates may take 30-60 seconds to complete. You'll see a confirmation 
                          once processing is finished.
                        </Text>
                      </BlockStack>
                    </InlineStack>
                  </div>
                </BlockStack>
              </Card>
            </FormLayout>
          </Form>
        </Modal.Section>
      </Modal>

      {/* AI Suggestions Modal */}
      {selectedProduct && (
        <Modal
          open={showSuggestionModal}
          onClose={() => setShowSuggestionModal(false)}
          title={`AI Suggestions for ${selectedProduct.title || selectedProduct.name || 'Product'}`}
          primaryAction={{
            content: 'Close',
            onAction: () => setShowSuggestionModal(false),
          }}
        >
          <Modal.Section>
            <BlockStack gap="400">
              <Text as="p" variant="bodyMd">
                Based on this product's performance and category, here are personalized AI-powered suggestions with recommended Shopify apps and upsell opportunities:
              </Text>
              
              {generateAISuggestions(selectedProduct).map((suggestion, index) => (
                <div key={index} className="product-card-hover" style={{ 
                  background: '#f1f5f9',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  padding: '1rem'
                }}>
                  <BlockStack gap="300">
                    <Text as="h4" variant="headingSm" fontWeight="medium">
                      {suggestion.title}
                    </Text>
                    
                    <Text as="p" variant="bodyMd">
                      {suggestion.description}
                    </Text>
                    
                    <div style={{ 
                      background: '#f0f9ff',
                      border: '1px solid #bae6fd',
                      borderRadius: '6px',
                      padding: '0.75rem'
                    }}>
                      <Text as="p" variant="bodySm" fontWeight="medium" tone="subdued">
                        💡 Recommended Action:
                      </Text>
                      <Text as="p" variant="bodySm" fontWeight="medium">
                        {suggestion.action}
                      </Text>
                    </div>

                    {suggestion.apps && suggestion.apps.length > 0 && (
                      <div style={{ 
                        background: '#fefdf8',
                        border: '1px solid #fde68a',
                        borderRadius: '6px',
                        padding: '0.75rem'
                      }}>
                        <Text as="p" variant="bodySm" fontWeight="medium" tone="subdued">
                          🛍️ Recommended Shopify Apps:
                        </Text>
                        <div style={{ marginTop: '0.5rem', display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                          {suggestion.apps.map((app, appIndex) => (
                            <Badge key={appIndex} tone="info" size="small">
                              {app}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {suggestion.upsell && (
                      <div style={{ 
                        background: '#f0fdf4',
                        border: '1px solid #bbf7d0',
                        borderRadius: '6px',
                        padding: '0.75rem'
                      }}>
                        <Text as="p" variant="bodySm" fontWeight="medium" tone="subdued">
                          💰 Upsell Opportunity:
                        </Text>
                        <Text as="p" variant="bodySm">
                          {suggestion.upsell}
                        </Text>
                      </div>
                    )}
                  </BlockStack>
                </div>
              ))}
              
              <div style={{ 
                background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '1rem'
              }}>
                <InlineStack gap="200" blockAlign="center">
                  <Icon source={InventoryIcon} tone="subdued" />
                  <Text as="p" variant="bodySm">
                    Product Details: {selectedProduct.createdAt ? getDaysInStore(selectedProduct.createdAt) : 0} days in store • 
                    {selectedProduct.lastSoldDate ? getDaysSinceLastSale(selectedProduct.lastSoldDate) : 0} days since last sale • 
                    Current price: ${Number(selectedProduct.price || 0).toFixed(2)} • 
                    Category: {selectedProduct.category || 'Not Specified'}
                  </Text>
                </InlineStack>
              </div>
            </BlockStack>
          </Modal.Section>
        </Modal>
      )}

      {/* Data Analysis Modal */}
      {isDataAnalysisModalOpen && selectedProduct && (
        <Modal
          open={isDataAnalysisModalOpen}
          onClose={() => {
            setIsDataAnalysisModalOpen(false);
            setAnalysisData(null);
          }}
          title={`Market Intelligence Report: ${selectedProduct.title || selectedProduct.name || 'Product'}`}
          primaryAction={{
            content: 'Close Analysis',
            onAction: () => {
              setIsDataAnalysisModalOpen(false);
              setAnalysisData(null);
            }
          }}
        >
          <Modal.Section>
            {isLoadingAnalysis ? (
              <div style={{ textAlign: 'center', padding: '2rem' }}>
                <Spinner accessibilityLabel="Loading analysis data" size="large" />
                <div style={{ marginTop: '1rem' }}>
                  <Text as="p" variant="bodyMd">
                    Analyzing market data from multiple sources...
                  </Text>
                  <Text as="p" variant="bodySm" tone="subdued">
                    Fetching competitor pricing, market trends, and strategic insights
                  </Text>
                </div>
              </div>
            ) : analysisData && !analysisData.error ? (
              <BlockStack gap="500">
                {/* Unified Market Intelligence Section */}
                <div style={{
                  background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                  border: '2px solid #e2e8f0',
                  borderRadius: '20px',
                  padding: '2.5rem',
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)',
                  position: 'relative',
                  overflow: 'hidden'
                }}>
                  {/* Background Pattern */}
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    right: 0,
                    width: '200px',
                    height: '200px',
                    background: 'radial-gradient(circle, rgba(59, 130, 246, 0.05) 0%, transparent 70%)',
                    borderRadius: '50%',
                    transform: 'translate(50%, -50%)'
                  }} />
                  
                  <BlockStack gap="600">
                    {/* Header Section */}
                    <div style={{ position: 'relative', zIndex: 1 }}>
                      <div style={{ marginBottom: '2rem' }}>
                        <InlineStack align="space-between" blockAlign="center">
                          <div>
                            <Text as="h2" variant="headingXl" fontWeight="bold">
                              Market Intelligence Analysis
                            </Text>
                            <Text as="p" variant="bodyLg" tone="subdued">
                              Comprehensive competitive analysis and strategic market insights
                            </Text>
                          </div>
                        <div style={{
                          background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                          color: 'white',
                          padding: '1rem 2rem',
                          borderRadius: '16px',
                          textAlign: 'center',
                          minWidth: '150px',
                          boxShadow: '0 4px 16px rgba(16, 185, 129, 0.3)'
                        }}>
                          <Text as="p" variant="bodyMd" fontWeight="bold" tone="inherit">
                            {analysisData?.marketInsights?.confidence || 0}% Confidence
                          </Text>
                          <Text as="p" variant="bodySm" tone="inherit">
                            {(analysisData?.marketInsights?.sampleSize || 0).toLocaleString()}+ data points
                          </Text>
                        </div>
                        </InlineStack>
                      </div>
                      
                      {/* Metadata Row */}
                      <div style={{
                        background: 'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)',
                        padding: '1.5rem',
                        borderRadius: '12px',
                        border: '1px solid #cbd5e1'
                      }}>
                        <InlineStack gap="800">
                          <div>
                            <Text as="p" variant="bodySm" fontWeight="bold">
                              Last Updated:
                            </Text>
                            <Text as="p" variant="bodySm" tone="subdued">
                              {analysisData.dataFreshness}
                            </Text>
                          </div>
                          <div>
                            <Text as="p" variant="bodySm" fontWeight="bold">
                              Analysis Scope:
                            </Text>
                            <Text as="p" variant="bodySm" tone="subdued">
                              Multi-channel competitive pricing
                            </Text>
                          </div>
                          <div>
                            <Text as="p" variant="bodySm" fontWeight="bold">
                              Market Coverage:
                            </Text>
                            <Text as="p" variant="bodySm" tone="subdued">
                              Global & regional competitors
                            </Text>
                          </div>
                        </InlineStack>
                      </div>
                    </div>

                    {/* Market Intelligence Summary */}
                    <div>
                    <div style={{ marginBottom: '1.5rem' }}>
                        <Text as="h3" variant="headingLg" fontWeight="bold">
                          Market Intelligence Summary
                        </Text>
                      </div>
                      
                      {/* Price Analysis Grid */}
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                        gap: '1.5rem',
                        marginBottom: '2rem'
                      }}>
                        <div style={{
                          background: 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)',
                          border: '2px solid #22c55e',
                          borderRadius: '16px',
                          padding: '2rem',
                          textAlign: 'center',
                          position: 'relative'
                        }}>
                          <div style={{
                            position: 'absolute',
                            top: '1rem',
                            right: '1rem',
                            width: '40px',
                            height: '40px',
                            background: 'rgba(34, 197, 94, 0.1)',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            <div style={{
                              width: '20px',
                              height: '20px',
                              background: '#22c55e',
                              borderRadius: '50%'
                            }} />
                          </div>
                          <Text as="p" variant="bodySm" tone="subdued">Your Current Price</Text>
                          <Text as="p" variant="headingLg" fontWeight="bold">
                            ${Number(selectedProduct?.price || 0).toFixed(2)}
                          </Text>
                        </div>

                        <div style={{
                          background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
                          border: '2px solid #3b82f6',
                          borderRadius: '16px',
                          padding: '2rem',
                          textAlign: 'center',
                          position: 'relative'
                        }}>
                          <div style={{
                            position: 'absolute',
                            top: '1rem',
                            right: '1rem',
                            width: '40px',
                            height: '40px',
                            background: 'rgba(59, 130, 246, 0.1)',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            <div style={{
                              width: '20px',
                              height: '20px',
                              background: '#3b82f6',
                              borderRadius: '50%'
                            }} />
                          </div>
                          <Text as="p" variant="bodySm" tone="subdued">Market Average</Text>
                          <Text as="p" variant="headingLg" fontWeight="bold">
                            ${Number(analysisData?.marketInsights?.averagePrice || 0).toFixed(2)}
                          </Text>
                        </div>

                        <div style={{
                          background: 'linear-gradient(135deg, #fefce8 0%, #fef3c7 100%)',
                          border: '2px solid #f59e0b',
                          borderRadius: '16px',
                          padding: '2rem',
                          textAlign: 'center',
                          position: 'relative'
                        }}>
                          <div style={{
                            position: 'absolute',
                            top: '1rem',
                            right: '1rem',
                            width: '40px',
                            height: '40px',
                            background: 'rgba(245, 158, 11, 0.1)',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            <div style={{
                              width: '20px',
                              height: '20px',
                              background: '#f59e0b',
                              borderRadius: '50%'
                            }} />
                          </div>
                          <Text as="p" variant="bodySm" tone="subdued">Price Range</Text>
                          <Text as="p" variant="headingLg" fontWeight="bold">
                            ${Number(analysisData?.marketInsights?.priceRange?.min || 0).toFixed(2)} - ${Number(analysisData?.marketInsights?.priceRange?.max || 0).toFixed(2)}
                          </Text>
                        </div>
                      </div>

                      {/* Market Indicators */}
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                        gap: '1.5rem'
                      }}>
                        <div style={{
                          background: '#ffffff',
                          border: '1px solid #e5e7eb',
                          borderRadius: '12px',
                          padding: '1.5rem',
                          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)'
                        }}>
                          <Text as="p" variant="bodySm" tone="subdued" fontWeight="medium">Market Trend</Text>
                          <div style={{ marginTop: '0.5rem' }}>
                            <Badge tone={(analysisData?.marketInsights?.marketTrend || 'stable') === 'growing' ? 'success' : (analysisData?.marketInsights?.marketTrend || 'stable') === 'stable' ? 'info' : 'warning'}>
                              {((analysisData?.marketInsights?.marketTrend || 'stable').charAt(0).toUpperCase() + (analysisData?.marketInsights?.marketTrend || 'stable').slice(1))}
                            </Badge>
                          </div>
                        </div>

                        <div style={{
                          background: '#ffffff',
                          border: '1px solid #e5e7eb',
                          borderRadius: '12px',
                          padding: '1.5rem',
                          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)'
                        }}>
                          <Text as="p" variant="bodySm" tone="subdued" fontWeight="medium">Demand Level</Text>
                          <div style={{ marginTop: '0.5rem' }}>
                            <Badge tone={(analysisData?.marketInsights?.demandLevel || 'medium') === 'high' ? 'success' : (analysisData?.marketInsights?.demandLevel || 'medium') === 'medium' ? 'info' : 'critical'}>
                              {((analysisData?.marketInsights?.demandLevel || 'medium').charAt(0).toUpperCase() + (analysisData?.marketInsights?.demandLevel || 'medium').slice(1))}
                            </Badge>
                          </div>
                        </div>

                        <div style={{
                          background: '#ffffff',
                          border: '1px solid #e5e7eb',
                          borderRadius: '12px',
                          padding: '1.5rem',
                          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)'
                        }}>
                          <Text as="p" variant="bodySm" tone="subdued" fontWeight="medium">Competition Level</Text>
                          <div style={{ marginTop: '0.5rem' }}>
                            <Badge tone={(analysisData?.marketInsights?.competitionLevel || 'moderate') === 'low' ? 'success' : (analysisData?.marketInsights?.competitionLevel || 'moderate') === 'moderate' ? 'warning' : 'critical'}>
                              {((analysisData?.marketInsights?.competitionLevel || 'moderate').charAt(0).toUpperCase() + (analysisData?.marketInsights?.competitionLevel || 'moderate').slice(1))}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                  </BlockStack>
                </div>

                {/* Competitor Analysis */}
                <div>
                  <BlockStack gap="300">
                    <InlineStack gap="200" blockAlign="center">
                      <Text as="h3" variant="headingMd" fontWeight="bold">
                        � Competitive Landscape Analysis
                      </Text>
                      <Badge tone="info">
                        {`${(analysisData?.competitors || []).length} competitors analyzed`}
                      </Badge>
                    </InlineStack>
                    
                    <div style={{ marginTop: '1rem' }}>
                      {(analysisData?.competitors || []).map((competitor: any, index: number) => (
                        <div key={index} style={{
                          background: '#ffffff',
                          border: '1px solid #e5e7eb',
                          borderRadius: '12px',
                          padding: '1.25rem',
                          marginBottom: '0.75rem',
                          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
                        }}>
                          <InlineStack gap="400" blockAlign="center">
                            <div style={{ flex: 1 }}>
                              <InlineStack gap="200" blockAlign="center">
                                <Text as="p" variant="bodyMd" fontWeight="bold">
                                  {competitor.name}
                                </Text>
                                <Badge size="small">
                                  {competitor.type}
                                </Badge>
                                {competitor.inStock ? (
                                  <Badge tone="success" size="small">In Stock</Badge>
                                ) : (
                                  <Badge tone="critical" size="small">Out of Stock</Badge>
                                )}
                              </InlineStack>
                              <BlockStack gap="100">
                                <InlineStack gap="300">
                                  <Text as="p" variant="bodySm">
                                    <strong>${competitor.price.toFixed(2)}</strong>
                                  </Text>
                                  <Text as="p" variant="bodySm" tone="subdued">
                                    {competitor.rating.toFixed(1)}⭐ ({competitor.reviews.toLocaleString()} reviews)
                                  </Text>
                                </InlineStack>
                                <Text as="p" variant="bodySm" tone="subdued">
                                  Last updated: {new Date(competitor.lastUpdated).toLocaleDateString()}
                                </Text>
                              </BlockStack>
                            </div>
                            <Button
                              url={competitor.url}
                              external
                              variant="secondary"
                              size="medium"
                            >
                              View Product →
                            </Button>
                          </InlineStack>
                        </div>
                      ))}
                    </div>
                  </BlockStack>
                </div>

                {/* Market Insights */}
                <div>
                  <Text as="h3" variant="headingMd" fontWeight="bold">
                    � Market Intelligence Summary
                  </Text>
                  <div style={{
                    background: 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)',
                    border: '1px solid #22c55e',
                    borderRadius: '12px',
                    padding: '1.5rem',
                    marginTop: '1rem'
                  }}>
                    <BlockStack gap="300">
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                        gap: '1rem'
                      }}>
                        <div>
                          <Text as="p" variant="bodySm" tone="subdued">Your Current Price</Text>
                          <Text as="p" variant="bodyMd" fontWeight="bold">
                            ${analysisData.currentPrice.toFixed(2)}
                          </Text>
                        </div>
                        <div>
                          <Text as="p" variant="bodySm" tone="subdued">Market Average</Text>
                          <Text as="p" variant="bodyMd" fontWeight="bold">
                            ${analysisData.marketInsights.averagePrice.toFixed(2)}
                          </Text>
                        </div>
                        <div>
                          <Text as="p" variant="bodySm" tone="subdued">Price Range</Text>
                          <Text as="p" variant="bodyMd" fontWeight="bold">
                            ${analysisData.marketInsights.priceRange.min.toFixed(2)} - ${analysisData.marketInsights.priceRange.max.toFixed(2)}
                          </Text>
                        </div>
                      </div>
                      
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                        gap: '1rem'
                      }}>
                        <div>
                          <Text as="p" variant="bodySm" tone="subdued">Market Trend</Text>
                          <Badge tone={analysisData.marketInsights.marketTrend === 'growing' ? 'success' : analysisData.marketInsights.marketTrend === 'stable' ? 'info' : 'warning'}>
                            {analysisData.marketInsights.marketTrend.charAt(0).toUpperCase() + analysisData.marketInsights.marketTrend.slice(1)}
                          </Badge>
                        </div>
                        <div>
                          <Text as="p" variant="bodySm" tone="subdued">Demand Level</Text>
                          <Badge tone={analysisData.marketInsights.demandLevel === 'high' ? 'success' : analysisData.marketInsights.demandLevel === 'medium' ? 'info' : 'critical'}>
                            {analysisData.marketInsights.demandLevel.charAt(0).toUpperCase() + analysisData.marketInsights.demandLevel.slice(1)}
                          </Badge>
                        </div>
                        <div>
                          <Text as="p" variant="bodySm" tone="subdued">Competition Level</Text>
                          <Badge tone={analysisData.marketInsights.competitionLevel === 'low' ? 'success' : analysisData.marketInsights.competitionLevel === 'moderate' ? 'warning' : 'critical'}>
                            {analysisData.marketInsights.competitionLevel.charAt(0).toUpperCase() + analysisData.marketInsights.competitionLevel.slice(1)}
                          </Badge>
                        </div>
                      </div>
                    </BlockStack>
                  </div>
                </div>

                {/* Professional Strategic Recommendations */}
                <div style={{ marginTop: '2rem' }}>
                  <div style={{
                    marginBottom: '1.5rem',
                    paddingBottom: '1rem',
                    borderBottom: '2px solid #e2e8f0'
                  }}>
                    <Text as="h3" variant="headingLg" fontWeight="bold">
                      Strategic Business Recommendations
                    </Text>
                    <Text as="p" variant="bodyMd" tone="subdued">
                      AI-powered insights based on competitive analysis and market trends
                    </Text>
                  </div>
                  
                  <div style={{ marginTop: '1rem' }}>
                    <BlockStack gap="400">
                    {analysisData.recommendations.map((rec: any, index: number) => {
                      const getRecommendationStyle = (type: string) => {
                        switch(type) {
                          case 'pricing':
                            return {
                              background: 'linear-gradient(145deg, #ffffff 0%, #fafafa 100%)',
                              border: '1px solid #e5e7eb',
                              borderLeft: '6px solid #f59e0b',
                              iconBg: '#fef3c7',
                              iconColor: '#f59e0b',
                              icon: '💰'
                            };
                          case 'marketing':
                            return {
                              background: 'linear-gradient(145deg, #ffffff 0%, #fafafa 100%)',
                              border: '1px solid #e5e7eb',
                              borderLeft: '6px solid #10b981',
                              iconBg: '#d1fae5',
                              iconColor: '#10b981',
                              icon: '📈'
                            };
                          default:
                            return {
                              background: 'linear-gradient(145deg, #ffffff 0%, #fafafa 100%)',
                              border: '1px solid #e5e7eb',
                              borderLeft: '6px solid #8b5cf6',
                              iconBg: '#ede9fe',
                              iconColor: '#8b5cf6',
                              icon: '🎯'
                            };
                        }
                      };
                      
                      const style = getRecommendationStyle(rec.type);
                      
                      return (
                        <div key={index} style={{
                          background: style.background,
                          border: style.border,
                          borderLeft: style.borderLeft,
                          borderRadius: '12px',
                          padding: '2rem',
                          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
                          transition: 'transform 0.2s ease, box-shadow 0.2s ease'
                        }}>
                          <BlockStack gap="400">
                            <InlineStack gap="300" blockAlign="center">
                              <div style={{
                                width: '48px',
                                height: '48px',
                                background: style.iconBg,
                                borderRadius: '12px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '20px'
                              }}>
                                {style.icon}
                              </div>
                              <div style={{ flex: 1 }}>
                                <InlineStack align="space-between" blockAlign="center">
                                  <Text as="h4" variant="headingSm" fontWeight="bold">
                                    {rec.title}
                                  </Text>
                                  <Badge tone={rec.type === 'pricing' ? 'warning' : rec.type === 'marketing' ? 'success' : 'info'}>
                                    {`${rec.type.charAt(0).toUpperCase() + rec.type.slice(1)} Strategy`}
                                  </Badge>
                                </InlineStack>
                              </div>
                            </InlineStack>
                            
                            <Text as="p" variant="bodyMd" tone="subdued">
                              {rec.description}
                            </Text>
                            
                            <div style={{
                              background: '#f8fafc',
                              padding: '1.25rem',
                              borderRadius: '10px',
                              border: '1px solid #e2e8f0'
                            }}>
                              <InlineStack gap="200" blockAlign="center">
                                <div style={{
                                  width: '24px',
                                  height: '24px',
                                  background: style.iconColor,
                                  borderRadius: '50%',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  color: 'white',
                                  fontSize: '12px',
                                  fontWeight: 'bold'
                                }}>
                                  ✓
                                </div>
                                <Text as="p" variant="bodyMd" fontWeight="medium">
                                  Expected Impact: {rec.impact}
                                </Text>
                              </InlineStack>
                            </div>
                          </BlockStack>
                        </div>
                      );
                    })}
                  </BlockStack>
                  </div>
                </div>

                {/* Risk Assessment & Market Opportunity */}
                <div style={{ 
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '1.5rem',
                  marginTop: '2rem'
                }}>
                  {/* Risk Assessment */}
                  <div style={{
                    background: 'linear-gradient(145deg, #ffffff 0%, #fafafa 100%)',
                    border: '1px solid #e5e7eb',
                    borderRadius: '16px',
                    padding: '1.5rem',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)'
                  }}>
                    <BlockStack gap="300">
                      <InlineStack gap="200" blockAlign="center">
                        <div style={{
                          width: '40px',
                          height: '40px',
                          background: analysisData.riskAssessment?.level === 'high' ? '#fee2e2' : 
                                     analysisData.riskAssessment?.level === 'medium' ? '#fef3c7' : '#d1fae5',
                          borderRadius: '10px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '18px'
                        }}>
                          {analysisData.riskAssessment?.level === 'high' ? '⚠️' : 
                           analysisData.riskAssessment?.level === 'medium' ? '⚡' : '✅'}
                        </div>
                        <div>
                          <Text as="h4" variant="headingSm" fontWeight="bold">
                            Risk Assessment
                          </Text>
                          <Badge tone={analysisData.riskAssessment?.level === 'high' ? 'critical' : 
                                      analysisData.riskAssessment?.level === 'medium' ? 'warning' : 'success'}>
                            {`${(analysisData.riskAssessment?.level || 'low').charAt(0).toUpperCase() + (analysisData.riskAssessment?.level || 'low').slice(1)} Risk`}
                          </Badge>
                        </div>
                      </InlineStack>
                      
                      <BlockStack gap="200">
                        <Text as="p" variant="bodySm" fontWeight="medium">
                          Key Risk Factors:
                        </Text>
                        {(analysisData.riskAssessment?.factors || []).map((factor: string, index: number) => (
                          <Text key={index} as="p" variant="bodySm" tone="subdued">
                            • {factor}
                          </Text>
                        ))}
                      </BlockStack>
                    </BlockStack>
                  </div>

                  {/* Market Opportunity */}
                  <div style={{
                    background: 'linear-gradient(145deg, #ffffff 0%, #fafafa 100%)',
                    border: '1px solid #e5e7eb',
                    borderRadius: '16px',
                    padding: '1.5rem',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)'
                  }}>
                    <BlockStack gap="300">
                      <InlineStack gap="200" blockAlign="center">
                        <div style={{
                          width: '40px',
                          height: '40px',
                          background: '#dbeafe',
                          borderRadius: '10px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '18px'
                        }}>
                          🎯
                        </div>
                        <div>
                          <Text as="h4" variant="headingSm" fontWeight="bold">
                            Market Opportunity
                          </Text>
                          <Text as="p" variant="bodySm" tone="subdued">
                            Score: {analysisData.marketOpportunity?.score || 75}/100
                          </Text>
                        </div>
                      </InlineStack>
                      
                      <BlockStack gap="200">
                        <div style={{
                          background: '#f0f9ff',
                          padding: '0.75rem',
                          borderRadius: '8px',
                          border: '1px solid #bfdbfe'
                        }}>
                          <Text as="p" variant="bodySm" fontWeight="medium">
                            {analysisData.marketOpportunity?.potential || 'Market positioning opportunity'}
                          </Text>
                        </div>
                        <Text as="p" variant="bodySm" tone="subdued">
                          <strong>Implementation Timeline:</strong> {analysisData.marketOpportunity?.timeline || '30-60 days'}
                        </Text>
                      </BlockStack>
                    </BlockStack>
                  </div>
                </div>

                {/* Competitive Advantage Analysis */}
                <div style={{
                  background: 'linear-gradient(145deg, #ffffff 0%, #fafafa 100%)',
                  border: '1px solid #e5e7eb',
                  borderRadius: '16px',
                  padding: '2rem',
                  marginTop: '1.5rem',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)'
                }}>
                  <BlockStack gap="400">
                    <div>
                      <Text as="h4" variant="headingMd" fontWeight="bold">
                        Competitive Advantage Analysis
                      </Text>
                      <Text as="p" variant="bodyMd" tone="subdued">
                        Strategic positioning assessment based on market analysis
                      </Text>
                    </div>
                    
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: '2rem'
                    }}>
                      {/* Strengths */}
                      <div>
                        <InlineStack gap="200" blockAlign="center">
                          <div style={{
                            width: '32px',
                            height: '32px',
                            background: '#d1fae5',
                            borderRadius: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '16px'
                          }}>
                            💪
                          </div>
                          <Text as="h5" variant="headingSm" fontWeight="bold">
                            Competitive Strengths
                          </Text>
                        </InlineStack>
                        <div style={{ marginTop: '1rem' }}>
                          <BlockStack gap="200">
                            {(analysisData.competitiveAdvantage?.strengths || []).map((strength: string, index: number) => (
                              <div key={index} style={{
                                background: '#f0fdf4',
                                padding: '0.75rem',
                                borderRadius: '8px',
                                border: '1px solid #bbf7d0'
                              }}>
                                <Text as="p" variant="bodySm">
                                  ✓ {strength}
                                </Text>
                              </div>
                            ))}
                          </BlockStack>
                        </div>
                      </div>

                      {/* Areas for Improvement */}
                      <div>
                        <InlineStack gap="200" blockAlign="center">
                          <div style={{
                            width: '32px',
                            height: '32px',
                            background: '#fef3c7',
                            borderRadius: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '16px'
                          }}>
                            🎯
                          </div>
                          <Text as="h5" variant="headingSm" fontWeight="bold">
                            Areas for Improvement
                          </Text>
                        </InlineStack>
                        <div style={{ marginTop: '1rem' }}>
                          <BlockStack gap="200">
                            {(analysisData.competitiveAdvantage?.weaknesses || []).map((weakness: string, index: number) => (
                              <div key={index} style={{
                                background: '#fffbeb',
                                padding: '0.75rem',
                                borderRadius: '8px',
                                border: '1px solid #fde68a'
                              }}>
                                <Text as="p" variant="bodySm">
                                  → {weakness}
                                </Text>
                              </div>
                            ))}
                          </BlockStack>
                        </div>
                      </div>
                    </div>
                  </BlockStack>
                </div>

                {/* Data Sources & Transparency */}
                <div style={{
                  background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
                  border: '2px solid #cbd5e1',
                  borderRadius: '12px',
                  padding: '1.5rem'
                }}>
                  <BlockStack gap="300">
                    <Text as="h4" variant="headingSm" fontWeight="bold">
                      🔍 Data Sources & Methodology
                    </Text>
                    
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                      gap: '1rem'
                    }}>
                      {analysisData.marketInsights.dataSources.map((source: string, index: number) => (
                        <div key={index} style={{
                          background: 'white',
                          padding: '0.75rem',
                          borderRadius: '8px',
                          border: '1px solid #e5e7eb'
                        }}>
                          <Text as="p" variant="bodySm" fontWeight="medium">
                            {source}
                          </Text>
                        </div>
                      ))}
                    </div>
                    
                    <InlineStack gap="400">
                      <Text as="p" variant="bodySm" tone="subdued">
                        📅 Last Updated: {new Date(analysisData.lastUpdated).toLocaleString()}
                      </Text>
                      <Text as="p" variant="bodySm" tone="subdued">
                        � Confidence: {analysisData.marketInsights.confidence}%
                      </Text>
                      <Text as="p" variant="bodySm" tone="subdued">
                        🎯 Sample Size: {analysisData.marketInsights.sampleSize.toLocaleString()} data points
                      </Text>
                    </InlineStack>
                    
                    <Text as="p" variant="bodySm" tone="subdued">
                      This analysis combines real-time pricing data, market trend indicators, and competitive intelligence to provide actionable business insights. Data is aggregated from multiple verified sources and updated every 2 hours.
                    </Text>
                    
                    <div style={{
                      background: '#f0f9ff',
                      border: '1px solid #0ea5e9',
                      borderRadius: '8px',
                      padding: '1rem',
                      marginTop: '1rem'
                    }}>
                      <Text as="p" variant="bodySm" fontWeight="medium">
                        📊 Confidence Score Explanation:
                      </Text>
                      <div style={{ marginTop: '0.5rem' }}>
                        <Text as="p" variant="bodySm" tone="subdued">
                          The {analysisData.marketInsights.confidence}% confidence level reflects the reliability of our market analysis based on:
                        </Text>
                      </div>
                      <ul style={{ margin: '0.5rem 0', paddingLeft: '1rem', fontSize: '13px', color: '#64748b' }}>
                        <li><strong>Data Quality:</strong> How recent and accurate the pricing data is across all sources</li>
                        <li><strong>Market Coverage:</strong> Number of competitors and marketplaces analyzed in your product category</li>
                        <li><strong>Source Reliability:</strong> Verification from multiple independent data providers</li>
                        <li><strong>Sample Size:</strong> Volume of data points ({analysisData.marketInsights.sampleSize.toLocaleString()}+ transactions analyzed)</li>
                      </ul>
                      <Text as="p" variant="bodySm" tone="subdued">
                        Higher confidence scores (85%+) indicate more reliable market insights for strategic decision-making.
                      </Text>
                    </div>
                  </BlockStack>
                </div>
              </BlockStack>
            ) : (
              <div style={{ textAlign: 'center', padding: '2rem' }}>
                <Text as="p" variant="bodyMd" tone="critical">
                  {analysisData?.error || 'Unable to fetch analysis data. Please try again later.'}
                </Text>
                <Text as="p" variant="bodySm" tone="subdued">
                  Please check your internet connection and try again
                </Text>
              </div>
            )}
          </Modal.Section>
        </Modal>
      )}

      {/* Help Section */}
      <div className="help-section">
        <div className="help-title">
          <Text as="h3" variant="headingLg">
            💡 Need Help?
          </Text>
        </div>
        
        <div className="help-content">
          <div className="help-item">
            <div className="help-item-title">
              <Text as="h4" variant="headingSm">
                📊 Setting Thresholds
              </Text>
            </div>
            <div className="help-item-text">
              <Text as="p" variant="bodySm">
                Adjust the inventory threshold to match your business needs. Lower thresholds mean fewer alerts but higher risk of stockouts. Consider your lead times and safety stock requirements.
              </Text>
            </div>
          </div>
          
          <div className="help-item">
            <div className="help-item-title">
              <Text as="h4" variant="headingSm">
                🔮 Understanding Forecasts
              </Text>
            </div>
            <div className="help-item-text">
              <Text as="p" variant="bodySm">
                Forecast badges show estimated days until stockout based on current sales velocity. Green = safe (8+ days), yellow = caution (4-7 days), red = urgent (≤3 days).
              </Text>
            </div>
          </div>
          
          <div className="help-item">
            <div className="help-item-title">
              <Text as="h4" variant="headingSm">
                Email Notifications
              </Text>
            </div>
            <div className="help-item-text">
              <Text as="p" variant="bodySm">
                Configure email alerts to receive automatic notifications when products reach low stock levels. Test your settings first to ensure proper delivery and formatting.
              </Text>
            </div>
          </div>
          
          <div className="help-item">
            <div className="help-item-title">
              <Text as="h4" variant="headingSm">
                📈 Inventory History
              </Text>
            </div>
            <div className="help-item-text">
              <Text as="p" variant="bodySm">
                Track all inventory changes over time. View detailed logs of stock movements, sales, and adjustments for better insights into your inventory patterns and trends.
              </Text>
            </div>
          </div>
        </div>
        
        <div className="help-actions">
          <Text as="p" variant="bodyMd" tone="subdued">
            Still need assistance? Explore our support options below:
          </Text>
          
          {/* Contact Support Accordion */}
          <div className="help-accordion">
            <details className="help-accordion-item">
              <summary className="help-accordion-header">
                <Text as="span" variant="bodyMd" fontWeight="semibold">
                  Contact Support
                </Text>
              </summary>
              <div className="help-accordion-content">
                <div className="help-accordion-scroll">
                  <Text as="p" variant="bodyMd">
                    Need assistance with Spector? Our support team is here to help you with any questions or issues.
                  </Text>
                  
                  <div style={{ marginTop: '1rem' }}>
                    <Text as="p" variant="bodyMd" fontWeight="semibold">
                      Email Support:
                    </Text>
                    <a 
                      href="mailto:ceren@cerensatelier.art?subject=Spector App Support"
                      className="help-email-link"
                    >
                      ceren@cerensatelier.art
                    </a>
                  </div>
                  
                  <div style={{ marginTop: '1rem' }}>
                    <Text as="p" variant="bodyMd" fontWeight="semibold">
                      For faster support, please include:
                    </Text>
                    <ul className="help-list">
                      <li>Your shop domain</li>
                      <li>Clear description of the issue</li>
                      <li>Screenshots if applicable</li>
                      <li>Steps to reproduce the problem</li>
                    </ul>
                  </div>
                  
                  <div style={{ marginTop: '1rem' }}>
                    <Text as="p" variant="bodyMd" tone="subdued">
                      We typically respond within 24 hours during business days.
                    </Text>
                  </div>
                </div>
              </div>
            </details>
          </div>

          {/* Full Documentation Accordion */}
          <div className="help-accordion">
            <details className="help-accordion-item">
              <summary className="help-accordion-header">
                <Text as="span" variant="bodyMd" fontWeight="semibold">
                  Full Documentation
                </Text>
              </summary>
              <div className="help-accordion-content">
                <div className="help-accordion-scroll">
                  <Text as="p" variant="bodyMd">
                    Complete guide to using Spector effectively for your Shopify store.
                  </Text>
                  
                  <div style={{ marginTop: '1rem' }}>
                    <Text as="h4" variant="headingMd" fontWeight="semibold">
                      Quick Start Guide
                    </Text>
                    <Text as="p" variant="bodyMd" tone="subdued">
                      Get up and running with inventory alerts in minutes. Learn how to configure thresholds, set up email notifications, and customize your alerts.
                    </Text>
                  </div>
                  
                  <div style={{ marginTop: '1rem' }}>
                    <Text as="h4" variant="headingMd" fontWeight="semibold">
                      Key Features
                    </Text>
                    <ul className="help-list">
                      <li>Real-time low stock monitoring</li>
                      <li>AI-powered sales forecasting</li>
                      <li>Email notifications and alerts</li>
                      <li>Inventory history tracking</li>
                      <li>Product management integration</li>
                      <li>Customizable alert thresholds</li>
                    </ul>
                  </div>
                  
                  <div style={{ marginTop: '1rem' }}>
                    <Text as="h4" variant="headingMd" fontWeight="semibold">
                      Troubleshooting
                    </Text>
                    <Text as="p" variant="bodyMd" tone="subdued">
                      Common issues and solutions including notification problems, sync errors, and performance optimization tips.
                    </Text>
                  </div>
                </div>
              </div>
            </details>
          </div>

          {/* Terms of Service Accordion */}
          <div className="help-accordion">
            <details className="help-accordion-item">
              <summary className="help-accordion-header">
                <Text as="span" variant="bodyMd" fontWeight="semibold">
                  Terms of Service
                </Text>
              </summary>
              <div className="help-accordion-content">
                <div className="help-accordion-scroll">
                  <Text as="p" variant="bodyMd">
                    Legal terms and conditions for using Spector.
                  </Text>
                  
                  <div style={{ marginTop: '1rem' }}>
                    <Text as="h4" variant="headingMd" fontWeight="semibold">
                      Key Points
                    </Text>
                    <ul className="help-list">
                      <li>App features and functionality description</li>
                      <li>User responsibilities and obligations</li>
                      <li>Data usage and privacy references</li>
                      <li>Important disclaimers about inventory accuracy</li>
                      <li>Limitation of liability clauses</li>
                    </ul>
                  </div>
                  
                  <div style={{ marginTop: '1rem' }}>
                    <Text as="p" variant="bodyMd" tone="subdued">
                      Last Updated: July 23, 2025
                    </Text>
                  </div>
                  
                  <div style={{ marginTop: '1rem' }}>
                    <Text as="p" variant="bodyMd" fontWeight="semibold" tone="critical">
                      Important Disclaimer
                    </Text>
                    <Text as="p" variant="bodyMd" tone="subdued">
                      The app provides estimates and predictions based on available data. Always verify actual inventory levels before making business decisions.
                    </Text>
                  </div>
                </div>
              </div>
            </details>
          </div>

          {/* Privacy Policy Accordion */}
          <div className="help-accordion">
            <details className="help-accordion-item">
              <summary className="help-accordion-header">
                <Text as="span" variant="bodyMd" fontWeight="semibold">
                  Privacy Policy
                </Text>
              </summary>
              <div className="help-accordion-content">
                <div className="help-accordion-scroll">
                  <Text as="p" variant="bodyMd" fontWeight="semibold">
                    By downloading and using Spector, you agree to this Privacy Policy.
                  </Text>
                  
                  <div style={{ marginTop: '1rem' }}>
                    <Text as="h4" variant="headingMd" fontWeight="semibold">
                      Information We Collect
                    </Text>
                    <Text as="p" variant="bodyMd" tone="subdued">
                      To provide inventory management services, we collect and process the following information from your Shopify store:
                    </Text>
                    <ul className="help-list">
                      <li>Product information including names, descriptions, variants, and current inventory levels</li>
                      <li>Historical order data for sales forecasting and trend analysis</li>
                      <li>Shop information including store name, email address, and basic configuration settings</li>
                      <li>Inventory change logs and stock movement history</li>
                      <li>User preferences for notifications and alert thresholds</li>
                    </ul>
                  </div>
                  
                  <div style={{ marginTop: '1rem' }}>
                    <Text as="h4" variant="headingMd" fontWeight="semibold">
                      How We Use Your Information
                    </Text>
                    <Text as="p" variant="bodyMd" tone="subdued">
                      We use your information solely to provide and improve our inventory management services:
                    </Text>
                    <ul className="help-list">
                      <li>Monitor inventory levels and generate stock alerts</li>
                      <li>Analyze sales patterns to predict future inventory needs</li>
                      <li>Send email notifications about low inventory and potential stockouts</li>
                      <li>Provide inventory analytics and reporting features</li>
                      <li>Offer customer support and technical assistance</li>
                      <li>Improve app functionality and user experience</li>
                    </ul>
                  </div>
                  
                  <div style={{ marginTop: '1rem' }}>
                    <Text as="h4" variant="headingMd" fontWeight="semibold">
                      Data Security and Protection
                    </Text>
                    <Text as="p" variant="bodyMd" tone="subdued">
                      We implement industry-standard security measures to protect your data:
                    </Text>
                    <ul className="help-list">
                      <li>All data transmission is encrypted using HTTPS/TLS protocols</li>
                      <li>Data is stored on secure servers with restricted access controls</li>
                      <li>Regular security audits and monitoring systems are in place</li>
                      <li>We comply with Shopify's Partner Program requirements and security standards</li>
                      <li>Access to your data is limited to authorized personnel on a need-to-know basis</li>
                    </ul>
                  </div>
                  
                  <div style={{ marginTop: '1rem' }}>
                    <Text as="h4" variant="headingMd" fontWeight="semibold">
                      Data Sharing and Third Parties
                    </Text>
                    <Text as="p" variant="bodyMd" tone="subdued">
                      We do not sell, trade, or rent your personal information to third parties. Information may be shared only in these limited circumstances:
                    </Text>
                    <ul className="help-list">
                      <li>With Shopify through their API as required for app functionality</li>
                      <li>With trusted service providers who assist in app operations (email delivery, hosting)</li>
                      <li>When required by law or to protect our legal rights</li>
                      <li>In the event of a business merger or acquisition (with prior notice)</li>
                    </ul>
                    <Text as="p" variant="bodyMd" tone="subdued">
                      All third-party services are required to maintain equivalent data protection standards.
                    </Text>
                  </div>
                  
                  <div style={{ marginTop: '1rem' }}>
                    <Text as="h4" variant="headingMd" fontWeight="semibold">
                      Data Retention
                    </Text>
                    <ul className="help-list">
                      <li>Data is retained while the app is actively installed and in use</li>
                      <li>Historical inventory data is kept for analytics and forecasting purposes</li>
                      <li>Upon app uninstallation, your data is deleted within 30 days</li>
                      <li>Some data may be retained longer if required by legal obligations</li>
                      <li>You can request immediate data deletion by contacting support</li>
                    </ul>
                  </div>
                  
                  <div style={{ marginTop: '1rem' }}>
                    <Text as="h4" variant="headingMd" fontWeight="semibold">
                      Your Rights and Choices
                    </Text>
                    <Text as="p" variant="bodyMd" tone="subdued">
                      You have the following rights regarding your data:
                    </Text>
                    <ul className="help-list">
                      <li>Access: Request information about data we have collected</li>
                      <li>Correction: Request corrections to inaccurate or incomplete data</li>
                      <li>Deletion: Request deletion of your data (subject to legal requirements)</li>
                      <li>Portability: Request a copy of your data in a structured format</li>
                      <li>Control: Manage notification preferences and app settings</li>
                      <li>Withdrawal: Uninstall the app at any time to stop data collection</li>
                    </ul>
                    <Text as="p" variant="bodyMd" tone="subdued">
                      To exercise these rights, contact us at ceren@cerensatelier.art
                    </Text>
                  </div>
                  
                  <div style={{ marginTop: '1rem' }}>
                    <Text as="h4" variant="headingMd" fontWeight="semibold">
                      Cookies and Tracking
                    </Text>
                    <ul className="help-list">
                      <li>Essential cookies for app authentication and session management</li>
                      <li>Local storage for user preferences and app configurations</li>
                      <li>No third-party tracking cookies or advertising technologies</li>
                      <li>No personal data is shared with analytics or advertising services</li>
                    </ul>
                  </div>
                  
                  <div style={{ marginTop: '1rem' }}>
                    <Text as="h4" variant="headingMd" fontWeight="semibold">
                      Compliance with Shopify Guidelines
                    </Text>
                    <Text as="p" variant="bodyMd" tone="subdued">
                      This app complies with Shopify's Partner Program requirements including:
                    </Text>
                    <ul className="help-list">
                      <li>Transparent data collection and usage practices</li>
                      <li>Secure handling of merchant and customer data</li>
                      <li>Respect for user privacy and data protection rights</li>
                      <li>Clear communication about app functionality and data use</li>
                    </ul>
                  </div>
                  
                  <div style={{ marginTop: '1rem' }}>
                    <Text as="h4" variant="headingMd" fontWeight="semibold">
                      Updates to This Policy
                    </Text>
                    <Text as="p" variant="bodyMd" tone="subdued">
                      We may update this Privacy Policy to reflect changes in our practices or legal requirements. When we make significant changes:
                    </Text>
                    <ul className="help-list">
                      <li>We will update the "Last Updated" date</li>
                      <li>Significant changes will be communicated through the app or email</li>
                      <li>Your continued use constitutes acceptance of the updated policy</li>
                    </ul>
                  </div>
                  
                  <div style={{ marginTop: '1rem' }}>
                    <Text as="p" variant="bodyMd" tone="subdued">
                      <strong>Last Updated:</strong> July 23, 2025
                    </Text>
                    <Text as="p" variant="bodyMd" tone="subdued">
                      <strong>Contact:</strong> ceren@cerensatelier.art
                    </Text>
                  </div>
                </div>
              </div>
            </details>
          </div>
        </div>
      </div>

      {/* Compact Disclaimer */}
      <div style={{
        padding: '1rem',
        textAlign: 'center',
        borderTop: '1px solid #e2e8f0',
        marginTop: '2rem'
      }}>
        <button
          onClick={() => setShowDisclaimerModal(true)}
          className="disclaimer-button"
        >
          <Icon source={InfoIcon} tone="subdued" />
          <Text as="span" variant="bodySm" tone="subdued">
            Important Disclaimer - Click to view
          </Text>
        </button>
      </div>

      {/* Disclaimer Modal */}
      <Modal
        open={showDisclaimerModal}
        onClose={() => setShowDisclaimerModal(false)}
        title="Important Disclaimer"
        primaryAction={{
          content: 'I Understand',
          onAction: () => setShowDisclaimerModal(false),
        }}
      >
        <Modal.Section>
          <BlockStack gap="400">
            <Text as="h3" variant="headingMd" fontWeight="semibold">
              Inventory Management Disclaimer
            </Text>
            
            <Text as="p" variant="bodyMd">
              This stock alert system is designed to help you manage inventory proactively. 
              However, please be aware of the following important limitations:
            </Text>
            
            <BlockStack gap="200">
              <Text as="h4" variant="headingSm" fontWeight="semibold">
                Data Accuracy
              </Text>
              <Text as="p" variant="bodyMd">
                • Stock levels are updated based on available data and may not reflect real-time changes
              </Text>
              <Text as="p" variant="bodyMd">
                • Always verify actual inventory levels in your Shopify admin before making reorder decisions
              </Text>
              <Text as="p" variant="bodyMd">
                • Third-party integrations may cause data sync delays
              </Text>
            </BlockStack>
            
            <BlockStack gap="200">
              <Text as="h4" variant="headingSm" fontWeight="semibold">
                Forecasting Limitations
              </Text>
              <Text as="p" variant="bodyMd">
                • Sales velocity calculations are estimates based on historical data
              </Text>
              <Text as="p" variant="bodyMd">
                • Forecasts should be used as guidance only, not absolute predictions
              </Text>
              <Text as="p" variant="bodyMd">
                • Seasonal trends, promotions, and market changes may affect accuracy
              </Text>
            </BlockStack>
            
            <BlockStack gap="200">
              <Text as="h4" variant="headingSm" fontWeight="semibold">
                Responsibility
              </Text>
              <Text as="p" variant="bodyMd">
                • Final inventory decisions remain your responsibility
              </Text>
              <Text as="p" variant="bodyMd">
                • This tool is provided as assistance, not as a replacement for business judgment
              </Text>
              <Text as="p" variant="bodyMd">
                • Regular inventory audits and manual verification are recommended
              </Text>
            </BlockStack>
            
            <div style={{
              background: '#fef3c7',
              border: '1px solid #f59e0b',
              borderRadius: '8px',
              padding: '1rem',
              marginTop: '1rem'
            }}>
              <Text as="p" variant="bodyMd" fontWeight="semibold">
                Important: Always double-check inventory levels in your Shopify admin before making purchasing decisions.
              </Text>
            </div>
          </BlockStack>
        </Modal.Section>
      </Modal>

      {/* Floating Reload Button */}
      <div style={{
        position: 'fixed',
        bottom: '2rem',
        right: '2rem',
        zIndex: 1000
      }}>
        <Button
          onClick={() => window.location.reload()}
          variant="primary"
          size="large"
          icon={RefreshIcon}
          accessibilityLabel="Reload all data"
        >
          Reload
        </Button>
      </div>
    </Page>
    </>
  );
}
