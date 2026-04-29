# CS お問い合わせ件数集計 GAS — 引き継ぎドキュメント

> 新しいチャットセッションでこのファイルを読めば、すぐに作業を再開できます。

---

## プロジェクト概要

CSスタッフの日報スプレッドシートから対応件数・対応時間を自動集計し、
【CS】お問い合わせ件数集計シートに書き込む Google Apps Script (GAS) です。

- **GAS スクリプトID**: `1XWJ4ykLJqINMhMuO7FosPUng3mKOyyLXiBJqOl1k56uZAuxijUpjpAG-`
- **集計シートID**: `1p2LzF43RpI72oP4gJph6Cazv8hPmYCN_n79aY2Bc1GE`
- **開発ブランチ**: `claude/setup-cs-tracking-sheets-JM9F7`
- **ローカルコード**: `/home/user/-/CS問い合わせ件数集計/コード.gs`

---

## スプレッドシートID一覧

| 役割 | ID |
|------|----|
| 集計シート（書き込み先） | `1p2LzF43RpI72oP4gJph6Cazv8hPmYCN_n79aY2Bc1GE` |
| CS部勤務表 | `1w5nrMbL6-RbrjXlxMv_0DzlhEfX3rnUJQFyotAPj4VE` |
| 日報（あゆみ） | `17YS1m15AZDCBsFKwRq0LEBGsf7jY4exCTJXyhZfDW9E` |
| 日報（ななこ） | `1joyW47gyikwF1tRTRfgiy-ldcsNKef73Ne4JAE1Lvhs` |
| 日報（ともえ） | `1rKUxHw1Rwkc9BQsT9nY_15khBa2bRinJjZpDInOi7-A` |
| 日報（はるかさん） | `1ZRulEZaZqUxvhYIliYskskGo2_KDw2dWizN04WgOi1w` |
| 日報（りお） | `1OLvkp5LXrCEiwnSNVfDK-mWPZ4Dka1l-l25EFRoAQgg` |
| 日報（ゆうか） | `1MaaS2V8L0KU48-0pPql9_0Sl5nE9aj6Rm6d5ONbTvFk` |
| 日報（みおなさん） | `1mPtv-l2u3JKBpKcRG0JZc5bSqw2e630vkfI-Je04Y6k` |

---

## バージョン履歴と現在の状態

### v6（ローカル保存済み・GASに適用済み）
- ローカルファイル: `/home/user/-/CS問い合わせ件数集計/コード.gs`
- 列構成: 1スタッフにつき **2列**（担当者名 / 対応時間）
  ```
  A: 日付  B: 担当者合計  C: 対応件数合計
  D: 担当者1  E: 対応時間1
  F: 担当者2  G: 対応時間2  ... （最大7スタッフ）
  ```
- ゆうかさんの `excludeCategories: ['CTO室']` 対応済み

### v7（チャット内で設計完了・**未保存・未デプロイ**）
- 列構成: 1スタッフにつき **3列**（担当者名 / 対応時間 / 対応件数）に拡張
  ```
  A: 日付  B: 担当者合計  C: 対応件数合計
  D: 担当者1  E: 対応時間1  F: 対応件数1
  G: 担当者2  H: 対応時間2  I: 対応件数2  ...
  ```
- `totalCols = 3 + MAX_STAFF_COLS * 3`（v6は `* 2`）
- 新関数 `fixAllTabHeaders()` — 既存タブのヘッダーを3列構成に修正
- バックフィルを2分割: `backfillPart1`（1/1〜2/15）/ `backfillPart2`（2/16〜4/3）

---

## v7 の主要変更点（コード差分）

### 1. writeSummary — 対応件数列を追加

```javascript
// v6（変更前）
rowValues.push(staffData[i].name);
rowValues.push(staffData[i].time + '分');

// v7（変更後）★ count を追加
rowValues.push(staffData[i].name);
rowValues.push(staffData[i].time + '分');
rowValues.push(staffData[i].count);  // ★ 追加

var totalCols = 3 + MAX_STAFF_COLS * 3; // ★ *2 → *3

// アライメントも3列分に変更
for (var i = 0; i < MAX_STAFF_COLS; i++) {
  sheet.getRange(writeRow, 4 + i * 3).setHorizontalAlignment('center'); // 担当者名
  sheet.getRange(writeRow, 5 + i * 3).setHorizontalAlignment('right');  // 対応時間
  sheet.getRange(writeRow, 6 + i * 3).setHorizontalAlignment('right');  // 対応件数
}
```

### 2. setupMonthHeader — 3列ヘッダーに変更

```javascript
function setupMonthHeader(sheet, year, month) {
  var totalCols = 3 + MAX_STAFF_COLS * 3;
  sheet.setColumnWidth(1, 160); sheet.setColumnWidth(2, 180); sheet.setColumnWidth(3, 90);
  for (var i = 0; i < MAX_STAFF_COLS; i++) {
    sheet.setColumnWidth(4 + i * 3, 110); // 担当者名
    sheet.setColumnWidth(5 + i * 3, 80);  // 対応時間
    sheet.setColumnWidth(6 + i * 3, 80);  // 対応件数
  }
  var headers = ['日付', '担当者（合計）', '対応件数'];
  for (var i = 1; i <= MAX_STAFF_COLS; i++) {
    headers.push('担当者' + i);
    headers.push('対応時間' + i);
    headers.push('対応件数' + i); // ★ 追加
  }
  sheet.getRange(HEADER_ROW, 1, 1, totalCols).setValues([headers])
       .setFontWeight('bold').setHorizontalAlignment('center').setVerticalAlignment('middle');
  sheet.setRowHeight(HEADER_ROW, 25);
  // タイトル行（1行目）も totalCols でマージ
  sheet.getRange(1, 1, 1, totalCols).merge()
       .setValue(year + '年' + month + '月 お問い合わせ件数集計')
       .setFontWeight('bold').setFontSize(13)
       .setHorizontalAlignment('center').setVerticalAlignment('middle');
  sheet.setRowHeight(1, 40);
}
```

### 3. fixAllTabHeaders — 既存タブのヘッダー修正（新規追加）

```javascript
function fixAllTabHeaders() {
  var targets = [
    {year:2026,month:1},{year:2026,month:2},
    {year:2026,month:3},{year:2026,month:4}
  ];
  var ss = SpreadsheetApp.openById(SS_ID.summary);
  for (var i = 0; i < targets.length; i++) {
    var sheetName = targets[i].year + '年' + targets[i].month + '月';
    var sheet = ss.getSheetByName(sheetName);
    if (!sheet) { Logger.log('タブなし: ' + sheetName); continue; }

    var totalCols = 3 + MAX_STAFF_COLS * 3;
    var headers = ['日付', '担当者（合計）', '対応件数'];
    for (var j = 1; j <= MAX_STAFF_COLS; j++) {
      headers.push('担当者' + j);
      headers.push('対応時間' + j);
      headers.push('対応件数' + j);
    }
    sheet.getRange(HEADER_ROW, 1, 1, totalCols)
         .setValues([headers])
         .setFontWeight('bold')
         .setHorizontalAlignment('center')
         .setVerticalAlignment('middle');
    sheet.setRowHeight(HEADER_ROW, 25);

    sheet.setColumnWidth(1, 160); sheet.setColumnWidth(2, 180); sheet.setColumnWidth(3, 90);
    for (var j = 0; j < MAX_STAFF_COLS; j++) {
      sheet.setColumnWidth(4 + j * 3, 110);
      sheet.setColumnWidth(5 + j * 3, 80);
      sheet.setColumnWidth(6 + j * 3, 80);
    }
    Logger.log('ヘッダー修正完了: ' + sheetName);
  }
  Logger.log('=== fixAllTabHeaders 完了 ===');
}
```

### 4. backfillPart1 / backfillPart2 — タイムアウト対策で2分割

```javascript
function backfillPart1() {
  Logger.log('=== バックフィル前半（2026/1/1〜2/15）開始 ===');
  processBatchRange(new Date(2026, 0, 1), new Date(2026, 1, 15));
  Logger.log('=== バックフィル前半 完了 ===');
}

function backfillPart2() {
  Logger.log('=== バックフィル後半（2026/2/16〜4/3）開始 ===');
  processBatchRange(new Date(2026, 1, 16), new Date(2026, 3, 3));
  Logger.log('=== バックフィル後半 完了 ===');
}
```

---

## スタッフ設定（STAFF_LIST）

```javascript
var STAFF_LIST = [
  { displayName: 'あゆみ',     reportId: '17YS1m15AZDCBsFKwRq0LEBGsf7jY4exCTJXyhZfDW9E',
    contentColIdx: 2, categoryColIdx: 1, useColCTime: false,
    csCategoryFilter: ['LINE対応'], excludeCategories: [] },
  { displayName: 'ななこ',     reportId: '1joyW47gyikwF1tRTRfgiy-ldcsNKef73Ne4JAE1Lvhs',
    contentColIdx: 2, categoryColIdx: 1, useColCTime: false,
    csCategoryFilter: null, excludeCategories: [] },
  { displayName: 'ともえ',     reportId: '1rKUxHw1Rwkc9BQsT9nY_15khBa2bRinJjZpDInOi7-A',
    contentColIdx: 2, categoryColIdx: 1, useColCTime: false,
    csCategoryFilter: null, excludeCategories: [] },
  { displayName: 'はるかさん', reportId: '1ZRulEZaZqUxvhYIliYskskGo2_KDw2dWizN04WgOi1w',
    contentColIdx: 4, categoryColIdx: 3, useColCTime: true,
    csCategoryFilter: null, excludeCategories: [] },
  { displayName: 'りお',       reportId: '1OLvkp5LXrCEiwnSNVfDK-mWPZ4Dka1l-l25EFRoAQgg',
    contentColIdx: 3, categoryColIdx: 2, useColCTime: false,
    csCategoryFilter: null, excludeCategories: [] },
  { displayName: 'ゆうか',     reportId: '1MaaS2V8L0KU48-0pPql9_0Sl5nE9aj6Rm6d5ONbTvFk',
    contentColIdx: 2, categoryColIdx: 1, useColCTime: false,
    csCategoryFilter: null, excludeCategories: ['CTO室'] }, // CTO室を件数・時間から除外
  { displayName: 'みおなさん', reportId: '1mPtv-l2u3JKBpKcRG0JZc5bSqw2e630vkfI-Je04Y6k',
    contentColIdx: 2, categoryColIdx: 1, useColCTime: false,
    csCategoryFilter: null, excludeCategories: [] },
];
```

---

## スタッフ別 日報の列構成の違い

| スタッフ | カテゴリ列 | 業務内容列 | 対応時間の計算方法 |
|---------|-----------|-----------|-----------------|
| あゆみ / ななこ / ともえ / ゆうか / みおなさん | B列(idx=1) | C列(idx=2) | 対象行数 × 30分 |
| りお | C列(idx=2) | D列(idx=3) | 対象行数 × 30分 |
| はるかさん | D列(idx=3) | E列(idx=4) | C列の値(h)× 60分 |

---

## GAS デプロイ手順（毎回の更新フロー）

```
1. GASエディタ（script.google.com）を開く
   → スクリプトID: 1XWJ4ykLJqINMhMuO7FosPUng3mKOyyLXiBJqOl1k56uZAuxijUpjpAG-

2. コード.gs の内容を全選択して貼り付け → 保存（Ctrl+S）

3. 実行したい関数を選択して「実行」ボタン
   - fixAllTabHeaders()  → 既存タブのヘッダー修正（v7適用時に1回だけ）
   - backfillPart1()     → 2026/1/1〜2/15 のデータ再書き込み
   - backfillPart2()     → 2026/2/16〜4/3 のデータ再書き込み
   - runDailyUpdate()    → 手動で当日・前日分を処理
   - processToday()      → 今日分のみ処理

4. ログ確認: 実行 > ログ（または Ctrl+Enter）
```

---

## ローカル開発環境（clasp）

```bash
# ローカルコードをGASにプッシュ
cd /home/user/-/CS問い合わせ件数集計
clasp push

# ログ確認
clasp logs --watch

# 関数をリモート実行（API実行可能デプロイが必要）
clasp run <関数名>
```

> **注意**: `clasp run` には GAS APIの有効化 + API実行可能デプロイが必要。
> 動かない場合はGASエディタから直接実行する。

---

## 未完了タスク（次のチャットで対応）

- [ ] **v7コードをローカルファイルに保存**
  - 対象: `/home/user/-/CS問い合わせ件数集計/コード.gs`（現在v6）
  - v7の変更内容はこのドキュメントの「v7の主要変更点」を参照
  - このファイル内の変更を適用して上書き保存する

- [ ] **v7コードをGASに貼り付けてデプロイ**
  - `fixAllTabHeaders()` で既存タブのヘッダーを修正
  - `backfillPart1()` → `backfillPart2()` でデータ再書き込み

- [ ] **動作確認**
  - 集計シートの1〜4月タブで「担当者N / 対応時間N / 対応件数N」の3列が正しく並んでいるか確認

---

## よく使うコマンド

```bash
# ローカルコードを確認
cat /home/user/-/CS問い合わせ件数集計/コード.gs

# ブランチ確認・切り替え
git branch
git checkout claude/setup-cs-tracking-sheets-JM9F7

# 変更をプッシュ
git add コード.gs
git commit -m "feat: v7 — 対応件数列を担当者ごとに追加"
git push -u origin claude/setup-cs-tracking-sheets-JM9F7
```

---

## トラブルシューティング

| 症状 | 原因 | 対処法 |
|------|------|--------|
| 列がずれる | 既存タブがv6形式（2列）のまま | `fixAllTabHeaders()` を実行 |
| GASタイムアウト | バックフィル期間が長すぎる | `backfillPart1` / `backfillPart2` に分けて実行 |
| `clasp run` 失敗 | API実行可能デプロイが未設定 | GASエディタから直接関数を実行 |
| 4月タブのデータが入らない | 月タブが存在しないまま処理した | `createMonthTab(2026, 4)` を実行後、再度バックフィル |
| ゆうかさんのCTO室が集計される | excludeCategories未設定 | STAFF_LISTのゆうかさんに `excludeCategories: ['CTO室']` があるか確認 |
