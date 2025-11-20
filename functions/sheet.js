const { GoogleAuth } = require('google-auth-library');
const { google } = require('googleapis');

async function getAuth() {
    try {
        // Get service account from environment variables
        const serviceAccount = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT);
        
        const auth = new GoogleAuth({
            credentials: serviceAccount,
            scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });
        
        return auth;
    } catch (error) {
        console.error('Auth error:', error);
        throw new Error('Failed to authenticate with Google Sheets');
    }
}

async function getSheetsClient() {
    const auth = await getAuth();
    return google.sheets({ version: 'v4', auth });
}

export async function onRequest(context) {
    const { request } = context;
    
    // CORS headers
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json'
    };

    // Handle OPTIONS request for CORS
    if (request.method === 'OPTIONS') {
        return new Response(null, { headers });
    }

    try {
        const url = new URL(request.url);
        const action = url.searchParams.get('action');
        const sheetName = url.searchParams.get('sheetName');
        
        const sheets = await getSheetsClient();
        const SPREADSHEET_ID = process.env.SPREADSHEET_ID;

        if (request.method === 'GET') {
            switch (action) {
                case 'read':
                    const range = url.searchParams.get('range') || '';
                    const result = await sheets.spreadsheets.values.get({
                        spreadsheetId: SPREADSHEET_ID,
                        range: `${sheetName}${range ? '!' + range : ''}`,
                    });
                    
                    return new Response(JSON.stringify({
                        success: true,
                        data: result.data.values || []
                    }), { headers });

                case 'checkExisting':
                    const nama = url.searchParams.get('nama');
                    const shift = url.searchParams.get('shift');
                    const tanggal = url.searchParams.get('tanggal');
                    const plu = url.searchParams.get('plu');
                    
                    // Read all data from SO_RAWAN_SHEET to check for existing entries
                    const existingData = await sheets.spreadsheets.values.get({
                        spreadsheetId: SPREADSHEET_ID,
                        range: process.env.SO_RAWAN_SHEET,
                    });
                    
                    const existingRows = existingData.data.values || [];
                    let existingRowIndex = -1;
                    
                    if (existingRows.length > 1) {
                        const headers = existingRows[0];
                        const idColumn = headers.indexOf('ID');
                        const namaColumn = headers.indexOf('Nama Kasir');
                        const shiftColumn = headers.indexOf('Shift');
                        const tanggalColumn = headers.indexOf('Tanggal Rekap');
                        const pluColumn = headers.indexOf('PLU');
                        
                        // Generate search ID (same as frontend)
                        const searchId = generateUniqueId(nama, shift, tanggal, plu);
                        
                        for (let i = 1; i < existingRows.length; i++) {
                            if (existingRows[i][idColumn] === searchId) {
                                existingRowIndex = i;
                                break;
                            }
                        }
                    }
                    
                    return new Response(JSON.stringify({
                        exists: existingRowIndex !== -1,
                        rowIndex: existingRowIndex
                    }), { headers });

                default:
                    return new Response(JSON.stringify({
                        error: 'Unknown action'
                    }), { status: 400, headers });
            }
        }

        if (request.method === 'POST') {
            const body = await request.json();
            
            switch (action) {
                case 'append':
                    const appendResult = await sheets.spreadsheets.values.append({
                        spreadsheetId: SPREADSHEET_ID,
                        range: `${sheetName}!A:Z`,
                        valueInputOption: 'RAW',
                        insertDataOption: 'INSERT_ROWS',
                        requestBody: {
                            values: [body.data]
                        }
                    });
                    
                    return new Response(JSON.stringify({
                        success: true,
                        data: appendResult.data
                    }), { headers });

                case 'update':
                    const updateResult = await sheets.spreadsheets.values.update({
                        spreadsheetId: SPREADSHEET_ID,
                        range: body.range,
                        valueInputOption: 'RAW',
                        requestBody: {
                            values: [body.data]
                        }
                    });
                    
                    return new Response(JSON.stringify({
                        success: true,
                        data: updateResult.data
                    }), { headers });

                default:
                    return new Response(JSON.stringify({
                        error: 'Unknown action'
                    }), { status: 400, headers });
            }
        }

        return new Response(JSON.stringify({
            error: 'Method not allowed'
        }), { status: 405, headers });

    } catch (error) {
        console.error('Sheets API error:', error);
        return new Response(JSON.stringify({
            error: error.message
        }), { status: 500, headers });
    }
}

// Helper function to generate unique ID (same as frontend)
function generateUniqueId(...args) {
    const text = args.join('-');
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
        const char = text.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
}
