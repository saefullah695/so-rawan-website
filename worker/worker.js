// worker/worker.js
import { GoogleSpreadsheet } from 'google-spreadsheet';

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

        // Untuk update, kita akan menggunakan approach yang lebih sederhana
        // dengan mencari row berdasarkan ID dan mengupdate secara manual
        const rows = await sheet.getRows();
        
        // Cari row yang sesuai (asumsi ID ada di kolom pertama)
        const targetRow = rows.find(row => row._rawData[0] === values[0]);
        
        if (targetRow) {
            // Update setiap field
            const headers = sheet.headerValues;
            for (let i = 0; i < headers.length; i++) {
                if (values[i] !== undefined) {
                    targetRow[headers[i]] = values[i];
                }
            }
            await targetRow.save();
        } else {
            return new Response(JSON.stringify({ error: 'Row not found' }), {
                status: 404,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

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

export default {
    async fetch(request, env, ctx) {
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
