/**
 * Gmail OAuth2でレポートメールを送信する
 *
 * 使い方:
 *   node scripts/soholm/send-report.js \
 *     --subject "【実績集計】スーホルム 2026-04-10" \
 *     --body-file /tmp/soholm-report.txt
 *
 * または本文を直接指定:
 *   node scripts/soholm/send-report.js \
 *     --subject "..." \
 *     --body "本文テキスト"
 *
 * HTMLメールにする場合は --html-file オプションを使用:
 *   node scripts/soholm/send-report.js \
 *     --subject "..." \
 *     --html-file /tmp/soholm-report.html
 *
 * 環境変数:
 *   GMAIL_CLIENT_ID      - Google OAuth2 クライアントID
 *   GMAIL_CLIENT_SECRET  - Google OAuth2 クライアントシークレット
 *   GMAIL_REFRESH_TOKEN  - OAuth2 リフレッシュトークン
 */

const nodemailer = require('nodemailer');
const fs = require('fs');

const GMAIL_USER = 'season.s.call.m.g69@gmail.com';
const SEND_TO = 'season.s.call.m.g69@gmail.com';

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg.startsWith('--')) {
      const eqIdx = arg.indexOf('=');
      if (eqIdx !== -1) {
        const key = arg.slice(2, eqIdx);
        args[key] = arg.slice(eqIdx + 1);
      } else {
        const key = arg.slice(2);
        args[key] = argv[i + 1] || true;
        i++;
      }
    }
  }
  return args;
}

async function main() {
  const clientId = process.env.GMAIL_CLIENT_ID;
  const clientSecret = process.env.GMAIL_CLIENT_SECRET;
  const refreshToken = process.env.GMAIL_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    console.error('ERROR: 環境変数 GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN が必要です');
    process.exit(1);
  }

  const args = parseArgs(process.argv);
  const subject = args['subject'] || '【実績集計】スーホルム レポート';

  let textBody = '';
  let htmlBody = '';

  if (args['body-file']) {
    textBody = fs.readFileSync(args['body-file'], 'utf-8');
  } else if (args['body']) {
    textBody = args['body'];
  }

  if (args['html-file']) {
    htmlBody = fs.readFileSync(args['html-file'], 'utf-8');
  }

  if (!textBody && !htmlBody) {
    console.error('ERROR: --body, --body-file, --html-file のいずれかを指定してください');
    process.exit(1);
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      type: 'OAuth2',
      user: GMAIL_USER,
      clientId,
      clientSecret,
      refreshToken,
    },
  });

  const mailOptions = {
    from: `スーホルム実績ツール <${GMAIL_USER}>`,
    to: SEND_TO,
    subject,
  };

  if (htmlBody) {
    mailOptions.html = htmlBody;
    if (textBody) mailOptions.text = textBody;
  } else {
    mailOptions.text = textBody;
  }

  const info = await transporter.sendMail(mailOptions);
  console.log(`メール送信完了: ${info.messageId}`);
  console.log(`送信先: ${SEND_TO}`);
  console.log(`件名: ${subject}`);
}

main().catch((err) => {
  console.error('FATAL:', err.message);
  process.exit(1);
});
