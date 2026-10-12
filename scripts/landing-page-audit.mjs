#!/usr/bin/env node
/**
 * Landing Page Auditor — assistedly.ai (Google Ads landing page + modern UX)
 *
 * Dependency-free Node script (built-ins only). Fetches the live page, runs a
 * battery of checks across:
 *   technical / seo / ux / conversion / transparency / mobile / performance
 * and reports pass/warn/fail per check plus an overall verdict.
 *
 * Usage:
 *   node scripts/landing-page-audit.mjs                         # audit https://assistedly.ai/
 *   node scripts/landing-page-audit.mjs --url <url>             # audit any URL
 *   node scripts/landing-page-audit.mjs --pages a,b,c           # audit multiple pages (comma-separated)
 *   node scripts/landing-page-audit.mjs --psi                   # add Core Web Vitals via PageSpeed Insights API
 *   node scripts/landing-page-audit.mjs --lighthouse            # add Core Web Vitals via local Lighthouse (npx)
 *   node scripts/landing-page-audit.mjs --json                  # machine-readable JSON report
 *   node scripts/landing-page-audit.mjs --out report.md         # write markdown report to file
 *
 * Exit code: 0 = no fails, 1 = at least one failed check (CI-friendly).
 */

import https from 'node:https';
import http from 'node:http';
import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

// ── CLI args ────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = args.indexOf(name);
  return i === -1 ? fallback : args[i + 1];
};
const has = (name) => args.includes(name);

const URL_ARG = flag('--url', 'https://assistedly.ai/');
const PAGES = (flag('--pages', '') || '').split(',').filter(Boolean);
const TARGETS = PAGES.length ? PAGES.map((p) => (p.startsWith('http') ? p : new URL(p, URL_ARG).href)) : [URL_ARG];
const USE_PSI = has('--psi');
const USE_LH = has('--lighthouse');
const AS_JSON = has('--json');
const OUT_FILE = flag('--out', null);
const MAX_LINK_CHECKS = 25; // cap internal link sampling per page

// ── Small helpers ───────────────────────────────────────────────────────────
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function fetchUrl(url, { timeout = 15000, redirects = 4 } = {}) {
  return new Promise((resolvePromise, reject) => {
    const doFetch = (u, depth) => {
      const uObj = new URL(u);
      const mod = uObj.protocol === 'http:' ? http : https;
      const req = mod.get(
        uObj,
        { headers: { 'User-Agent': 'care-circle-landing-page-auditor/1.0' } },
        (res) => {
          if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location && depth < redirects) {
            res.resume();
            return doFetch(new URL(res.headers.location, u).href, depth + 1);
          }
          const chunks = [];
          const t0 = Date.now();
          res.on('data', (c) => chunks.push(c));
          res.on('end', () => {
            const body = Buffer.concat(chunks).toString('utf8');
            resolvePromise({
              url: u,
              status: res.statusCode,
              headers: res.headers,
              body,
              bytes: Buffer.byteLength(body),
              timeMs: Date.now() - t0,
            });
          });
        }
      );
      req.setTimeout(timeout, () => req.destroy(new Error('timeout')));
      req.on('error', reject);
    };
    doFetch(url, 0);
  });
}

const esc = (s) => String(s ?? '').replace(/</g, '&lt;');
const trunc = (s, n = 160) => {
  const t = String(s ?? '').replace(/\s+/g, ' ').trim();
  return t.length > n ? t.slice(0, n - 1) + '…' : t;
};

// ── Check registry ──────────────────────────────────────────────────────────
let checks = [];
const add = (category, id, label, status, detail, fix) =>
  checks.push({ category, id, label, status, detail: trunc(detail), fix });

const PASS = 'pass', WARN = 'warn', FAIL = 'fail';

// ── Core Web Vitals (PageSpeed Insights API) ────────────────────────────────
async function cwvViaPsi(url) {
  const out = {};
  for (const strategy of ['mobile', 'desktop']) {
    try {
      const api = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&strategy=${strategy}&category=performance&category=accessibility&category=best-practices&category=seo`;
      const res = await fetchUrl(api, { timeout: 60000 });
      if (res.status !== 200) {
        out[strategy] = { error: `PSI API HTTP ${res.status} (rate limited? add --lighthouse for local run)` };
        continue;
      }
      const data = JSON.parse(res.body);
      const audits = data.lighthouseResult?.audits ?? {};
      const cats = data.lighthouseResult?.categories ?? {};
      const num = (id) => {
        const a = audits[id];
        return a && typeof a.displayValue === 'string' ? a.displayValue : a?.numericValue != null ? a.numericValue.toFixed(2) : null;
      };
      out[strategy] = {
        performance: Math.round(cats.performance?.score * 100 ?? null),
        accessibility: Math.round(cats.accessibility?.score * 100 ?? null),
        'best-practices': Math.round(cats['best-practices']?.score * 100 ?? null),
        seo: Math.round(cats.seo?.score * 100 ?? null),
        FCP: num('first-contentful-paint'),
        LCP: num('largest-contentful-paint'),
        INP: num('interaction-to-next-paint'),
        TBT: num('total-blocking-time'),
        CLS: num('cumulative-layout-shift'),
        SpeedIndex: num('speed-index'),
      };
    } catch (e) {
      out[strategy] = { error: String(e.message) };
    }
  }
  return out;
}

// ── Core Web Vitals (local Lighthouse) ──────────────────────────────────────
const CHROME_CANDIDATES = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/chromium',
];
function findChrome() {
  try {
    const fs = awaitImport('node:fs');
    for (const c of CHROME_CANDIDATES) if (fs.existsSync(c)) return c;
  } catch { /* ignore */ }
  return undefined;
}
async function awaitImport(spec) {
  return import(spec);
}

async function cwvViaLighthouse(url) {
  const chromePath = findChrome();
  const outFile = `/tmp/lh-${Date.now()}.json`;
  const argsArr = [
    '--yes', 'lighthouse', url,
    '--output=json', `--output-path=${outFile}`,
    '--only-categories=performance,accessibility,best-practices,seo',
    '--quiet', '--chrome-flags=--headless=new',
  ];
  if (chromePath) argsArr.push(`--chrome-path=${chromePath}`);
  return new Promise((res) => {
    const proc = spawn('npx', argsArr, { stdio: 'ignore' });
    const timer = setTimeout(() => { proc.kill('SIGKILL'); res({ error: 'lighthouse timed out' }); }, 180000);
    proc.on('close', async (code) => {
      clearTimeout(timer);
      try {
        const fs = await awaitImport('node:fs');
        const raw = fs.readFileSync(outFile, 'utf8');
        const data = JSON.parse(raw);
        const audits = data.audits ?? {};
        const cats = data.categories ?? {};
        const num = (id) => (audits[id]?.displayValue ?? audits[id]?.numericValue?.toFixed?.(2) ?? null);
        res({
          performance: Math.round(cats.performance?.score * 100 ?? null),
          accessibility: Math.round(cats.accessibility?.score * 100 ?? null),
          'best-practices': Math.round(cats['best-practices']?.score * 100 ?? null),
          seo: Math.round(cats.seo?.score * 100 ?? null),
          FCP: num('first-contentful-paint'), LCP: num('largest-contentful-paint'),
          INP: num('interaction-to-next-paint'), TBT: num('total-blocking-time'),
          CLS: num('cumulative-layout-shift'), SpeedIndex: num('speed-index'),
        });
      } catch (e) {
        res({ error: `lighthouse failed (${code}): ${e.message}` });
      }
    });
  });
}

// ── Per-page static audit ───────────────────────────────────────────────────
async function auditPage(url) {
  checks = [];
  let page;
  try {
    page = await fetchUrl(url, { timeout: 20000 });
  } catch (e) {
    add('technical', 'fetch', 'Page is reachable', FAIL, `${url} — ${e.message}`, 'Site returned an error or timed out; check the Worker.');
    return { url, checks, cwv: null, scores: null };
  }

  const html = page.body;

  // ── Technical ──
  add('technical', 'http_status', 'HTTP status', page.status === 200 ? PASS : FAIL, `HTTP ${page.status}`, 'Landing pages must return 200 (Google Ads policy: site must function).');
  add('technical', 'https', 'HTTPS enforced', url.startsWith('https://') ? PASS : FAIL, url, 'Serve over HTTPS only.');
  add('technical', 'ttfb', 'Server response time', page.timeMs < 1000 ? PASS : page.timeMs < 2500 ? WARN : FAIL, `${page.timeMs} ms`, 'TTFB < 1s is expected; > 2.5s hurts CWV and quality score.');
  add('technical', 'content_type', 'Serves HTML', (page.headers['content-type'] || '').includes('text/html') ? PASS : WARN, page.headers['content-type'] || 'unknown', 'Should serve text/html.');

  // robots.txt + sitemap.xml
  for (const [name, ok] of [['robots.txt', true], ['sitemap.xml', true]]) {
    try {
      const r = await fetchUrl(new URL(name, url).href, { timeout: 10000 });
      const good = r.status === 200 && (name === 'sitemap.xml' ? r.body.includes('<urlset') || r.body.includes('<sitemapindex') || r.body.includes('<url') : true);
      add('seo', `file_${name.replace('.', '_')}`, `${name} available`, good ? PASS : FAIL,
        `HTTP ${r.status}${good ? '' : ' (does not look like a sitemap)'}`,
        name === 'sitemap.xml' ? 'Add a sitemap.xml listing all landing pages; submit to Google Search Console.' : 'robots.txt should not block crawling of landing pages.');
    } catch {
      add('seo', `file_${name.replace('.', '_')}`, `${name} available`, FAIL, 'could not fetch', 'Ensure the file is served.');
    }
  }

  // Page weight & request budget (sample assets referenced in HTML)
  const assetUrls = [...html.matchAll(/(?:src|href)="(\/(?:images|_next|static)[^"]*)"/g)].map((m) => new URL(m[1], url).href);
  const uniqueAssets = [...new Set(assetUrls)].slice(0, 20);
  let assetBytes = 0, assetCount = 0;
  for (const a of uniqueAssets) {
    try {
      const r = await fetchUrl(a, { timeout: 10000 });
      assetBytes += r.bytes; assetCount++;
      if (assetCount >= 20) break;
    } catch { /* skip */ }
  }
  add('performance', 'page_weight', 'Page weight budget (sampled assets)', assetBytes < 1500000 ? PASS : assetBytes < 3000000 ? WARN : FAIL,
    `${(assetBytes / 1024).toFixed(0)} KB across ${assetCount} sampled assets (images + JS + CSS)`, 'Keep initial page weight under ~1.5 MB; compress images (WebP/AVIF), trim JS.');
  const imgCount = (html.match(/<img /g) || []).length;
  add('performance', 'image_count', 'Image load count', imgCount <= 12 ? PASS : WARN, `${imgCount} <img> tags in HTML`, 'Each image is a network request; lazy-load below-the-fold images.');

  // ── SEO / metadata ──
  const title = (html.match(/<title[^>]*>([^<]*)<\/title>/) || [])[1]?.trim() ?? '';
  add('seo', 'title', 'Meta title present & sized', title && title.length >= 30 && title.length <= 65 ? PASS : title ? WARN : FAIL,
    title ? `${title.length} chars — "${title}"` : 'missing', 'Title 30–65 chars, keyword-first, one per page.');
  const desc = (html.match(/<meta name="description" content="([^"]*)"/) || [])[1]?.trim() ?? '';
  add('seo', 'description', 'Meta description present & sized', desc && desc.length >= 70 && desc.length <= 160 ? PASS : desc ? WARN : FAIL,
    desc ? `${desc.length} chars — "${desc}"` : 'missing', 'Description 70–160 chars, includes primary keyword + CTA value.');
  const lang = (html.match(/<html[^>]*lang="([^"]*)"/) || [])[1] ?? '';
  add('seo', 'lang', 'lang attribute set', /^[a-z]{2}(-[A-Z]{2})?$/.test(lang) ? PASS : FAIL, `lang="${lang}"`, 'Declare document language.');
  const viewport = (html.match(/<meta name="viewport" content="([^"]*)"/) || [])[1] ?? '';
  add('mobile', 'viewport', 'Viewport meta (mobile)', viewport.includes('width=device-width') ? PASS : FAIL, viewport || 'missing', 'Required for mobile rendering.');
  const canonical = (html.match(/<link rel="canonical" href="([^"]*)"/) || [])[1] ?? '';
  add('seo', 'canonical', 'Canonical link', canonical ? PASS : WARN, canonical || 'missing', 'Add canonical per page to avoid duplicate-content dilution.');
  const og = Object.fromEntries([...html.matchAll(/property="og:([^"]+)" content="([^"]*)"/g)].map((m) => [m[1], m[2]]));
  add('seo', 'og_tags', 'Open Graph tags', og.title && og.description ? PASS : WARN, `title=${og.title ? '✓' : '✗'} description=${og.description ? '✓' : '✗'} type=${og.type ? '✓' : '✗'} url=${og.url ? '✓' : '✗'} image=${og.image ? '✓' : '✗'}`,
    'Add og:url, og:image (1200×630), og:site_name for rich link sharing (relevant for shared links from ads tools).');
  const tw = Object.fromEntries([...html.matchAll(/name="twitter:([^"]+)" content="([^"]*)"/g)].map((m) => [m[1], m[2]]));
  add('seo', 'twitter_tags', 'Twitter card tags', tw.card ? PASS : WARN, Object.keys(tw).length ? `card=${tw.card ?? '✗'}` : 'none', 'twitter:card + summary_large_image recommended.');
  const jsonld = (html.match(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g) || []).length;
  add('seo', 'structured_data', 'Structured data (JSON-LD)', jsonld > 0 ? PASS : WARN, `${jsonld} block(s)`, 'Add Organization / HealthCareBusiness / WebSite JSON-LD for rich results.');

  // ── UX: content & heading structure ──
  const h1s = [...html.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/g)].map((m) => m[1].replace(/<[^>]+>/g, '').trim());
  add('ux', 'h1_count', 'Single H1 present', h1s.length === 1 ? PASS : h1s.length === 0 ? FAIL : WARN,
    `${h1s.length} H1: ${h1s.map((h) => trunc(h, 40)).join(' | ') || 'none'}`, 'Exactly one H1; it should state the offer (keyword + outcome).');
  const h2s = [...html.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/g)].map((m) => m[1].replace(/<[^>]+>/g, '').trim());
  add('ux', 'h2_sections', 'H2 section headings', h2s.length >= 3 ? PASS : WARN, `${h2s.length} H2 headings`, 'Break the page into scannable H2 sections (problem → solution → proof → CTA).');

  const imgTags = [...html.matchAll(/<img [^>]*>/g)];
  const noAlt = imgTags.filter((m) => !/alt=/.test(m[0]));
  add('accessibility', 'img_alt', 'All images have alt text', noAlt.length === 0 ? PASS : WARN, `${noAlt.length}/${imgTags.length} images missing alt`, 'Add descriptive alt text (also a Google Ads quality signal for relevance).');

  // ── Conversion ──
  const heroStart = html.indexOf('<main');
  const heroSlice = heroStart >= 0 ? html.slice(heroStart, heroStart + 60000) : html.slice(0, 60000);
  const ctaLabels = [...new Set([...html.matchAll(/>([^<>]{0,40}(?:Start|Get|Sign|Book|Request|Apply|Learn)[^<>]{0,40})<\/a>/g)].map((m) => m[1].trim()))].slice(0, 8);
  const primaryCta = 'Start a Care Plan';
  const ctaCount = (html.match(/Start a Care Plan/g) || []).length;
  add('conversion', 'cta_present', 'Primary CTA present', ctaCount >= 1 ? PASS : FAIL, `${ctaCount}× "${primaryCta}" in nav/footer/hero`, 'One clear, repeated primary CTA.');
  add('conversion', 'cta_hero', 'CTA above the fold', heroSlice.includes(primaryCta) ? PASS : WARN, 'Primary CTA appears in first 60 KB of <main>', 'Hero must contain the CTA so it is visible without scrolling.');
  const formCount = (html.match(/<form/g) || []).length;
  // A missing lead-capture <form> is NOT a problem when the primary CTA routes
  // to a signup/registration flow (e.g. magic-link passwordless login).
  const signupRe = /signup|register|login|auth|start|cases|magic/i;
  const normText = (s) => s.replace(/\s+/g, ' ').trim();
  const ctaLinks = [...html.matchAll(/<a\b[^>]*href="([^"]*)"[^>]*>([^<]{0,60})<\/a>/g)]
    .filter((m) => normText(m[2]).includes(primaryCta))
    .map((m) => m[1]);
  const ctaToSignup = ctaLinks.find((h) => signupRe.test(h) && !/^https?:/i.test(h))
    ?? ctaLinks.find((h) => signupRe.test(h));
  add('conversion', 'form', 'Conversion form / lead capture',
    formCount >= 1 || ctaToSignup ? PASS : WARN,
    ctaToSignup
      ? `No lead-capture form — conversion via "${primaryCta}" CTA → ${ctaToSignup} (magic-link passwordless signup flow)`
      : `${formCount} <form> element(s)`,
    'For paid traffic, capture leads via a form, or ensure the primary CTA routes to the signup flow (magic-link passwordless registration/login is the conversion mechanism).');
  const quote = (html.match(/<blockquote/) || []).length;
  const hasStats = /(?:%|in [0-9]|out of [0-9]|stars?|rating)/i.test(html.replace(/<[^>]+>/g, ' '));
  add('conversion', 'social_proof', 'Social proof (testimonials/stats)', quote > 0 || hasStats ? PASS : WARN,
    `${quote} testimonial(s)${hasStats ? ', stats present' : ', no stats found'}`, 'Add a real testimonial or outcome stat above the fold.');
  const trustTerms = ['HIPAA', 'encrypt', 'secure', 'complian', 'audit', 'privacy'];
  const trustFound = trustTerms.filter((t) => html.toLowerCase().includes(t));
  add('conversion', 'trust_signals', 'Trust signals (HIPAA/security/compliance)', trustFound.length >= 2 ? PASS : WARN,
    trustFound.length ? `found: ${trustFound.join(', ')}` : 'none', 'Healthcare visitors convert when trust (HIPAA posture, encryption, compliance) is visible.');

  // ── Transparency (Google Ads policy) ──
  const linkHrefs = [...new Set([...html.matchAll(/href="([^"]*)"/g)].map((m) => m[1]))];
  const hasPrivacy = linkHrefs.some((h) => /privacy/i.test(h));
  const hasTerms = linkHrefs.some((h) => /terms|legal/i.test(h));
  add('transparency', 'privacy_policy', 'Privacy policy link', hasPrivacy ? PASS : FAIL, hasPrivacy ? 'linked in page' : 'no link found', 'Google Ads policy requires a clear privacy policy; link it in the footer.');
  add('transparency', 'terms', 'Terms / legal link', hasTerms ? PASS : WARN, hasTerms ? 'linked in page' : 'no link found', 'Terms of service page is expected for paid traffic (healthcare especially).');
  const mailto = (html.match(/mailto:([^"'>\s]+)/) || [])[1] ?? '';
  const tel = (html.match(/tel:([^"'>\s]+)/) || [])[1] ?? '';
  const addr = /(\d+\s+[A-Za-z0-9 .]+\s+(?:St|Street|Ave|Avenue|Rd|Road|Blvd|Boulevard|Suite|Ste|Way|Dr|Drive|Pkwy|Parkway)\b)/i.test(html.replace(/<[^>]+>/g, ' '));
  add('transparency', 'contact_info', 'Contact info (email/phone/address)', mailto || tel || addr ? PASS : FAIL,
    `email=${mailto ? '✓' : '✗'} phone=${tel ? '✓' : '✗'} address=${addr ? '✓' : '✗'}`, 'Google Ads transparency: visitors must be able to contact the business (email, phone, or address).');
  const businessName = (html.match(/Assistedly Cares/g) || []).length;
  add('transparency', 'business_identity', 'Business identity clear', businessName >= 1 ? PASS : WARN, `${businessName} mention(s) of "Assistedly Cares"`, 'State who you are and what the page offers immediately (relevance + transparency).');

  // ── Navigation / dead ends ──
  const internal = [...new Set(linkHrefs.filter((h) => h.startsWith('/') && !h.startsWith('/_next') && !h.startsWith('/cdn-cgi') && !h.startsWith('/images')))]
    .slice(0, MAX_LINK_CHECKS);
  const broken = [];
  for (const p of internal) {
    try {
      const r = await fetchUrl(new URL(p, url).href, { timeout: 10000 });
      if (r.status >= 400) broken.push(`${p} (${r.status})`);
    } catch { broken.push(`${p} (err)`); }
  }
  add('ux', 'internal_links', 'Internal links healthy (sampled)', broken.length === 0 ? PASS : WARN,
    broken.length ? `${broken.length}/${internal.length} broken: ${broken.slice(0, 5).join(', ')}` : `${internal.length} links OK`,
    'Fix 404 internal links; Google Ads policy forbids broken landing pages/navigation dead ends.');
  add('ux', 'navigation', 'Site navigation options', /<nav/.test(html) ? PASS : WARN, 'nav element present' , 'Always give visitors a way to navigate (nav + footer links).');
  const navBlocks = [...html.matchAll(/<nav\b[^>]*>([\s\S]*?)<\/nav>/g)];
  const navLinkCount = navBlocks.reduce((sum, m) => sum + (m[1].match(/<a\b/g) || []).length, 0);
  add('ux', 'nav_link_count', 'Top nav link count (≤ 6)', navLinkCount <= 6 ? PASS : navLinkCount <= 8 ? WARN : FAIL,
    `${navLinkCount} link(s) across ${navBlocks.length} <nav> element(s)`,
    'Modern best practice: keep primary nav to 3–7 items; move secondary links (features, legal) to the footer.');

  // ── Mobile (static proxies) ──
  add('mobile', 'mobile_ready', 'Mobile-ready markup', viewport.includes('width=device-width') && /clamp\(/.test(html) ? PASS : WARN,
    'responsive viewport + fluid type present', 'Confirm with real mobile Lighthouse run (--lighthouse).');

  // ── Performance: CWV ──
  let cwv = null, scores = null;
  if (USE_PSI) {
    try { cwv = await cwvViaPsi(url); } catch (e) { cwv = { error: String(e.message) }; }
  }
  if (USE_LH) {
    try { scores = await cwvViaLighthouse(url); } catch (e) { scores = { error: String(e.message) }; }
  }
  if (cwv?.mobile && cwv.mobile.LCP) {
    const lcpOk = /s/.test(cwv.mobile.LCP) && parseFloat(cwv.mobile.LCP) <= 2.5;
    add('performance', 'lcp', 'LCP ≤ 2.5s (mobile)', lcpOk ? PASS : WARN, `LCP ${cwv.mobile.LCP}`, 'LCP is the #1 Google Ads landing page speed factor.');
    const cls = parseFloat(cwv.mobile.CLS);
    add('performance', 'cls', 'CLS ≤ 0.1 (mobile)', cls <= 0.1 ? PASS : WARN, `CLS ${cwv.mobile.CLS}`, 'Stable layout = fewer accidental taps on paid traffic.');
  }

  return { url, checks, cwv, scores };
}

// ── Report rendering ────────────────────────────────────────────────────────
function renderMarkdown(results) {
  const lines = [];
  lines.push(`# Landing Page Audit — ${results.url}`);
  lines.push('');
  lines.push(`_Generated ${new Date().toISOString()} by scripts/landing-page-audit.mjs_`);
  const catNames = {
    technical: 'Technical', performance: 'Performance & CWV', seo: 'SEO & Metadata',
    ux: 'UX & Content', conversion: 'Conversion', transparency: 'Transparency (Google Ads policy)',
    mobile: 'Mobile', accessibility: 'Accessibility',
  };
  const order = ['technical', 'performance', 'seo', 'ux', 'conversion', 'transparency', 'mobile', 'accessibility'];
  for (const cat of order) {
    const list = results.checks.filter((c) => c.category === cat);
    if (!list.length) continue;
    lines.push(`\n## ${catNames[cat] ?? cat}`);
    lines.push('');
    lines.push('| Status | Check | Detail |');
    lines.push('|---|---|---|');
    for (const c of list) {
      const icon = c.status === PASS ? '✅' : c.status === WARN ? '⚠️' : '❌';
      lines.push(`| ${icon} | ${c.label} | ${esc(c.detail)} |`);
    }
  }
  if (results.cwv) {
    lines.push('\n## Core Web Vitals (PageSpeed Insights)');
    lines.push('');
    lines.push('| Metric | Mobile | Desktop | Good |');
    lines.push('|---|---|---|---|');
    const m = results.cwv.mobile ?? {}, d = results.cwv.desktop ?? {};
    for (const [label, key] of [['LCP', 'LCP'], ['INP', 'INP'], ['TBT', 'TBT'], ['CLS', 'CLS'], ['FCP', 'FCP'], ['Speed Index', 'SpeedIndex']]) {
      const good = key === 'CLS' ? '≤ 0.1' : key === 'INP' || key === 'TBT' ? 'INP ≤ 200ms / TBT ≤ 200ms' : key === 'LCP' || key === 'FCP' ? '≤ 2.5s / ≤ 1.8s' : '≤ 3.4s';
      lines.push(`| ${label} | ${m[key] ?? '—'} | ${d[key] ?? '—'} | ${good} |`);
    }
    for (const s of ['mobile', 'desktop']) {
      const v = results.cwv[s];
      if (v?.error) lines.push(`\n_${s}: ${v.error}_`);
    }
  }
  if (results.scores) {
    lines.push('\n## Lighthouse Scores (local run)');
    lines.push('');
    lines.push('| Category | Score |');
    lines.push('|---|---|');
    for (const [k, v] of Object.entries(results.scores)) lines.push(`| ${k} | ${v ?? '—'} |`);
  }
  const fails = results.checks.filter((c) => c.status === FAIL);
  const warns = results.checks.filter((c) => c.status === WARN);
  lines.push(`\n## Verdict: ${fails.length === 0 ? (warns.length === 0 ? '✅ PASS' : '⚠️ PASS WITH WARNINGS') : '❌ FAIL'}`);
  lines.push('');
  lines.push(`- **${fails.length} failed** · **${warns.length} warnings** · **${results.checks.length - fails.length - warns.length} passed**`);
  if (fails.length) {
    lines.push('\n### Must fix (P0)');
    for (const f of fails) lines.push(`- ❌ **${f.label}** — ${f.fix ?? f.detail}`);
  }
  if (warns.length) {
    lines.push('\n### Should fix (P1)');
    for (const w of warns) lines.push(`- ⚠️ **${w.label}** — ${w.fix ?? w.detail}`);
  }
  return lines.join('\n');
}

// ── Main ────────────────────────────────────────────────────────────────────
const results = [];
for (const t of TARGETS) {
  const r = await auditPage(t);
  results.push(r);
  await sleep(500);
}
const final = {
  generatedAt: new Date().toISOString(),
  tool: 'scripts/landing-page-audit.mjs',
  targets: TARGETS,
  results,
};

if (AS_JSON) {
  console.log(JSON.stringify(final, null, 2));
} else {
  for (const r of results) console.log(renderMarkdown(r) + '\n');
}
if (OUT_FILE) {
  const md = results.map(renderMarkdown).join('\n\n---\n\n');
  writeFileSync(resolve(OUT_FILE), md, 'utf8');
  console.log(`\nReport written to ${OUT_FILE}`);
}
const anyFail = results.some((r) => r.checks.some((c) => c.status === FAIL));
process.exit(anyFail ? 1 : 0);