// worker/worker.js
import { GoogleSpreadsheet } from 'google-spreadsheet';

// Configuration
const CONFIG = {
    MAX_ROWS: 1000,
    CACHE_TTL: 300000, // 5 minutes
    ALLOWED_ORIGINS: ['https://yourdomain.com', 'http://localhost:3000']
};

// CORS headers dengan origin validation
function getCorsHeaders(request) {
    const origin = request.headers.get('Origin');
    const allowedOrigins = CONFIG.ALLOWED_ORIGINS;
    
    return {
        'Access-Control-Allow-Origin': allowedOrigins.includes(origin) ? origin : allowedOrigins[0],
        'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Max-Age': '86400',
    };
}

async function handleOptions(request) {
    return new Response(null, {
        headers: getCorsHeaders(request),
    });
}

// Cache untuk spreadsheet document
class SpreadsheetCache {
    constructor() {
        this.cache = new Map();
    }

    get(key) {
        const item = this.cache.get(key);
        if (!item) return null;
        
        if (Date.now() > item.expiry) {
            this.cache.delete(key);
            return null;
        }
        
        return item.data;
    }

    set(key, data, ttl = CONFIG.CACHE_TTL) {
        this.cache.set(key, {
            data,
            expiry: Date.now() + ttl
        });
    }

    clear() {
        this.cache.clear();
    }
}

const docCache = new SpreadsheetCache();

// Helper functions
function validateSheetName(sheetName) {
    if (!sheetName || typeof sheetName !== 'string') {
        return false;
    }
    return /^[a-zA-Z0-9_\-\s]+$/.test(sheetName);
}

function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function sanitizeInput(input) {
    if (typeof input !== 'string') return '';
    return input.trim().slice(0, 100); // Limit input length
}

async function getAuthenticatedDoc(env) {
    const cacheKey = `doc_${env.SPREADSHEET_ID}`;
    let doc = docCache.get(cacheKey);

    if (!doc) {
        doc = new GoogleSpreadsheet(env.SPREADSHEET_ID);
        
        // Validasi environment variables
        if (!env.SERVICE_ACCOUNT_EMAIL || !validateEmail(env.SERVICE_ACCOUNT_EMAIL)) {
            throw new Error('Invalid service account email configuration');
        }

        if (!env.PRIVATE_KEY) {
            throw new Error('Private key not configured');
        }

        await doc.useServiceAccountAuth({
            client_email: env.SERVICE_ACCOUNT_EMAIL,
            private_key: env.PRIVATE_KEY.replace(/\\n/g, '\n'),
        });

        await doc.loadInfo();
        docCache.set(cacheKey, doc);
    }

    return doc;
}

async function handleGet(request, env) {
    const url = new URL(request.url);
    const sheetName = sanitizeInput(url.searchParams.get('sheetName'));
    const limit = Math.min(parseInt(url.searchParams.get('limit')) || 100, CONFIG.MAX_ROWS);
    const offset = Math.max(parseInt(url.searchParams.get('offset')) || 0, 0);

    if (!sheetName || !validateSheetName(sheetName)) {
        return new Response(JSON.stringify({ error: 'Valid sheetName is required' }), {
            status: 400,
            headers: { ...getCorsHeaders(request), 'Content-Type': 'application/json' },
        });
    }

    try {
        const doc = await getAuthenticatedDoc(env);
        const sheet = doc.sheetsByTitle[sheetName];
        
        if (!sheet) {
            return new Response(JSON.stringify({ error: `Sheet "${sheetName}" not found` }), {
                status: 404,
                headers: { ...getCorsHeaders(request), 'Content-Type': 'application/json' },
            });
        }

        // Get total row count first
        await sheet.loadHeaderRow();
        const totalRows = sheet.rowCount;

        // Load rows with pagination
        const rows = await sheet.getRows({
            limit: limit,
            offset: offset
        });

        const values = rows.map(row => row._rawData);
        const headerRow = sheet.headerValues || [];

        const response = {
            values: [headerRow, ...values],
            pagination: {
                total: totalRows,
                limit: limit,
                offset: offset,
                hasMore: (offset + limit) < totalRows
            }
        };

        return new Response(JSON.stringify(response), {
            headers: { ...getCorsHeaders(request), 'Content-Type': 'application/json' },
        });
    } catch (error) {
        console.error('Error fetching sheet data:', error);
        return new Response(JSON.stringify({ error: 'Failed to fetch sheet data' }), {
            status: 500,
            headers: { ...getCorsHeaders(request), 'Content-Type': 'application/json' },
        });
    }
}

async function handleAppend(request, env) {
    let requestBody;
    
    try {
        requestBody = await request.json();
    } catch (error) {
        return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
            status: 400,
            headers: { ...getCorsHeaders(request), 'Content-Type': 'application/json' },
        });
    }

    const { sheetName, values } = requestBody;

    if (!sheetName || !validateSheetName(sheetName)) {
        return new Response(JSON.stringify({ error: 'Valid sheetName is required' }), {
            status: 400,
            headers: { ...getCorsHeaders(request), 'Content-Type': 'application/json' },
        });
    }

    if (!Array.isArray(values) || values.length === 0) {
        return new Response(JSON.stringify({ error: 'Values must be a non-empty array' }), {
            status: 400,
            headers: { ...getCorsHeaders(request), 'Content-Type': 'application/json' },
        });
    }

    // Validate values array
    if (values.some(value => typeof value === 'object' && value !== null)) {
        return new Response(JSON.stringify({ error: 'Values must be primitive types only' }), {
            status: 400,
            headers: { ...getCorsHeaders(request), 'Content-Type': 'application/json' },
        });
    }

    try {
        const doc = await getAuthenticatedDoc(env);
        const sheet = doc.sheetsByTitle[sheetName];
        
        if (!sheet) {
            return new Response(JSON.stringify({ error: `Sheet "${sheetName}" not found` }), {
                status: 404,
                headers: { ...getCorsHeaders(request), 'Content-Type': 'application/json' },
            });
        }

        await sheet.addRow(values);
        
        // Invalidate cache setelah modifikasi data
        docCache.clear();

        return new Response(JSON.stringify({ 
            success: true,
            message: 'Row appended successfully'
        }), {
            headers: { ...getCorsHeaders(request), 'Content-Type': 'application/json' },
        });
    } catch (error) {
        console.error('Error appending to sheet:', error);
        return new Response(JSON.stringify({ error: 'Failed to append data' }), {
            status: 500,
            headers: { ...getCorsHeaders(request), 'Content-Type': 'application/json' },
        });
    }
}

async function handleUpdate(request, env) {
    let requestBody;
    
    try {
        requestBody = await request.json();
    } catch (error) {
        return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
            status: 400,
            headers: { ...getCorsHeaders(request), 'Content-Type': 'application/json' },
        });
    }

    const { sheetName, keyColumn, keyValue, updates } = requestBody;

    if (!sheetName || !validateSheetName(sheetName)) {
        return new Response(JSON.stringify({ error: 'Valid sheetName is required' }), {
            status: 400,
            headers: { ...getCorsHeaders(request), 'Content-Type': 'application/json' },
        });
    }

    if (!keyColumn || typeof keyColumn !== 'string') {
        return new Response(JSON.stringify({ error: 'keyColumn is required and must be a string' }), {
            status: 400,
            headers: { ...getCorsHeaders(request), 'Content-Type': 'application/json' },
        });
    }

    if (!updates || typeof updates !== 'object' || Object.keys(updates).length === 0) {
        return new Response(JSON.stringify({ error: 'Updates object with at least one field is required' }), {
            status: 400,
            headers: { ...getCorsHeaders(request), 'Content-Type': 'application/json' },
        });
    }

    try {
        const doc = await getAuthenticatedDoc(env);
        const sheet = doc.sheetsByTitle[sheetName];
        
        if (!sheet) {
            return new Response(JSON.stringify({ error: `Sheet "${sheetName}" not found` }), {
                status: 404,
                headers: { ...getCorsHeaders(request), 'Content-Type': 'application/json' },
            });
        }

        await sheet.loadHeaderRow();
        const rows = await sheet.getRows();
        
        // Find row by key column
        const targetRow = rows.find(row => row[keyColumn] === keyValue);
        
        if (!targetRow) {
            return new Response(JSON.stringify({ error: 'Row not found with specified key' }), {
                status: 404,
                headers: { ...getCorsHeaders(request), 'Content-Type': 'application/json' },
            });
        }

        // Validate update fields against header
        const validHeaders = sheet.headerValues;
        const invalidFields = Object.keys(updates).filter(field => !validHeaders.includes(field));
        
        if (invalidFields.length > 0) {
            return new Response(JSON.stringify({ 
                error: `Invalid fields: ${invalidFields.join(', ')}`,
                validFields: validHeaders 
            }), {
                status: 400,
                headers: { ...getCorsHeaders(request), 'Content-Type': 'application/json' },
            });
        }

        // Apply updates
        Object.keys(updates).forEach(field => {
            targetRow[field] = updates[field];
        });
        
        await targetRow.save();
        
        // Invalidate cache setelah modifikasi data
        docCache.clear();

        return new Response(JSON.stringify({ 
            success: true,
            message: 'Row updated successfully'
        }), {
            headers: { ...getCorsHeaders(request), 'Content-Type': 'application/json' },
        });
    } catch (error) {
        console.error('Error updating sheet:', error);
        return new Response(JSON.stringify({ error: 'Failed to update data' }), {
            status: 500,
            headers: { ...getCorsHeaders(request), 'Content-Type': 'application/json' },
        });
    }
}

export default {
    async fetch(request, env, ctx) {
        if (request.method === 'OPTIONS') {
            return handleOptions(request);
        }

        const url = new URL(request.url);
        const path = url.pathname;

        try {
            if (path === '/api/sheets' && request.method === 'GET') {
                return await handleGet(request, env);
            } else if (path === '/api/sheets/append' && request.method === 'POST') {
                return await handleAppend(request, env);
            } else if (path === '/api/sheets/update' && request.method === 'PUT') {
                return await handleUpdate(request, env);
            } else {
                return new Response(JSON.stringify({ error: 'Endpoint not found' }), {
                    status: 404,
                    headers: { ...getCorsHeaders(request), 'Content-Type': 'application/json' },
                });
            }
        } catch (error) {
            console.error('Error handling request:', error);
            return new Response(JSON.stringify({ error: 'Internal server error' }), {
                status: 500,
                headers: { ...getCorsHeaders(request), 'Content-Type': 'application/json' },
            });
        }
    },
};
