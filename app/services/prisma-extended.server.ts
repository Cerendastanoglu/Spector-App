import { PrismaClient } from "@prisma/client";
import type { 
  InventoryChangeType, 
  InventorySource, 
  InventoryLogEntry, 
  CreateInventoryLogData 
} from "./inventory-history.server";

// Define the InventoryLog model operations interface
interface InventoryLogDelegate {
  create(args: {
    data: CreateInventoryLogData & { timestamp?: Date };
  }): Promise<InventoryLogEntry>;
  
  findMany(args?: {
    where?: {
      shop?: string;
      productId?: string;
      changeType?: InventoryChangeType;
      source?: InventorySource;
      userId?: string;
      timestamp?: {
        gte?: Date;
        lte?: Date;
        gt?: Date;
        lt?: Date;
      };
    };
    orderBy?: {
      timestamp?: 'asc' | 'desc';
      [key: string]: any;
    };
    skip?: number;
    take?: number;
    select?: {
      changeType?: boolean;
      source?: boolean;
      productId?: boolean;
      productTitle?: boolean;
      timestamp?: boolean;
    } | Record<string, boolean>;
  }): Promise<InventoryLogEntry[]>;
  
  count(args?: {
    where?: {
      shop?: string;
      productId?: string;
      changeType?: InventoryChangeType;
      source?: InventorySource;
      userId?: string;
      timestamp?: {
        gte?: Date;
        lte?: Date;
        gt?: Date;
        lt?: Date;
      };
    };
  }): Promise<number>;
  
  deleteMany(args: {
    where: {
      shop: string;
      timestamp?: {
        lt?: Date;
        gte?: Date;
        lte?: Date;
      };
    };
  }): Promise<{ count: number }>;
}

// Extend the PrismaClient type to include inventoryLog
interface ExtendedPrismaClient extends PrismaClient {
  inventoryLog: InventoryLogDelegate;
}

// Create a function that safely extends the Prisma client
function createExtendedPrismaClient(prisma: PrismaClient): ExtendedPrismaClient {
  // Check if the inventoryLog property exists at runtime
  const hasInventoryLog = 'inventoryLog' in prisma;
  
  if (hasInventoryLog) {
    // If it exists, just return the client with proper typing
    return prisma as ExtendedPrismaClient;
  }
  
  // If it doesn't exist, create a fallback implementation
  const inventoryLogDelegate: InventoryLogDelegate = {
    async create(args) {
      // Try to use the actual prisma client first
      try {
        return await (prisma as any).inventoryLog.create(args);
      } catch (error) {
        console.error('InventoryLog table not found. Please run: npx prisma db push');
        throw new Error('InventoryLog model is not available. Database migration required.');
      }
    },
    
    async findMany(args = {}) {
      try {
        return await (prisma as any).inventoryLog.findMany(args);
      } catch (error) {
        console.warn('InventoryLog table not found, returning empty array');
        return [];
      }
    },
    
    async count(args = {}) {
      try {
        return await (prisma as any).inventoryLog.count(args);
      } catch (error) {
        console.warn('InventoryLog table not found, returning 0');
        return 0;
      }
    },
    
    async deleteMany(args) {
      try {
        return await (prisma as any).inventoryLog.deleteMany(args);
      } catch (error) {
        console.warn('InventoryLog table not found, returning count 0');
        return { count: 0 };
      }
    }
  };
  
  // Create extended client with inventoryLog delegate
  return Object.assign(prisma, {
    inventoryLog: inventoryLogDelegate
  }) as ExtendedPrismaClient;
}

// Export the extended client
export { createExtendedPrismaClient };
export type { ExtendedPrismaClient, InventoryLogDelegate };
