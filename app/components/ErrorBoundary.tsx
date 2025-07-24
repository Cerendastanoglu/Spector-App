import React from 'react';
import { Banner } from '@shopify/polaris';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error: Error }>;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Filter out Shopify internal errors that we can't control
    const isShopifyInternalError = 
      error.message.includes('SendBeacon failed') ||
      error.message.includes('shopify') ||
      error.stack?.includes('shopify');

    if (!isShopifyInternalError) {
      console.error('App Error Boundary caught an error:', error, errorInfo);
    }
  }

  render() {
    if (this.state.hasError && this.state.error) {
      // Don't show error UI for Shopify internal errors
      const isShopifyInternalError = 
        this.state.error.message.includes('SendBeacon failed') ||
        this.state.error.message.includes('shopify') ||
        this.state.error.stack?.includes('shopify');

      if (isShopifyInternalError) {
        return this.props.children;
      }

      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback;
        return <FallbackComponent error={this.state.error} />;
      }

      return (
        <Banner tone="critical">
          <p><strong>Something went wrong:</strong> {this.state.error.message}</p>
          <p>Please refresh the page or contact support if the issue persists.</p>
        </Banner>
      );
    }

    return this.props.children;
  }
}
