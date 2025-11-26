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

function errorResponse(message, status = 500, details = null) {
  return jsonResponse({
    error: message,
    details: details,
    success: false
  }, status);
}

// =====================================================
// 🔐 Autentikasi Google Sheets
// =====================================================
async function getGoogleSheet(env) {
  try {
    const privateKey = env.PRIVATE_KEY?.replace(/\\n/g, "\n");
    if (!env.SPREADSHEET_ID || !env.SERVICE_ACCOUNT_EMAIL || !privateKey) {
      throw new Error("Missing one or more Google credentials.");
    }

    const serviceAccountAuth = new JWT({
      email: env.SERVICE_ACCOUNT_EMAIL,
      key: privateKey,
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    const doc = new GoogleSpreadsheet(env.SPREADSHEET_ID, serviceAccountAuth);
    await doc.loadInfo();
    return doc;
  } catch (error) {
    console.error("Error in getGoogleSheet:", error);
    throw new Error(`Failed to initialize Google Sheet: ${error.message}`);
  }
}

// =====================================================
// 📘 GET /api/sheets — ambil data sheet
// =====================================================
async function handleGet(request, env) {
  try {
    const url = new URL(request.url);
    const sheetName = url.searchParams.get("sheetName");
    
    if (!sheetName) {
      return errorResponse("sheetName is required", 400);
    }

    console.log(`Fetching data from sheet: ${sheetName}`);

    const doc = await getGoogleSheet(env);
    const sheet = doc.sheetsByTitle[sheetName];
    
    if (!sheet) {
      return errorResponse(
        `Sheet "${sheetName}" not found`,
        404,
        { availableSheets: Object.keys(doc.sheetsByTitle) }
      );
    }

    // Gunakan getRows() untuk performa yang lebih baik
    const rows = await sheet.getRows();
    console.log(`Found ${rows.length} rows in sheet ${sheetName}`);

    // Jika tidak ada data, return array kosong
    if (rows.length === 0) {
      return jsonResponse({
        success: true,
        values: [],
        rowCount: 0,
        colCount: 0
      });
    }

    // Ambil header dari row pertama
    await sheet.loadHeaderRow();
    const headers = sheet.headerValues;
    console.log("Headers:", headers);

    // Format data menjadi array 2D
    const values = [headers]; // Baris pertama adalah header
    
    rows.forEach(row => {
      const rowData = headers.map(header => {
        const value = row.get(header);
        return value !== null && value !== undefined ? String(value) : "";
      });
      values.push(rowData);
    });

    console.log(`Successfully retrieved ${values.length} rows of data`);

    return jsonResponse({ 
      success: true, 
      values,
      rowCount: values.length,
      colCount: headers.length
    });

  } catch (error) {
    console.error("Error in handleGet:", error);
    return errorResponse(
      "Failed to fetch sheet data", 
      500,
      { message: error.message }
    );
  }
}

// =====================================================
// ➕ POST /api/sheets/append — tambah baris baru
// =====================================================
async function handleAppend(request, env) {
  try {
    const { sheetName, values } = await request.json();
    
    if (!sheetName || !values) {
      return errorResponse("sheetName and values are required", 400);
    }

    console.log(`Appending data to sheet: ${sheetName}`, values);

    const doc = await getGoogleSheet(env);
    const sheet = doc.sheetsByTitle[sheetName];
    
    if (!sheet) {
      return errorResponse(`Sheet "${sheetName}" not found`, 404);
    }

    // Load header untuk memastikan struktur data sesuai
    await sheet.loadHeaderRow();
    const headers = sheet.headerValues;

    if (!headers || headers.length === 0) {
      return errorResponse(
        "No headers found in sheet. Please ensure row 1 contains headers.",
        400
      );
    }

    console.log("Sheet headers:", headers);

    let successCount = 0;
    const errors = [];

    // Handle multiple rows
    if (Array.isArray(values[0])) {
      // Multiple rows
      for (const [index, rowValues] of values.entries()) {
        try {
          const rowData = {};
          headers.forEach((header, i) => {
            // Pastikan nilai sesuai dengan urutan header
            const value = rowValues[i] !== undefined && rowValues[i] !== null 
              ? String(rowValues[i]) 
              : "";
            rowData[header] = value;
          });
          await sheet.addRow(rowData);
          successCount++;
          console.log(`Successfully added row ${index + 1}`);
        } catch (rowError) {
          console.error(`Error adding row ${index + 1}:`, rowError);
          errors.push(`Row ${index + 1}: ${rowError.message}`);
        }
      }
    } else {
      // Single row
      try {
        const rowData = {};
        headers.forEach((header, i) => {
          const value = values[i] !== undefined && values[i] !== null 
            ? String(values[i]) 
            : "";
          rowData[header] = value;
        });
        await sheet.addRow(rowData);
        successCount++;
        console.log("Successfully added single row");
      } catch (rowError) {
        console.error("Error adding single row:", rowError);
        errors.push(`Single row: ${rowError.message}`);
      }
    }

    if (errors.length > 0) {
      return jsonResponse({
        success: true,
        message: `Partially successful: ${successCount} row(s) added, ${errors.length} error(s)`,
        added: successCount,
        errors: errors
      });
    }

    return jsonResponse({ 
      success: true, 
      message: `${successCount} row(s) added successfully` 
    });

  } catch (error) {
    console.error("Error in handleAppend:", error);
    return errorResponse(
      "Failed to append data", 
      500,
      { message: error.message }
    );
  }
}

// =====================================================
// ✏️ PUT /api/sheets/update — update data existing
// =====================================================
async function handleUpdate(request, env) {
  try {
    const { sheetName, range, values } = await request.json();

    if (!sheetName || !range || !values) {
      return errorResponse("sheetName, range, and values are required", 400);
    }

    console.log(`Updating sheet: ${sheetName}, range: ${range}`, values);

    const doc = await getGoogleSheet(env);
    const sheet = doc.sheetsByTitle[sheetName];
    
    if (!sheet) {
      return errorResponse(`Sheet "${sheetName}" not found`, 404);
    }

    // Parse range (format: "A2:K2" atau "Sheet1!A2:K2")
    let rangeMatch;
    if (range.includes('!')) {
      rangeMatch = range.match(/([A-Z]+)(\d+):([A-Z]+)(\d+)$/);
    } else {
      rangeMatch = range.match(/^([A-Z]+)(\d+):([A-Z]+)(\d+)$/);
    }

    if (!rangeMatch) {
      return errorResponse(
        "Invalid range format. Use format like 'A2:K2'",
        400
      );
    }

    const startRow = parseInt(rangeMatch[2]);
    const endRow = parseInt(rangeMatch[4]);

    // Validasi: hanya support single row update untuk sekarang
    if (startRow !== endRow) {
      return errorResponse("Only single row updates are supported", 400);
    }

    await sheet.loadHeaderRow();
    const headers = sheet.headerValues;
    
    if (!headers || headers.length === 0) {
      return errorResponse(
        "No headers found in sheet. Please ensure row 1 contains headers.",
        400
      );
    }

    const rows = await sheet.getRows();

    // Cari row berdasarkan index (row 2 = index 0 di array rows)
    const rowIndex = startRow - 2;
    if (rowIndex < 0 || rowIndex >= rows.length) {
      return errorResponse(
        `Row ${startRow} not found (sheet has ${rows.length} data rows)`,
        404
      );
    }

    const targetRow = rows[rowIndex];

    // Update row data
    headers.forEach((header, i) => {
      if (i < values.length) {
        const value = values[i] !== undefined && values[i] !== null 
          ? String(values[i]) 
          : "";
        targetRow.set(header, value);
      }
    });
    
    await targetRow.save();

    console.log(`Successfully updated row ${startRow}`);

    return jsonResponse({ 
      success: true, 
      message: "Row updated successfully" 
    });

  } catch (error) {
    console.error("Error in handleUpdate:", error);
    return errorResponse(
      "Failed to update data", 
      500,
      { message: error.message }
    );
  }
}

// =====================================================
// 🔍 POST /api/sheets/find — find data by criteria
// =====================================================
async function handleFind(request, env) {
  try {
    const { sheetName, keyColumn, keyValue } = await request.json();

    if (!sheetName || !keyColumn || !keyValue) {
      return errorResponse("sheetName, keyColumn, and keyValue are required", 400);
    }

    console.log(`Searching in ${sheetName} for ${keyColumn}=${keyValue}`);

    const doc = await getGoogleSheet(env);
    const sheet = doc.sheetsByTitle[sheetName];
    
    if (!sheet) {
      return errorResponse(`Sheet "${sheetName}" not found`, 404);
    }

    await sheet.loadHeaderRow();
    const headers = sheet.headerValues;
    
    if (!headers || headers.length === 0) {
      return errorResponse(
        "No headers found in sheet. Please ensure row 1 contains headers.",
        400
      );
    }

    // Validasi bahwa keyColumn ada di headers
    if (!headers.includes(keyColumn)) {
      return errorResponse(
        `Column "${keyColumn}" not found in sheet headers`,
        400,
        { availableColumns: headers }
      );
    }

    const rows = await sheet.getRows();
    
    console.log(`Searching in ${rows.length} rows for ${keyColumn}=${keyValue}`);

    const targetRow = rows.find((row) => {
      const cellValue = row.get(keyColumn);
      return cellValue && String(cellValue).trim() === String(keyValue).trim();
    });

    if (!targetRow) {
      return errorResponse(
        `Row with ${keyColumn}=${keyValue} not found`,
        404,
        { searchedRows: rows.length }
      );
    }

    const rowData = headers.map(header => {
      const value = targetRow.get(header);
      return value !== null && value !== undefined ? String(value) : "";
    });

    const rowIndex = rows.indexOf(targetRow) + 2; // +2 karena header row 1, data mulai row 2

    console.log(`Found matching row at index ${rowIndex}`);

    return jsonResponse({ 
      success: true, 
      rowIndex: rowIndex,
      data: rowData 
    });

  } catch (error) {
    console.error("Error in handleFind:", error);
    return errorResponse(
      "Failed to find data", 
      500,
      { message: error.message }
    );
  }
}

// =====================================================
// 🗑️ DELETE /api/sheets/delete — hapus baris
// =====================================================
async function handleDelete(request, env) {
  try {
    const { sheetName, rowIndex } = await request.json();

    if (!sheetName || !rowIndex) {
      return errorResponse("sheetName and rowIndex are required", 400);
    }

    console.log(`Deleting row ${rowIndex} from sheet: ${sheetName}`);

    const doc = await getGoogleSheet(env);
    const sheet = doc.sheetsByTitle[sheetName];
    
    if (!sheet) {
      return errorResponse(`Sheet "${sheetName}" not found`, 404);
    }

    const rows = await sheet.getRows();
    
    // Validasi rowIndex
    if (rowIndex < 2 || rowIndex > rows.length + 1) {
      return errorResponse(
        `Row ${rowIndex} not found (available rows: 2-${rows.length + 1})`,
        404
      );
    }

    const targetRowIndex = rowIndex - 2; // Convert to 0-based index
    const targetRow = rows[targetRowIndex];
    
    if (!targetRow) {
      return errorResponse(`Row ${rowIndex} not found`, 404);
    }

    await targetRow.delete();

    console.log(`Successfully deleted row ${rowIndex}`);

    return jsonResponse({ 
      success: true, 
      message: `Row ${rowIndex} deleted successfully` 
    });

  } catch (error) {
    console.error("Error in handleDelete:", error);
    return errorResponse(
      "Failed to delete row", 
      500,
      { message: error.message }
    );
  }
}

// =====================================================
// 📋 GET /api/sheets/list — daftar semua sheet
// =====================================================
async function handleListSheets(request, env) {
  try {
    const doc = await getGoogleSheet(env);
    const sheets = Object.keys(doc.sheetsByTitle);
    
    console.log(`Found ${sheets.length} sheets:`, sheets);

    return jsonResponse({
      success: true,
      sheets: sheets,
      count: sheets.length
    });

  } catch (error) {
    console.error("Error in handleListSheets:", error);
    return errorResponse(
      "Failed to list sheets", 
      500,
      { message: error.message }
    );
  }
}

// =====================================================
// 🩺 GET /health — health check
// =====================================================
async function handleHealth(env) {
  try {
    // Test connection to Google Sheets
    const doc = await getGoogleSheet(env);
    const sheetCount = Object.keys(doc.sheetsByTitle).length;
    
    return jsonResponse({
      status: "healthy",
      message: "SO Rawan Worker API is running",
      timestamp: new Date().toISOString(),
      sheetsAvailable: sheetCount,
      service: "Google Sheets API"
    });

  } catch (error) {
    console.error("Health check failed:", error);
    return errorResponse(
      "Service unhealthy - Google Sheets connection failed",
      503,
      { message: error.message }
    );
  }
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

    // Handle CORS preflight
    if (method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // Routing
      if (path === "/health" && method === "GET") {
        return handleHealth(env);
      }
      
      if (path === "/api/sheets" && method === "GET") {
        return handleGet(request, env);
      }
      
      if (path === "/api/sheets/list" && method === "GET") {
        return handleListSheets(request, env);
      }
      
      if (path === "/api/sheets/append" && method === "POST") {
        return handleAppend(request, env);
      }
      
      if (path === "/api/sheets/update" && method === "PUT") {
        return handleUpdate(request, env);
      }
      
      if (path === "/api/sheets/find" && method === "POST") {
        return handleFind(request, env);
      }
      
      if (path === "/api/sheets/delete" && method === "DELETE") {
        return handleDelete(request, env);
      }

      // Endpoint not found
      return jsonResponse({
        error: "Endpoint not found",
        path,
        method,
        availableEndpoints: [
          "GET /health",
          "GET /api/sheets?sheetName=YourSheet",
          "GET /api/sheets/list",
          "POST /api/sheets/append",
          "PUT /api/sheets/update",
          "POST /api/sheets/find",
          "DELETE /api/sheets/delete"
        ],
      }, 404);

    } catch (error) {
      console.error("Unhandled error in router:", error);
      return errorResponse(
        "Internal server error",
        500,
        { message: error.message }
      );
    }
  },
};
