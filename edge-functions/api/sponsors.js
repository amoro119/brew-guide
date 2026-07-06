/* global SPONSORS_KV */

const SPONSORS_KV_KEY = 'sponsors_list';
const SPONSORS_CACHE_SECONDS = 60;

const API_ALLOWED_METHODS = ['GET', 'OPTIONS'];

function buildCorsHeaders() {
  return new Headers({
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': API_ALLOWED_METHODS.join(', '),
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  });
}

function withCors(response) {
  const headers = new Headers(response.headers || {});
  const corsHeaders = buildCorsHeaders();
  corsHeaders.forEach((value, key) => {
    headers.set(key, value);
  });

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function jsonResponse(data, status = 200) {
  return withCors(
    new Response(JSON.stringify(data), {
      status,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': `public, max-age=${SPONSORS_CACHE_SECONDS}, stale-while-revalidate=300`,
      },
    })
  );
}

function noContentResponse() {
  return withCors(new Response(null, { status: 204 }));
}

function normalizeSponsorNames(value) {
  if (!Array.isArray(value)) return [];

  return Array.from(
    new Set(
      value
        .filter(item => typeof item === 'string')
        .map(item => item.trim())
        .filter(Boolean)
    )
  );
}

function parseSponsorsRecord(value) {
  if (!value) return { names: [] };

  if (Array.isArray(value)) {
    return { names: normalizeSponsorNames(value) };
  }

  if (typeof value === 'object') {
    return { names: normalizeSponsorNames(value.names) };
  }

  if (typeof value !== 'string') return { names: [] };

  const raw = value.trim();
  if (!raw) return { names: [] };

  try {
    return parseSponsorsRecord(JSON.parse(raw));
  } catch {
    return { names: [] };
  }
}

function getSponsorsKV() {
  const kv =
    globalThis.SPONSORS_KV ||
    (typeof SPONSORS_KV !== 'undefined' ? SPONSORS_KV : null);
  return kv && typeof kv.get === 'function' ? kv : null;
}

async function getSponsorsList() {
  const kv = getSponsorsKV();
  if (!kv) return { names: [] };

  try {
    return parseSponsorsRecord(await kv.get(SPONSORS_KV_KEY));
  } catch {
    return { names: [] };
  }
}

export default async function onRequest(context) {
  const { request } = context;

  if (request.method === 'OPTIONS') return noContentResponse();
  if (request.method !== 'GET') {
    return jsonResponse({ error: 'Method Not Allowed' }, 405);
  }

  const sponsors = await getSponsorsList();
  return jsonResponse({
    success: true,
    names: sponsors.names,
  });
}
