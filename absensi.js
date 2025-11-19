import { initializeSheets } from '../../utils/sheets.js';

export async function onRequestGet(context) {
    const { env } = context;
    
    try {
        const sheets = await initializeSheets(env);
        
        // Get data from Absensi worksheet
        const response = await sheets.api.spreadsheets.values.get({
            spreadsheetId: sheets.spreadsheetId,
            range: 'Absensi!A:F', // Adjust range based on your actual columns
        });

        const rows = response.data.values || [];
        
        if (rows.length <= 1) {
            return new Response(JSON.stringify({
                success: true,
                data: [],
                count: 0,
                message: 'No data found in Absensi sheet'
            }), {
                headers: getCorsHeaders()
            });
        }
        
        const headers = rows[0].map(h => h.toString().toLowerCase().trim());
        
        // Find column indices
        const nikIndex = headers.findIndex(h => h.includes('nik'));
        const namaIndex = headers.findIndex(h => h.includes('nama'));
        const jabatanIndex = headers.findIndex(h => h.includes('jabatan'));
        const tanggalIndex = headers.findIndex(h => h.includes('tanggal'));
        const shiftIndex = headers.findIndex(h => h.includes('shift'));
        const hpIndex = headers.findIndex(h => h.includes('handphone') || h.includes('hp'));
        
        // Map rows to objects
        const items = rows.slice(1)
            .map(row => ({
                nik: (row[nikIndex]?.toString().trim() || ''),
                nama: (row[namaIndex]?.toString().trim() || ''),
                jabatan: (row[jabatanIndex]?.toString().trim() || ''),
                tanggal: (row[tanggalIndex]?.toString().trim() || ''),
                shift: (row[shiftIndex]?.toString().trim() || ''),
                noHandphone: (row[hpIndex]?.toString().trim() || '')
            }))
            .filter(item => item.nama && item.nik); // Filter out empty rows

        return new Response(JSON.stringify({
            success: true,
            data: items,
            count: items.length,
            timestamp: new Date().toISOString()
        }), {
            headers: getCorsHeaders()
        });

    } catch (error) {
        console.error('Error fetching Absensi data:', error);
        
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
