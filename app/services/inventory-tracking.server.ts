import { authenticate } from "../shopify.server";
import { createInventoryLog } from "../services/inventory-history.server";

/**
 * Webhook handler for inventory level updates
 * This tracks when inventory changes occur in Shopify
 */
export async function handleInventoryLevelUpdate(shop: string, inventoryData: any) {
  try {
    const { admin } = await authenticate.admin({
      shop,
    } as any);

    // Get product and variant information
    const productQuery = `
      query getProduct($id: ID!) {
        product(id: $id) {
          id
          title
          variants(first: 10) {
            edges {
              node {
                id
                title
                inventoryQuantity
              }
            }
          }
        }
      }
    `;

    // Extract inventory level data from webhook
    const inventoryItemId = inventoryData.inventory_item_id;
    const newQuantity = inventoryData.available;
    const locationId = inventoryData.location_id;

    // You would need to map inventory_item_id to product/variant
    // This is a simplified example
    
    await createInventoryLog({
      shop,
      productId: inventoryData.product_id || "unknown",
      productTitle: inventoryData.product_title || "Unknown Product",
      variantId: inventoryData.variant_id,
      variantTitle: inventoryData.variant_title,
      changeType: "ADJUSTMENT",
      previousStock: inventoryData.previous_quantity || 0,
      newStock: newQuantity,
      quantity: newQuantity - (inventoryData.previous_quantity || 0),
      source: "WEBHOOK",
      notes: `Inventory updated via webhook for location ${locationId}`,
    });

    console.log(`Inventory log created for product ${inventoryData.product_id}`);
  } catch (error) {
    console.error("Error handling inventory level update:", error);
  }
}

/**
 * Manual function to create inventory log entries
 * Use this when manually adjusting inventory through the app
 */
export async function logManualInventoryChange(
  shop: string,
  productId: string,
  productTitle: string,
  variantId: string | undefined,
  variantTitle: string | undefined,
  previousStock: number,
  newStock: number,
  userId: string | undefined,
  userName: string | undefined,
  userEmail: string | undefined,
  notes?: string
) {
  try {
    await createInventoryLog({
      shop,
      productId,
      productTitle,
      variantId,
      variantTitle,
      changeType: "MANUAL_EDIT",
      previousStock,
      newStock,
      quantity: newStock - previousStock,
      userId,
      userName,
      userEmail,
      source: "ADMIN",
      notes: notes || "Manual inventory adjustment",
    });

    console.log(`Manual inventory log created for product ${productId}`);
  } catch (error) {
    console.error("Error logging manual inventory change:", error);
  }
}

/**
 * Log sales-related inventory changes
 * Call this when orders are fulfilled
 */
export async function logSaleInventoryChange(
  shop: string,
  orderData: {
    id: string;
    orderNumber: string;
    lineItems: Array<{
      productId: string;
      productTitle: string;
      variantId?: string;
      variantTitle?: string;
      quantity: number;
      previousStock: number;
    }>;
  }
) {
  try {
    for (const item of orderData.lineItems) {
      await createInventoryLog({
        shop,
        productId: item.productId,
        productTitle: item.productTitle,
        variantId: item.variantId,
        variantTitle: item.variantTitle,
        changeType: "SALE",
        previousStock: item.previousStock,
        newStock: item.previousStock - item.quantity,
        quantity: -item.quantity, // Negative for sales
        orderId: orderData.id,
        orderNumber: orderData.orderNumber,
        source: "ADMIN",
        notes: `Sale fulfillment - Order #${orderData.orderNumber}`,
      });
    }

    console.log(`Sale inventory logs created for order ${orderData.orderNumber}`);
  } catch (error) {
    console.error("Error logging sale inventory changes:", error);
  }
}

/**
 * Log restock inventory changes
 * Call this when inventory is replenished
 */
export async function logRestockInventoryChange(
  shop: string,
  productId: string,
  productTitle: string,
  variantId: string | undefined,
  variantTitle: string | undefined,
  previousStock: number,
  newStock: number,
  userId: string | undefined,
  userName: string | undefined,
  userEmail: string | undefined,
  supplier?: string,
  purchaseOrder?: string
) {
  try {
    await createInventoryLog({
      shop,
      productId,
      productTitle,
      variantId,
      variantTitle,
      changeType: "RESTOCK",
      previousStock,
      newStock,
      quantity: newStock - previousStock,
      userId,
      userName,
      userEmail,
      source: "ADMIN",
      notes: `Restock from ${supplier || "supplier"}${purchaseOrder ? ` - PO: ${purchaseOrder}` : ""}`,
    });

    console.log(`Restock inventory log created for product ${productId}`);
  } catch (error) {
    console.error("Error logging restock inventory change:", error);
  }
}

/**
 * Create sample inventory logs for demonstration
 * This function creates realistic sample data
 */
export async function createSampleInventoryLogs(shop: string) {
  const sampleLogs = [
    {
      productId: "gid://shopify/Product/1",
      productTitle: "Premium T-Shirt",
      variantTitle: "Large / Blue",
      changeType: "SALE" as const,
      previousStock: 25,
      newStock: 23,
      quantity: -2,
      orderNumber: "1001",
      source: "POS" as const,
      notes: "In-store sale",
    },
    {
      productId: "gid://shopify/Product/2",
      productTitle: "Cotton Hoodie",
      changeType: "RESTOCK" as const,
      previousStock: 5,
      newStock: 30,
      quantity: 25,
      userName: "Store Manager",
      userEmail: "manager@store.com",
      source: "ADMIN" as const,
      notes: "Weekly supplier delivery",
    },
    {
      productId: "gid://shopify/Product/3",
      productTitle: "Summer Dress",
      variantTitle: "Medium / Red",
      changeType: "MANUAL_EDIT" as const,
      previousStock: 12,
      newStock: 10,
      quantity: -2,
      userName: "Store Assistant",
      userEmail: "assistant@store.com",
      source: "ADMIN" as const,
      notes: "Found damaged items during inventory check",
    },
    {
      productId: "gid://shopify/Product/4",
      productTitle: "Leather Jacket",
      changeType: "RETURN" as const,
      previousStock: 8,
      newStock: 9,
      quantity: 1,
      orderNumber: "998",
      source: "ADMIN" as const,
      notes: "Customer return - item in good condition",
    },
    {
      productId: "gid://shopify/Product/1",
      productTitle: "Premium T-Shirt",
      variantTitle: "Medium / Black",
      changeType: "ADJUSTMENT" as const,
      previousStock: 15,
      newStock: 14,
      quantity: -1,
      source: "WEBHOOK" as const,
      notes: "Shopify Flow inventory adjustment",
    },
  ];

  try {
    for (const log of sampleLogs) {
      await createInventoryLog({
        shop,
        ...log,
      });
    }
    console.log(`Created ${sampleLogs.length} sample inventory logs`);
  } catch (error) {
    console.error("Error creating sample inventory logs:", error);
  }
}
