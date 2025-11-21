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

// Helper untuk debug
function logError(context, error) {
    console.error(`${context}:`, {
        message: error.message,
        stack: error.stack,
        code: error.code,
        response: error.response
    });
}

async function handleGet(request, env) {
    const url = new URL(request.url);
    const sheetName = url.searchParams.get('sheetName');
    const range = url.searchParams.get('range') || '';

    console.log('Fetching sheet data:', { sheetName, range });

    if (!sheetName) {
        return new Response(JSON.stringify({ error: 'sheetName is required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    try {
        // Validasi environment variables
        if (!env.SPREADSHEET_ID || !env.SERVICE_ACCOUNT_EMAIL || !env.PRIVATE_KEY) {
            throw new Error('Missing required environment variables');
        }

        console.log('Initializing Google Spreadsheet with ID:', env.SPREADSHEET_ID);
        
        const doc = new GoogleSpreadsheet(env.SPREADSHEET_ID);
        
        // Format private key dengan benar
        const privateKey = env.PRIVATE_KEY.replace(/\\n/g, '\n');
        
        console.log('Authenticating with service account:', env.SERVICE_ACCOUNT_EMAIL);
        
        await doc.useServiceAccountAuth({
            client_email: env.SERVICE_ACCOUNT_EMAIL,
            private_key: privateKey,
        });

        console.log('Loading document info...');
        await doc.loadInfo();
        
        console.log('Available sheets:', doc.sheetsByTitle);
        
        const sheet = doc.sheetsByTitle[sheetName];
        if (!sheet) {
            console.error(`Sheet "${sheetName}" not found. Available sheets:`, Object.keys(doc.sheetsByTitle));
            return new Response(JSON.stringify({ 
                error: `Sheet "${sheetName}" not found`,
                availableSheets: Object.keys(doc.sheetsByTitle)
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
            stack: env.NODE_ENV === 'development' ? error.stack : undefined
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

        // Pastikan header sudah diload
        await sheet.loadHeaderRow();
        
        // Buat object dari values berdasarkan header
        const headers = sheet.headerValues;
        const rowData = {};
        headers.forEach((header, index) => {
            rowData[header] = values[index] || '';
        });

        await sheet.addRow(rowData);

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

async function handleUpdate(request, env) {
    try {
        const { sheetName, rowIndex, values } = await request.json();

        console.log('Updating data:', { sheetName, rowIndex, values });

        if (!sheetName || rowIndex === undefined || !values) {
            return new Response(JSON.stringify({ error: 'sheetName, rowIndex and values are required' }), {
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

        const rows = await sheet.getRows();
        
        if (rowIndex < 0 || rowIndex >= rows.length) {
            return new Response(JSON.stringify({ error: 'Row index out of bounds' }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        const targetRow = rows[rowIndex];
        const headers = sheet.headerValues;
        
        // Update each field
        headers.forEach((header, index) => {
            if (values[index] !== undefined) {
                targetRow[header] = values[index];
            }
        });
        
        await targetRow.save();

        return new Response(JSON.stringify({ success: true }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    } catch (error) {
        logError('Error updating sheet', error);
        return new Response(JSON.stringify({ 
            error: 'Failed to update data',
            details: error.message
        }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
}

export default {
    async fetch(request, env, ctx) {
        // Handle CORS preflight
        if (request.method === 'OPTIONS') {
            return handleOptions(request);
        }

        const url = new URL(request.url);
        const path = url.pathname;

        try {
            if (path === '/api/sheets' && request.method === 'GET') {
                return await handleGet(request, env);
            } else if (path === '/api/sheets/append' && request.method === 'POST') {
                return await handleAppend(request, env);
            } else if (path === '/api/sheets/update' && request.method === 'PUT') {
                return await handleUpdate(request, env);
            } else {
                return new Response(JSON.stringify({ error: 'Endpoint not found' }), {
                    status: 404,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                });
            }
        } catch (error) {
            logError('Error handling request', error);
            return new Response(JSON.stringify({ 
                error: 'Internal server error',
                details: error.message
            }), {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }
    },
};
