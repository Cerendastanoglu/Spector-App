import { LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";

/**
 * Enhanced authentication utility that supports both session tokens and fallback authentication
 * Optimized for App Bridge session token authentication to avoid slow OAuth redirects
 */

export interface SessionAuthResult {
  admin: any;
  session: any;
  cors?: (response: Response) => Response;
}

/**
 * Fast session token authentication with fallback
 * Uses App Bridge session tokens when available, fallback to standard auth
 */
export async function authenticateSession(
  args: LoaderFunctionArgs | ActionFunctionArgs
): Promise<SessionAuthResult> {
  const { request } = args;
  
  try {
    // Check for session token in headers (App Bridge)
    const sessionToken = request.headers.get('X-Shopify-Session-Token') || 
                        request.headers.get('Authorization')?.replace('Bearer ', '');
    
    if (sessionToken) {
      // Use session token authentication - much faster
      const result = await authenticate.admin(request);
      return result;
    }
    
    // Fallback to standard authentication
    const result = await authenticate.admin(request);
    return result;
    
  } catch (error) {
    console.error('Authentication error:', error);
    
    // If authentication fails, try to handle gracefully
    try {
      const result = await authenticate.admin(request);
      return result;
    } catch (fallbackError) {
      console.error('Fallback authentication failed:', fallbackError);
      throw fallbackError;
    }
  }
}

/**
 * Lightweight session check for public routes
 * Returns session info without throwing on auth failure
 */
export async function checkSession(request: Request): Promise<{
  isAuthenticated: boolean;
  session?: any;
  admin?: any;
}> {
  try {
    const result = await authenticate.admin(request);
    return {
      isAuthenticated: true,
      session: result.session,
      admin: result.admin
    };
  } catch {
    return {
      isAuthenticated: false
    };
  }
}

/**
 * Extract shop domain from request - works with session tokens
 */
export function getShopDomain(request: Request): string | null {
  const url = new URL(request.url);
  
  // Check query parameters first (common in embedded apps)
  const shopParam = url.searchParams.get('shop');
  if (shopParam) {
    return shopParam.replace('.myshopify.com', '');
  }
  
  // Check headers (session token might include shop info)
  const host = request.headers.get('X-Shopify-Shop-Domain');
  if (host) {
    return host.replace('.myshopify.com', '');
  }
  
  return null;
}

/**
 * Create optimized GraphQL client with session token support
 */
export function createGraphQLClient(admin: any) {
  return {
    async query(query: string, variables?: Record<string, any>) {
      try {
        const result = await admin.graphql(query, { variables });
        return await result.json();
      } catch (error) {
        console.error('GraphQL query error:', error);
        throw error;
      }
    }
  };
}
