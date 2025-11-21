// worker.js
export default {
  async fetch(request, env) {
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    // Handle preflight requests
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);
    const path = url.pathname;

    try {
      // GET - Read data from sheet
      if (request.method === 'GET' && path === '/api/sheets') {
        return await handleGetRequest(url, env);
      }
      
      // POST - Append data to sheet
      if (request.method === 'POST' && path === '/api/sheets/append') {
        return await handlePostRequest(request, env);
      }
      
      // PUT - Update data in sheet
      if (request.method === 'PUT' && path === '/api/sheets/update') {
        return await handlePutRequest(request, env);
      }

      // Default response
      return new Response('SO Rawan Hilang API Worker', {
        headers: { ...corsHeaders, 'Content-Type': 'text/plain' }
      });

    } catch (error) {
      console.error('Error:', error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }
};

// Handle GET requests
async function handleGetRequest(url, env) {
  const sheetName = url.searchParams.get('sheetName');
  const range = url.searchParams.get('range') || 'A:Z'; // Default to all columns

  if (!sheetName) {
    throw new Error('sheetName parameter is required');
  }

  const apiUrl = `https://sheets.googleapis.com/v4/spreadsheets/${env.SPREADSHEET_ID}/values/${sheetName}!${range}`;
  
  const response = await fetch(apiUrl, {
    headers: {
      'Authorization': `Bearer ${await getAccessToken(env)}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Google Sheets API error: ${response.status}`);
  }

  const data = await response.json();
  return new Response(JSON.stringify({ values: data.values || [] }), {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}

// Handle POST requests (append)
async function handlePostRequest(request, env) {
  const { sheetName, values } = await request.json();

  if (!sheetName || !values) {
    throw new Error('sheetName and values are required');
  }

  const apiUrl = `https://sheets.googleapis.com/v4/spreadsheets/${env.SPREADSHEET_ID}/values/${sheetName}!A:Z:append?valueInputOption=RAW`;
  
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${await getAccessToken(env)}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      values: [values], // Wrap in array as required by API
    }),
  });

  if (!response.ok) {
    throw new Error(`Google Sheets API error: ${response.status}`);
  }

  const data = await response.json();
  return new Response(JSON.stringify({ success: true, data }), {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}

// Handle PUT requests (update)
async function handlePutRequest(request, env) {
  const { sheetName, range, values } = await request.json();

  if (!sheetName || !range || !values) {
    throw new Error('sheetName, range and values are required');
  }

  const apiUrl = `https://sheets.googleapis.com/v4/spreadsheets/${env.SPREADSHEET_ID}/values/${sheetName}!${range}?valueInputOption=RAW`;
  
  const response = await fetch(apiUrl, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${await getAccessToken(env)}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      values: [values], // Wrap in array as required by API
    }),
  });

  if (!response.ok) {
    throw new Error(`Google Sheets API error: ${response.status}`);
  }

  const data = await response.json();
  return new Response(JSON.stringify({ success: true, data }), {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}

// Get Google API access token
async function getAccessToken(env) {
  const serviceAccount = {
    "type": "service_account",
    "project_id": "your-project-id",
    "private_key_id": "key-id",
    "private_key": env.PRIVATE_KEY.replace(/\\n/g, '\n'),
    "client_email": env.SERVICE_ACCOUNT_EMAIL,
    "client_id": "client-id",
    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
    "token_uri": "https://oauth2.googleapis.com/token",
    "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs"
  };

  const jwtHeader = btoa(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const now = Math.floor(Date.now() / 1000);
  const jwtClaimSet = btoa(JSON.stringify({
    iss: serviceAccount.client_email,
    scope: 'https://www.googleapis.com/auth/spreadsheets',
    aud: serviceAccount.token_uri,
    exp: now + 3600,
    iat: now
  }));

  const signatureInput = `${jwtHeader}.${jwtClaimSet}`;
  
  // Sign the JWT - in a real implementation, you'd use a proper JWT library
  // This is a simplified version
  const crypto = await import('crypto');
  const sign = crypto.createSign('RSA-SHA256');
  sign.update(signatureInput);
  const signature = sign.sign(serviceAccount.private_key, 'base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');

  const jwt = `${signatureInput}.${signature}`;

  const tokenResponse = await fetch(serviceAccount.token_uri, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });

  const tokenData = await tokenResponse.json();
  return tokenData.access_token;
}
