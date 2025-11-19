import { initializeSheets } from '../utils/sheets.js';

export async function onRequestPost(context) {
    try {
        const data = await context.request.json();
        const { nama, tanggal_rekap, shift, items } = data;

        if (!nama || !tanggal_rekap || !shift || !items || items.length === 0) {
            return new Response(JSON.stringify({
                success: false,
                error: 'Data tidak lengkap'
            }), {
                status: 400,
                headers: getCorsHeaders()
            });
        }

        const sheets = await initializeSheets(context.env);
        const timestamp = new Date().toISOString();

        const rows = items.map(item => [
            generateUniqueId(nama, shift, tanggal_rekap, item.plu),
            timestamp,
            nama,
            tanggal_rekap,
            shift,
            item.plu,
            item.namaBarang,
            item.oh.toString(),
            item.fisik.toString(),
            item.selisih.toString(),
            'Website'
        ]);

        await sheets.api.spreadsheets.values.append({
            spreadsheetId: sheets.spreadsheetId,
            range: 'SoRawan!A:K',
            valueInputOption: 'USER_ENTERED',
            requestBody: { values: rows }
        });

        return new Response(JSON.stringify({
            success: true,
            message: `Data SO Rawan berhasil disimpan (${items.length} items)`
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
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
    };
}

function generateUniqueId(...args) {
    return args.join('-') + '-' + Date.now();
}
