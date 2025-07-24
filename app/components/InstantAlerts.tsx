import { useState, useEffect } from "react";
import { useFetcher } from "@remix-run/react";
import {
  Banner,
  BlockStack,
  InlineStack,
  Text,
  Button,
  Card,
  Badge,
  Icon,
} from "@shopify/polaris";
import {
  AlertTriangleIcon,
  RefreshIcon,
  XSmallIcon,
} from "@shopify/polaris-icons";

interface Product {
  id: string;
  name: string;
  stock: number;
  salesVelocity?: {
    daily: number;
    weekly: number;
    monthly: number;
  };
  forecast?: {
    daysUntilStockout: number | null;
    status: 'critical' | 'warning' | 'safe' | 'unknown';
  };
}

interface AlertProduct {
  id: string;
  name: string;
  stock: number;
  status: 'out-of-stock' | 'critical' | 'warning';
  daysUntilStockout?: number;
}

interface InstantAlert {
  id: string;
  type: 'critical' | 'warning' | 'success' | 'info';
  title: string;
  message: string;
  products?: AlertProduct[];
  timestamp: Date;
  dismissed: boolean;
  action?: string;
}

export function InstantAlerts() {
  const [alerts, setAlerts] = useState<InstantAlert[]>([]);
  const [lastCheck, setLastCheck] = useState<Date>(new Date());
  const [isMinimized, setIsMinimized] = useState(false);
  
  const fetcher = useFetcher();

  // Check for inventory alerts
  const checkInventoryAlerts = () => {
    const criticalThreshold = 2;
    const warningThreshold = 5;
    
    // Use simple mock data to avoid connection issues
    const mockProducts = [
      { id: "1", name: "Premium Widget Pro", stock: 0, dailySales: 2.5 },
      { id: "2", name: "Essential Tool Kit", stock: 1, dailySales: 1.2 },
      { id: "3", name: "Basic Component", stock: 3, dailySales: 0.8 },
      { id: "4", name: "Advanced Module", stock: 4, dailySales: 1.5 },
    ];
    
    const criticalProducts: AlertProduct[] = [];
    const warningProducts: AlertProduct[] = [];
    const outOfStockProducts: AlertProduct[] = [];

    mockProducts.forEach(product => {
      const daysUntilStockout = product.dailySales > 0 ? Math.ceil(product.stock / product.dailySales) : null;
      
      if (product.stock === 0) {
        outOfStockProducts.push({
          id: product.id,
          name: product.name,
          stock: product.stock,
          status: 'out-of-stock',
          daysUntilStockout: 0
        });
      } else if (product.stock <= criticalThreshold || (daysUntilStockout && daysUntilStockout <= 3)) {
        criticalProducts.push({
          id: product.id,
          name: product.name,
          stock: product.stock,
          status: 'critical',
          daysUntilStockout: daysUntilStockout || undefined
        });
      } else if (product.stock <= warningThreshold || (daysUntilStockout && daysUntilStockout <= 7)) {
        warningProducts.push({
          id: product.id,
          name: product.name,
          stock: product.stock,
          status: 'warning',
          daysUntilStockout: daysUntilStockout || undefined
        });
      }
    });

    const newAlerts: InstantAlert[] = [];
    const now = new Date();

    // Create alerts for different scenarios
    if (outOfStockProducts.length > 0) {
      newAlerts.push({
        id: `out-of-stock-${now.getTime()}`,
        type: 'critical',
        title: 'Products Out of Stock',
        message: `${outOfStockProducts.length} product${outOfStockProducts.length > 1 ? 's are' : ' is'} completely out of stock`,
        products: outOfStockProducts,
        timestamp: now,
        dismissed: false,
        action: 'restock'
      });
    }

    if (criticalProducts.length > 0) {
      newAlerts.push({
        id: `critical-${now.getTime()}`,
        type: 'critical',
        title: 'Critical Stock Levels',
        message: `${criticalProducts.length} product${criticalProducts.length > 1 ? 's need' : ' needs'} immediate attention`,
        products: criticalProducts,
        timestamp: now,
        dismissed: false,
        action: 'urgent-restock'
      });
    }

    if (warningProducts.length > 0) {
      newAlerts.push({
        id: `warning-${now.getTime()}`,
        type: 'warning',
        title: 'Low Stock Warning',
        message: `${warningProducts.length} product${warningProducts.length > 1 ? 's are' : ' is'} running low`,
        products: warningProducts,
        timestamp: now,
        dismissed: false,
        action: 'plan-restock'
      });
    }

    return newAlerts;
  };

  // Periodic check for new alerts
  useEffect(() => {
    const checkForAlerts = () => {
      const newAlerts = checkInventoryAlerts();
      
      newAlerts.forEach(newAlert => {
        setAlerts(prev => {
          // Check if similar alert already exists and is not dismissed
          const exists = prev.some(alert => 
            alert.type === newAlert.type && 
            alert.title === newAlert.title &&
            !alert.dismissed &&
            Math.abs(alert.timestamp.getTime() - newAlert.timestamp.getTime()) < 300000 // 5 minutes
          );
          
          if (!exists) {
            return [newAlert, ...prev.slice(0, 9)]; // Keep only last 10 alerts
          }
          return prev;
        });
      });
      
      setLastCheck(new Date());
    };

    // Initial check
    checkForAlerts();

    // Check every 2 minutes (less frequent to be less intrusive)
    const interval = setInterval(checkForAlerts, 120000);

    return () => clearInterval(interval);
  }, []);

  // Auto-dismiss old alerts after 10 minutes
  useEffect(() => {
    const autoDismissInterval = setInterval(() => {
      const now = new Date();
      setAlerts(prev => 
        prev.map(alert => {
          const ageInMinutes = (now.getTime() - alert.timestamp.getTime()) / (1000 * 60);
          if (ageInMinutes > 10 && !alert.dismissed) {
            return { ...alert, dismissed: true };
          }
          return alert;
        })
      );
    }, 60000); // Check every minute

    return () => clearInterval(autoDismissInterval);
  }, []);

  const dismissAlert = (alertId: string) => {
    setAlerts(prev => 
      prev.map(alert => 
        alert.id === alertId 
          ? { ...alert, dismissed: true }
          : alert
      )
    );
  };

  const dismissAllAlerts = () => {
    setAlerts(prev => 
      prev.map(alert => ({ ...alert, dismissed: true }))
    );
  };

  const refreshAlerts = () => {
    const newAlerts = checkInventoryAlerts();
    setAlerts(newAlerts);
  };

  const activeAlerts = alerts.filter(alert => !alert.dismissed);

  if (activeAlerts.length === 0) {
    return null;
  }

  // Hidden until further notice - notification bar disabled
  return null;

  return (
    <>
      {/* Simple bottom notification bar */}
      {activeAlerts.length > 0 && (
        <div style={{
          position: 'fixed',
          bottom: '20px',
          left: '20px',
          right: '20px',
          zIndex: 100,
          backgroundColor: '#fff',
          border: '1px solid #E1E3E5',
          borderRadius: '8px',
          padding: '12px 16px',
          boxShadow: '0 2px 12px rgba(0, 0, 0, 0.15)',
          maxWidth: '800px',
          margin: '0 auto'
        }}>
          <InlineStack align="space-between" blockAlign="center" wrap={false}>
            <InlineStack gap="300" blockAlign="center" wrap={false}>
              <Icon source={AlertTriangleIcon} tone="critical" />
              <BlockStack gap="100">
                <Text variant="bodyMd" as="span" fontWeight="medium">
                  {activeAlerts.length} stock alert{activeAlerts.length > 1 ? 's' : ''} need attention
                </Text>
                <Text variant="bodySm" as="span" tone="subdued">
                  {activeAlerts.filter(a => a.type === 'critical').length} critical, {activeAlerts.filter(a => a.type === 'warning').length} low stock
                </Text>
              </BlockStack>
            </InlineStack>
            
            <InlineStack gap="200" blockAlign="center">
              <Button size="slim" variant="primary" onClick={() => setIsMinimized(!isMinimized)}>
                {isMinimized ? 'View Details' : 'Hide Details'}
              </Button>
              <Button 
                size="slim" 
                variant="tertiary"
                onClick={dismissAllAlerts}
              >
                Dismiss
              </Button>
            </InlineStack>
          </InlineStack>
          
          {/* Expandable details */}
          {!isMinimized && (
            <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #E1E3E5' }}>
              <InlineStack gap="200" wrap={true}>
                {activeAlerts.slice(0, 5).map((alert) => (
                  <div key={alert.id} style={{
                    padding: '8px 12px',
                    backgroundColor: alert.type === 'critical' ? '#FEF7F0' : '#FFF9E6',
                    border: `1px solid ${alert.type === 'critical' ? '#FFD6CC' : '#FFE066'}`,
                    borderRadius: '6px',
                    minWidth: '150px'
                  }}>
                    <BlockStack gap="100">
                      <Text variant="bodySm" as="span" fontWeight="medium">
                        {alert.title}
                      </Text>
                      <Text variant="bodySm" as="span" tone="subdued">
                        {alert.products?.length || 0} product{(alert.products?.length || 0) > 1 ? 's' : ''}
                      </Text>
                    </BlockStack>
                  </div>
                ))}
                {activeAlerts.length > 5 && (
                  <Text variant="bodySm" as="span" tone="subdued">
                    +{activeAlerts.length - 5} more
                  </Text>
                )}
              </InlineStack>
            </div>
          )}
        </div>
      )}
    </>
  );
}
