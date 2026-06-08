#!/usr/bin/env node
/**
 * Obtém refresh token do Gmail via OAuth2 para uso nas edge functions.
 *
 * Pré-requisitos:
 *   1. Criar credencial OAuth2 no Google Cloud Console (tipo: Desktop App)
 *   2. Habilitar Gmail API no projeto
 *   3. Preencher GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET abaixo ou em .env.local
 *
 * Uso:
 *   node scripts/gmail-oauth-token.js
 *
 * Saída: refresh_token para setar em GMAIL_REFRESH_TOKEN nas env vars do Supabase
 */

const https = require("https");
const http = require("http");
const url = require("url");

// Lê do ambiente ou usa valores de exemplo
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || "";
const REDIRECT_URI = "http://localhost:3000/oauth2callback";

const SCOPES = [
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/gmail.readonly",
].join(" ");

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error(
    "ERRO: Defina GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET como variáveis de ambiente.\n" +
    "Exemplo:\n" +
    "  GOOGLE_CLIENT_ID=xxx GOOGLE_CLIENT_SECRET=yyy node scripts/gmail-oauth-token.js"
  );
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

console.log("\n1. Abra esta URL no navegador:\n");
console.log(authUrl);
console.log("\n2. Authorize e aguarde o redirect para localhost:3000...\n");

// Servidor local para capturar o código de autorização
const server = http.createServer(async (req, res) => {
  const parsed = url.parse(req.url, true);
  if (parsed.pathname !== "/oauth2callback") {
    res.end("Not found");
    return;
  }

  const code = parsed.query.code;
  if (!code) {
    res.end("Erro: código não encontrado na query string.");
    server.close();
    return;
  }

  res.end("<html><body><h2>Autorizado! Pode fechar esta aba.</h2></body></html>");
  server.close();

  // Troca o code por tokens
  const body = new URLSearchParams({
    code,
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    redirect_uri: REDIRECT_URI,
    grant_type: "authorization_code",
  }).toString();

  const options = {
    hostname: "oauth2.googleapis.com",
    path: "/token",
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Content-Length": Buffer.byteLength(body),
    },
  };

  const tokenReq = https.request(options, (tokenRes) => {
    let data = "";
    tokenRes.on("data", (chunk) => (data += chunk));
    tokenRes.on("end", () => {
      const tokens = JSON.parse(data);
      if (tokens.error) {
        console.error("Erro ao obter tokens:", tokens);
        return;
      }
      console.log("\n✅ Tokens obtidos com sucesso!\n");
      console.log("ACCESS_TOKEN (expira em 1h):", tokens.access_token);
      console.log("\nREFRESH_TOKEN (permanente):", tokens.refresh_token);
      console.log(
        "\n📋 Adicione no Supabase Dashboard > Project Settings > Edge Functions > Secrets:\n" +
        `  GMAIL_REFRESH_TOKEN = ${tokens.refresh_token}\n` +
        `  GOOGLE_CLIENT_ID    = ${CLIENT_ID}\n` +
        `  GOOGLE_CLIENT_SECRET = ${CLIENT_SECRET}\n`
      );
    });
  });

  tokenReq.on("error", (e) => console.error("Erro na requisição:", e));
  tokenReq.write(body);
  tokenReq.end();
});

server.listen(3000, () => {
  console.log("Servidor de callback rodando em http://localhost:3000...");
});
