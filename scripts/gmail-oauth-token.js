#!/usr/bin/env node
import http from "http";
import https from "https";
import { parse } from "url";
import { exec } from "child_process";

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || "";
const PORT = 8080;
const REDIRECT_URI = `http://localhost:${PORT}`;

const SCOPES = [
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/gmail.readonly",
].join(" ");

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error("ERRO: Defina GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET.");
  process.exit(1);
}

const authUrl =
  "https://accounts.google.com/o/oauth2/v2/auth?" +
  new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: "code",
    scope: SCOPES,
    access_type: "offline",
    prompt: "consent",
  });

console.log("\nAbrindo navegador automaticamente...\n");
console.log("URL:", authUrl, "\n");
exec(`start "" "${authUrl}"`);

const server = http.createServer((req, res) => {
  const { query } = parse(req.url, true);

  if (!query.code) {
    res.end("Aguardando...");
    return;
  }

  res.end("<html><body><h2>Autorizado! Pode fechar esta aba.</h2></body></html>");
  server.close();

  const body = new URLSearchParams({
    code: query.code,
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    redirect_uri: REDIRECT_URI,
    grant_type: "authorization_code",
  }).toString();

  const req2 = https.request(
    {
      hostname: "oauth2.googleapis.com",
      path: "/token",
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Content-Length": Buffer.byteLength(body),
      },
    },
    (res2) => {
      let data = "";
      res2.on("data", (c) => (data += c));
      res2.on("end", () => {
        const tokens = JSON.parse(data);
        if (tokens.error) {
          console.error("Erro:", tokens.error, "-", tokens.error_description);
          return;
        }
        console.log("✅ REFRESH_TOKEN obtido:\n");
        console.log(tokens.refresh_token);
        console.log(
          "\nRode para salvar no Supabase:\n" +
          `  supabase secrets set GMAIL_REFRESH_TOKEN="${tokens.refresh_token}" --project-ref hynadwlwrscvjubryqlg\n`
        );
      });
    }
  );

  req2.on("error", (e) => console.error("Erro:", e));
  req2.write(body);
  req2.end();
});

server.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}...`);
});
