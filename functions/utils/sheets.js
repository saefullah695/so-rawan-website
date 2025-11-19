// Google Sheets initialization for Cloudflare Pages
export async function initializeSheets(env) {
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
