import { initializeSheets } from '../utils/sheets.js';

export async function onRequestGet(context) {
    try {
        const sheets = await initializeSheets(context.env);
        
        const response = await sheets.api.spreadsheets.values.get({
            spreadsheetId: sheets.spreadsheetId,
            range: 'Absensi!A:Z',
        });

        const rows = response.data.values || [];
        
        if (rows.length <= 1) {
            return new Response(JSON.stringify({
                success: true,
                data: [],
                count: 0
            }), {
                headers: getCorsHeaders()
            });
        }
        
        const headers = rows[0].map(h => h.toString().toLowerCase().trim());
        
        // Find column indices dynamically
        const namaIndex = headers.findIndex(h => h.includes('nama'));
        const nikIndex = headers.findIndex(h => h.includes('nik'));
        const jabatanIndex = headers.findIndex(h => h.includes('jabatan'));
        
        // Map data
        const items = rows.slice(1)
            .map(row => ({
                nik: (row[nikIndex]?.toString().trim() || ''),
                nama: (row[namaIndex]?.toString().trim() || ''),
                jabatan: (row[jabatanIndex]?.toString().trim() || '')
            }))
            .filter(item => item.nama);

        return new Response(JSON.stringify({
            success: true,
            data: items,
            count: items.length
        }), {
            headers: getCorsHeaders()
        });

    } catch (error) {
        return new Response(JSON.stringify({
            success: false,
            error: error.message
        }), {
            status: 500,
            headers: getCorsHeaders()
        });
    }
}

export async function onRequestOptions() {
    return new Response(null, {
        headers: getCorsHeaders()
    });
}

function getCorsHeaders() {
    return {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
    };
}
