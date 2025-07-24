import prisma from "../db.server";

export async function testPrismaModels() {
  console.log("Available Prisma models:");
  console.log(Object.keys(prisma));
  
  // Try different possible names
  const possibleNames = ['inventoryHistory', 'InventoryHistory', 'inventory_history'];
  
  for (const name of possibleNames) {
    if ((prisma as any)[name]) {
      console.log(`Found model: ${name}`);
      try {
        const count = await (prisma as any)[name].count();
        console.log(`${name} count: ${count}`);
      } catch (error) {
        console.log(`Error querying ${name}:`, error);
      }
    }
  }
}

// Simple function to create sample data using raw SQL
export async function createSampleDataWithSQL(shop: string) {
  try {
    await prisma.$executeRaw`
      INSERT INTO InventoryHistory (
        id, shop, productId, productTitle, variantId, variantTitle,
        changeType, previousStock, newStock, quantity, userId, userName,
        userEmail, orderId, orderNumber, notes, source, timestamp
      ) VALUES 
      (
        'sample1', ${shop}, 'gid://shopify/Product/123456', 'Sample T-Shirt',
        'gid://shopify/ProductVariant/789', 'Blue / M', 'SALE', 25, 24, -1,
        'staff_001', 'John Store Manager', 'john@store.com',
        'gid://shopify/Order/999', '#1001', 'Customer purchase', 'POS',
        datetime('now', '-1 day')
      ),
      (
        'sample2', ${shop}, 'gid://shopify/Product/234567', 'Premium Jeans',
        'gid://shopify/ProductVariant/890', 'Dark Blue / 32', 'RESTOCK', 5, 25, 20,
        'staff_002', 'Sarah Inventory', 'sarah@store.com',
        NULL, NULL, 'Weekly restock from supplier', 'ADMIN',
        datetime('now', '-2 hours')
      ),
      (
        'sample3', ${shop}, 'gid://shopify/Product/345678', 'Wireless Headphones',
        NULL, NULL, 'MANUAL_EDIT', 10, 8, -2,
        'staff_001', 'John Store Manager', 'john@store.com',
        NULL, NULL, 'Found 2 damaged units during inventory check', 'MANUAL',
        datetime('now', '-3 hours')
      )
    `;
    
    console.log("Sample data created successfully!");
    return true;
  } catch (error) {
    console.error("Error creating sample data:", error);
    return false;
  }
}

export async function getLogsWithSQL(shop: string) {
  try {
    const logs = await prisma.$queryRaw`
      SELECT * FROM InventoryHistory 
      WHERE shop = ${shop} 
      ORDER BY timestamp DESC 
      LIMIT 50
    `;
    
    return logs;
  } catch (error) {
    console.error("Error fetching logs:", error);
    return [];
  }
}
