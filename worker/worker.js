// worker/worker.js
const { GoogleSpreadsheet } = require('google-spreadsheet');

// CORS headers
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
};

async function handleOptions(request) {
    return new Response(null, {
        headers: corsHeaders,
    });
}

async function handleGet(request, env) {
    const url = new URL(request.url);
    const sheetName = url.searchParams.get('sheetName');
    const range = url.searchParams.get('range');

    if (!sheetName) {
        return new Response(JSON.stringify({ error: 'sheetName is required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    try {
        const doc = new GoogleSpreadsheet(env.SPREADSHEET_ID);
        
        await doc.useServiceAccountAuth({
            client_email: env.SERVICE_ACCOUNT_EMAIL,
            private_key: env.PRIVATE_KEY.replace(/\\n/g, '\n'),
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
        const values = rows.map(row => row._rawData);

        // Add header row
        const headerRow = sheet.headerValues || [];
        values.unshift(headerRow);

        return new Response(JSON.stringify({ values }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    } catch (error) {
        console.error('Error fetching sheet data:', error);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
}

async function handleAppend(request, env) {
    try {
        const { sheetName, values } = await request.json();

        if (!sheetName || !values) {
            return new Response(JSON.stringify({ error: 'sheetName and values are required' }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        const doc = new GoogleSpreadsheet(env.SPREADSHEET_ID);
        
        await doc.useServiceAccountAuth({
            client_email: env.SERVICE_ACCOUNT_EMAIL,
            private_key: env.PRIVATE_KEY.replace(/\\n/g, '\n'),
        });

        await doc.loadInfo();
        
        const sheet = doc.sheetsByTitle[sheetName];
        if (!sheet) {
            return new Response(JSON.stringify({ error: `Sheet ${sheetName} not found` }), {
                status: 404,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        await sheet.addRow(values);

        return new Response(JSON.stringify({ success: true }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    } catch (error) {
        console.error('Error appending to sheet:', error);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
}

async function handleUpdate(request, env) {
    try {
        const { sheetName, range, values } = await request.json();

        if (!sheetName || !range || !values) {
            return new Response(JSON.stringify({ error: 'sheetName, range and values are required' }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        const doc = new GoogleSpreadsheet(env.SPREADSHEET_ID);
        
        await doc.useServiceAccountAuth({
            client_email: env.SERVICE_ACCOUNT_EMAIL,
            private_key: env.PRIVATE_KEY.replace(/\\n/g, '\n'),
        });

        await doc.loadInfo();
        
        const sheet = doc.sheetsByTitle[sheetName];
        if (!sheet) {
            return new Response(JSON.stringify({ error: `Sheet ${sheetName} not found` }), {
                status: 404,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        // Parse range (format: A1:B2)
        const rangeMatch = range.match(/^([A-Z]+)(\d+):([A-Z]+)(\d+)$/);
        if (!rangeMatch) {
            return new Response(JSON.stringify({ error: 'Invalid range format' }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        const startCol = rangeMatch[1];
        const startRow = parseInt(rangeMatch[2]);
        const endCol = rangeMatch[3];
        const endRow = parseInt(rangeMatch[4]);

        // Load cells for the range
        await sheet.loadCells(`${range}`);

        // Update cells
        for (let row = startRow; row <= endRow; row++) {
            for (let col = columnToIndex(startCol); col <= columnToIndex(endCol); col++) {
                const cell = sheet.getCell(row - 1, col); // Sheets are 0-indexed
                const valueIndex = (row - startRow) * (columnToIndex(endCol) - columnToIndex(startCol) + 1) + (col - columnToIndex(startCol));
                cell.value = values[valueIndex];
            }
        }

        await sheet.saveUpdatedCells();

        return new Response(JSON.stringify({ success: true }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    } catch (error) {
        console.error('Error updating sheet:', error);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
}

// Helper function to convert column letter to index (A=0, B=1, etc.)
function columnToIndex(column) {
    let index = 0;
    for (let i = 0; i < column.length; i++) {
        index = index * 26 + (column.charCodeAt(i) - 'A'.charCodeAt(0) + 1);
    }
    return index - 1;
}

export default {
    async fetch(request, env) {
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
                return new Response(JSON.stringify({ error: 'Not found' }), {
                    status: 404,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                });
            }
        } catch (error) {
            console.error('Error handling request:', error);
            return new Response(JSON.stringify({ error: 'Internal server error' }), {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }
    },
};
