import type { ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { createInventoryLog } from "../services/inventory-history.server";

/**
 * Webhook endpoint for inventory level updates
 * This demonstrates how to integrate inventory logging with Shopify webhooks
 */
export async function action({ request }: ActionFunctionArgs) {
  try {
    const { topic, shop, session, admin } = await authenticate.webhook(request);

    if (topic !== "INVENTORY_LEVELS_UPDATE") {
      return json({ received: true }, { status: 200 });
    }

    const webhookData = await request.json();
    console.log("Inventory webhook received:", webhookData);

    // Extract relevant data from webhook
    const inventoryItemId = webhookData.inventory_item_id;
    const locationId = webhookData.location_id;
    const available = webhookData.available;
    
    // For demonstration, we'll create a sample log entry
    // In a real implementation, you'd query Shopify to get product details
    try {
      await createInventoryLog({
        shop: shop,
        productId: `product_${inventoryItemId}`,
        productTitle: "Product from Webhook",
        changeType: "ADJUSTMENT",
        previousStock: available - 1, // Simulated previous stock
        newStock: available,
        quantity: 1, // Simulated change
        source: "WEBHOOK",
        notes: `Inventory updated via webhook for location ${locationId}`,
      });

      console.log("Inventory log created from webhook");
    } catch (logError) {
      console.error("Error creating inventory log:", logError);
      // Don't fail the webhook for logging errors
    }

    return json({ received: true }, { status: 200 });
  } catch (error) {
    console.error("Webhook error:", error);
    return json({ error: "Webhook processing failed" }, { status: 500 });
  }
}

// This endpoint doesn't need a loader since it's webhook-only
export async function loader() {
  return json({ message: "This endpoint is for webhooks only" }, { status: 405 });
}
