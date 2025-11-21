// Worker.js — Rekap SO Rawan Hilang
// Menyajikan index.html di root (/) dan menyediakan API untuk Google Sheets

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    // ✅ Halaman utama (index.html)
    if (path === "/") {
      try {
        // Mengembalikan HTML response
        const htmlResponse = await fetch('https://raw.githubusercontent.com/saefullah695/so-rawan-website/main/index.html');
        if (htmlResponse.ok) {
          return new Response(await htmlResponse.text(), {
            headers: { 
              "Content-Type": "text/html; charset=utf-8",
              "Cache-Control": "no-cache"
            },
          });
        }
      } catch (error) {
        console.error('Error fetching HTML:', error);
      }
      
      // Fallback: Return simple message
      return new Response("Aplikasi Rekap SO Rawan Hilang - Silakan deploy HTML terpisah", {
        headers: { "Content-Type": "text/html; charset=utf-8" }
      });
    }

    // ✅ Endpoint API
    if (path.startsWith("/api/")) {
      return handleRequest(request, env);
    }

    // Jika path tidak ditemukan
    return new Response("Not Found", { status: 404 });
  },
};

// =============================
// ====== API HANDLER ==========
// =============================

async function handleRequest(request, env) {
  const url = new URL(request.url);
  const path = url.pathname;

  // CORS headers
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };

  // Handle preflight requests
  if (request.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const accessToken = await getAccessToken(env);

    if (path === "/api/sheets" && request.method === "GET") {
      return await getSheetData(request, accessToken, env);
    } else if (path === "/api/sheets/append" && request.method === "POST") {
      return await appendToSheet(request, accessToken, env);
    } else if (path === "/api/sheets/update" && request.method === "PUT") {
      return await updateSheetData(request, accessToken, env);
    } else {
      return new Response("Not Found", { status: 404, headers: corsHeaders });
    }
  } catch (error) {
    console.error("Worker error:", error);
    return new Response(
      JSON.stringify({
        error: "Internal Server Error",
        message: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
}

// =============================
// ====== GOOGLE AUTH ==========
// =============================

function normalizePrivateKey(raw) {
  if (!raw) throw new Error("PRIVATE_KEY missing");
  return raw.replace(/\\n/g, "\n");
}

async function getAccessToken(env) {
  const serviceAccount = {
    client_email: env.SERVICE_ACCOUNT_EMAIL,
    private_key: normalizePrivateKey(env.PRIVATE_KEY),
  };

  const now = Math.floor(Date.now() / 1000);
  const expiry = now + 3600;

  const jwtHeader = JSON.stringify({ alg: "RS256", typ: "JWT" });
  const jwtPayload = JSON.stringify({
    iss: serviceAccount.client_email,
    scope: "https://www.googleapis.com/auth/spreadsheets",
    aud: "https://oauth2.googleapis.com/token",
    exp: expiry,
    iat: now,
  });

  const base64Header = btoa(unescape(encodeURIComponent(jwtHeader)))
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
  const base64Payload = btoa(unescape(encodeURIComponent(jwtPayload)))
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  const signatureInput = `${base64Header}.${base64Payload}`;
  const signature = await signJWT(signatureInput, serviceAccount.private_key);
  const base64Signature = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  const jwt = `${signatureInput}.${base64Signature}`;

  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
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

async function signJWT(data, privateKey) {
  // Remove header and footer and convert to ArrayBuffer
  const pemContents = privateKey
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\n/g, "")
    .replace(/\r/g, "");

  const binaryDer = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));

  const key = await crypto.subtle.importKey(
    "pkcs8",
    binaryDer,
    {
      name: "RSASSA-PKCS1-v1_5",
      hash: "SHA-256",
    },
    false,
    ["sign"]
  );

  const encoder = new TextEncoder();
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    encoder.encode(data)
  );

  return signature;
}

// =============================
// ====== SHEETS API ===========
// =============================

async function getSheetData(request, accessToken, env) {
  const url = new URL(request.url);
  const spreadsheetId = env.SPREADSHEET_ID;
  const sheetName = url.searchParams.get("sheetName");
  const range = url.searchParams.get("range") || "";

  if (!spreadsheetId || !sheetName) {
    return new Response(
      JSON.stringify({ error: "Missing required parameters" }),
      { 
        status: 400, 
        headers: { 
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        } 
      }
    );
  }

  const apiRange = range ? `${sheetName}!${range}` : sheetName;
  const apiUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(apiRange)}`;

  const response = await fetch(apiUrl, {
    headers: { 
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Sheets API error:', errorText);
    return new Response(
      JSON.stringify({ 
        error: "Failed to fetch sheet data",
        details: errorText
      }),
      { 
        status: response.status,
        headers: { 
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        } 
      }
    );
  }

  const data = await response.json();
  return new Response(JSON.stringify(data), {
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
}

async function appendToSheet(request, accessToken, env) {
  const { sheetName, values } = await request.json();
  const spreadsheetId = env.SPREADSHEET_ID;

  if (!spreadsheetId || !sheetName || !values) {
    return new Response(
      JSON.stringify({ error: "Missing required parameters" }),
      { 
        status: 400, 
        headers: { 
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        } 
      }
    );
  }

  const apiUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(sheetName)}!A:Z:append?valueInputOption=RAW`;

  const response = await fetch(apiUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      values: [values],
      majorDimension: "ROWS"
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Sheets API append error:', errorText);
    return new Response(
      JSON.stringify({ 
        error: "Failed to append data",
        details: errorText
      }),
      { 
        status: response.status,
        headers: { 
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        } 
      }
    );
  }

  const data = await response.json();
  return new Response(JSON.stringify(data), {
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
}

async function updateSheetData(request, accessToken, env) {
  const { sheetName, range, values } = await request.json();
  const spreadsheetId = env.SPREADSHEET_ID;

  if (!spreadsheetId || !sheetName || !range || !values) {
    return new Response(
      JSON.stringify({ error: "Missing required parameters" }),
      { 
        status: 400, 
        headers: { 
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        } 
      }
    );
  }

  const apiUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(sheetName)}!${range}?valueInputOption=RAW`;

  const response = await fetch(apiUrl, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      values: [values],
      majorDimension: "ROWS"
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Sheets API update error:', errorText);
    return new Response(
      JSON.stringify({ 
        error: "Failed to update data",
        details: errorText
      }),
      { 
        status: response.status,
        headers: { 
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        } 
      }
    );
  }

  const data = await response.json();
  return new Response(JSON.stringify(data), {
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
