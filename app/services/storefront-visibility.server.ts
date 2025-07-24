import { authenticate } from "../shopify.server";

interface ProductVisibilitySettings {
  enabled: boolean;
  hideOutOfStock: boolean;
  showWhenRestocked: boolean;
}

// Simple in-memory storage (in production, use database)
let visibilitySettings: ProductVisibilitySettings = {
  enabled: false,
  hideOutOfStock: true,
  showWhenRestocked: true,
};

export function getVisibilitySettings() {
  return visibilitySettings;
}

export function updateVisibilitySettings(settings: Partial<ProductVisibilitySettings>) {
  visibilitySettings = { ...visibilitySettings, ...settings };
}

export async function updateProductVisibility(request: Request, productId: string, visible: boolean) {
  try {
    const { admin } = await authenticate.admin(request);
    
    const mutation = `
      mutation productUpdate($input: ProductInput!) {
        productUpdate(input: $input) {
          product {
            id
            status
          }
          userErrors {
            field
            message
          }
        }
      }
    `;

    const variables = {
      input: {
        id: productId,
        status: visible ? "ACTIVE" : "DRAFT"
      }
    };

    const response = await admin.graphql(mutation, { variables });
    const data = await response.json();

    if (data.data?.productUpdate?.userErrors?.length > 0) {
      console.error("Product visibility update errors:", data.data.productUpdate.userErrors);
      return { success: false, errors: data.data.productUpdate.userErrors };
    }

    console.log(`Product ${productId} visibility updated to: ${visible ? 'VISIBLE' : 'HIDDEN'}`);
    return { 
      success: true, 
      product: data.data.productUpdate.product,
      action: visible ? 'shown' : 'hidden'
    };

  } catch (error) {
    console.error("Error updating product visibility:", error);
    return { success: false, error: String(error) };
  }
}

export async function bulkUpdateProductVisibility(request: Request, products: Array<{id: string, stock: number}>) {
  if (!visibilitySettings.enabled) {
    return { success: false, message: "Storefront visibility management is disabled" };
  }

  const results = {
    hidden: [] as string[],
    shown: [] as string[],
    errors: [] as string[],
  };

  for (const product of products) {
    try {
      // Hide if out of stock and hideOutOfStock is enabled
      const shouldHide = visibilitySettings.hideOutOfStock && product.stock === 0;
      // Show if restocked and showWhenRestocked is enabled
      const shouldShow = visibilitySettings.showWhenRestocked && product.stock > 0;

      let targetVisibility: boolean | null = null;
      
      if (shouldHide) {
        targetVisibility = false; // Hide from storefront
      } else if (shouldShow) {
        targetVisibility = true; // Show on storefront
      }

      if (targetVisibility !== null) {
        const result = await updateProductVisibility(request, product.id, targetVisibility);
        
        if (result.success) {
          if (result.action === 'hidden') {
            results.hidden.push(product.id);
          } else {
            results.shown.push(product.id);
          }
        } else {
          results.errors.push(`${product.id}: ${result.error || 'Unknown error'}`);
        }
      }

      // Add small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
      
    } catch (error) {
      results.errors.push(`${product.id}: ${String(error)}`);
    }
  }

  return {
    success: true,
    results,
    summary: {
      hidden: results.hidden.length,
      shown: results.shown.length,
      errors: results.errors.length,
      total: products.length
    }
  };
}

export async function syncAllProductVisibility(request: Request) {
  try {
    if (!visibilitySettings.enabled) {
      return { success: false, message: "Storefront visibility management is disabled" };
    }

    const { admin } = await authenticate.admin(request);
    
    // Get all products with their inventory levels
    const query = `
      query getProducts($first: Int!) {
        products(first: $first) {
          edges {
            node {
              id
              title
              status
              variants(first: 5) {
                edges {
                  node {
                    id
                    inventoryQuantity
                  }
                }
              }
            }
          }
          pageInfo {
            hasNextPage
            endCursor
          }
        }
      }
    `;

    const response = await admin.graphql(query, {
      variables: { first: 100 }
    });
    
    const data = await response.json();
    
    if (!data.data?.products?.edges) {
      return { success: false, message: "Failed to fetch products" };
    }

    const products = data.data.products.edges.map(({ node }: any) => {
      const totalStock = node.variants.edges.reduce((sum: number, variant: any) => {
        return sum + (variant.node.inventoryQuantity || 0);
      }, 0);

      return {
        id: node.id,
        title: node.title,
        stock: totalStock,
        currentStatus: node.status
      };
    });

    // Filter products that need visibility changes
    const productsToUpdate = products.filter((product: any) => {
      const shouldBeHidden = visibilitySettings.hideOutOfStock && product.stock === 0;
      const shouldBeVisible = visibilitySettings.showWhenRestocked && product.stock > 0;
      
      // Update if current status doesn't match desired state
      if (shouldBeHidden && product.currentStatus === 'ACTIVE') {
        return true; // Need to hide
      }
      if (shouldBeVisible && product.currentStatus === 'DRAFT') {
        return true; // Need to show
      }
      
      return false;
    });

    console.log(`Found ${productsToUpdate.length} products that need visibility updates`);

    if (productsToUpdate.length === 0) {
      return {
        success: true,
        message: "All products are already in sync",
        results: { hidden: 0, shown: 0, errors: 0, total: products.length }
      };
    }

    // Update visibility for products that need it
    const result = await bulkUpdateProductVisibility(request, productsToUpdate);
    
    return {
      success: true,
      message: `Sync completed: ${result.summary?.hidden || 0} hidden, ${result.summary?.shown || 0} shown, ${result.summary?.errors || 0} errors`,
      results: result.summary || { hidden: 0, shown: 0, errors: 0, total: 0 },
      details: result.results
    };

  } catch (error) {
    console.error("Error syncing product visibility:", error);
    return { success: false, message: `Sync failed: ${String(error)}` };
  }
}

export async function getProductVisibilityStatus(request: Request, productId: string) {
  try {
    const { admin } = await authenticate.admin(request);
    
    const query = `
      query getProduct($id: ID!) {
        product(id: $id) {
          id
          title
          status
          variants(first: 5) {
            edges {
              node {
                id
                inventoryQuantity
              }
            }
          }
        }
      }
    `;

    const response = await admin.graphql(query, {
      variables: { id: productId }
    });
    
    const data = await response.json();
    
    if (!data.data?.product) {
      return { success: false, message: "Product not found" };
    }

    const product = data.data.product;
    const totalStock = product.variants.edges.reduce((sum: number, variant: any) => {
      return sum + (variant.node.inventoryQuantity || 0);
    }, 0);

    return {
      success: true,
      product: {
        id: product.id,
        title: product.title,
        status: product.status,
        stock: totalStock,
        isVisible: product.status === 'ACTIVE',
        shouldBeVisible: visibilitySettings.showWhenRestocked && totalStock > 0,
        shouldBeHidden: visibilitySettings.hideOutOfStock && totalStock === 0
      }
    };

  } catch (error) {
    console.error("Error getting product visibility status:", error);
    return { success: false, message: String(error) };
  }
}
