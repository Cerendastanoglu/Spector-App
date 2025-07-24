# Instant Alerts System

## Overview
The Instant Alerts system provides real-time notifications for critical inventory situations directly in your Shopify app interface.

## Features

### 🚨 **Real-Time Monitoring**
- **Automatic checks every 60 seconds** for inventory changes
- **Immediate notifications** when critical thresholds are reached
- **Toast notifications** for new alerts
- **Manual refresh** capability

### 📊 **Alert Types**

#### Critical Alerts (Red)
- **Out of Stock**: Products with 0 inventory
- **Critical Stock**: Products with ≤2 units OR ≤3 days until stockout
- **Immediate action required**

#### Warning Alerts (Yellow) 
- **Low Stock**: Products with ≤5 units OR ≤7 days until stockout
- **Planning action recommended**

### 🎯 **Smart Forecasting Integration**
- **Days until stockout** calculated using real sales velocity
- **Predictive alerts** based on sales trends
- **Stock + sales velocity** analysis

### 🖥️ **User Interface**

#### Fixed Position Panel
- **Top-right corner** of the screen
- **Always visible** when alerts are active
- **Scrollable** for multiple alerts
- **Professional shadows** and styling

#### Alert Cards
- **Color-coded backgrounds** (red for critical, yellow for warning)
- **Timestamp** of when alert was triggered
- **Product details** with stock levels
- **Action buttons** for quick response
- **Individual dismiss** capability

#### Header Controls
- **Alert counter** showing active alerts
- **Last check timestamp** 
- **Refresh button** for manual updates
- **Dismiss All** for clearing alerts

### 🔧 **Technical Implementation**

#### Component Structure
```tsx
<InstantAlerts />
  ├── Alert Header (count, controls)
  ├── Alert Cards (max 3 shown)
  │   ├── Badge + Timestamp
  │   ├── Title + Message  
  │   ├── Product List
  │   └── Action Buttons
  ├── "Show More" indicator
  └── Toast Notifications
```

#### Data Flow
1. **Periodic Check** (60s intervals)
2. **Inventory Analysis** (stock levels + sales velocity)
3. **Alert Generation** (critical/warning classification)
4. **Deduplication** (prevent spam)
5. **UI Update** (notifications + cards)

#### Alert Logic
```typescript
// Out of Stock
if (stock === 0) → CRITICAL

// Critical Stock  
if (stock ≤ 2 OR daysUntilStockout ≤ 3) → CRITICAL

// Warning Stock
if (stock ≤ 5 OR daysUntilStockout ≤ 7) → WARNING
```

### 🎮 **User Actions**

#### Available Actions
- **View Dashboard** - Navigate to main inventory page
- **Restock Now** - For out-of-stock items
- **Urgent Action** - For critical stock situations  
- **Plan Restock** - For warning-level stock

#### Alert Management
- **Individual Dismiss** - Hide specific alerts
- **Dismiss All** - Clear all active alerts
- **Auto-expiry** - Alerts expire after 5 minutes if conditions change
- **Manual Refresh** - Force immediate check

### 📱 **Responsive Design**
- **Fixed width**: 420px
- **Mobile-friendly** button sizes
- **Touch-optimized** interactions
- **Accessible** color contrast and labels

### 🔮 **Future Enhancements**
- **WebSocket integration** for real-time updates
- **Email alert integration** 
- **Custom thresholds** per product
- **Snooze functionality**
- **Alert history** and analytics
- **Sound notifications**

## Integration

The Instant Alerts system is automatically included when you navigate to any page in the app. It runs independently and doesn't interfere with the main application functionality.

### Setup
1. Component is added to `app/routes/app.tsx`
2. Automatically monitors inventory
3. No additional configuration required
4. Works with existing forecasting system

### Customization
You can modify alert thresholds, check intervals, and styling by editing `/app/components/InstantAlerts.tsx`.
