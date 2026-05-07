/**
 * Gmail API でレポートメールを送信する
 *
 * 使い方:
 *   node scripts/soholm/send-report.js \
 *     --subject "【実績集計】スーホルム 2026-04-30" \
 *     --body-file /tmp/soholm-report.txt
 *
 *   または本文を直接指定:
 *   node scripts/soholm/send-report.js \
 *     --subject "..." \
 *     --body "本文テキスト"
 *
 * 環境変数:
 *   GMAIL_CLIENT_ID      - Google OAuth2 クライアントID
 *   GMAIL_CLIENT_SECRET  - Google OAuth2 クライアントシークレット
 *   GMAIL_REFRESH_TOKEN  - OAuth2 リフレッシュトークン
 */

const { google } = require('googleapis');
const fs = require('fs');

const GMAIL_USER = 'season.s.call.m.g69@gmail.com';
const SEND_TO   = 'season.s.call.m.g69@gmail.com';

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg.startsWith('--')) {
      const eqIdx = arg.indexOf('=');
      if (eqIdx !== -1) {
        args[arg.slice(2, eqIdx)] = arg.slice(eqIdx + 1);
      } else {
        args[arg.slice(2)] = argv[i + 1] || true;
        i++;
      }
    }
  }
  return args;
}

function buildMimeMessage({ from, to, subject, text, html }) {
  const contentType = html
    ? 'text/html; charset=UTF-8'
    : 'text/plain; charset=UTF-8';
  const body = html || text;

  const mime = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: =?UTF-8?B?${Buffer.from(subject).toString('base64')}?=`,
    'MIME-Version: 1.0',
    `Content-Type: ${contentType}`,
    'Content-Transfer-Encoding: base64',
    '',
    Buffer.from(body).toString('base64'),
  ].join('\r\n');

  return Buffer.from(mime)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

async function main() {
  const clientId     = process.env.GMAIL_CLIENT_ID;
  const clientSecret = process.env.GMAIL_CLIENT_SECRET;
  const refreshToken = process.env.GMAIL_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    console.error('ERROR: 環境変数 GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN が必要です');
    process.exit(1);
  }

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
  oauth2Client.setCredentials({ refresh_token: refreshToken });

  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

  const args    = parseArgs(process.argv);
  const subject = args['subject'] || '【実績集計】スーホルム レポート';

  let body = '';
  let htmlBody = '';

  if (args['html-file']) {
    htmlBody = fs.readFileSync(args['html-file'], 'utf-8');
  } else if (args['body-file']) {
    body = fs.readFileSync(args['body-file'], 'utf-8');
  } else if (args['body']) {
    body = args['body'];
  }

  if (!body && !htmlBody) {
    console.error('ERROR: --body / --body-file / --html-file のいずれかを指定してください');
    process.exit(1);
  }

  const raw = buildMimeMessage({
    from: `スーホルム実績ツール <${GMAIL_USER}>`,
    to: SEND_TO,
    subject,
    text: body,
    html: htmlBody || undefined,
  });

  const res = await gmail.users.messages.send({
    userId: 'me',
    requestBody: { raw },
  });

  console.log(`メール送信完了: ${res.data.id}`);
  console.log(`送信先: ${SEND_TO}`);
  console.log(`件名: ${subject}`);
}

main().catch((err) => {
  console.error('FATAL:', err.message);
  process.exit(1);
});
