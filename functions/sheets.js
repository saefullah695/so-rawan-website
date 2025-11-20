
import { GoogleAuth } from 'google-auth-library';
import { google } from 'googleapis';

async function getSheetsClient() {
    try {
        console.log('Initializing Google Sheets client...');
        
        if (!process.env.GOOGLE_SERVICE_ACCOUNT) {
            throw new Error('GOOGLE_SERVICE_ACCOUNT environment variable is not set');
        }

        if (!process.env.SPREADSHEET_ID) {
            throw new Error('SPREADSHEET_ID environment variable is not set');
        }

        const serviceAccount = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT);
        
        const auth = new GoogleAuth({
            credentials: serviceAccount,
            scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });

        console.log('Google Sheets client initialized successfully');
        return google.sheets({ version: 'v4', auth });
    } catch (error) {
        console.error('Error initializing Sheets client:', error);
        throw new Error('Failed to authenticate with Google Sheets: ' + error.message);
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

export async function onRequest(context) {
    const { request } = context;
    
    // CORS headers
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Content-Type': 'application/json'
    };

    // Handle OPTIONS request for CORS preflight
    if (request.method === 'OPTIONS') {
        return new Response(null, { headers });
    }

    try {
        const url = new URL(request.url);
        const action = url.searchParams.get('action');
        const sheetName = url.searchParams.get('sheetName');
        
        console.log(`Processing request: ${request.method} ${action} for sheet: ${sheetName}`);

        const sheets = await getSheetsClient();
        const SPREADSHEET_ID = process.env.SPREADSHEET_ID;

        // GET requests
        if (request.method === 'GET') {
            switch (action) {
                case 'read':
                    const range = url.searchParams.get('range') || '';
                    const fullRange = `${sheetName}${range ? '!' + range : ''}`;
                    
                    console.log(`Reading range: ${fullRange}`);
                    
                    const result = await sheets.spreadsheets.values.get({
                        spreadsheetId: SPREADSHEET_ID,
                        range: fullRange,
                    });
                    
                    console.log(`Successfully read ${(result.data.values || []).length} rows`);
                    
                    return new Response(JSON.stringify({
                        success: true,
                        data: result.data.values || []
                    }), { headers });

                case 'checkExisting':
                    const nama = url.searchParams.get('nama');
                    const shift = url.searchParams.get('shift');
                    const tanggal = url.searchParams.get('tanggal');
                    const plu = url.searchParams.get('plu');
                    
                    console.log(`Checking existing data for: ${nama}, ${shift}, ${tanggal}, ${plu}`);
                    
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
                    
                    console.log(`Existing data check: ${existingRowIndex !== -1 ? 'Found' : 'Not found'}`);
                    
                    return new Response(JSON.stringify({
                        exists: existingRowIndex !== -1,
                        rowIndex: existingRowIndex + 1 // Convert to 1-based index for Sheets
                    }), { headers });

                default:
                    return new Response(JSON.stringify({
                        error: 'Unknown action for GET request'
                    }), { status: 400, headers });
            }
        }

        // POST requests
        if (request.method === 'POST') {
            const body = await request.json();
            
            switch (action) {
                case 'append':
                    console.log(`Appending data to sheet: ${sheetName}`, body.data);
                    
                    const appendResult = await sheets.spreadsheets.values.append({
                        spreadsheetId: SPREADSHEET_ID,
                        range: `${sheetName}!A:Z`,
                        valueInputOption: 'RAW',
                        insertDataOption: 'INSERT_ROWS',
                        requestBody: {
                            values: [body.data]
                        }
                    });
                    
                    console.log('Successfully appended data');
                    
                    return new Response(JSON.stringify({
                        success: true,
                        data: appendResult.data
                    }), { headers });

                case 'update':
                    const range = body.range;
                    console.log(`Updating range: ${range}`, body.data);
                    
                    const updateResult = await sheets.spreadsheets.values.update({
                        spreadsheetId: SPREADSHEET_ID,
                        range: range,
                        valueInputOption: 'RAW',
                        requestBody: {
                            values: [body.data]
                        }
                    });
                    
                    console.log('Successfully updated data');
                    
                    return new Response(JSON.stringify({
                        success: true,
                        data: updateResult.data
                    }), { headers });

                default:
                    return new Response(JSON.stringify({
                        error: 'Unknown action for POST request'
                    }), { status: 400, headers });
            }
        }

        return new Response(JSON.stringify({
            error: 'Method not allowed'
        }), { status: 405, headers });

    } catch (error) {
        console.error('Sheets API error:', error);
        return new Response(JSON.stringify({
            error: error.message,
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        }), { 
            status: 500, 
            headers 
        });
    }
}
