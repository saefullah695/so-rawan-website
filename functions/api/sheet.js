export async function onRequest(context) {
    const { request, env } = context;
    const url = new URL(request.url);

    // Parameter dari URL
    const sheet = url.searchParams.get("sheet");
    const mode = url.searchParams.get("mode") || "get"; 
    const range = url.searchParams.get("range") || "A:Z";

    if (!sheet) {
        return new Response(JSON.stringify({ error: "Missing sheet parameter" }), {
            status: 400
        });
    }

    // Ambil environment variable
    const sa = JSON.parse(env.YOUR_API_KEY); // service account JSON
    const sheetId = env.YOUR_SPREADSHEET_ID;

    // Generate Google OAuth token
    const token = await generateGoogleToken(sa);

    // Base URL Google Sheets API
    const baseUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values`;

    // ===========================
    // MODE: GET DATA
    // ===========================
    if (mode === "get") {
        const res = await fetch(`${baseUrl}/${sheet}!${range}`, {
            headers: { Authorization: `Bearer ${token}` }
        });

        return new Response(await res.text(), {
            headers: { "Content-Type": "application/json" }
        });
    }

    // ===========================
    // MODE: APPEND DATA
    // ===========================
    if (mode === "append") {
        const body = await request.json();
        const values = body.values || [];

        const res = await fetch(`${baseUrl}/${sheet}!A:Z:append?valueInputOption=RAW`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ values })
        });

        return new Response(await res.text(), {
            headers: { "Content-Type": "application/json" }
        });
    }

    // ===========================
    // MODE: UPDATE (UPSERT)
    // ===========================
    if (mode === "update") {
        const body = await request.json();
        const rangeUpdate = body.range;
        const values = body.values;

        const res = await fetch(`${baseUrl}/${sheet}!${rangeUpdate}?valueInputOption=RAW`, {
            method: "PUT",
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ values })
        });

        return new Response(await res.text(), {
            headers: { "Content-Type": "application/json" }
        });
    }

    return new Response(JSON.stringify({ error: "Invalid mode" }), { status: 400 });
}


// ================================
// GENERATOR GOOGLE TOKEN
// ================================
async function generateGoogleToken(serviceAccount) {
    const header = { alg: "RS256", typ: "JWT" };
    const now = Math.floor(Date.now() / 1000);

    const claim = {
        iss: serviceAccount.client_email,
        scope: "https://www.googleapis.com/auth/spreadsheets",
        aud: "https://oauth2.googleapis.com/token",
        exp: now + 3600,
        iat: now
    };

    const base64Header = btoa(JSON.stringify(header));
    const base64Claim = btoa(JSON.stringify(claim));

    const toSign = `${base64Header}.${base64Claim}`;

    const key = await crypto.subtle.importKey(
        "pkcs8",
        str2ab(serviceAccount.private_key),
        { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
        false,
        ["sign"]
    );

    const signature = await crypto.subtle.sign(
        "RSASSA-PKCS1-v1_5",
        key,
        new TextEncoder().encode(toSign)
    );

    const jwt = `${toSign}.${arrayBufferToBase64(signature)}`;

    const response = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        body: new URLSearchParams({
            grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
            assertion: jwt
        })
    });

    const result = await response.json();
    return result.access_token;
}


// ==========================
// HELPER FUNCTIONS
// ==========================
function str2ab(str) {
    const cleaned = str
        .replace(/-----BEGIN PRIVATE KEY-----/g, "")
        .replace(/-----END PRIVATE KEY-----/g, "")
        .replace(/\n/g, "");

    const binary = atob(cleaned);
    const len = binary.length;

    const buffer = new ArrayBuffer(len);
    const view = new Uint8Array(buffer);

    for (let i = 0; i < len; i++) {
        view[i] = binary.charCodeAt(i);
    }
    return buffer;
}

function arrayBufferToBase64(buffer) {
    let binary = "";
    const bytes = new Uint8Array(buffer);

    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }

    return btoa(binary);
}
