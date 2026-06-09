// supabase/functions/_shared/gmail-client.ts

export interface GmailSnippet {
  id: string;
  subject: string;
  snippet: string;
  date: string;
  from: string;
}

async function getAccessToken(): Promise<string> {
  const clientId = Deno.env.get("GOOGLE_CLIENT_ID");
  const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET");
  const refreshToken = Deno.env.get("GMAIL_REFRESH_TOKEN");

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error("[gmail-client] missing GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET or GMAIL_REFRESH_TOKEN");
  }

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`[gmail-client] token refresh failed ${res.status}: ${body}`);
  }

  const data = await res.json() as { access_token: string };
  return data.access_token;
}

const LABEL_QUERY = "label:4-notification-inteligencia-artificial";
const DAYS_BACK = 7;

export async function fetchGmailSnippets(): Promise<GmailSnippet[]> {
  const accessToken = await getAccessToken();

  const afterDate = new Date(Date.now() - DAYS_BACK * 24 * 60 * 60 * 1000);
  const afterTimestamp = Math.floor(afterDate.getTime() / 1000);
  const query = `${LABEL_QUERY} after:${afterTimestamp}`;

  const listRes = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(query)}&maxResults=20`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (!listRes.ok) {
    const body = await listRes.text();
    throw new Error(`[gmail-client] list messages failed ${listRes.status}: ${body}`);
  }

  const listData = await listRes.json() as { messages?: Array<{ id: string }> };
  const messages = listData.messages ?? [];

  if (messages.length === 0) return [];

  const batch = messages.slice(0, 15);
  const snippets = await Promise.all(
    batch.map(async ({ id }) => {
      const msgRes = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      if (!msgRes.ok) return null;

      const msg = await msgRes.json() as {
        snippet: string;
        payload: { headers: Array<{ name: string; value: string }> };
        internalDate: string;
      };

      const headers = msg.payload.headers;
      const subject = headers.find((h) => h.name === "Subject")?.value ?? "(sem assunto)";
      const from = headers.find((h) => h.name === "From")?.value ?? "";
      const date = new Date(parseInt(msg.internalDate)).toISOString().split("T")[0];

      return { id, subject, snippet: msg.snippet, date, from } satisfies GmailSnippet;
    })
  );

  return snippets.filter((s): s is GmailSnippet => s !== null);
}
