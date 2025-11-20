// Cloudflare Worker untuk mengakses Google Sheets dengan Service Account
export default {
  async fetch(request, env, ctx) {
    return handleRequest(request, env, ctx);
  },
};

async function handleRequest(request, env) {
  const url = new URL(request.url);
  const path = url.pathname;

  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  // Handle preflight requests
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Dapatkan access token dari service account
    const accessToken = await getAccessToken(env);

    // Routing API
    if (path === '/api/sheets' && request.method === 'GET') {
      return await getSheetData(request, accessToken, env);
    } else if (path === '/api/sheets/append' && request.method === 'POST') {
      return await appendToSheet(request, accessToken, env);
    } else if (path === '/api/sheets/update' && request.method === 'PUT') {
      return await updateSheetData(request, accessToken, env);
    } else {
      return new Response('Not Found', { status: 404, headers: corsHeaders });
    }
  } catch (error) {
    console.error('Worker error:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal Server Error',
        message: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
}

// --- Utility untuk normalisasi Private Key ---
function normalizePrivateKey(raw) {
  if (!raw) throw new Error('PRIVATE_KEY missing');
  // jika berisi literal '\n', ubah jadi newline sesungguhnya
  return raw.includes('\\n') ? raw.replace(/\\n/g, '\n') : raw;
}

// --- Ambil access token dari Service Account ---
async function getAccessToken(env) {
  const serviceAccount = {
    client_email: env.SERVICE_ACCOUNT_EMAIL,
    private_key: normalizePrivateKey(env.PRIVATE_KEY),
  };

  const now = Math.floor(Date.now() / 1000);
  const expiry = now + 3600;

  const jwtHeader = JSON.stringify({ alg: 'RS256', typ: 'JWT' });
  const jwtPayload = JSON.stringify({
    iss: serviceAccount.client_email,
    scope: 'https://www.googleapis.com/auth/spreadsheets',
    aud: 'https://oauth2.googleapis.com/token',
    exp: expiry,
    iat: now,
  });

  const base64Header = btoa(jwtHeader)
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
  const base64Payload = btoa(jwtPayload)
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  const signatureInput = `${base64Header}.${base64Payload}`;
  const signature = await signJWT(signatureInput, serviceAccount.private_key);
  const base64Signature = btoa(signature)
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  const jwt = `${signatureInput}.${base64Signature}`;

  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });

  if (!tokenResponse.ok) {
    const errorText = await tokenResponse.text();
    throw new Error(
      `Failed to get access token: ${tokenResponse.status} ${errorText}`
    );
  }

  const tokenData = await tokenResponse.json();
  return tokenData.access_token;
}

// --- Fungsi untuk menandatangani JWT ---
async function signJWT(data, privateKey) {
  const pemContents = privateKey
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\s/g, '');

  const binaryDer = Uint8Array.from(atob(pemContents), (c) => c.charCodeAt(0));

  const key = await crypto.subtle.importKey(
    'pkcs8',
    binaryDer.buffer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const encoder = new TextEncoder();
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    key,
    encoder.encode(data)
  );

  return String.fromCharCode(...new Uint8Array(signature));
}

// --- Ambil data dari Google Sheets ---
async function getSheetData(request, accessToken, env) {
  const url = new URL(request.url);
  const spreadsheetId = env.SPREADSHEET_ID;
  const sheetName = url.searchParams.get('sheetName');
  const range = url.searchParams.get('range') || '';

  if (!spreadsheetId || !sheetName) {
    return new Response(
      JSON.stringify({ error: 'Missing required parameters' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const apiUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${sheetName}${
    range ? '!' + range : ''
  }`;

  const response = await fetch(apiUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Sheets API error: ${response.status} ${errorText}`);
  }

  const data = await response.json();

  return new Response(JSON.stringify(data), {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}

// --- Tambah data ke Google Sheets ---
async function appendToSheet(request, accessToken, env) {
  const { sheetName, values } = await request.json();
  const spreadsheetId = env.SPREADSHEET_ID;

  if (!spreadsheetId || !sheetName || !values) {
    return new Response(
      JSON.stringify({ error: 'Missing required parameters' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const apiUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${sheetName}!A:Z:append?valueInputOption=RAW`;

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ values: [values] }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Sheets API error: ${response.status} ${errorText}`);
  }

  const data = await response.json();

  return new Response(JSON.stringify(data), {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}

// --- Update data di Google Sheets ---
async function updateSheetData(request, accessToken, env) {
  const { sheetName, range, values } = await request.json();
  const spreadsheetId = env.SPREADSHEET_ID;

  if (!spreadsheetId || !sheetName || !range || !values) {
    return new Response(
      JSON.stringify({ error: 'Missing required parameters' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const apiUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${sheetName}!${range}?valueInputOption=RAW`;

  const response = await fetch(apiUrl, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ values: [values] }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Sheets API error: ${response.status} ${errorText}`);
  }

  const data = await response.json();

  return new Response(JSON.stringify(data), {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
