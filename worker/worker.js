import { GoogleSpreadsheet } from "google-spreadsheet";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

// Handle preflight CORS
async function handleOptions() {
  return new Response(null, { headers: corsHeaders });
}

// 🔍 GET data dari Google Sheets
async function handleGet(request, env) {
  const url = new URL(request.url);
  const sheetName = url.searchParams.get("sheetName");

  if (!sheetName) {
    return jsonResponse({ error: "sheetName is required" }, 400);
  }

  try {
    // Validasi environment variable
    if (!env.SPREADSHEET_ID) throw new Error("Missing SPREADSHEET_ID");
    if (!env.SERVICE_ACCOUNT_EMAIL) throw new Error("Missing SERVICE_ACCOUNT_EMAIL");
    if (!env.PRIVATE_KEY) throw new Error("Missing PRIVATE_KEY");

    const privateKey = env.PRIVATE_KEY.replace(/\\n/g, "\n");
    const doc = new GoogleSpreadsheet(env.SPREADSHEET_ID);

    await doc.useServiceAccountAuth({
      client_email: env.SERVICE_ACCOUNT_EMAIL,
      private_key: privateKey,
    });

    await doc.loadInfo();
    const sheet = doc.sheetsByTitle[sheetName];

    if (!sheet) {
      const availableSheets = Object.keys(doc.sheetsByTitle);
      return jsonResponse({
        error: `Sheet "${sheetName}" not found`,
        availableSheets,
      }, 404);
    }

    await sheet.loadHeaderRow();
    const rows = await sheet.getRows();

    const headers = sheet.headerValues;
    const values = rows.map(row => headers.map(h => row[h] || ""));
    values.unshift(headers); // Tambahkan header di awal

    return jsonResponse({ success: true, rows: values });
  } catch (error) {
    console.error("Error in handleGet:", error);
    return jsonResponse({
      error: "Failed to fetch sheet data",
      details: error.message,
    }, 500);
  }
}

// ✏️ POST append data ke Google Sheets
async function handleAppend(request, env) {
  try {
    const { sheetName, values } = await request.json();

    if (!sheetName || !values) {
      return jsonResponse({ error: "sheetName and values are required" }, 400);
    }

    const privateKey = env.PRIVATE_KEY.replace(/\\n/g, "\n");
    const doc = new GoogleSpreadsheet(env.SPREADSHEET_ID);

    await doc.useServiceAccountAuth({
      client_email: env.SERVICE_ACCOUNT_EMAIL,
      private_key: privateKey,
    });

    await doc.loadInfo();
    const sheet = doc.sheetsByTitle[sheetName];

    if (!sheet) {
      return jsonResponse({ error: `Sheet ${sheetName} not found` }, 404);
    }

    await sheet.loadHeaderRow();
    const headers = sheet.headerValues;

    const rowData = {};
    headers.forEach((header, i) => {
      rowData[header] = values[i] || "";
    });

    await sheet.addRow(rowData);

    return jsonResponse({ success: true, message: "Row added successfully" });
  } catch (error) {
    console.error("Error in handleAppend:", error);
    return jsonResponse({
      error: "Failed to append data",
      details: error.message,
    }, 500);
  }
}

// 🩺 Health check
async function handleHealth() {
  return jsonResponse({
    status: "ok",
    message: "SO Rawan Worker API is running",
    timestamp: new Date().toISOString(),
  });
}

// 🔧 Helper JSON Response
function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// 🚀 Router utama
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const { pathname } = url;

    console.log(`[${request.method}] ${pathname}`);

    if (request.method === "OPTIONS") return handleOptions();

    if (pathname === "/health" && request.method === "GET")
      return handleHealth();

    if (pathname === "/api/sheets" && request.method === "GET")
      return handleGet(request, env);

    if (pathname === "/api/sheets/append" && request.method === "POST")
      return handleAppend(request, env);

    return jsonResponse({
      error: "Endpoint not found",
      path: pathname,
      availableEndpoints: [
        "GET /health",
        "GET /api/sheets?sheetName=YourSheet",
        "POST /api/sheets/append",
      ],
    }, 404);
  },
};
