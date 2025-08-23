export const config = { runtime: 'edge' };

// point this to YOUR real upstream for m3u8 proxy
const UPSTREAM = 'https://p.quickwatch.co';

const HOP_BY_HOP = new Set([
  'connection','keep-alive','proxy-authenticate','proxy-authorization',
  'te','trailer','transfer-encoding','upgrade','host' // host must be set by fetch
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
  // start from incoming headers
  const out = new Headers();
  for (const [k, v] of req.headers.entries()) {
    const lower = k.toLowerCase();
    if (!HOP_BY_HOP.has(lower)) out.set(lower, v);
  }

  // defaults often required by CF Workers / strict origins
  if (!out.has('user-agent')) out.set('user-agent', 'Mozilla/5.0');
  if (!out.has('accept')) out.set('accept', '*/*');

  // ensure Origin/Referer present (some upstreams check these)
  if (!out.has('origin') && req.headers.get('origin')) out.set('origin', req.headers.get('origin'));
  if (!out.has('referer') && req.headers.get('referer')) out.set('referer', req.headers.get('referer'));

  // merge overrides from ?headers={}
  if (headersParam) {
    try {
      const obj = JSON.parse(headersParam);
      for (const [k, v] of Object.entries(obj)) out.set(k.toLowerCase(), String(v));
    } catch { /* ignore bad JSON */ }
  }
  return out;
}

export default async function handler(req) {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: cors() });
  }

  const inUrl = new URL(req.url);
  const debug = inUrl.searchParams.get('__debug') === '1';
  const headersParam = inUrl.searchParams.get('headers');

  // preserve original subpath after /m3u8proxy
  const upstreamPath = inUrl.pathname.replace(/^\/m3u8proxy/, '') || '/';
  const dest = new URL(UPSTREAM + upstreamPath + inUrl.search);

  const forwardHeaders = buildForwardHeaders(req, headersParam);

  if (debug) {
    const preview = {
      dest: dest.toString(),
      method: 'GET',
      headers: [...forwardHeaders.entries()]
        .filter(([k]) => k !== 'authorization') // don’t print secrets
    };
    return new Response(JSON.stringify(preview, null, 2), {
      status: 200, headers: { ...cors(), 'content-type': 'application/json' }
    });
  }

  try {
    const upstream = await fetch(dest.toString(), {
      method: 'GET',
      headers: forwardHeaders,
      redirect: 'follow',
      // cache intentionally left to default; add `cache: 'no-store'` if needed
    });

    // pass through upstream’s body & headers + CORS
    const h = new Headers(upstream.headers);
    const c = cors();
    for (const k in c) h.set(k, c[k]);

    // return upstream status (so you can see if it’s 403/404/5xx)
    return new Response(upstream.body, { status: upstream.status, headers: h });
  } catch (err) {
    // surface the failure so you can see why it 500’d
    const body = { error: 'fetch_failed', message: String(err), dest: dest.toString() };
    return new Response(JSON.stringify(body), {
      status: 502,
      headers: { ...cors(), 'content-type': 'application/json' }
    });
  }
}
