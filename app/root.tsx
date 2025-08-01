import type { LinksFunction, MetaFunction, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLoaderData,
} from "@remix-run/react";

import { AppProvider } from "@shopify/polaris";
import translations from "@shopify/polaris/locales/en.json";
import polarisStyles from "@shopify/polaris/build/esm/styles.css?url";
import { ErrorBoundary } from "./components/ErrorBoundary";

// Polaris fonts (already in your code)
const shopifyFontLinks = [
  <link key="font1" rel="preconnect" href="https://cdn.shopify.com/" />,
  <link
    key="font2"
    rel="stylesheet"
    href="https://cdn.shopify.com/static/fonts/inter/v4/styles.css"
  />,
];

export const meta: MetaFunction = () => [{ title: "Spector" }];

export const links: LinksFunction = () => [
  { rel: "stylesheet", href: polarisStyles },
];

export async function loader({ request }: LoaderFunctionArgs) {
  return json({
    apiKey: process.env.SHOPIFY_API_KEY || '',
  });
}

export default function App() {
  const { apiKey } = useLoaderData<typeof loader>();
  
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        {shopifyFontLinks}
        <Meta />
        <Links />
        <style dangerouslySetInnerHTML={{
          __html: `
            /* Critical CSS only - minimal for <50KB target */
            body { 
              margin: 0; 
              font-family: Inter, -apple-system, BlinkMacSystemFont, sans-serif;
              background: #f8fafc;
              font-size: 14px;
              line-height: 1.4;
            }
            
            /* Minimal loading state */
            .loading { 
              display: flex; 
              justify-content: center; 
              align-items: center; 
              min-height: 200px; 
            }
            
            /* Prevent layout shift - minimal rules */
            .Polaris-Layout { min-height: 100vh; }
            .Polaris-Page { background: transparent; }
            
            /* Essential image optimization */
            img { 
              opacity: 0; 
              transition: opacity 0.2s; 
              max-width: 100%;
              height: auto;
            }
            img.loaded { opacity: 1; }
            
            /* Defer non-critical animations */
            @media (prefers-reduced-motion: reduce) {
              *, *::before, *::after { 
                animation-duration: 0.01ms !important; 
                transition-duration: 0.01ms !important; 
              }
            }
          `
        }} />
      </head>
      <body>
        <script
          src="https://cdn.shopify.com/shopifycloud/app-bridge.js"
        ></script>
        <script dangerouslySetInnerHTML={{
          __html: `
            // Initialize App Bridge with session token support
            window.shopifyApp = window.shopifyApp || {};
            window.shopifyApp.ready = function() {
              const urlParams = new URLSearchParams(window.location.search);
              const apiKey = urlParams.get('api_key') || '${apiKey}';
              const host = urlParams.get('host') || '';
              
              const app = window.ShopifyApp && window.ShopifyApp.createApp({
                apiKey: apiKey,
                host: host,
                forceRedirect: true,
              });
              
              if (app) {
                // Use session tokens for authentication
                app.subscribe(window.ShopifyApp.Action.SessionToken.TOKEN_REQUEST, (data) => {
                  // Handle session token requests
                  if (data && data.sessionToken) {
                    window.shopifyApp.sessionToken = data.sessionToken;
                    // Add session token to future requests
                    const headers = document.querySelector('meta[name="csrf-token"]');
                    if (headers) {
                      headers.setAttribute('content', data.sessionToken);
                    }
                  }
                });
                
                // Request initial session token
                app.dispatch(window.ShopifyApp.Action.SessionToken.REQUEST);
              }
            };
            
            // Wait for App Bridge to load
            if (window.ShopifyApp) {
              window.shopifyApp.ready();
            } else {
              document.addEventListener('DOMContentLoaded', window.shopifyApp.ready);
            }
          `
        }} />
        <AppProvider i18n={translations}>
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </AppProvider>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}
