# コミネコ

GitHubコミットを図解してSlackに投稿するシステム。

## プロジェクト構造

```
configs/
├── repos/           # リポジトリ内のアプリ定義（共有）
└── projects/        # プロジェクト別設定（Slack先、対象アプリ）

.claude/
├── prompts/
│   └── daily-report.md    # メイン処理フロー
└── skills/                # 各処理の詳細知識
```

## 実行方法

```bash
claude "/daily-report を configs/projects/your-project.yml で実行"
```

## スキル参照ガイド

| タイミング | スキル | 内容 |
|-----------|--------|------|
| 設定読み込み時 | config-reader | 2層構造の読み方、アプリフィルタ |
| コミット取得時 | github-api | REST APIエンドポイント |
| 差分分析時 | code-analyzer | ビジネス視点への変換ルール |
| 図解生成前 | diagram-guidelines | デザイン基準、examples |
| スクショ時 | screenshot-capture | Playwrightスクリプト |
| Slack投稿時 | slack-formatting | 複数画像まとめ投稿 |

## スーホルム 実績レポートツール

Gmailの実績報告メールを集計し、毎朝7時JSTにメールで送信するシステム。

```bash
# ワークフロー手動実行（GitHub Actions）
# .github/workflows/soholm-report.yml
```

### 処理フロー

| ステップ | 内容 |
|---------|------|
| メール取得 | `scripts/soholm/fetch-emails.js` で Gmail API を使いメール取得 |
| Claude分析 | `.claude/prompts/soholm-report.md` に従い実績データを集計 |
| メール送信 | `scripts/soholm/send-report.js` で Gmail OAuth2 送信 |

### スーホルム GitHub Secrets

| シークレット名 | 用途 |
|--------------|------|
| `GMAIL_CLIENT_ID` | Google OAuth2 クライアントID |
| `GMAIL_CLIENT_SECRET` | Google OAuth2 クライアントシークレット |
| `GMAIL_REFRESH_TOKEN` | OAuth2 リフレッシュトークン（初回セットアップ時に取得） |

### Gmail OAuth2 初回セットアップ

1. [Google Cloud Console](https://console.cloud.google.com/) でプロジェクト作成
2. Gmail API を有効化
3. OAuth2 認証情報（デスクトップアプリ）を作成
4. 以下のスコープで認証: `https://www.googleapis.com/auth/gmail.readonly`, `https://www.googleapis.com/auth/gmail.send`
5. 取得した `client_id`, `client_secret`, `refresh_token` を GitHub Secrets に登録

---

## GitHub Secrets

GitHub Actionsで使用するシークレット一覧:

| シークレット名 | 用途 |
|---------------|------|
| `ANTHROPIC_API_KEY` | Claude API認証 |
| `GH_TOKEN` | GitHub API認証（コミット取得） |
| `SLACK_BOT_TOKEN` | Slack Bot認証 |
| `SLACK_CHANNEL` | 投稿先チャンネルID |

## Slack投稿ルール

Slackへの投稿は **必ず `slack-formatting` スキルを使用** してください。

```bash
node .claude/skills/slack-formatting/scripts/post-report.js \
  --message "メッセージ" \
  /tmp/image1.png /tmp/image2.png
```

**禁止事項:**
- curl で直接 Slack API を呼び出す
- 独自の投稿ロジックを書く
