// api/m3u8proxy.js
export const config = { runtime: 'edge' };

// Change to YOUR real upstream for m3u8 proxy if needed
const UPSTREAM = 'https://p.quickwatch.co';

const HOP_BY_HOP = new Set([
  'connection','keep-alive','proxy-authenticate','proxy-authorization',
  'te','trailer','transfer-encoding','upgrade','host'
]);

function cors(extra = {}) {
  return {
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'GET,HEAD,OPTIONS',
    'access-control-allow-headers': '*',
    'access-control-max-age': '86400',
    ...extra,
  };
}

function buildForwardHeaders(req, headersParam) {
  const out = new Headers();

  for (const [k, v] of req.headers.entries()) {
    const lower = k.toLowerCase();
    if (!HOP_BY_HOP.has(lower)) out.set(lower, v);
  }

  // Defaults many upstreams expect
  if (!out.has('user-agent')) out.set('user-agent', 'Mozilla/5.0');
  if (!out.has('accept')) out.set('accept', '*/*');
  if (!out.has('accept-language')) out.set('accept-language', 'en-US,en;q=0.8');

  // Preserve Origin/Referer if the browser sent them
  if (!out.has('origin') && req.headers.get('origin')) out.set('origin', req.headers.get('origin'));
  if (!out.has('referer') && req.headers.get('referer')) out.set('referer', req.headers.get('referer'));

  // Allow overrides from ?headers={}
  if (headersParam) {
    try {
      const obj = JSON.parse(headersParam);
      for (const [k, v] of Object.entries(obj)) out.set(k.toLowerCase(), String(v));
    } catch {}
  }
  return out;
}

function buildDestUrls(inUrl) {
  // Keep the part after /m3u8proxy (e.g. /m3u8-proxy)
  const upstreamPath = inUrl.pathname.replace(/^\/m3u8proxy/, '') || '/';

  // Attempt A: raw search (existing behaviour)
  const A = new URL(UPSTREAM + upstreamPath + inUrl.search);

  // Attempt B: decode the `url` param once and rebuild query
  const B = new URL(UPSTREAM + upstreamPath);
  const sp = new URLSearchParams(inUrl.search);
  const rawUrlParam = sp.get('url');
  if (rawUrlParam) {
    try {
      const decodedOnce = decodeURIComponent(rawUrlParam);
      sp.set('url', decodedOnce);
    } catch {
      // if decode fails, leave it as-is
    }
  }
  B.search = sp.toString() ? `?${sp.toString()}` : '';

  return { A, B };
}

export default async function handler(req) {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: cors() });
  }

  const inUrl = new URL(req.url);
  const debug = inUrl.searchParams.get('__debug') === '1';
  const headersParam = inUrl.searchParams.get('headers');

  const forwardHeaders = buildForwardHeaders(req, headersParam);
  const { A, B } = buildDestUrls(inUrl);

  if (debug) {
    const preview = {
      attemptA: A.toString(),
      attemptB: B.toString(),
      method: 'GET',
      headers: [...forwardHeaders.entries()].filter(([k]) => k !== 'authorization'),
    };
    return new Response(JSON.stringify(preview, null, 2), {
      status: 200,
      headers: { ...cors(), 'content-type': 'application/json' }
    });
  }

  // Try Attempt A (raw query)
  try {
    const r1 = await fetch(A.toString(), { method: 'GET', headers: forwardHeaders, redirect: 'follow' });
    if (r1.ok || (r1.status >= 200 && r1.status < 500)) {
      const h = new Headers(r1.headers);
      for (const [k, v] of Object.entries(cors({ 'x-proxy-diag': 'A' })) ) h.set(k, v);
      return new Response(r1.body, { status: r1.status, headers: h });
    }
    // fallthrough to attempt B if clear server error
  } catch {}

  // Try Attempt B (decoded url param)
  try {
    const r2 = await fetch(B.toString(), { method: 'GET', headers: forwardHeaders, redirect: 'follow' });
    const h = new Headers(r2.headers);
    for (const [k, v] of Object.entries(cors({ 'x-proxy-diag': 'B' })) ) h.set(k, v);
    return new Response(r2.body, { status: r2.status, headers: h });
  } catch (err) {
    const body = { error: 'fetch_failed', message: String(err), attemptA: A.toString(), attemptB: B.toString() };
    return new Response(JSON.stringify(body), {
      status: 502,
      headers: { ...cors(), 'content-type': 'application/json', 'x-proxy-diag': 'EX' }
    });
  }
}
