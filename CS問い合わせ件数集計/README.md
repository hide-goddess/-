# CS お問い合わせ件数集計 GAS

## 概要

CS部勤務表の問合せ当番をもとに、各スタッフの日報から対応件数を自動集計して
【CS】お問い合わせ件数集計シートに反映するGoogle Apps Scriptです。

---

## スプレッドシート構成

| 役割 | スプシ名 | ID |
|------|----------|-----|
| 勤務表 | CS部勤務表 | `1w5nrMbL6-RbrjXlxMv_0DzlhEfX3rnUJQFyotAPj4VE` |
| 集計シート | 【CS】お問い合わせ件数集計シート | `1p2LzF43RpI72oP4gJph6Cazv8hPmYCN_n79aY2Bc1GE` |
| 日報（あゆみ） | yukinoさん_日報 | `17YS1m15AZDCBsFKwRq0LEBGsf7jY4exCTJXyhZfDW9E` |
| 日報（ななこ） | 菜々子さん_日報 | `1joyW47gyikwF1tRTRfgiy-ldcsNKef73Ne4JAE1Lvhs` |
| 日報（ともえ） | ともえさん_日報 | `1rKUxHw1Rwkc9BQsT9nY_15khBa2bRinJjZpDInOi7-A` |
| 日報（はるか） | はるか_日報new | `1ZRulEZaZqUxvhYIliYskskGo2_KDw2dWizN04WgOi1w` |
| 日報（りお） | りおさん_日報 | `1OLvkp5LXrCEiwnSNVfDK-mWPZ4Dka1l-l25EFRoAQgg` |
| 日報（ゆうか） | 優花さん_日報 | `1MaaS2V8L0KU48-0pPql9_0Sl5nE9aj6Rm6d5ONbTvFk` |
| 日報（みおな） | みおなさん_日報 | `1mPtv-l2u3JKBpKcRG0JZc5bSqw2e630vkfI-Je04Y6k` |

---

## 担当者名の対応表

| 勤務表（問合せ当番） | 集計シート表示名 | 日報スプシ |
|---------------------|-----------------|------------|
| あゆみ | あゆみ | yukinoさん_日報 |
| ななこ | ななこ | 菜々子さん_日報 |
| ともえ | ともえ | ともえさん_日報 |
| はるか | はるかさん | はるか_日報new |
| りお | りお | りおさん_日報 |
| ゆうか | ゆうか | 優花さん_日報 |
| みおな | みおなさん | みおなさん_日報 |

---

## 初回セットアップ手順

### 1. GASに貼り付け

1. 【CS】お問い合わせ件数集計シートを開く
2. 拡張機能 > Apps Script を開く
3. `コード.gs` の内容を貼り付けて保存

### 2. スクリプトのタイムゾーン設定

Apps Script エディタ > ⚙️ プロジェクトの設定 > タイムゾーン を **Asia/Tokyo** に設定

### 3. 権限を承認

各スプレッドシートへのアクセス権限を承認（初回実行時にダイアログが出ます）

### 4. ドロップダウンを既存タブに設定（任意）

```
initialSetupDropdowns() を実行
```

### 5. 3/15以降の過去データを一括取得

```
processMarchFromStart() を実行
```

### 6. 自動トリガーを設定

```
setupDailyTrigger() を実行
→ 毎日午前7時に runDailyUpdate() が自動実行されます
```

---

## 各関数の説明

| 関数名 | 説明 |
|--------|------|
| `runDailyUpdate()` | 毎日トリガーで実行。今日分の処理＋月末タブ作成 |
| `processToday()` | 今日のデータを手動処理 |
| `processMarchFromStart()` | 2026/3/15 〜 本日を一括処理 |
| `processBatch()` | 任意の期間を一括処理（関数内の日付を変更して実行） |
| `setupDailyTrigger()` | 毎日午前7時のトリガーを設定 |
| `initialSetupDropdowns()` | 既存の1〜3月タブにドロップダウンを追加 |
| `createMonthTab(year, month)` | 指定月のタブを新規作成 |

---

## 集計シートの構造

```
行1: タイトル（○年○月 お問い合わせ件数集計）
行2〜7: 空白 / サマリーエリア
行8: 列ヘッダー（日付 / 担当者 / 対応件数 / 備考）
行9〜: データ（日付順に自動挿入）
```

---

## 月タブ自動作成のタイミング

- 月末（例: 3/31）の `runDailyUpdate()` 実行後に翌月（4月）タブを自動作成
- 翌月タブにはヘッダー・列幅・ドロップダウンが自動設定される

---

## 対応件数の抽出ロジック（日報から）

以下の優先順位で件数を抽出します：

1. **「合計」を含む行** の C〜I列の数値を合計
2. **「問い合わせ」「対応」を含む行** の C〜I列を合計
3. **全行** の C〜I列の数値を合計（上記で取得できない場合）

> 日報ごとにフォーマットが異なる場合は、担当者ごとに抽出ロジックを調整してください。

---

## 色設定のカスタマイズ

`applyRowFormat()` 関数内の以下の変数を変更してください：

```javascript
var bgWeekdayOdd  = '#FFFFFF'; // 平日奇数行
var bgWeekdayEven = '#F3F3F3'; // 平日偶数行
var bgSaturday    = '#DDEEFF'; // 土曜
var bgSunday      = '#FFE4E4'; // 日曜
```

---

## 注意事項

- GASはスプレッドシートのオーナーまたは編集権限が必要です
- 日報タブ名のフォーマットが上記候補に含まれない場合は `generateTabNameCandidates()` に追加してください
- 実行ログは Apps Script エディタの「実行ログ」で確認できます
