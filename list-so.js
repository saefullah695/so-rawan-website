import { initializeSheets } from '../../utils/sheets.js';

export async function onRequestGet(context) {
    const { env } = context;
    
    try {
        const sheets = await initializeSheets(env);
        
        // Get data from List_so worksheet
        const response = await sheets.api.spreadsheets.values.get({
            spreadsheetId: sheets.spreadsheetId,
            range: 'List_so!A:B', // PLU di kolom A, Nama Barang di kolom B
        });

        const rows = response.data.values || [];
        
        // Skip header row and map to objects
        const items = rows.slice(1)
            .map(row => ({
                plu: (row[0]?.toString().trim() || ''),
                namaBarang: (row[1]?.toString().trim() || '')
            }))
            .filter(item => item.plu && item.namaBarang) // Filter out empty rows
            .sort((a, b) => a.namaBarang.localeCompare(b.namaBarang)); // Sort by name

        return new Response(JSON.stringify({
            success: true,
            data: items,
            count: items.length,
            timestamp: new Date().toISOString()
        }), {
            headers: getCorsHeaders()
        });

    } catch (error) {
        console.error('Error fetching List_so data:', error);
        
        return new Response(JSON.stringify({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        }), {
            status: 500,
            headers: getCorsHeaders()
        });
    }
}

export async function onRequestOptions(context) {
    return new Response(null, {
        headers: getCorsHeaders()
    });
}

function getCorsHeaders() {
    return {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
    };
}
