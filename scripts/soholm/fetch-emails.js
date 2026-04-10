/**
 * Gmail APIで【実績報告】【スーホルム】【SOHOLM】メールを取得する
 *
 * 環境変数:
 *   GMAIL_CLIENT_ID      - Google OAuth2 クライアントID
 *   GMAIL_CLIENT_SECRET  - Google OAuth2 クライアントシークレット
 *   GMAIL_REFRESH_TOKEN  - OAuth2 リフレッシュトークン
 *
 * 出力: /tmp/soholm-emails.json
 */

const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

const GMAIL_USER = 'season.s.call.m.g69@gmail.com';
const OUTPUT_FILE = '/tmp/soholm-emails.json';

function getYesterdayJST() {
  const jstOffsetMs = 9 * 60 * 60 * 1000;
  const nowUtc = Date.now();
  const jstNow = new Date(nowUtc + jstOffsetMs);
  const yesterday = new Date(jstNow);
  yesterday.setDate(yesterday.getDate() - 1);
  return yesterday.toISOString().split('T')[0]; // YYYY-MM-DD
}

function decodeBase64Url(data) {
  return Buffer.from(data.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf-8');
}

function extractBody(payload) {
  if (!payload) return '';

  // マルチパートの場合は再帰的に探す
  if (payload.parts && payload.parts.length > 0) {
    for (const part of payload.parts) {
      if (part.mimeType === 'text/plain' && part.body && part.body.data) {
        return decodeBase64Url(part.body.data);
      }
    }
    // text/plainがなければHTMLを試みる
    for (const part of payload.parts) {
      if (part.mimeType === 'text/html' && part.body && part.body.data) {
        return decodeBase64Url(part.body.data)
          .replace(/<[^>]*>/g, '')
          .replace(/&nbsp;/g, ' ')
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .trim();
      }
      // ネストされたマルチパートを再帰処理
      if (part.parts) {
        const nested = extractBody(part);
        if (nested) return nested;
      }
    }
  }

  // シングルパート
  if (payload.body && payload.body.data) {
    return decodeBase64Url(payload.body.data);
  }

  return '';
}

async function main() {
  const clientId = process.env.GMAIL_CLIENT_ID;
  const clientSecret = process.env.GMAIL_CLIENT_SECRET;
  const refreshToken = process.env.GMAIL_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    console.error('ERROR: 環境変数 GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN が必要です');
    process.exit(1);
  }

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
  oauth2Client.setCredentials({ refresh_token: refreshToken });

  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

  const yesterdayDate = getYesterdayJST();
  const searchDate = yesterdayDate.replace(/-/g, '/');

  // Gmail検索クエリ: 件名に実績報告 OR スーホルム OR SOHOLM を含む昨日以降のメール
  const query = `subject:(実績報告 OR スーホルム OR SOHOLM) after:${searchDate}`;
  console.log(`検索クエリ: ${query}`);

  const listRes = await gmail.users.messages.list({
    userId: GMAIL_USER,
    q: query,
    maxResults: 100,
  });

  const messageRefs = listRes.data.messages || [];
  console.log(`ヒット件数: ${messageRefs.length}`);

  const emails = [];

  for (const ref of messageRefs) {
    const detail = await gmail.users.messages.get({
      userId: GMAIL_USER,
      id: ref.id,
      format: 'full',
    });

    const headers = detail.data.payload.headers || [];
    const getHeader = (name) => headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value || '';

    const subject = getHeader('Subject');
    const from = getHeader('From');
    const date = getHeader('Date');
    const messageId = getHeader('Message-ID');
    const body = extractBody(detail.data.payload);

    emails.push({
      id: ref.id,
      message_id: messageId,
      subject,
      from,
      date,
      body: body.trim(),
    });

    console.log(`  取得: [${date}] ${subject}`);
  }

  // 日付の新しい順にソート
  emails.sort((a, b) => new Date(b.date) - new Date(a.date));

  const output = {
    fetched_at: new Date().toISOString(),
    target_date: yesterdayDate,
    gmail_user: GMAIL_USER,
    search_query: query,
    email_count: emails.length,
    emails,
  };

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2), 'utf-8');
  console.log(`\n完了: ${emails.length}件のメールを ${OUTPUT_FILE} に保存しました`);
}

main().catch((err) => {
  console.error('FATAL:', err.message);
  process.exit(1);
});
