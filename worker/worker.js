import { SignJWT } from "jose";

async function getAccessToken(env) {
  const key = env.PRIVATE_KEY.replace(/\\n/g, "\n");
  const privateKey = await crypto.subtle.importKey(
    "pkcs8",
    new TextEncoder().encode(key),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const now = Math.floor(Date.now() / 1000);
  const jwt = await new SignJWT({
    iss: env.SERVICE_ACCOUNT_EMAIL,
    scope: "https://www.googleapis.com/auth/spreadsheets",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  })
    .setProtectedHeader({ alg: "RS256" })
    .sign(privateKey);

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });
  const data = await res.json();
  return data.access_token;
}

export default {
  async fetch(request, env) {
    const token = await getAccessToken(env);
    const url = new URL(request.url);
    const sheetId = env.SPREADSHEET_ID;

    if (url.pathname === "/api/sheets" && request.method === "GET") {
      const sheetName = url.searchParams.get("sheetName") || "Sheet1";
      const res = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${sheetName}!A1:Z1000`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return new Response(await res.text(), {
        headers: { "content-type": "application/json" },
      });
    }

    return new Response("Worker aktif — coba /api/sheets?sheetName=List_so");
  },
};
