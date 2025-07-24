import prisma from "../db.server";

export type InventoryChangeType = 
  | "MANUAL_EDIT" 
  | "SALE" 
  | "RESTOCK" 
  | "ADJUSTMENT" 
  | "RETURN"
  | "TRANSFER"
  | "DAMAGED"
  | "PROMOTION";

export type InventorySource = 
  | "ADMIN" 
  | "POS" 
  | "APP" 
  | "WEBHOOK" 
  | "MANUAL"
  | "SHOPIFY_FLOW"
  | "API";

export interface InventoryLogEntry {
  id: string;
  shop: string;
  productId: string;
  productTitle: string;
  variantId?: string;
  variantTitle?: string;
  changeType: InventoryChangeType;
  previousStock: number;
  newStock: number;
  quantity: number;
  userId?: string;
  userName?: string;
  userEmail?: string;
  orderId?: string;
  orderNumber?: string;
  notes?: string;
  source: InventorySource;
  timestamp: Date;
}

export interface CreateInventoryLogData {
  shop: string;
  productId: string;
  productTitle: string;
  variantId?: string;
  variantTitle?: string;
  changeType: InventoryChangeType;
  previousStock: number;
  newStock: number;
  quantity: number;
  userId?: string;
  userName?: string;
  userEmail?: string;
  orderId?: string;
  orderNumber?: string;
  notes?: string;
  source: InventorySource;
}

/**
 * Create sample inventory logs for testing
 */
export async function createSampleInventoryLogs(shop: string): Promise<InventoryLogEntry[]> {
  const sampleLogs = [
    {
      shop,
      productId: "gid://shopify/Product/123456",
      productTitle: "Sample T-Shirt",
      variantId: "gid://shopify/ProductVariant/789",
      variantTitle: "Blue / M",
      changeType: "SALE" as InventoryChangeType,
      previousStock: 25,
      newStock: 24,
      quantity: -1,
      userId: "staff_001",
      userName: "John Store Manager",
      userEmail: "john@store.com",
      orderId: "gid://shopify/Order/999",
      orderNumber: "#1001",
      notes: "Customer purchase",
      source: "POS" as InventorySource,
    },
    {
      shop,
      productId: "gid://shopify/Product/234567",
      productTitle: "Premium Jeans",
      variantId: "gid://shopify/ProductVariant/890",
      variantTitle: "Dark Blue / 32",
      changeType: "RESTOCK" as InventoryChangeType,
      previousStock: 5,
      newStock: 25,
      quantity: 20,
      userId: "staff_002",
      userName: "Sarah Inventory",
      userEmail: "sarah@store.com",
      notes: "Weekly restock from supplier",
      source: "ADMIN" as InventorySource,
    },
    {
      shop,
      productId: "gid://shopify/Product/345678",
      productTitle: "Wireless Headphones",
      changeType: "MANUAL_EDIT" as InventoryChangeType,
      previousStock: 10,
      newStock: 8,
      quantity: -2,
      userId: "staff_001",
      userName: "John Store Manager",
      userEmail: "john@store.com",
      notes: "Found 2 damaged units during inventory check",
      source: "MANUAL" as InventorySource,
    },
    {
      shop,
      productId: "gid://shopify/Product/456789",
      productTitle: "Coffee Mug Set",
      variantId: "gid://shopify/ProductVariant/1001",
      variantTitle: "Ceramic / White",
      changeType: "RETURN" as InventoryChangeType,
      previousStock: 15,
      newStock: 16,
      quantity: 1,
      orderId: "gid://shopify/Order/888",
      orderNumber: "#1000",
      notes: "Customer return - item in good condition",
      source: "POS" as InventorySource,
    },
    {
      shop,
      productId: "gid://shopify/Product/567890",
      productTitle: "Sport Shoes",
      variantId: "gid://shopify/ProductVariant/1102",
      variantTitle: "Black / Size 9",
      changeType: "ADJUSTMENT" as InventoryChangeType,
      previousStock: 12,
      newStock: 11,
      quantity: -1,
      userId: "staff_003",
      userName: "Mike Warehouse",
      userEmail: "mike@store.com",
      notes: "Inventory count discrepancy adjustment",
      source: "ADMIN" as InventorySource,
    }
  ];

  const createdLogs = [];
  for (const logData of sampleLogs) {
    try {
      const log = await prisma.inventoryHistory.create({
        data: {
          ...logData,
          timestamp: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000), // Random time in last week
        },
      });
      createdLogs.push(log);
    } catch (error) {
      console.error("Error creating sample log:", error);
    }
  }

  return createdLogs.map(log => ({
    ...log,
    changeType: log.changeType as InventoryChangeType,
    source: log.source as InventorySource,
    variantId: log.variantId === null ? undefined : log.variantId,
    variantTitle: log.variantTitle === null ? undefined : log.variantTitle,
    userId: log.userId === null ? undefined : log.userId,
    userName: log.userName === null ? undefined : log.userName,
    userEmail: log.userEmail === null ? undefined : log.userEmail,
    orderId: log.orderId === null ? undefined : log.orderId,
    orderNumber: log.orderNumber === null ? undefined : log.orderNumber,
    notes: log.notes === null ? undefined : log.notes,
  }));
}

/**
 * Create a new inventory log entry
 */
export async function createInventoryLog(data: CreateInventoryLogData): Promise<InventoryLogEntry> {
  try {
    const log = await prisma.inventoryHistory.create({
      data: {
        ...data,
        timestamp: new Date(),
      },
    });
    return {
      ...log,
      changeType: log.changeType as InventoryChangeType,
      source: log.source as InventorySource,
      variantId: log.variantId === null ? undefined : log.variantId,
      variantTitle: log.variantTitle === null ? undefined : log.variantTitle,
      userId: log.userId === null ? undefined : log.userId,
      userName: log.userName === null ? undefined : log.userName,
      userEmail: log.userEmail === null ? undefined : log.userEmail,
      orderId: log.orderId === null ? undefined : log.orderId,
      orderNumber: log.orderNumber === null ? undefined : log.orderNumber,
      notes: log.notes === null ? undefined : log.notes,
    };
  } catch (error) {
    console.error("Error creating inventory log:", error);
    throw error;
  }
}

/**
 * Get inventory logs for a specific product
 */
export async function getProductInventoryLogs(
  shop: string, 
  productId: string, 
  limit: number = 50
): Promise<InventoryLogEntry[]> {
  try {
    const logsRaw = await prisma.inventoryHistory.findMany({
      where: {
        shop,
        productId,
      },
      orderBy: {
        timestamp: 'desc',
      },
      take: limit,
    });
    return logsRaw.map(log => ({
      ...log,
      changeType: log.changeType as InventoryChangeType,
      source: log.source as InventorySource,
      variantId: log.variantId === null ? undefined : log.variantId,
      variantTitle: log.variantTitle === null ? undefined : log.variantTitle,
      userId: log.userId === null ? undefined : log.userId,
      userName: log.userName === null ? undefined : log.userName,
      userEmail: log.userEmail === null ? undefined : log.userEmail,
      orderId: log.orderId === null ? undefined : log.orderId,
      orderNumber: log.orderNumber === null ? undefined : log.orderNumber,
      notes: log.notes === null ? undefined : log.notes,
    }));
  } catch (error) {
    console.error("Error fetching product inventory logs:", error);
    return [];
  }
}

/**
 * Get all inventory logs for a shop with pagination and filtering
 */
export async function getInventoryLogs(
  shop: string,
  options: {
    limit?: number;
    offset?: number;
    changeType?: InventoryChangeType;
    source?: InventorySource;
    productId?: string;
    dateFrom?: Date;
    dateTo?: Date;
    userId?: string;
  } = {}
): Promise<{
  logs: InventoryLogEntry[];
  total: number;
  hasMore: boolean;
}> {
  const {
    limit = 50,
    offset = 0,
    changeType,
    source,
    productId,
    dateFrom,
    dateTo,
    userId,
  } = options;

  const whereConditions: any = {
    shop,
  };

  if (changeType) {
    whereConditions.changeType = changeType;
  }

  if (source) {
    whereConditions.source = source;
  }

  if (productId) {
    whereConditions.productId = productId;
  }

  if (userId) {
    whereConditions.userId = userId;
  }

  if (dateFrom || dateTo) {
    whereConditions.timestamp = {};
    if (dateFrom) {
      whereConditions.timestamp.gte = dateFrom;
    }
    if (dateTo) {
      whereConditions.timestamp.lte = dateTo;
    }
  }

  try {
    const [logsRaw, total] = await Promise.all([
      prisma.inventoryHistory.findMany({
        where: whereConditions,
        orderBy: {
          timestamp: 'desc',
        },
        skip: offset,
        take: limit,
      }),
      prisma.inventoryHistory.count({
        where: whereConditions,
      }),
    ]);

    const logs: InventoryLogEntry[] = logsRaw.map(log => ({
      ...log,
      changeType: log.changeType as InventoryChangeType,
      source: log.source as InventorySource,
      variantId: log.variantId === null ? undefined : log.variantId,
      variantTitle: log.variantTitle === null ? undefined : log.variantTitle,
      userId: log.userId === null ? undefined : log.userId,
      userName: log.userName === null ? undefined : log.userName,
      userEmail: log.userEmail === null ? undefined : log.userEmail,
      orderId: log.orderId === null ? undefined : log.orderId,
      orderNumber: log.orderNumber === null ? undefined : log.orderNumber,
      notes: log.notes === null ? undefined : log.notes,
    }));

    return {
      logs,
      total,
      hasMore: offset + logs.length < total,
    };
  } catch (error) {
    console.error("Error fetching inventory logs:", error);
    return {
      logs: [],
      total: 0,
      hasMore: false,
    };
  }
}

/**
 * Get inventory summary statistics
 */
export async function getInventoryLogStats(
  shop: string,
  dateFrom?: Date,
  dateTo?: Date
): Promise<{
  totalChanges: number;
  changesByType: Record<InventoryChangeType, number>;
  changesBySource: Record<InventorySource, number>;
  topProducts: Array<{
    productId: string;
    productTitle: string;
    changeCount: number;
  }>;
  recentActivity: number; // changes in last 24 hours
}> {
  const whereConditions: any = {
    shop,
  };

  if (dateFrom || dateTo) {
    whereConditions.timestamp = {};
    if (dateFrom) {
      whereConditions.timestamp.gte = dateFrom;
    }
    if (dateTo) {
      whereConditions.timestamp.lte = dateTo;
    }
  }

  try {
    // Get all logs for analysis
    const logs = await prisma.inventoryHistory.findMany({
      where: whereConditions,
      select: {
        changeType: true,
        source: true,
        productId: true,
        productTitle: true,
        timestamp: true,
      },
    });

    // Calculate statistics
    const totalChanges = logs.length;
    
    const changesByType: Record<string, number> = {};
    const changesBySource: Record<string, number> = {};
    const productCounts: Record<string, { title: string; count: number }> = {};

    logs.forEach((log: { changeType: string; source: string; productId: string; productTitle: string; timestamp: Date }) => {
      // Count by type
      changesByType[log.changeType] = (changesByType[log.changeType] || 0) + 1;
      
      // Count by source
      changesBySource[log.source] = (changesBySource[log.source] || 0) + 1;
      
      // Count by product
      if (!productCounts[log.productId]) {
        productCounts[log.productId] = { title: log.productTitle, count: 0 };
      }
      productCounts[log.productId].count++;
    });

    // Get top products
    const topProducts = Object.entries(productCounts)
      .map(([productId, data]) => ({
        productId,
        productTitle: data.title,
        changeCount: data.count,
      }))
      .sort((a, b) => b.changeCount - a.changeCount)
      .slice(0, 10);

    // Recent activity (last 24 hours)
    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentActivity = logs.filter((log: { timestamp: Date }) => log.timestamp > last24Hours).length;

    return {
      totalChanges,
      changesByType: changesByType as Record<InventoryChangeType, number>,
      changesBySource: changesBySource as Record<InventorySource, number>,
      topProducts,
      recentActivity,
    };
  } catch (error) {
    console.error("Error fetching inventory stats:", error);
    return {
      totalChanges: 0,
      changesByType: {
          MANUAL_EDIT: 0,
          SALE: 0,
          RESTOCK: 0,
          ADJUSTMENT: 0,
          RETURN: 0,
          TRANSFER: 0,
          DAMAGED: 0,
          PROMOTION: 0,
      },
      changesBySource: {
          ADMIN: 0,
          POS: 0,
          APP: 0,
          WEBHOOK: 0,
          MANUAL: 0,
          SHOPIFY_FLOW: 0,
          API: 0
      },
      topProducts: [],
      recentActivity: 0,
    };
  }
}

/**
 * Delete old inventory logs (cleanup function)
 */
export async function cleanupOldInventoryLogs(
  shop: string,
  daysToKeep: number = 90
): Promise<number> {
  const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);
  
  try {
    const result = await prisma.inventoryHistory.deleteMany({
      where: {
        shop,
        timestamp: {
          lt: cutoffDate,
        },
      },
    });

    return result.count;
  } catch (error) {
    console.error("Error cleaning up old inventory logs:", error);
    return 0;
  }
}

/**
 * Helper function to get change type display information
 */
export function getChangeTypeInfo(changeType: InventoryChangeType): {
  label: string;
  description: string;
  icon: string;
  color: 'success' | 'warning' | 'critical' | 'info' | 'attention';
} {
  switch (changeType) {
    case "SALE":
      return {
        label: "Sale",
        description: "Inventory reduced due to customer purchase",
        icon: "CashDollarIcon",
        color: "success",
      };
    case "RESTOCK":
      return {
        label: "Restock",
        description: "Inventory increased from supplier delivery",
        icon: "ArchiveIcon",
        color: "info",
      };
    case "MANUAL_EDIT":
      return {
        label: "Manual Edit",
        description: "Inventory manually adjusted by staff",
        icon: "EditIcon",
        color: "attention",
      };
    case "ADJUSTMENT":
      return {
        label: "Adjustment",
        description: "Inventory corrected due to count discrepancy",
        icon: "SettingsIcon",
        color: "warning",
      };
    case "RETURN":
      return {
        label: "Return",
        description: "Inventory increased from customer return",
        icon: "RefreshIcon",
        color: "info",
      };
    case "TRANSFER":
      return {
        label: "Transfer",
        description: "Inventory moved between locations",
        icon: "TransferIcon",
        color: "info",
      };
    case "DAMAGED":
      return {
        label: "Damaged",
        description: "Inventory removed due to damage",
        icon: "DeleteIcon",
        color: "critical",
      };
    case "PROMOTION":
      return {
        label: "Promotion",
        description: "Inventory reduced due to promotional activity",
        icon: "GiftCardIcon",
        color: "success",
      };
    default:
      return {
        label: "Unknown",
        description: "Unknown inventory change",
        icon: "QuestionCircleIcon",
        color: "info",
      };
  }
}

/**
 * Helper function to get source display information
 */
export function getSourceInfo(source: InventorySource): {
  label: string;
  description: string;
  icon: string;
} {
  switch (source) {
    case "ADMIN":
      return {
        label: "Shopify Admin",
        description: "Change made through Shopify admin panel",
        icon: "DesktopIcon",
      };
    case "POS":
      return {
        label: "Point of Sale",
        description: "Change made through POS system",
        icon: "StoreIcon",
      };
    case "APP":
      return {
        label: "Third-party App",
        description: "Change made by external application",
        icon: "MobileIcon",
      };
    case "WEBHOOK":
      return {
        label: "Webhook",
        description: "Automatic change via webhook",
        icon: "LinkIcon",
      };
    case "MANUAL":
      return {
        label: "Manual Entry",
        description: "Manually entered change",
        icon: "TextIcon",
      };
    case "SHOPIFY_FLOW":
      return {
        label: "Shopify Flow",
        description: "Automated by Shopify Flow",
        icon: "AutomationIcon",
      };
    case "API":
      return {
        label: "API",
        description: "Change made via API call",
        icon: "CodeIcon",
      };
    default:
      return {
        label: "Unknown",
        description: "Unknown source",
        icon: "QuestionCircleIcon",
      };
  }
}
