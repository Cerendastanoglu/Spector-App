import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  try {
    // Test basic server functionality
    const url = new URL(request.url);
    
    return json({
      status: "Server is working",
      timestamp: new Date().toISOString(),
      url: url.pathname,
      method: request.method,
      headers: Object.fromEntries(request.headers),
    });
  } catch (error) {
    console.error("Debug route error:", error);
    throw new Response("Debug route failed", { status: 500 });
  }
};

export default function DebugRoute() {
  const data = useLoaderData<typeof loader>();

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h1>Server Debug Information</h1>
      <pre style={{ 
        background: '#f5f5f5', 
        padding: '15px', 
        borderRadius: '5px',
        whiteSpace: 'pre-wrap' 
      }}>
        {JSON.stringify(data, null, 2)}
      </pre>
      
      <h2>Quick Tests:</h2>
      <ul>
        <li>✅ Server is responding</li>
        <li>✅ Remix loader working</li>
        <li>✅ JSON serialization working</li>
        <li>✅ React rendering working</li>
      </ul>
    </div>
  );
}
