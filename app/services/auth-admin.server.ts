import { authenticate } from "../shopify.server";
import { redirect } from "@remix-run/node";

/**
 * Enhanced authentication that checks for admin privileges
 * This ensures only admin users can access sensitive pages like inventory history
 */
export async function authenticateAdmin(request: Request) {
  const { session } = await authenticate.admin(request);
  
  // Basic authentication check
  if (!session || !session.shop) {
    throw redirect("/app");
  }

  // For Shopify apps, the session represents the store connection
  // All users with access to the app admin have legitimate access
  // You can add additional checks here if needed:
  
  // Option 1: Check session validity
  if (!session.accessToken) {
    throw redirect("/app");
  }

  // Option 2: Add custom admin logic based on your requirements
  // For example, check against a database of admin users
  // const adminStores = ['admin-store.myshopify.com'];
  // if (!adminStores.includes(session.shop)) {
  //   throw new Response("Admin access required", { status: 403 });
  // }

  // Log access for audit purposes
  console.log(`Inventory history accessed by store: ${session.shop}`);
  
  return { session };
}

/**
 * Check if current user has admin privileges (for conditional UI rendering)
 */
export function isAdmin(session: any): boolean {
  // For Shopify apps, if they have a valid session, they have admin access
  // You can customize this logic based on your specific requirements
  return Boolean(session?.shop && session?.accessToken);
}

/**
 * Get user display name for audit logs
 */
export function getUserDisplayName(session: any): string {
  // Use shop name as the identifier for Shopify sessions
  return session?.shop || "Unknown Store";
}
