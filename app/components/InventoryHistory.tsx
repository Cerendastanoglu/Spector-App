import { useState, useEffect } from "react";
import {
  Card,
  DataTable,
  Badge,
  Text,
  InlineStack,
  BlockStack,
  Filters,
  Button,
  Modal,
  FormLayout,
  Select,
  TextField,
  EmptyState,
  Pagination,
  Tooltip,
  Icon,
  Spinner,
} from "@shopify/polaris";
import {
  ClockIcon,
  ProductIcon,
  PersonIcon,
  NoteIcon,
  CashDollarIcon,
  ArchiveIcon,
  EditIcon,
  SettingsIcon,
  RefreshIcon,
  DeleteIcon,
  GiftCardIcon,
  QuestionCircleIcon,
  DesktopIcon,
  StoreIcon,
  MobileIcon,
  LinkIcon,
  TextIcon,
  AutomationIcon,
  CodeIcon,
  TransferIcon,
  ClipboardIcon,
} from "@shopify/polaris-icons";
import type { InventoryLogEntry, InventoryChangeType, InventorySource } from "../services/inventory-history.server";
import { getChangeTypeInfo, getSourceInfo } from "../services/inventory-history.server";

// Icon mapping function to get the actual icon component from the icon name
function getIconComponent(iconName: string) {
  const iconMap: Record<string, any> = {
    CashDollarIcon,
    ArchiveIcon,
    EditIcon,
    SettingsIcon,
    RefreshIcon,
    TransferIcon,
    DeleteIcon,
    GiftCardIcon,
    QuestionCircleIcon,
    DesktopIcon,
    StoreIcon,
    MobileIcon,
    LinkIcon,
    TextIcon,
    AutomationIcon,
    CodeIcon,
    ClipboardIcon,
  };
  return iconMap[iconName] || QuestionCircleIcon;
}

export interface SerializedInventoryLogEntry {
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
  timestamp: string; // Serialized as string
}

interface InventoryHistoryProps {
  initialLogs: SerializedInventoryLogEntry[];
  initialTotal: number;
  initialHasMore: boolean;
  productId?: string; // Optional: filter for specific product
  shop: string; // Shop identifier for API calls
  isPublic?: boolean; // Whether to use public API endpoint
}

interface FilterState {
  changeType?: InventoryChangeType;
  source?: InventorySource;
  dateFrom?: string;
  dateTo?: string;
  userId?: string;
  searchTerm?: string;
}

export function InventoryHistory({
  initialLogs,
  initialTotal,
  initialHasMore,
  productId,
  shop,
  isPublic = false,
}: InventoryHistoryProps) {
  const [logs, setLogs] = useState<SerializedInventoryLogEntry[]>(initialLogs);
  const [total, setTotal] = useState(initialTotal);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(25);
  
  // Filter state
  const [filters, setFilters] = useState<FilterState>({});
  const [showFilters, setShowFilters] = useState(false);
  
  // Detail modal state
  const [selectedLog, setSelectedLog] = useState<SerializedInventoryLogEntry | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Filter options
  const changeTypeOptions = [
    { label: "All Change Types", value: "" },
    { label: "Sale", value: "SALE" },
    { label: "Restock", value: "RESTOCK" },
    { label: "Manual Edit", value: "MANUAL_EDIT" },
    { label: "Adjustment", value: "ADJUSTMENT" },
    { label: "Return", value: "RETURN" },
    { label: "Transfer", value: "TRANSFER" },
    { label: "Damaged", value: "DAMAGED" },
    { label: "Promotion", value: "PROMOTION" },
  ];

  const sourceOptions = [
    { label: "All Sources", value: "" },
    { label: "Shopify Admin", value: "ADMIN" },
    { label: "Point of Sale", value: "POS" },
    { label: "Third-party App", value: "APP" },
    { label: "Webhook", value: "WEBHOOK" },
    { label: "Manual Entry", value: "MANUAL" },
    { label: "Shopify Flow", value: "SHOPIFY_FLOW" },
    { label: "API", value: "API" },
  ];

  // Load data with filters
  const loadData = async (page = 1, newFilters = filters) => {
    setLoading(true);
    try {
      const offset = (page - 1) * pageSize;
      const params = new URLSearchParams({
        limit: pageSize.toString(),
        offset: offset.toString(),
        shop: shop,
      });

      if (isPublic) {
        params.append("public", "true");
      }

      if (productId) params.append("productId", productId);
      if (newFilters.changeType) params.append("changeType", newFilters.changeType);
      if (newFilters.source) params.append("source", newFilters.source);
      if (newFilters.dateFrom) params.append("dateFrom", newFilters.dateFrom);
      if (newFilters.dateTo) params.append("dateTo", newFilters.dateTo);
      if (newFilters.userId) params.append("userId", newFilters.userId);

      const apiEndpoint = "/app/api/inventory-history";
      const response = await fetch(`${apiEndpoint}?${params}`);
      const data = await response.json();

      setLogs(data.logs);
      setTotal(data.total);
      setHasMore(data.hasMore);
      setCurrentPage(page);
    } catch (error) {
      console.error("Error loading inventory history:", error);
    } finally {
      setLoading(false);
    }
  };

  // Filter handlers
  const handleFiltersChange = (newFilters: FilterState) => {
    setFilters(newFilters);
    loadData(1, newFilters);
  };

  const handleFiltersClear = () => {
    const clearedFilters = {};
    setFilters(clearedFilters);
    loadData(1, clearedFilters);
  };

  // Format data for DataTable
  const formatLogForTable = (log: SerializedInventoryLogEntry) => {
    const changeInfo = getChangeTypeInfo(log.changeType);
    const sourceInfo = getSourceInfo(log.source);
    const ChangeIcon = getIconComponent(changeInfo.icon);
    
    // Map our color values to Polaris Icon tone values
    const getIconTone = (color: string) => {
      switch (color) {
        case 'success': return 'success';
        case 'warning': return 'warning';
        case 'critical': return 'critical';
        case 'info': return 'info';
        case 'attention': return 'caution';
        default: return 'base';
      }
    };

    return [
      // Timestamp
      new Date(log.timestamp).toLocaleString(),
      
      // Product
      log.variantTitle ? `${log.productTitle} - ${log.variantTitle}` : log.productTitle,
      
      // Change Type
      <InlineStack gap="100" align="start" key={`change-${log.id}`}>
        <Icon source={ChangeIcon} tone={getIconTone(changeInfo.color)} />
        <Text as="span">{changeInfo.label}</Text>
      </InlineStack>,
      
      // Stock Change
      `${log.previousStock} → ${log.newStock} (${log.quantity > 0 ? "+" : ""}${log.quantity})`,
      
      // User/Source
      `${log.userName || "System"} (${sourceInfo.label})`,
      
      // Actions
      <Button
        key={`action-${log.id}`}
        variant="tertiary"
        size="micro"
        onClick={() => {
          setSelectedLog(log);
          setShowDetailModal(true);
        }}
      >
        Details
      </Button>,
    ];
  };

  const tableRows = logs.map(formatLogForTable);

  const tableHeadings = [
    "Timestamp",
    "Product",
    "Change Type", 
    "Stock Change",
    "User/Source",
    "Actions",
  ];

  // Filter components
  const filterComponents = [
    {
      key: "changeType",
      label: "Change Type",
      filter: (
        <Select
          label="Change Type"
          labelHidden
          options={changeTypeOptions}
          value={filters.changeType || ""}
          onChange={(value) =>
            handleFiltersChange({ ...filters, changeType: value as InventoryChangeType })
          }
        />
      ),
    },
    {
      key: "source",
      label: "Source",
      filter: (
        <Select
          label="Source"
          labelHidden
          options={sourceOptions}
          value={filters.source || ""}
          onChange={(value) =>
            handleFiltersChange({ ...filters, source: value as InventorySource })
          }
        />
      ),
    },
    {
      key: "dateFrom",
      label: "From Date",
      filter: (
        <TextField
          label="From Date"
          labelHidden
          type="date"
          value={filters.dateFrom || ""}
          onChange={(value) =>
            handleFiltersChange({ ...filters, dateFrom: value })
          }
          autoComplete="off"
        />
      ),
    },
    {
      key: "dateTo",
      label: "To Date",
      filter: (
        <TextField
          label="To Date"
          labelHidden
          type="date"
          value={filters.dateTo || ""}
          onChange={(value) =>
            handleFiltersChange({ ...filters, dateTo: value })
          }
          autoComplete="off"
        />
      ),
    },
  ];

  const appliedFilters = [];
  if (filters.changeType) {
    const option = changeTypeOptions.find(opt => opt.value === filters.changeType);
    appliedFilters.push({
      key: "changeType",
      label: `Change Type: ${option?.label}`,
      onRemove: () => handleFiltersChange({ ...filters, changeType: undefined }),
    });
  }
  if (filters.source) {
    const option = sourceOptions.find(opt => opt.value === filters.source);
    appliedFilters.push({
      key: "source",
      label: `Source: ${option?.label}`,
      onRemove: () => handleFiltersChange({ ...filters, source: undefined }),
    });
  }
  if (filters.dateFrom) {
    appliedFilters.push({
      key: "dateFrom",
      label: `From: ${filters.dateFrom}`,
      onRemove: () => handleFiltersChange({ ...filters, dateFrom: undefined }),
    });
  }
  if (filters.dateTo) {
    appliedFilters.push({
      key: "dateTo",
      label: `To: ${filters.dateTo}`,
      onRemove: () => handleFiltersChange({ ...filters, dateTo: undefined }),
    });
  }

  return (
    <Card>
      <BlockStack gap="400">
        {/* Header */}
        <InlineStack align="space-between">
          <Text as="h2" variant="headingMd">
            {productId ? "Product Inventory History" : "Inventory History"}
          </Text>
          <InlineStack gap="200">
            <Text as="p" variant="bodySm" tone="subdued">
              {total} total changes
            </Text>
            <Button
              variant="tertiary"
              onClick={() => setShowFilters(!showFilters)}
            >
              {showFilters ? "Hide Filters" : "Show Filters"}
            </Button>
          </InlineStack>
        </InlineStack>

        {/* Filters */}
        {showFilters && (
          <Filters
            queryValue=""
            filters={filterComponents}
            appliedFilters={appliedFilters}
            onQueryChange={() => {}}
            onQueryClear={() => {}}
            onClearAll={handleFiltersClear}
          />
        )}

        {/* Loading state */}
        {loading && (
          <InlineStack align="center">
            <Spinner size="small" />
            <Text as="p">Loading history...</Text>
          </InlineStack>
        )}

        {/* Data table */}
        {!loading && logs.length > 0 && (
          <DataTable
            columnContentTypes={["text", "text", "text", "text", "text", "text"]}
            headings={tableHeadings}
            rows={tableRows}
            truncate
          />
        )}

        {/* Empty state */}
        {!loading && logs.length === 0 && (
          <EmptyState
            heading="No inventory changes found"
            image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
          >
            <Text as="p">
              {Object.keys(filters).length > 0
                ? "Try adjusting your filters to see more results."
                : "Inventory changes will appear here as they occur."}
            </Text>
          </EmptyState>
        )}

        {/* Pagination */}
        {!loading && logs.length > 0 && (
          <InlineStack align="center">
            <Pagination
              label={`Showing ${(currentPage - 1) * pageSize + 1}-${Math.min(
                currentPage * pageSize,
                total
              )} of ${total}`}
              hasPrevious={currentPage > 1}
              onPrevious={() => loadData(currentPage - 1)}
              hasNext={hasMore}
              onNext={() => loadData(currentPage + 1)}
            />
          </InlineStack>
        )}

        {/* Detail Modal */}
        {selectedLog && (
          <Modal
            open={showDetailModal}
            onClose={() => setShowDetailModal(false)}
            title="Inventory Change Details"
            primaryAction={{
              content: "Close",
              onAction: () => setShowDetailModal(false),
            }}
          >
            <Modal.Section>
              <FormLayout>
                <FormLayout.Group>
                  <TextField
                    label="Product"
                    value={selectedLog.productTitle}
                    readOnly
                    autoComplete="off"
                  />
                  {selectedLog.variantTitle && (
                    <TextField
                      label="Variant"
                      value={selectedLog.variantTitle}
                      readOnly
                      autoComplete="off"
                    />
                  )}
                </FormLayout.Group>

                <FormLayout.Group>
                  <TextField
                    label="Change Type"
                    value={getChangeTypeInfo(selectedLog.changeType).label}
                    readOnly
                    autoComplete="off"
                  />
                  <TextField
                    label="Source"
                    value={getSourceInfo(selectedLog.source).label}
                    readOnly
                    autoComplete="off"
                  />
                </FormLayout.Group>

                <FormLayout.Group>
                  <TextField
                    label="Previous Stock"
                    value={selectedLog.previousStock.toString()}
                    readOnly
                    autoComplete="off"
                  />
                  <TextField
                    label="New Stock"
                    value={selectedLog.newStock.toString()}
                    readOnly
                    autoComplete="off"
                  />
                  <TextField
                    label="Change Amount"
                    value={`${selectedLog.quantity > 0 ? "+" : ""}${selectedLog.quantity}`}
                    readOnly
                    autoComplete="off"
                  />
                </FormLayout.Group>

                {(selectedLog.userName || selectedLog.userEmail) && (
                  <FormLayout.Group>
                    {selectedLog.userName && (
                      <TextField
                        label="User Name"
                        value={selectedLog.userName}
                        readOnly
                        autoComplete="off"
                      />
                    )}
                    {selectedLog.userEmail && (
                      <TextField
                        label="User Email"
                        value={selectedLog.userEmail}
                        readOnly
                        autoComplete="off"
                      />
                    )}
                  </FormLayout.Group>
                )}

                {(selectedLog.orderId || selectedLog.orderNumber) && (
                  <FormLayout.Group>
                    {selectedLog.orderNumber && (
                      <TextField
                        label="Order Number"
                        value={selectedLog.orderNumber}
                        readOnly
                        autoComplete="off"
                      />
                    )}
                    {selectedLog.orderId && (
                      <TextField
                        label="Order ID"
                        value={selectedLog.orderId}
                        readOnly
                        autoComplete="off"
                      />
                    )}
                  </FormLayout.Group>
                )}

                <TextField
                  label="Timestamp"
                  value={new Date(selectedLog.timestamp).toLocaleString()}
                  readOnly
                  autoComplete="off"
                />

                {selectedLog.notes && (
                  <TextField
                    label="Notes"
                    value={selectedLog.notes}
                    multiline={4}
                    readOnly
                    autoComplete="off"
                  />
                )}
              </FormLayout>
            </Modal.Section>
          </Modal>
        )}
      </BlockStack>
    </Card>
  );
}
