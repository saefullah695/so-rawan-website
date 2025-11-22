// worker/worker.js
import { GoogleSpreadsheet } from 'google-spreadsheet';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

async function handleOptions(request) {
    return new Response(null, {
        headers: corsHeaders,
    });
}

function logError(context, error) {
    console.error(`${context}:`, {
        message: error.message,
        stack: error.stack,
        code: error.code,
    });
}

async function handleGet(request, env) {
    const url = new URL(request.url);
    const sheetName = url.searchParams.get('sheetName');
    const range = url.searchParams.get('range') || '';

    console.log('Fetching sheet data:', { sheetName, range, url: request.url });

    if (!sheetName) {
        return new Response(JSON.stringify({ error: 'sheetName is required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    try {
        // Validasi environment variables
        if (!env.SPREADSHEET_ID) {
            throw new Error('SPREADSHEET_ID is missing');
        }
        if (!env.SERVICE_ACCOUNT_EMAIL) {
            throw new Error('SERVICE_ACCOUNT_EMAIL is missing');
        }
        if (!env.PRIVATE_KEY) {
            throw new Error('PRIVATE_KEY is missing');
        }

        console.log('Environment variables check passed');
        
        const doc = new GoogleSpreadsheet(env.SPREADSHEET_ID);
        
        // Format private key dengan benar
        const privateKey = env.PRIVATE_KEY.replace(/\\n/g, '\n');
        
        console.log('Authenticating with service account...');
        
        await doc.useServiceAccountAuth({
            client_email: env.SERVICE_ACCOUNT_EMAIL,
            private_key: privateKey,
        });

        console.log('Loading document info...');
        await doc.loadInfo();
        
        console.log('Available sheets:', Object.keys(doc.sheetsByTitle));
        
        const sheet = doc.sheetsByTitle[sheetName];
        if (!sheet) {
            const availableSheets = Object.keys(doc.sheetsByTitle);
            console.error(`Sheet "${sheetName}" not found. Available:`, availableSheets);
            return new Response(JSON.stringify({ 
                error: `Sheet "${sheetName}" not found`,
                availableSheets: availableSheets
            }), {
                status: 404,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        console.log(`Loading rows from sheet: ${sheetName}`);
        await sheet.loadHeaderRow();
        const rows = await sheet.getRows();
        
        console.log(`Found ${rows.length} rows`);

        // Format data dengan header
        const headerRow = sheet.headerValues;
        const values = rows.map(row => {
            const rowData = [];
            headerRow.forEach(header => {
                rowData.push(row[header] || '');
            });
            return rowData;
        });

        // Tambahkan header sebagai row pertama
        values.unshift(headerRow);

        return new Response(JSON.stringify({ 
            success: true,
            values,
            sheetInfo: {
                title: sheet.title,
                rowCount: rows.length,
                headerCount: headerRow.length
            }
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    } catch (error) {
        logError('Error fetching sheet data', error);
        return new Response(JSON.stringify({ 
            error: 'Failed to fetch sheet data',
            details: error.message,
            sheetName: sheetName
        }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
}

async function handleAppend(request, env) {
    try {
        const { sheetName, values } = await request.json();

        console.log('Appending data:', { sheetName, values });

        if (!sheetName || !values) {
            return new Response(JSON.stringify({ error: 'sheetName and values are required' }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        const doc = new GoogleSpreadsheet(env.SPREADSHEET_ID);
        const privateKey = env.PRIVATE_KEY.replace(/\\n/g, '\n');
        
        await doc.useServiceAccountAuth({
            client_email: env.SERVICE_ACCOUNT_EMAIL,
            private_key: privateKey,
        });

        await doc.loadInfo();
        
        const sheet = doc.sheetsByTitle[sheetName];
        if (!sheet) {
            return new Response(JSON.stringify({ error: `Sheet ${sheetName} not found` }), {
                status: 404,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        // Buat object dari values
        const rowObject = {};
        const headers = await sheet.headerValues;
        headers.forEach((header, index) => {
            if (values[index] !== undefined) {
                rowObject[header] = values[index];
            }
        });

        await sheet.addRow(rowObject);

        return new Response(JSON.stringify({ success: true }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    } catch (error) {
        logError('Error appending to sheet', error);
        return new Response(JSON.stringify({ 
            error: 'Failed to append data',
            details: error.message
        }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
}

// Simple health check endpoint
async function handleHealthCheck() {
    return new Response(JSON.stringify({ 
        status: 'ok',
        message: 'SO Rawan Worker is running',
        timestamp: new Date().toISOString()
    }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
}

export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);
        const pathname = url.pathname;

        console.log(`Incoming request: ${request.method} ${pathname}`);

        // Handle CORS preflight
        if (request.method === 'OPTIONS') {
            return handleOptions(request);
        }

        // Route requests
        if (pathname === '/api/sheets' && request.method === 'GET') {
            return await handleGet(request, env);
        } else if (pathname === '/api/sheets/append' && request.method === 'POST') {
            return await handleAppend(request, env);
        } else if (pathname === '/health' && request.method === 'GET') {
            return await handleHealthCheck();
        } else {
            console.log(`Endpoint not found: ${pathname}`);
            return new Response(JSON.stringify({ 
                error: 'Endpoint not found',
                requestedPath: pathname,
                availableEndpoints: [
                    'GET /api/sheets?sheetName=...',
                    'POST /api/sheets/append',
                    'GET /health'
                ]
            }), {
                status: 404,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }
    },
};
