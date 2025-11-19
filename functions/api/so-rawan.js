import { initializeSheets } from '../../utils/sheets.js';

export async function onRequestPost(context) {
    const { request, env } = context;
    
    try {
        const data = await request.json();
        const { nama, tanggal_rekap, shift, items } = data;

        // Validation
        if (!nama || !tanggal_rekap || !shift || !items || items.length === 0) {
            return new Response(JSON.stringify({
                success: false,
                error: 'Data tidak lengkap: nama, tanggal, shift, dan items wajib diisi'
            }), {
                status: 400,
                headers: getCorsHeaders()
            });
        }

        const sheets = await initializeSheets(env);

        // Prepare data for Google Sheets
        const timestamp = new Date().toISOString();
        const rows = items.map(item => [
            generateUniqueId(nama, shift, tanggal_rekap, item.plu), // ID
            timestamp,                                              // Timestamp
            nama,                                                   // Nama Kasir
            tanggal_rekap,                                          // Tanggal Rekap
            shift,                                                  // Shift
            item.plu,                                               // PLU
            item.namaBarang,                                        // Nama Barang
            item.oh.toString(),                                     // OH
            item.fisik.toString(),                                  // Fisik
            item.selisih.toString(),                                // Selisih
            'Website',                                              // Pengirim
            timestamp.split('T')[0]                                 // Date for sorting
        ]);

        // Append to SoRawan worksheet
        const appendResponse = await sheets.api.spreadsheets.values.append({
            spreadsheetId: sheets.spreadsheetId,
            range: 'SoRawan!A:L',
            valueInputOption: 'USER_ENTERED',
            insertDataOption: 'INSERT_ROWS',
            requestBody: { values: rows }
        });

        return new Response(JSON.stringify({
            success: true,
            message: `Data SO Rawan berhasil disimpan (${items.length} items)`,
            details: {
                kasir: nama,
                tanggal: tanggal_rekap,
                shift: shift,
                totalItems: items.length,
                updatedCells: appendResponse.data.updates?.updatedCells || 0,
                timestamp: timestamp
            }
        }), {
            headers: getCorsHeaders()
        });

    } catch (error) {
        console.error('Error saving SO Rawan data:', error);
        
        return new Response(JSON.stringify({
            success: false,
            error: 'Gagal menyimpan data: ' + error.message,
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

function generateUniqueId(...args) {
    return args.join('-') + '-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
}
