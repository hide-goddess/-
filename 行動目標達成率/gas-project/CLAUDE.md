# 行動目標達成率 自動更新スクリプト — 引継ぎメモ

## プロジェクト概要

Google Apps Script (GAS) で「行動目標達成率」スプレッドシートを毎日自動更新するスクリプト。
各メンバーの個人スプシから KR（Key Result）と達成率を取得し、集計タブに書き込む。

## ファイル

| パス | 説明 |
|------|------|
| `/home/user/-/行動目標達成率/gas-project/monthly_goals_achievement.gs` | ローカルの最新コード（GASにコピペして使用） |

## Git ブランチ

```
claude/automate-monthly-goals-XZ93N
```

## スプレッドシート

| 種別 | スプレッドシートID |
|------|-------------------|
| 集計先（メイン） | `14A0vw4W--Tn3B30ylWjnVT-1tLjG9gmtXtRRNQatq3M` |

## スクリプトの設定値

```javascript
var MAIN_SPREADSHEET_ID = '14A0vw4W--Tn3B30ylWjnVT-1tLjG9gmtXtRRNQatq3M';
var ACHIEVEMENT_TAB_NAME = '行動目標達成率';
var fromMonth = 1;  // 抽出開始月
var toMonth   = 4;  // 抽出終了月（現在4月まで）
```

## 自動実行トリガー

- 毎日 **午前4時** に `autoUpdateMonthlyGoals` が実行される
- GAS エディタで `setupTrigger` 関数を一度実行することで設定される

## MEMBERSリスト（メンバーとスプシID）

| 名前 | ssId | 備考 |
|------|------|------|
| 松元陸 | `1no-0rtLzKWybhJYne41zINUDqWh8xagF6kh5UvifPOs` | |
| 平松弥央菜 | `1jeLIm3kRHl5-4b3EwvgrNnwfoAFG036ymmL2BggaRks` | tabIds: {2: 1824428192} |
| 小林陽香 | `1zL9jpB8WPmCgJaLudY8usZrHPHK7TBmVKLt17RAx0Yk` | |
| 小林未侑 | `1mpuozouSmS8BJNFk2zYQAGlIp9m0M3fp7yOu3Ta_e4I` | |
| 中田菜々子 | `1eK9tZEvv_H7iXCi7b2LsREzIEsyN17SYptklB3HXke4` | |
| 久保梨生 | `10CU-78ByNYhzr5LuIhK8makS1uZ_LSPK8HBuFGC9hhU` | |
| 宇梶知恵 | `1vLIsuqdOoWrmH-EXdBkUL3XSkcYxl5sEW7NGillEviI` | tabIds: {2: 482499501} ※重要 |
| 増子真也子 | `1sbHXZaFivRzliSZEX72rvLFN4EU7bR6ltXbB39lZHVc` | |
| 川端歩実 | `1sLz2fvbPOA1mwwGAUOtn2zOO97XosnbI1jXqJ2n2vlc` | tabIds: {2: 1784140390} |
| 田中里奈 | `1LZisdyfMmShNsD0cgZtiLZe7uyUPfDDUrLv6U4h_ra0` | |
| 山下優花 | `15PtZ4__btQ2UxpBNPbGdfGd8dKpjenRAT6Mrn3bMVck` | |
| 中村八重子 | `1QI8POM4hZAkjjwSeWwamxDmoUx4-zNRD3CTLS0SJyhs` | |
| 佐藤大河 | `1PMGKmUaU2hze5N4Ar7eCcU_uJz-jQThdq_3eGWuI_kw` | |
| 青木博資 | `1PecGIyJDbHy2y1yXIia0Ada1HENe3qY6W-HSppiyUTc` | |
| 田畑秀晃 | `1a7K7N062cHMRTwX8lYpujRGH6b6z1s9bDf--v_DJZ7M` | |
| 田中春奈 | `1vmMTNe38hVlvcbK2s21MU70Dwi1W7VYqppLsfKJ3z2Y` | tabIds: {2: 111794697} |

## tabIds プロパティについて

```javascript
tabIds: { 月番号: gid }
```

- `getSheetByName` では同名の空タブが先に取得されてしまう問題を回避するため
- `tabIds` が指定されている月は **必ずgidで直接タブを取得**（getSheetByName をスキップ）
- 宇梶知恵の2月が典型例：`定量評価シート_2月`（空）と`定量評価シート_2月_`（データあり）が両方存在

## krRangeByMonth プロパティについて

```javascript
krRangeByMonth: { 月番号: 'セル範囲' }
```

- メンバーによってKRのセル位置が異なる場合に月ごとに上書き指定できる
- 例: `krRangeByMonth: { 3: 'B10:C15' }`

## 主要関数

| 関数名 | 説明 |
|--------|------|
| `autoUpdateMonthlyGoals` | メイン関数（トリガーで自動実行） |
| `runMonthRange` | 指定月範囲を手動で一括更新 |
| `setupTrigger` | 毎日4時のトリガーを設定（一度だけ実行） |
| `deleteTrigger` | トリガーを削除 |

## GASへの適用手順

1. GASエディタを開く（集計スプシのツール → Apps Script）
2. `monthly_goals_achievement.gs` の内容を全コピー
3. GASエディタの既存コードを全削除 → 貼り付け → 保存
4. `setupTrigger` を一度実行してトリガーを設定
5. `runMonthRange` を実行して即時反映を確認

## 過去の主な修正履歴

1. **宇梶知恵 2月データ抽出不具合の修正**
   - 原因: 同名の空タブが存在し `getSheetByName` が空タブを取得していた
   - 修正: `tabIds` 指定時は `getSheetByName` をスキップしてgidで直接取得

2. **メインスプシIDの変更**
   - 変更後: `14A0vw4W--Tn3B30ylWjnVT-1tLjG9gmtXtRRNQatq3M`

3. **抽出月範囲の拡張**
   - 1月〜4月に設定（`fromMonth=1, toMonth=4`）

4. **自動実行時刻の変更**
   - 毎日午前4時に変更（以前は5時）
