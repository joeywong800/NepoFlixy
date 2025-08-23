export const config = { runtime: 'edge' };

const UPSTREAM = 'https://a.quickwatch.co';

function corsHeaders(extra = {}) {
  return {
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'GET,HEAD,OPTIONS',
    'access-control-allow-headers': '*',
    'access-control-max-age': '86400',
    ...extra,
  };
}

export default async function handler(req) {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }

  const inUrl = new URL(req.url);
  const upstreamPath = inUrl.pathname.replace(/^\/proxy/, '') || '/';
  const dest = UPSTREAM + upstreamPath + inUrl.search;

  let fwdHeaders = {};
  const headersParam = inUrl.searchParams.get('headers');
  if (headersParam) {
    try { fwdHeaders = JSON.parse(headersParam); } catch {}
  }

  const hdrs = new Headers(fwdHeaders);
  if (!hdrs.has('origin') && req.headers.get('origin')) {
    hdrs.set('origin', req.headers.get('origin'));
  }
  if (!hdrs.has('referer') && req.headers.get('referer')) {
    hdrs.set('referer', req.headers.get('referer'));
  }

  const upstream = await fetch(dest, { headers: hdrs, redirect: 'follow' });

  const out = new Headers(upstream.headers);
  for (const [k, v] of Object.entries(corsHeaders())) out.set(k, v);

  return new Response(upstream.body, { status: upstream.status, headers: out });
}
