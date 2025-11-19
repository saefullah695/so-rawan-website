import { initializeSheets } from '../utils/sheets.js';

export async function onRequestGet(context) {
    try {
        const sheets = await initializeSheets(context.env);
        
        const response = await sheets.api.spreadsheets.values.get({
            spreadsheetId: sheets.spreadsheetId,
            range: 'List_so!A:B',
        });

        const rows = response.data.values || [];
        const items = rows.slice(1)
            .map(row => ({
                plu: (row[0]?.toString().trim() || ''),
                namaBarang: (row[1]?.toString().trim() || '')
            }))
            .filter(item => item.plu && item.namaBarang);

        return new Response(JSON.stringify({
            success: true,
            data: items,
            count: items.length
        }), {
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type'
            }
        });

    } catch (error) {
        return new Response(JSON.stringify({
            success: false,
            error: error.message
        }), {
            status: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            }
        });
    }
}

// Handle OPTIONS for CORS
export async function onRequestOptions() {
    return new Response(null, {
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type'
        }
    });
}
