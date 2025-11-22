import { GoogleSpreadsheet } from "google-spreadsheet";
import { JWT } from "google-auth-library";

// =====================================================
// 🔧 Konfigurasi dasar
// =====================================================
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// =====================================================
// 🔐 Autentikasi Google Sheets
// =====================================================
async function getGoogleSheet(env) {
  const privateKey = env.PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!env.SPREADSHEET_ID || !env.SERVICE_ACCOUNT_EMAIL || !privateKey)
    throw new Error("Missing one or more Google credentials.");

  const serviceAccountAuth = new JWT({
    email: env.SERVICE_ACCOUNT_EMAIL,
    key: privateKey,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  const doc = new GoogleSpreadsheet(env.SPREADSHEET_ID, serviceAccountAuth);
  await doc.loadInfo();
  return doc;
}

// =====================================================
// 📘 GET /api/sheets — ambil data sheet
// =====================================================
async function handleGet(request, env) {
  const url = new URL(request.url);
  const sheetName = url.searchParams.get("sheetName");
  if (!sheetName) return jsonResponse({ error: "sheetName is required" }, 400);

  try {
    const doc = await getGoogleSheet(env);
    const sheet = doc.sheetsByTitle[sheetName];
    if (!sheet)
      return jsonResponse(
        {
          error: `Sheet "${sheetName}" not found`,
          availableSheets: Object.keys(doc.sheetsByTitle),
        },
        404
      );

    await sheet.loadHeaderRow();
    const rows = await sheet.getRows();
    const headers = sheet.headerValues;
    const values = rows.map((row) => headers.map((h) => row[h] || ""));
    values.unshift(headers);

    return jsonResponse({ success: true, values });
  } catch (error) {
    console.error("Error in handleGet:", error);
    return jsonResponse({ error: "Failed to fetch sheet data", details: error.message }, 500);
  }
}

// =====================================================
// ➕ POST /api/sheets/append — tambah baris baru
// =====================================================
async function handleAppend(request, env) {
  try {
    const { sheetName, values } = await request.json();
    if (!sheetName || !values)
      return jsonResponse({ error: "sheetName and values are required" }, 400);

    const doc = await getGoogleSheet(env);
    const sheet = doc.sheetsByTitle[sheetName];
    if (!sheet) return jsonResponse({ error: `Sheet ${sheetName} not found` }, 404);

    await sheet.loadHeaderRow();
    const headers = sheet.headerValues;

    const rowData = {};
    headers.forEach((h, i) => (rowData[h] = values[i] || ""));
    await sheet.addRow(rowData);

    return jsonResponse({ success: true, message: "Row added successfully" });
  } catch (error) {
    console.error("Error in handleAppend:", error);
    return jsonResponse({ error: "Failed to append data", details: error.message }, 500);
  }
}

// =====================================================
// ✏️ PUT /api/sheets/update — update data existing
// =====================================================
async function handleUpdate(request, env) {
  try {
    const { sheetName, keyColumn, keyValue, updates } = await request.json();

    if (!sheetName || !keyColumn || !keyValue || !updates)
      return jsonResponse(
        { error: "sheetName, keyColumn, keyValue, and updates are required" },
        400
      );

    const doc = await getGoogleSheet(env);
    const sheet = doc.sheetsByTitle[sheetName];
    if (!sheet) return jsonResponse({ error: `Sheet ${sheetName} not found` }, 404);

    await sheet.loadHeaderRow();
    const rows = await sheet.getRows();
    const targetRow = rows.find((r) => (r[keyColumn] || "").trim() === keyValue.trim());

    if (!targetRow)
      return jsonResponse({ error: `Row with ${keyColumn}=${keyValue} not found` }, 404);

    Object.keys(updates).forEach((field) => {
      targetRow[field] = updates[field];
    });
    await targetRow.save();

    return jsonResponse({ success: true, message: "Row updated successfully" });
  } catch (error) {
    console.error("Error in handleUpdate:", error);
    return jsonResponse({ error: "Failed to update data", details: error.message }, 500);
  }
}

// =====================================================
// 🩺 GET /health
// =====================================================
async function handleHealth() {
  return jsonResponse({
    status: "ok",
    message: "SO Rawan Worker API is running",
    timestamp: new Date().toISOString(),
  });
}

// =====================================================
// 🚀 Router utama
// =====================================================
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    console.log(`[${method}] ${path}`);

    if (method === "OPTIONS") return new Response(null, { headers: corsHeaders });
    if (path === "/health" && method === "GET") return handleHealth();
    if (path === "/api/sheets" && method === "GET") return handleGet(request, env);
    if (path === "/api/sheets/append" && method === "POST") return handleAppend(request, env);
    if (path === "/api/sheets/update" && method === "PUT") return handleUpdate(request, env);

    return jsonResponse(
      {
        error: "Endpoint not found",
        path,
        availableEndpoints: [
          "GET /health",
          "GET /api/sheets?sheetName=YourSheet",
          "POST /api/sheets/append",
          "PUT /api/sheets/update",
        ],
      },
      404
    );
  },
};
