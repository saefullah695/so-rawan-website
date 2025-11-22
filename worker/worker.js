import { GoogleSpreadsheet } from "google-spreadsheet";
import { JWT } from "google-auth-library";

// ========================
// Konfigurasi dasar CORS
// ========================
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

// Helper: respon JSON standar
function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ========================
// Utility: Autentikasi Google Sheets API
// ========================
async function getGoogleSheet(env) {
  try {
    if (!env.SPREADSHEET_ID) throw new Error("Missing SPREADSHEET_ID");
    if (!env.SERVICE_ACCOUNT_EMAIL) throw new Error("Missing SERVICE_ACCOUNT_EMAIL");
    if (!env.PRIVATE_KEY) throw new Error("Missing PRIVATE_KEY");

    const privateKey = env.PRIVATE_KEY.replace(/\\n/g, "\n");

    const serviceAccountAuth = new JWT({
      email: env.SERVICE_ACCOUNT_EMAIL,
      key: privateKey,
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    const doc = new GoogleSpreadsheet(env.SPREADSHEET_ID, serviceAccountAuth);
    await doc.loadInfo();
    return doc;
  } catch (error) {
    console.error("Auth error:", error);
    throw new Error("Failed to authenticate with Google Sheets");
  }
}

// ========================
// Endpoint: GET /api/sheets
// ========================
async function handleGet(request, env) {
  const url = new URL(request.url);
  const sheetName = url.searchParams.get("sheetName");

  if (!sheetName) return jsonResponse({ error: "sheetName is required" }, 400);

  try {
    const doc = await getGoogleSheet(env);
    const sheet = doc.sheetsByTitle[sheetName];

    if (!sheet) {
      return jsonResponse(
        {
          error: `Sheet "${sheetName}" not found`,
          availableSheets: Object.keys(doc.sheetsByTitle),
        },
        404
      );
    }

    await sheet.loadHeaderRow();
    const rows = await sheet.getRows();
    const headers = sheet.headerValues;
    const values = rows.map((row) => headers.map((h) => row[h] || ""));
    values.unshift(headers);

    return jsonResponse({ success: true, values });
  } catch (error) {
    console.error("Error in handleGet:", error);
    return jsonResponse(
      { error: "Failed to fetch sheet data", details: error.message },
      500
    );
  }
}

// ========================
// Endpoint: POST /api/sheets/append
// ========================
async function handleAppend(request, env) {
  try {
    const { sheetName, values } = await request.json();

    if (!sheetName || !values)
      return jsonResponse(
        { error: "sheetName and values are required" },
        400
      );

    const doc = await getGoogleSheet(env);
    const sheet = doc.sheetsByTitle[sheetName];

    if (!sheet)
      return jsonResponse({ error: `Sheet ${sheetName} not found` }, 404);

    await sheet.loadHeaderRow();
    const headers = sheet.headerValues;

    const rowData = {};
    headers.forEach((h, i) => {
      rowData[h] = values[i] || "";
    });

    await sheet.addRow(rowData);
    return jsonResponse({ success: true, message: "Row added successfully" });
  } catch (error) {
    console.error("Error in handleAppend:", error);
    return jsonResponse(
      { error: "Failed to append data", details: error.message },
      500
    );
  }
}

// ========================
// Endpoint: GET /health
// ========================
async function handleHealth() {
  return jsonResponse({
    status: "ok",
    message: "SO Rawan Worker API is running",
    timestamp: new Date().toISOString(),
  });
}

// ========================
// Router utama
// ========================
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    console.log(`[${method}] ${path}`);

    if (method === "OPTIONS") return new Response(null, { headers: corsHeaders });

    if (path === "/health" && method === "GET") return handleHealth();
    if (path === "/api/sheets" && method === "GET") return handleGet(request, env);
    if (path === "/api/sheets/append" && method === "POST")
      return handleAppend(request, env);

    return jsonResponse(
      {
        error: "Endpoint not found",
        path,
        availableEndpoints: [
          "GET /health",
          "GET /api/sheets?sheetName=YourSheet",
          "POST /api/sheets/append",
        ],
      },
      404
    );
  },
};
