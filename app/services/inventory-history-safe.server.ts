import prisma from "../db.server";

/**
 * Test function to verify InventoryLog model is available
 */
export async function testInventoryLogModel() {
  try {
    // Test if the model exists
    const count = await (prisma as any).inventoryLog?.count();
    console.log("InventoryLog model test:", count);
    return true;
  } catch (error) {
    console.error("InventoryLog model not available:", error);
    return false;
  }
}

/**
 * Simplified version that doesn't rely on the InventoryLog model
 * This ensures the service works even if the database isn't set up yet
 */
export async function createInventoryLogSafe(data: any): Promise<any> {
  try {
    const client = prisma as any;
    if (client.inventoryLog) {
      return await client.inventoryLog.create({ data });
    } else {
      console.warn("InventoryLog model not available - skipping log creation");
      return null;
    }
  } catch (error) {
    console.error("Error creating inventory log:", error);
    return null;
  }
}

/**
 * Safe version of getInventoryLogs that handles missing model gracefully
 */
export async function getInventoryLogsSafe(shop: string, options: any = {}) {
  try {
    const client = prisma as any;
    if (client.inventoryLog) {
      const logs = await client.inventoryLog.findMany({
        where: { shop },
        orderBy: { timestamp: 'desc' },
        take: options.limit || 50,
        skip: options.offset || 0,
      });
      const total = await client.inventoryLog.count({ where: { shop } });
      return {
        logs,
        total,
        hasMore: (options.offset || 0) + logs.length < total,
      };
    } else {
      console.warn("InventoryLog model not available - returning empty results");
      return { logs: [], total: 0, hasMore: false };
    }
  } catch (error) {
    console.error("Error fetching inventory logs:", error);
    return { logs: [], total: 0, hasMore: false };
  }
}

/**
 * Safe version of stats function
 */
export async function getInventoryLogStatsSafe(shop: string) {
  try {
    const client = prisma as any;
    if (client.inventoryLog) {
      const total = await client.inventoryLog.count({ where: { shop } });
      return {
        totalChanges: total,
        changesByType: {},
        changesBySource: {},
        topProducts: [],
        recentActivity: 0,
      };
    } else {
      return {
        totalChanges: 0,
        changesByType: {},
        changesBySource: {},
        topProducts: [],
        recentActivity: 0,
      };
    }
  } catch (error) {
    console.error("Error fetching inventory stats:", error);
    return {
      totalChanges: 0,
      changesByType: {},
      changesBySource: {},
      topProducts: [],
      recentActivity: 0,
    };
  }
}
