/**
 * Branch-Routing Worker
 * Used for comparing different branches side-by-side
 *
 * Usage:
 *   Access branch at: https://< branch >.care-circle-preview.pages.dev
 *   -> Worker routes to KV-managed deployment for that branch
 */

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const { KV } = env;

    // Extract branch from hostname
    // Expected: <branch>.care-circle-preview.pages.dev
    const hostname = url.hostname;
    const [branch] = hostname.split('.');

    if (!branch || branch === 'care-circle-preview') {
      return new Response('Branch routing worker\n\nUse format: <branch>.care-circle-preview.pages.dev\n\nAvailable branches:\n' +
        await listBranches(KV), {
        status: 400,
        headers: { 'Content-Type': 'text/plain' }
      });
    }

    // Lookup branch manifest in KV
    const manifestKey = `manifest:${branch}`;
    const manifest = await KV.get(manifestKey, { type: 'json' });

    if (!manifest) {
      return new Response(JSON.stringify({
        error: 'Branch not found in KV',
        branch,
        available: await listBranches(KV)
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Build upstream URL
    const upstream = manifest.buildUrl || `https://${branch}.pages.dev`;
    const upstreamUrl = new URL(url.pathname + url.search, upstream);

    // Proxy headers
    const backendHeaders = new Headers(request.headers);
    backendHeaders.set('Host', upstreamUrl.hostname);
    ['x-forwarded-for', 'x-forwarded-for', 'x-forwarded-port', 'x-forwarded-proto', 'x-request-id'].forEach(h => backendHeaders.delete(h));

    const backendRequest = new Request(upstreamUrl, {
      method: request.method,
      headers: backendHeaders,
      body: request.body,
      redirect: 'manual'
    });

    try {
      const response = await fetch(backendRequest);
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers
      });
    } catch (err) {
      return new Response(JSON.stringify({
        error: 'Backend request failed',
        branch,
        upstream,
        message: err.message
      }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  },

  async listBranches(KV) {
    const list = await KV.list({ prefix: 'manifest:' });
    return list.keys.map(k => k.name.replace('manifest:', '')).join('\n');
  }
};