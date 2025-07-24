import type { LinksFunction, MetaFunction } from "@remix-run/node";
import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
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

export default function App() {
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
            /* Critical CSS to prevent FOUC */
            body { 
              margin: 0; 
              font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
              background: #f8fafc;
            }
            
            /* Loading spinner */
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
            
            /* Prevent layout shift */
            .Polaris-Layout { min-height: 100vh; }
            .Polaris-Page { background: transparent; }
            
            /* Image loading optimization */
            img { 
              opacity: 0; 
              transition: opacity 0.3s ease-in-out; 
            }
            img.loaded { opacity: 1; }
          `
        }} />
      </head>
      <body>
        <script
          src="https://cdn.shopify.com/shopifycloud/app-bridge.js"
        ></script>
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
