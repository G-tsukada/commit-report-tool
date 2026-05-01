/**
 * Gmail OAuth2 リフレッシュトークン取得スクリプト（初回セットアップ用）
 *
 * 使い方:
 *   node scripts/soholm/get-refresh-token.js
 *
 * ブラウザで認証すると自動でコードを受け取り、refresh_token が表示されます。
 */

const { google } = require('googleapis');
const http = require('http');
const readline = require('readline');
const { URL } = require('url');

const SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.send',
];

const PORT = 3000;
const REDIRECT_URI = `http://localhost:${PORT}/callback`;

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const question = (q) => new Promise((res) => rl.question(q, res));

async function waitForCode() {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const url = new URL(req.url, `http://localhost:${PORT}`);
      const code = url.searchParams.get('code');
      const error = url.searchParams.get('error');

      if (error) {
        res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(`<h1>エラー: ${error}</h1><p>このウィンドウを閉じてください。</p>`);
        server.close();
        reject(new Error(`OAuth エラー: ${error}`));
        return;
      }

      if (code) {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end('<h1>認証完了！</h1><p>このウィンドウを閉じて、ターミナルに戻ってください。</p>');
        server.close();
        resolve(code);
      }
    });

    server.listen(PORT, () => {
      console.log(`\nポート ${PORT} で待機中... ブラウザで認証してください。`);
    });

    server.on('error', reject);
  });
}

async function main() {
  const clientId = await question('Client ID を入力: ');
  const clientSecret = await question('Client Secret を入力: ');

  const oauth2Client = new google.auth.OAuth2(
    clientId.trim(),
    clientSecret.trim(),
    REDIRECT_URI
  );

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent',
  });

  console.log('\n--- 以下のURLをブラウザで開いてください ---');
  console.log(authUrl);
  console.log('-------------------------------------------');

  const code = await waitForCode();
  console.log('\n認証コードを受け取りました。トークンを取得中...');

  const { tokens } = await oauth2Client.getToken(code);

  console.log('\n========== GitHub Secrets に登録する値 ==========');
  console.log(`GMAIL_CLIENT_ID     : ${clientId.trim()}`);
  console.log(`GMAIL_CLIENT_SECRET : ${clientSecret.trim()}`);
  console.log(`GMAIL_REFRESH_TOKEN : ${tokens.refresh_token}`);
  console.log('=================================================\n');

  rl.close();
}

main().catch((err) => {
  console.error('ERROR:', err.message);
  rl.close();
  process.exit(1);
});
