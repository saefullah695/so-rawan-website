// Simple Google Sheets utility
async function initializeSheets(env) {
    try {
        if (!env.GS_CLIENT_EMAIL || !env.GS_PRIVATE_KEY || !env.SPREADSHEET_ID) {
            throw new Error('Missing required environment variables');
        }

        // Dynamic import for Google APIs
        const { GoogleAuth } = await import('google-auth-library');
        const { google } = await import('googleapis');

        const auth = new GoogleAuth({
            credentials: {
                client_email: env.GS_CLIENT_EMAIL,
                private_key: env.GS_PRIVATE_KEY.replace(/\\n/g, '\n'),
            },
            scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });

        const sheets = google.sheets({ version: 'v4', auth });
        
        return { 
            api: sheets, 
            spreadsheetId: env.SPREADSHEET_ID
        };

    } catch (error) {
        console.error('Sheets initialization error:', error);
        throw error;
    }
}

// CORS headers
function getCorsHeaders() {
    return {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
    };
}

// Main API handler
export async function onRequest(context) {
    const { request, env, params } = context;
    const path = params.path || '';
    
    // Set CORS headers
    const corsHeaders = getCorsHeaders();

    // Handle preflight OPTIONS request
    if (request.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        // Route based on path
        switch (path) {
            case 'list-so':
                if (request.method === 'GET') {
                    return await handleListSo(env, corsHeaders);
                }
                break;
            case 'absensi':
                if (request.method === 'GET') {
                    return await handleAbsensi(env, corsHeaders);
                }
                break;
            case 'so-rawan':
                if (request.method === 'POST') {
                    return await handleSoRawan(request, env, corsHeaders);
                }
                break;
            default:
                return new Response(JSON.stringify({ 
                    success: false, 
                    error: 'Endpoint not found' 
                }), { 
                    status: 404, 
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
                });
        }

        return new Response(JSON.stringify({ 
            success: false, 
            error: 'Method not allowed' 
        }), { 
            status: 405, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });

    } catch (error) {
        console.error('API Error:', error);
        return new Response(JSON.stringify({ 
            success: false, 
            error: error.message 
        }), { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
    }
}

async function handleListSo(env, corsHeaders) {
    try {
        const sheets = await initializeSheets(env);
        
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
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    } catch (error) {
        return new Response(JSON.stringify({
            success: false,
            error: 'Gagal memuat data barang: ' + error.message
        }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
}

async function handleAbsensi(env, corsHeaders) {
    try {
        const sheets = await initializeSheets(env);
        
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
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
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
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    } catch (error) {
        return new Response(JSON.stringify({
            success: false,
            error: 'Gagal memuat data absensi: ' + error.message
        }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
}

async function handleSoRawan(request, env, corsHeaders) {
    try {
        const data = await request.json();
        const { nama, tanggal_rekap, shift, items } = data;

        if (!nama || !tanggal_rekap || !shift || !items || items.length === 0) {
            return new Response(JSON.stringify({
                success: false,
                error: 'Data tidak lengkap: nama, tanggal, shift, dan items wajib diisi'
            }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        const sheets = await initializeSheets(env);
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
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    } catch (error) {
        return new Response(JSON.stringify({
            success: false,
            error: 'Gagal menyimpan data: ' + error.message
        }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
}

function generateUniqueId(...args) {
    return args.join('-') + '-' + Date.now();
}
