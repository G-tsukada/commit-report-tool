/**
 * Gmail OAuth2 リフレッシュトークン取得スクリプト（初回セットアップ用）
 *
 * 使い方:
 *   node scripts/soholm/get-refresh-token.js
 *
 * 表示されたURLをブラウザで開き、認証後にコードを貼り付けると
 * refresh_token が表示されます。
 */

const { google } = require('googleapis');
const readline = require('readline');

const SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.send',
];

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const question = (q) => new Promise((res) => rl.question(q, res));

async function main() {
  const clientId = await question('Client ID を入力: ');
  const clientSecret = await question('Client Secret を入力: ');

  const oauth2Client = new google.auth.OAuth2(
    clientId.trim(),
    clientSecret.trim(),
    'urn:ietf:wg:oauth:2.0:oob'
  );

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent',
  });

  console.log('\n--- 以下のURLをブラウザで開いてください ---');
  console.log(authUrl);
  console.log('-------------------------------------------\n');

  const code = await question('ブラウザに表示された認証コードを貼り付け: ');

  const { tokens } = await oauth2Client.getToken(code.trim());

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
