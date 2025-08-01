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
  variantId?: string | null;
  variantTitle?: string | null;
  changeType: InventoryChangeType;
  previousStock: number;
  newStock: number;
  quantity: number;
  userId?: string | null;
  userName?: string | null;
  userEmail?: string | null;
  orderId?: string | null;
  orderNumber?: string | null;
  notes?: string | null;
  source: InventorySource;
  timestamp: Date;
}

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
        description: "Inventory increased due to customer return",
        icon: "RefreshIcon",
        color: "info",
      };
    case "TRANSFER":
      return {
        label: "Transfer",
        description: "Inventory moved between locations",
        icon: "DeliveryIcon",
        color: "attention",
      };
    case "DAMAGED":
      return {
        label: "Damaged",
        description: "Inventory removed due to damage",
        icon: "AlertTriangleIcon",
        color: "critical",
      };
    case "PROMOTION":
      return {
        label: "Promotion",
        description: "Inventory reduced for promotional purposes",
        icon: "GiftIcon",
        color: "info",
      };
    default:
      return {
        label: "Unknown",
        description: "Unknown inventory change type",
        icon: "QuestionMarkIcon",
        color: "info",
      };
  }
}

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
        description: "Change triggered by webhook",
        icon: "ConnectIcon",
      };
    case "MANUAL":
      return {
        label: "Manual Entry",
        description: "Manually entered inventory change",
        icon: "EditIcon",
      };
    case "SHOPIFY_FLOW":
      return {
        label: "Shopify Flow",
        description: "Change triggered by Shopify Flow automation",
        icon: "AutomationIcon",
      };
    case "API":
      return {
        label: "API",
        description: "Change made through API call",
        icon: "CodeIcon",
      };
    default:
      return {
        label: "Unknown",
        description: "Unknown source",
        icon: "QuestionMarkIcon",
      };
  }
}
