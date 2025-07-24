import { sendLowStockAlert } from "./email.server";

export interface NotificationSettings {
  email: {
    enabled: boolean;
    recipientEmail: string;
    oosAlertsEnabled?: boolean;     // Out of Stock alerts
    criticalAlertsEnabled?: boolean; // Critical level alerts
  };
  slack: {
    enabled: boolean;
    webhookUrl: string;
    channel: string;
  };
  discord: {
    enabled: boolean;
    webhookUrl: string;
    username: string;
  };
}

export interface Product {
  id: string;
  name: string;
  stock: number;
  price: number;
  category?: string;
}

export interface ShopInfo {
  name: string;
  email: string;
  myshopifyDomain: string;
  contactEmail?: string;
}

// Send Slack notification
export async function sendSlackNotification(
  webhookUrl: string,
  channel: string,
  products: Product[],
  shopInfo: ShopInfo
) {
  try {
    const lowStockProducts = products.filter(p => p.stock > 0 && p.stock <= 5);
    const outOfStockProducts = products.filter(p => p.stock === 0);
    
    const attachment = {
      color: outOfStockProducts.length > 0 ? "danger" : "warning",
      title: `📦 Inventory Alert for ${shopInfo.name}`,
      fields: [
        {
          title: "🚨 Out of Stock",
          value: outOfStockProducts.length > 0 
            ? outOfStockProducts.map(p => `• ${p.name}`).join('\n')
            : "None",
          short: true
        },
        {
          title: "⚠️ Low Stock (≤5)",
          value: lowStockProducts.length > 0
            ? lowStockProducts.map(p => `• ${p.name} (${p.stock} left)`).join('\n')
            : "None",
          short: true
        }
      ],
      footer: "Shopify Inventory Management",
      ts: Math.floor(Date.now() / 1000)
    };

    const payload = {
      channel: channel,
      username: "Inventory Bot",
      icon_emoji: ":package:",
      text: `Inventory alert for ${shopInfo.name}`,
      attachments: [attachment]
    };

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Slack API error: ${response.status}`);
    }

    return { success: true, message: "Slack notification sent successfully" };
  } catch (error) {
    console.error('Slack notification error:', error);
    return { success: false, message: `Failed to send Slack notification: ${error}` };
  }
}

// Send Discord notification
export async function sendDiscordNotification(
  webhookUrl: string,
  username: string,
  products: Product[],
  shopInfo: ShopInfo
) {
  try {
    const lowStockProducts = products.filter(p => p.stock > 0 && p.stock <= 5);
    const outOfStockProducts = products.filter(p => p.stock === 0);
    
    const embed = {
      title: `📦 Inventory Alert for ${shopInfo.name}`,
      color: outOfStockProducts.length > 0 ? 0xff0000 : 0xffa500, // Red for out of stock, orange for low stock
      fields: [
        {
          name: "🚨 Out of Stock",
          value: outOfStockProducts.length > 0 
            ? outOfStockProducts.map(p => `• ${p.name}`).join('\n')
            : "None",
          inline: true
        },
        {
          name: "⚠️ Low Stock (≤5)",
          value: lowStockProducts.length > 0
            ? lowStockProducts.map(p => `• ${p.name} (${p.stock} left)`).join('\n')
            : "None",
          inline: true
        }
      ],
      footer: {
        text: "Shopify Inventory Management"
      },
      timestamp: new Date().toISOString()
    };

    const payload = {
      username: username,
      avatar_url: "https://cdn.shopify.com/s/files/1/0533/2089/files/shopify_glyph.png",
      embeds: [embed]
    };

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Discord API error: ${response.status}`);
    }

    return { success: true, message: "Discord notification sent successfully" };
  } catch (error) {
    console.error('Discord notification error:', error);
    return { success: false, message: `Failed to send Discord notification: ${error}` };
  }
}

// Send comprehensive notifications to all enabled channels
export async function sendAllNotifications(
  settings: NotificationSettings,
  products: Product[],
  shopInfo: ShopInfo,
  threshold: number = 5
) {
  const results = [];

  // Send email notification
  if (settings.email.enabled && settings.email.recipientEmail) {
    try {
      const lowStockProducts = products.filter(p => p.stock > 0 && p.stock <= threshold);
      const outOfStockProducts = products.filter(p => p.stock === 0);
      const criticalProducts = products.filter(p => p.stock > 0 && p.stock <= threshold / 2);
      
      // Filter products based on toggle settings
      let productsToAlert: Product[] = [];
      
      if (settings.email.oosAlertsEnabled) {
        productsToAlert.push(...outOfStockProducts);
      }
      
      if (settings.email.criticalAlertsEnabled) {
        productsToAlert.push(...criticalProducts);
      }
      
      // If no specific toggles are enabled, send all alerts (backward compatibility)
      if (!settings.email.oosAlertsEnabled && !settings.email.criticalAlertsEnabled) {
        productsToAlert = [...lowStockProducts, ...outOfStockProducts];
      }
      
      // Remove duplicates (product might be both critical and low stock)
      const uniqueProducts = productsToAlert.filter((product, index, self) => 
        index === self.findIndex(p => p.id === product.id)
      );
      
      if (uniqueProducts.length > 0) {
        const emailResult = await sendLowStockAlert(
          uniqueProducts.filter(p => p.stock > 0),
          uniqueProducts.filter(p => p.stock === 0),
          threshold,
          {
            enabled: true,
            recipientEmail: settings.email.recipientEmail,
            shopInfo: shopInfo
          }
        );
        results.push({ type: 'email', ...emailResult });
      } else {
        results.push({ 
          type: 'email', 
          success: true, 
          message: 'No products match selected alert criteria' 
        });
      }
    } catch (error) {
      results.push({ type: 'email', success: false, message: `Email error: ${error}` });
    }
  }

  // Send Slack notification
  if (settings.slack.enabled && settings.slack.webhookUrl) {
    const slackResult = await sendSlackNotification(
      settings.slack.webhookUrl,
      settings.slack.channel,
      products,
      shopInfo
    );
    results.push({ type: 'slack', ...slackResult });
  }

  // Send Discord notification
  if (settings.discord.enabled && settings.discord.webhookUrl) {
    const discordResult = await sendDiscordNotification(
      settings.discord.webhookUrl,
      settings.discord.username,
      products,
      shopInfo
    );
    results.push({ type: 'discord', ...discordResult });
  }

  return results;
}

// Test all notification channels
export async function testAllNotifications(settings: NotificationSettings, shopInfo: ShopInfo) {
  const testProducts: Product[] = [
    {
      id: "test-1",
      name: "Test Product - Out of Stock",
      stock: 0,
      price: 29.99,
      category: "Test"
    },
    {
      id: "test-2", 
      name: "Test Product - Low Stock",
      stock: 2,
      price: 19.99,
      category: "Test"
    }
  ];

  return await sendAllNotifications(settings, testProducts, shopInfo);
}
