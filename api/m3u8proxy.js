// api/m3u8proxy.js
export const config = { runtime: 'edge' };

// security: only allow http(s)
const ALLOWED_PROTOCOLS = new Set(['http:', 'https:']);

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

function buildForwardHeaders(req, headerJson) {
  const out = new Headers();

  // copy incoming headers (minus hop-by-hop)
  for (const [k, v] of req.headers.entries()) {
    const lower = k.toLowerCase();
    if (!HOP_BY_HOP.has(lower)) out.set(lower, v);
  }

  // sensible defaults (some origins are picky)
  if (!out.has('user-agent')) out.set('user-agent', 'Mozilla/5.0');
  if (!out.has('accept')) out.set('accept', '*/*');
  if (!out.has('accept-language')) out.set('accept-language', 'en-US,en;q=0.8');

  // keep Origin/Referer if they were sent
  if (!out.has('origin') && req.headers.get('origin')) out.set('origin', req.headers.get('origin'));
  if (!out.has('referer') && req.headers.get('referer')) out.set('referer', req.headers.get('referer'));

  // allow explicit overrides via ?headers={}
  if (headerJson) {
    try {
      const obj = JSON.parse(headerJson);
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

  // read target
  const rawTarget = inUrl.searchParams.get('url');
  if (!rawTarget) {
    return new Response('Missing url', { status: 400, headers: cors() });
  }

  // the client often sends an already-encoded url; try raw first, then decoded-once
  let targetStr = rawTarget;
  let target;
  try {
    target = new URL(targetStr);
  } catch {
    try {
      targetStr = decodeURIComponent(rawTarget);
      target = new URL(targetStr);
    } catch {
      return new Response('Invalid url', { status: 400, headers: cors() });
    }
  }

  if (!ALLOWED_PROTOCOLS.has(target.protocol)) {
    return new Response('Unsupported protocol', { status: 400, headers: cors() });
  }

  const headersParam = inUrl.searchParams.get('headers');
  const fwdHeaders = buildForwardHeaders(req, headersParam);

  if (debug) {
    const preview = {
      target: target.toString(),
      headers: [...fwdHeaders.entries()].filter(([k]) => k !== 'authorization'),
    };
    return new Response(JSON.stringify(preview, null, 2), {
      status: 200,
      headers: { ...cors(), 'content-type': 'application/json' }
    });
  }

  try {
    const upstream = await fetch(target.toString(), {
      method: 'GET',
      headers: fwdHeaders,
      redirect: 'follow',
      // if the origin supports ranges, the browser/player will include Range header; we pass it through
    });

    const h = new Headers(upstream.headers);
    for (const [k, v] of Object.entries(cors())) h.set(k, v);

    // on error codes, try to surface text (helps debugging non-media errors)
    if (upstream.status >= 400 && !h.get('content-type')?.includes('application/vnd.apple.mpegurl')) {
      const text = await upstream.text().catch(() => '');
      return new Response(text || upstream.statusText, { status: upstream.status, headers: h });
    }

    return new Response(upstream.body, { status: upstream.status, headers: h });
  } catch (err) {
    const body = { error: 'fetch_failed', message: String(err), target: target.toString() };
    return new Response(JSON.stringify(body), {
      status: 502,
      headers: { ...cors(), 'content-type': 'application/json' }
    });
  }
}
