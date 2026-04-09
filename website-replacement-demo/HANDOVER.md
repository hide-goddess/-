# HPリプレイスデモ - 引き継ぎメモ

次回このプロジェクトを再開するときに、このファイルを最初に見れば思い出せるようにしたメモです。

---

## 1. プロジェクト概要

既存HPのURLと参考新規URLを入力し、テキスト指示と合わせて **Gemini API** でリプレイス後のHPデモを1ファイルHTMLとして生成するWebアプリ。

- ブランチ: `claude/website-replacement-demo-9CIRC`
- 作業ディレクトリ: `website-replacement-demo/`
- 使用モデル: `gemini-2.5-flash`
- SDK: `@google/genai`
- フレームワーク: Node.js + Express

---

## 2. ディレクトリ構成

```
website-replacement-demo/
├── package.json           # 依存パッケージ定義
├── package-lock.json
├── server.js              # Express サーバー / Gemini API 呼び出し
├── .env.example           # 環境変数サンプル
├── .env                   # 本番キー (gitignore対象, 手動作成)
├── .gitignore
├── HANDOVER.md            # このファイル
└── public/
    ├── index.html         # フロント画面 (3ステップフォーム)
    ├── style.css
    └── app.js             # フロントロジック
```

---

## 3. 再開手順 (PowerShell / Windows)

### ステップ1: 最新コードを取得

```powershell
cd C:\Users\h.tabata\my-repo
git fetch origin
git checkout claude/website-replacement-demo-9CIRC
git pull origin claude/website-replacement-demo-9CIRC
```

### ステップ2: 依存パッケージをインストール (初回 or package.json 更新時のみ)

```powershell
cd website-replacement-demo
npm install
```

### ステップ3: .env を用意

`.env` が無い場合は `.env.example` をコピーしてキーを埋める:

```powershell
Copy-Item .env.example .env
notepad .env
```

`.env` の内容:
```
GEMINI_API_KEY=AIzaSy...      # Google AI Studio で発行したキー
GEMINI_MODEL=gemini-2.5-flash
PORT=3000
```

> ⚠️ `.env` は `.gitignore` で除外済み。**絶対にコミットしないこと**。
> キーは https://aistudio.google.com/app/apikey で発行/管理。

### ステップ4: サーバー起動

```powershell
npm start
```

以下のログが出れば成功:
```
Website Replacement Demo → http://localhost:3000
Model: gemini-2.5-flash
```

ブラウザで http://localhost:3000 を開く。停止は `Ctrl + C`。

---

## 4. 使い方 (3ステップ)

1. **ステップ1: 既存HPのURL** にリプレイス前HPのURLを入力 → 「既存HPを読み込む」ボタン
   - → Gemini が構成/課題点を要約
2. **ステップ2: 参考にする新規URL** に参考サイトのURLを入力 → 「参考URLを読み込む」ボタン
   - → 既存HPの改善アイデアを抽出
3. **ステップ3: テキスト指示** に要望を自由記述
   - 例: 「ヒーローセクションをより強く訴求、配色は紺と白、CTAを上部固定」
4. 下部の「**リプレイスデモを生成する**」青ボタンをクリック
   - → 右側 iframe にリプレイス後のHPプレビュー
   - 「HTMLをダウンロード」「新規タブで開く」ボタンも使える

---

## 5. APIエンドポイント (内部用)

| メソッド | パス | 役割 |
|---|---|---|
| POST | `/api/analyze-existing` | 既存HPを読み込み要約 |
| POST | `/api/analyze-reference` | 参考URLを読み込み改善案抽出 |
| POST | `/api/generate-replacement` | リプレイス後HPをHTMLで生成 |

すべて `server.js` 内の `generateText()` 経由で Gemini を呼び出す。

---

## 6. 実装済み機能

- ✅ 既存HPの読み込み・要約 (Gemini)
- ✅ 参考新規URLの読み込み・改善案抽出 (Gemini)
- ✅ テキスト指示を加えたリプレイス後HPの1ファイルHTML生成
- ✅ ブラウザ上での iframe プレビュー
- ✅ 生成HTMLのダウンロード / 新規タブ表示
- ✅ `.env` からのAPIキー読み込み (`dotenv`)
- ✅ 503/429エラー時の自動リトライ (指数バックオフ 1s→2s→4s→8s、最大5回)
- ✅ リトライ上限時のユーザー向けエラーメッセージ

---

## 7. トラブルシュート

| 症状 | 原因 | 対処 |
|---|---|---|
| `[warn] GEMINI_API_KEY が未設定です` | `.env` が無い or キーが空 | `.env` を作成・編集 |
| `error: API key not valid` | キーが間違い or revoke 済み | 新しいキーを発行して `.env` 更新 |
| `503 UNAVAILABLE` / `overloaded` | Gemini 側の過負荷 | 自動リトライで待機。5回失敗したら数分後に再試行 |
| `429 RESOURCE_EXHAUSTED` | レート制限超過 | 数分待つ、または有料プランへ |
| `fetch failed` | 入力URLが存在しない / ネットワーク不可 | URLを確認 |
| ポート 3000 使用中エラー | 別プロセスが 3000 を使用 | `.env` の `PORT` を変更 (例: 3001) |

---

## 8. セキュリティ注意事項

- **APIキーを絶対にコミットしない**。`.env` のみで管理
- APIキーをチャット/Slack/メール等に貼り付けない (漏洩扱いで revoke 必須)
- 不要なキーは Google AI Studio でこまめに revoke
- このリポジトリ `.gitignore` で `.env` を除外済み。追加するファイル名に注意

---

## 9. 参考リンク

- Google AI Studio (APIキー発行): https://aistudio.google.com/app/apikey
- Gemini API ドキュメント: https://ai.google.dev/gemini-api/docs
- `@google/genai` NPM: https://www.npmjs.com/package/@google/genai

---

## 10. 次回以降の改善アイデア (TODO)

未実装だが入れると便利そうなもの:

- [ ] プロンプト履歴の localStorage 保存
- [ ] 生成結果の複数案出力 (ABテスト用)
- [ ] 画像・favicon の取り込み (スクリーンショット参照)
- [ ] ダークモード切替
- [ ] 簡易認証 (社内利用時)
- [ ] Vercel / Cloud Run へのデプロイ手順追加

必要になったタイミングで着手。
