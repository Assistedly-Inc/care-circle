/**
 * track-worker — Google Ads URL tracking subdomain.
 *
 * Sits in front of the final URL in the Google Ads tracking template, per
 * https://support.google.com/google-ads/answer/2549100 (Tracking templates &
 * ValueTrack parameters).
 *
 * Tracking template (set at account / campaign / ad group level):
 *   https://track.assistedly.ai/?url={lpurl}&ad_id={adid}&campaign_id={campaignid}&adgroup_id={adgroupid}&device={device}&gclid={gclid}
 *
 * Behavior:
 *   - 302-redirects to the exact decoded {lpurl} value. Google URL-encodes
 *     the ValueTrack value, so the `url` param contains the full final URL
 *     (already including any auto-tagged gclid, per account settings).
 *   - Does NOT append tracking params to the final URL (avoids double-
 *     attaching gclid — Google handles gclid at the ad level).
 *   - Logs click context (ad/campaign/device/gclid/country/UA/referer) as
 *     structured JSON to Workers Logs ([observability] enabled = true).
 */
import type { ExportedHandler, IncomingRequestCfProperties } from "@cloudflare/workers-types";

export default {
  async fetch(request: Request<unknown, IncomingRequestCfProperties>): Promise<Response> {
    const u = new URL(request.url);
    const landingPage = u.searchParams.get("url") ?? u.searchParams.get("lpurl");

    if (!landingPage) {
      return new Response("Missing url/lpurl parameter", {
        status: 400,
        headers: { "content-type": "text/plain; charset=utf-8" },
      });
    }

    // {lpurl} must be an absolute http(s) URL. Parse + scheme-check as a
    // minimal open-redirect guard (rejects javascript: etc.).
    let target: URL;
    try {
      target = new URL(landingPage);
    } catch {
      return new Response("Invalid url/lpurl parameter", { status: 400 });
    }
    if (target.protocol !== "http:" && target.protocol !== "https:") {
      return new Response("Invalid url scheme", { status: 400 });
    }

    // Structured click log → Workers Logs (view live with `wrangler tail`).
    console.log(
      JSON.stringify({
        level: "info",
        event: "click",
        ad_id: u.searchParams.get("ad_id") ?? undefined,
        gclid: u.searchParams.get("gclid") ?? undefined,
        campaign_id: u.searchParams.get("campaign_id") ?? undefined,
        adgroup_id: u.searchParams.get("adgroup_id") ?? undefined,
        device: u.searchParams.get("device") ?? undefined,
        landing_page: target.toString(),
        user_agent: request.headers.get("User-Agent") ?? undefined,
        referer: request.headers.get("Referer") ?? undefined,
        country: request.cf?.country ?? undefined,
      }),
    );

    return Response.redirect(target.toString(), 302);
  },
} satisfies ExportedHandler;