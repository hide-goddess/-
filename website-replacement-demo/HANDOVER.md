# HPリプレイスデモ - 引き継ぎメモ

次回このプロジェクトを再開するときに、このファイルを最初に読んでください。

---

## 1. プロジェクト概要

既存HPのURLと参考新規URLを入力し、テキスト指示と合わせて **Gemini API** でリプレイス後のHPデモを1ファイルHTMLとして生成するWebアプリ。

- リポジトリ: `hide-goddess/-`
- ブランチ: `claude/website-replacement-demo-9CIRC`
- 作業ディレクトリ: `website-replacement-demo/`
- 使用モデル: `gemini-2.0-flash` (フォールバック: `gemini-2.5-flash`)
- SDK: `@google/genai` v1.x
- フレームワーク: Node.js + Express (ES Modules)
- ローカルパス (Windows): `C:\Users\h.tabata\my-repo\website-replacement-demo\`

---

## 2. ディレクトリ構成

```
website-replacement-demo/
├── package.json           # 依存パッケージ定義
├── package-lock.json
├── server.js              # Express サーバー / Gemini API 呼び出し
├── .env.example           # 環境変数サンプル (3キー対応)
├── .env                   # 本番キー (gitignore対象, 手動作成)
├── .gitignore
├── HANDOVER.md            # このファイル
└── public/
    ├── index.html         # フロント画面 (3ステップフォーム + プレビュー)
    ├── style.css           # ダークブルー基調のUI
    └── app.js             # フロントロジック (API呼び出し + iframe表示)
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

### ステップ3: .env を用意 (APIキー3つ)

`.env` が無い場合:
```powershell
Copy-Item .env.example .env
notepad .env
```

`.env` の内容 (3つのAPIキーをそれぞれ**別のGCPプロジェクト**から発行):
```
GEMINI_API_KEY_1=AIzaSy...  (1つ目のキー)
GEMINI_API_KEY_2=AIzaSy...  (2つ目のキー)
GEMINI_API_KEY_3=AIzaSy...  (3つ目のキー)
GEMINI_MODEL=gemini-2.0-flash
PORT=3000
```

> ⚠️ `.env` は `.gitignore` で除外済み。**絶対にコミットしないこと**。
> ⚠️ 3つのキーは**別の Google Cloud プロジェクト**から発行すること。
>    同じプロジェクトだと日次無料枠 (20回/日/モデル) が共有されて意味がない。
> キー発行先: https://aistudio.google.com/app/apikey → 「Create API key in new project」

### ステップ4: サーバー起動

```powershell
npm start
```

成功ログ:
```
Website Replacement Demo → http://localhost:3000
Model: gemini-2.0-flash (fallback: gemini-2.5-flash)
API Keys: 3個 登録済み
Retry: 各キー×各モデル 最大3回 (計 最大18回)
```

ブラウザで http://localhost:3000 を開く。停止は `Ctrl + C`。

---

## 4. 使い方 (3ステップ)

1. **ステップ1: 既存HPのURL** → 「既存HPを読み込む」ボタン → Gemini が構成/課題点を要約
2. **→ 30秒待つ ←** (無料枠レート制限対策)
3. **ステップ2: 参考にする新規URL** → 「参考URLを読み込む」ボタン → 改善アイデアを抽出
4. **→ 30秒待つ ←**
5. **ステップ3: テキスト指示** に要望を自由記述
6. 「**リプレイスデモを生成する**」青ボタンをクリック
   - 右側 iframe にリプレイス後のHPプレビュー (複数ページ構成)
   - 「HTMLをダウンロード」「新規タブで開く」ボタンも使える

> ⚠️ **各ステップの間に30秒待つ**こと。連続実行するとレート制限を消費してしまう。

---

## 5. アーキテクチャ

### APIエンドポイント

| メソッド | パス | 役割 | maxOutputTokens |
|---|---|---|---|
| POST | `/api/analyze-existing` | 既存HPを読み込み要約 | 2000 |
| POST | `/api/analyze-reference` | 参考URLを読み込み改善案抽出 | 2000 |
| POST | `/api/generate-replacement` | リプレイス後HPをHTMLで生成 | 30000 |

### 3層エラー耐性

```
APIキーローテーション (最大3キー)
  └─→ モデルフォールバック (gemini-2.0-flash → gemini-2.5-flash)
       └─→ 指数バックオフリトライ (各モデル最大3回, 待機 3s→6s→12s)
```

- 合計最大 **3キー × 2モデル × 3回 = 18回** 試行
- 1つのキーの日次無料枠 (20回/日/モデル) を使い切ったら自動で次のキーへ

### HP生成プロンプトの特徴 (server.js:284)

- **複数ページHP構成** (LPではない) を指示
- ナビゲーションクリックで JavaScript による display:block/none のページ切り替え
- 最低ページ: HOME, 会社概要, 事業内容, お問い合わせ
- コードフェンス(```)禁止、生HTMLのみ出力
- 生成後にフェンス除去 + DOCTYPE前テキスト除去の2段階クリーニング

---

## 6. 実装済み機能

- ✅ 既存HPの読み込み・要約 (Gemini)
- ✅ 参考新規URLの読み込み・改善案抽出 (Gemini)
- ✅ テキスト指示を加えたリプレイス後HPの1ファイルHTML生成
- ✅ LP ではなく**複数ページHP構成**で生成 (JS によるページ切り替え)
- ✅ ブラウザ上での iframe プレビュー
- ✅ 生成HTMLのダウンロード / 新規タブ表示
- ✅ 複数APIキーローテーション (最大3キー, .env で管理)
- ✅ モデルフォールバック (gemini-2.0-flash → gemini-2.5-flash)
- ✅ 指数バックオフリトライ (各モデル最大3回)
- ✅ 429/503 エラー時のユーザー向け日本語エラーメッセージ
- ✅ コードフェンス自動除去 + DOCTYPE前テキスト除去
- ✅ 生成結果デバッグログ (文字数・先頭80文字)
- ✅ `.env` による設定 (dotenv, BOMなしUTF-8推奨)
- ✅ `.gitignore` で `.env` / `node_modules` 除外

---

## 7. トラブルシュート

| 症状 | 原因 | 対処 |
|---|---|---|
| `APIキーが未設定です` | `.env` が無い or キーが空 | `.env` を作成・編集 |
| `API key not valid` | キーが間違い or revoke 済み | 新しいキーを発行して `.env` 更新 |
| `API Keys: 1個 登録済み` | `.env` のエンコーディングがBOM付き | PowerShell の `[System.IO.File]::WriteAllText()` で BOMなしUTF-8で書き直す |
| `429 RESOURCE_EXHAUSTED` | 日次無料枠 (20回/日/モデル) を使い切った | 別プロジェクトのキーを追加 or 翌日まで待つ or 課金を有効化 |
| `503 UNAVAILABLE` | Gemini モデルの一時的過負荷 | リトライで自動復帰、数分待てば解消 |
| `404 models/xxx not found` | モデルIDが無効 | `.env` の `GEMINI_MODEL` を `gemini-2.0-flash` に設定 |
| `fetch failed` | 入力URLが存在しない or ネットワーク不可 | URLを確認 |
| ポート 3000 使用中 | 別プロセスが 3000 を使用 | `.env` の `PORT` を変更 (例: 3001) |
| プレビューに ` ```html ` と表示 | コードフェンス除去が失敗 | server.js のフェンス除去ロジックを確認 |
| プレビューが空白 | maxOutputTokens 不足でHTML途中切れ | server.js の maxOutputTokens を増やす |
| LP構成になってしまう | プロンプトの「複数ページ」指示不足 | server.js:287 のプロンプトを確認 |
| `.env` が notepad で壊れる | Windows notepad の BOM問題 | PowerShell の WriteAllText で書く (下記参照) |

### .env を PowerShell で安全に書く方法

```powershell
$k1 = Read-Host "1つ目のAPIキー"
$k2 = Read-Host "2つ目のAPIキー"
$k3 = Read-Host "3つ目のAPIキー"
$text = "GEMINI_API_KEY_1=$k1`nGEMINI_API_KEY_2=$k2`nGEMINI_API_KEY_3=$k3`nGEMINI_MODEL=gemini-2.0-flash`nPORT=3000"
[System.IO.File]::WriteAllText("$PWD\.env", $text, [System.Text.UTF8Encoding]::new($false))
```

---

## 8. セキュリティ注意事項

- **APIキーを絶対にコミットしない**。`.env` のみで管理
- **APIキーをチャット/Slack/メールに貼り付けない** (漏洩扱いで即 revoke 必須)
- `Read-Host` の出力もスクリーンショットに写るので注意
- 不要なキーは Google AI Studio でこまめに revoke
- `.gitignore` で `.env` を除外済み

---

## 9. 無料枠とコスト

### Gemini API 無料枠 (2025年時点)

| 項目 | 無料枠 |
|---|---|
| リクエスト数 | 20回/日/モデル/プロジェクト |
| 3キー (3プロジェクト) × 2モデル | **合計 120回/日** |
| 1回フル実行 (3ステップ) | 3リクエスト消費 |
| 1日あたりフル実行可能回数 | **約 40回/日** |

### 課金有効時の従量料金

| モデル | 入力 (1Mトークン) | 出力 (1Mトークン) | 1回フルのコスト |
|---|---|---|---|
| gemini-2.0-flash | ~$0.075 | ~$0.30 | **~$0.005 (~0.8円)** |
| gemini-2.5-flash | ~$0.15 | ~$0.60 | **~$0.01 (~1.5円)** |

課金有効化: https://console.cloud.google.com/billing

---

## 10. コミット履歴

```
12b82be feat: HP生成プロンプトをLP→複数ページHP構成に変更
ba61d4f feat: 複数APIキーローテーション機能を追加
9327642 fix: HTML生成の品質改善 - トークン上限拡大・フェンス除去強化
15e1ce2 fix: HTMLコードフェンスの除去ロジックを強化
2db0672 fix: リトライ待機時間を大幅延長、壊れたフォールバックモデルを除去
f6339ef fix: デフォルトモデルを gemini-2.0-flash に変更、フォールバックモデル修正
45ddfad feat: モデルフォールバック機能を追加
110c3cb feat: デフォルトモデルを gemini-2.0-flash-lite に変更
5ac75cf docs: 再開手順をまとめた HANDOVER.md を追加
33b455c feat: Gemini API 呼び出しに指数バックオフのリトライを追加
9035bec feat: APIバックエンドをAnthropicからGemini (gemini-2.5-flash) へ移行
03f0842 feat: HPリプレイスデモ生成ツールを追加
```

---

## 11. 次回チャットへの引き継ぎプロンプト

次回の Claude チャット (Web or ターミナル) を開始するときに、以下を貼り付けると文脈がスムーズに引き継がれます:

```
リポジトリ hide-goddess/- のブランチ claude/website-replacement-demo-9CIRC で
「HPリプレイスデモ生成ツール」を開発中です。

■ 概要
- Node.js + Express のWebアプリ (website-replacement-demo/ ディレクトリ)
- 既存HPのURLと参考URLを読み込み、Gemini API で改善版HPの
  デモHTMLを生成してブラウザでプレビューするツール
- Gemini API (@google/genai SDK) を使用、モデルは gemini-2.0-flash

■ 現在の状態
- 基本機能は完成し動作確認済み
- 複数APIキーローテーション (3キー) 実装済み
- モデルフォールバック (gemini-2.0-flash → gemini-2.5-flash) 実装済み
- 複数ページHP構成 (LP→HP) のプロンプト改善済み
- ローカル環境: C:\Users\h.tabata\my-repo\website-replacement-demo\
- 詳細は HANDOVER.md を参照

■ やりたいこと
(ここに次にやりたいことを書く)
```

---

## 12. 参考リンク

- Google AI Studio (APIキー発行): https://aistudio.google.com/app/apikey
- Gemini API ドキュメント: https://ai.google.dev/gemini-api/docs
- `@google/genai` NPM: https://www.npmjs.com/package/@google/genai
- Google Cloud 課金設定: https://console.cloud.google.com/billing
