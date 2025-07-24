interface Product {
  id: string;
  name: string;
  stock: number;
}

interface ShopInfo {
  email: string;
  name: string;
  myshopifyDomain: string;
  contactEmail?: string;
}

interface SimpleEmailSettings {
  enabled: boolean;
  recipientEmail: string;
  shopInfo: ShopInfo;
}

export const sendLowStockAlert = async (
  lowStockProducts: Product[],
  zeroStockProducts: Product[],
  threshold: number,
  settings: SimpleEmailSettings
) => {
  // Email functionality removed - return mock response
  console.log('Mock email alert would be sent for:', {
    lowStockCount: lowStockProducts.length,
    zeroStockCount: zeroStockProducts.length,
    threshold,
    recipient: settings.recipientEmail,
    store: settings.shopInfo.name
  });

  return {
    success: true,
    message: `Mock email alert for ${lowStockProducts.length + zeroStockProducts.length} products`,
    messageId: `mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  };
};

// Test email configuration
export const testEmailSettings = async (settings: SimpleEmailSettings) => {
  // Email functionality removed - return mock response
  console.log('Mock email test would be sent to:', {
    recipient: settings.recipientEmail,
    store: settings.shopInfo.name,
    enabled: settings.enabled
  });

  return {
    success: true,
    message: `Mock test email for ${settings.shopInfo.name}`,
    messageId: `mock_test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  };
};
