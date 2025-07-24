import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin } = await authenticate.admin(request);

  // Get products with detailed image information
const response = await admin.graphql(
    `#graphql
        query getProductsDebug {
            products(first: 10) {
                edges {
                    node {
                        id
                        title
                        totalInventory
                        featuredMedia {
                            ... on MediaImage {
                                id
                                image {
                                    url
                                    altText
                                    width
                                    height
                                }
                            }
                        }
                        media(first: 5) {
                            edges {
                                node {
                                    ... on MediaImage {
                                        id
                                        image {
                                            url
                                            altText
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }`
);

  const responseJson = await response.json();
  const responseData = responseJson as any;
  
  return json({
    products: responseData.data.products.edges,
    debug: {
      timestamp: new Date().toISOString(),
      productCount: responseData.data.products.edges.length,
      hasErrors: !!responseData.errors,
      errors: responseData.errors || null
    }
  });
};

export default function DebugProducts() {
  const { products, debug } = useLoaderData<typeof loader>();

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h1>Product Image Debug Information</h1>
      
      <div style={{ marginBottom: '20px', padding: '10px', backgroundColor: '#f5f5f5' }}>
        <h3>Debug Info:</h3>
        <pre>{JSON.stringify(debug, null, 2)}</pre>
      </div>

      <h3>Products with Image Details:</h3>
      {products.map(({ node }: any, index: number) => (
        <div key={node.id} style={{ 
          marginBottom: '20px', 
          padding: '15px', 
          border: '1px solid #ddd',
          backgroundColor: index % 2 === 0 ? '#f9f9f9' : 'white'
        }}>
          <h4>{node.title}</h4>
          <p><strong>ID:</strong> {node.id}</p>
          <p><strong>Total Inventory:</strong> {node.totalInventory}</p>
          
          <h5>Featured Media:</h5>
          {node.featuredMedia ? (
            <div style={{ marginLeft: '20px' }}>
              <p><strong>Featured Media ID:</strong> {node.featuredMedia.id}</p>
              {node.featuredMedia.image ? (
                <div>
                  <p><strong>Image URL:</strong> {node.featuredMedia.image.url}</p>
                  <p><strong>Image URL:</strong> {node.featuredMedia.image.url}</p>
                  <p><strong>Alt Text:</strong> {node.featuredMedia.image.altText || 'None'}</p>
                  <p><strong>Dimensions:</strong> {node.featuredMedia.image.width} x {node.featuredMedia.image.height}</p>
                  <div style={{ marginTop: '10px' }}>
                    <p><strong>Image Preview:</strong></p>
                    <img 
                      src={node.featuredMedia.image.url} 
                      alt={node.featuredMedia.image.altText || node.title}
                      style={{ 
                        width: '100px', 
                        height: '100px', 
                        objectFit: 'cover',
                        border: '1px solid #ccc'
                      }}
                      onLoad={() => console.log('✅ Preview loaded for:', node.title)}
                      onError={() => console.log('❌ Preview failed for:', node.title)}
                    />
                  </div>
                </div>
              ) : (
                <p style={{ color: 'red' }}>No image in featured media</p>
              )}
            </div>
          ) : (
            <p style={{ color: 'red' }}>No featured media</p>
          )}

          <h5>All Media ({node.media.edges.length} items):</h5>
          {node.media.edges.length > 0 ? (
            <div style={{ marginLeft: '20px' }}>
              {node.media.edges.map(({ node: mediaNode }: any, mediaIndex: number) => (
                <div key={mediaNode.id} style={{ marginBottom: '10px' }}>
                  <p><strong>Media {mediaIndex + 1}:</strong> {mediaNode.id}</p>
                  {mediaNode.image && (
                    <p><strong>URL:</strong> {mediaNode.image.url}</p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: 'orange' }}>No media found</p>
          )}
        </div>
      ))}
    </div>
  );
}
