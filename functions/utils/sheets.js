import { GoogleAuth } from 'google-auth-library';
import { google } from 'googleapis';

export async function initializeSheets(env) {
    try {
        if (!env.GS_CLIENT_EMAIL || !env.GS_PRIVATE_KEY || !env.SPREADSHEET_ID) {
            throw new Error('Missing required environment variables: GS_CLIENT_EMAIL, GS_PRIVATE_KEY, SPREADSHEET_ID');
        }

        const auth = new GoogleAuth({
            credentials: {
                client_email: env.GS_CLIENT_EMAIL,
                private_key: env.GS_PRIVATE_KEY.replace(/\\n/g, '\n'),
            },
            scopes: [
                'https://www.googleapis.com/auth/spreadsheets',
                'https://www.googleapis.com/auth/drive.file'
            ],
        });

        const sheets = google.sheets({ version: 'v4', auth });
        const spreadsheetId = env.SPREADSHEET_ID;

        // Verify we can access the spreadsheet
        try {
            await sheets.spreadsheets.get({
                spreadsheetId: spreadsheetId
            });
        } catch (error) {
            throw new Error(`Cannot access spreadsheet: ${error.message}`);
        }

        return { 
            api: sheets, 
            spreadsheetId,
            auth 
        };

    } catch (error) {
        console.error('Error initializing Google Sheets:', error);
        throw error;
    }
}
