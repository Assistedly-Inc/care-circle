// Routing Worker for branch-specific deployments
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const branchName = url.hostname.split('.')[0]; // Extract first part of hostname

    // Allow direct access to static files (images, etc.)
    if (url.pathname.startsWith('/_next/static/') || 
        url.pathname.startsWith('/images/') ||
        url.pathname.startsWith('/public/')) {
      return request;
    }

    // Get the deployment manifest from KV
    const manifestKey = env.BRANCH_MANIFEST || `manifest:${branchName}`;
    const manifest = await env.KV.get(manifestKey);

    if (!manifest) {
      // Return 404 if no deployment found for this branch
      return new Response('No preview deployment found for this branch', {
        status: 404,
        headers: { 'Content-Type': 'text/plain' },
      });
    }

    const deployment = JSON.parse(manifest);

    // Proxy all requests to the preview deployment
    const previewUrl = new URL(deployment.url);
    previewUrl.pathname = url.pathname;
    previewUrl.search = url.search;

    const previewRequest = new Request(previewUrl, {
      method: request.method,
      headers: request.headers,
      body: request.body,
      redirect: 'manual',
    });

    const response = await fetch(previewRequest);

    // Update response to use the correct canary hostname
    const responseHeaders = new Headers(response.headers);
    responseHeaders.set('X-CF-Branch', branchName);
    responseHeaders.set('X-Deployed-At', deployment.deployedAt);

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });
  },
};