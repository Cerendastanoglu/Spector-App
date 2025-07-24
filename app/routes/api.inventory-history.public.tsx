import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { getLogsWithSQL } from "../services/inventory-test.server";

export async function loader({ request }: LoaderFunctionArgs) {
  // Completely public API - no authentication required
  const url = new URL(request.url);
  const shop = url.searchParams.get("shop") || "default-shop";
  const limit = parseInt(url.searchParams.get("limit") || "50");
  const offset = parseInt(url.searchParams.get("offset") || "0");
  const changeType = url.searchParams.get("changeType") || undefined;
  const source = url.searchParams.get("source") || undefined;
  const productId = url.searchParams.get("productId") || undefined;
  const userId = url.searchParams.get("userId") || undefined;
  
  const dateFrom = url.searchParams.get("dateFrom") 
    ? new Date(url.searchParams.get("dateFrom")!) 
    : undefined;
  const dateTo = url.searchParams.get("dateTo") 
    ? new Date(url.searchParams.get("dateTo")!) 
    : undefined;

  try {
    const logs = await getLogsWithSQL(shop);
    const logsArray = Array.isArray(logs) ? logs : [];

    // Apply basic filtering (the SQL service currently doesn't support all filters)
    let filteredLogs = logsArray;
    
    if (changeType) {
      filteredLogs = filteredLogs.filter((log: any) => log.changeType === changeType);
    }
    
    if (source) {
      filteredLogs = filteredLogs.filter((log: any) => log.source === source);
    }
    
    if (productId) {
      filteredLogs = filteredLogs.filter((log: any) => log.productId === productId);
    }
    
    if (userId) {
      filteredLogs = filteredLogs.filter((log: any) => log.userId === userId);
    }
    
    if (dateFrom) {
      filteredLogs = filteredLogs.filter((log: any) => new Date(log.timestamp) >= dateFrom);
    }
    
    if (dateTo) {
      filteredLogs = filteredLogs.filter((log: any) => new Date(log.timestamp) <= dateTo);
    }

    // Apply pagination
    const paginatedLogs = filteredLogs.slice(offset, offset + limit);

    return json({
      logs: paginatedLogs.map((log: any) => ({
        ...log,
        timestamp: log.timestamp?.toISOString?.() || new Date().toISOString(),
      })),
      total: filteredLogs.length,
      hasMore: offset + limit < filteredLogs.length,
    });
  } catch (error) {
    console.error("Error fetching inventory logs:", error);
    return json(
      { 
        logs: [], 
        total: 0, 
        hasMore: false,
        error: "Failed to fetch inventory history" 
      }, 
      { status: 500 }
    );
  }
}
