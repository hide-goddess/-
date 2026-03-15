# 行動目標達成率 月次自動更新 GAS

## 概要

毎月1日に前月分の各メンバーの **Key Result** と **達成率** を
「メンバーの日報・評価制度管理」スプレッドシートの **行動目標達成率** タブへ自動書き込みします。

---

## セットアップ手順

### 1. GAS プロジェクトを作成する

1. [メンバーの日報・評価制度管理スプシ](https://docs.google.com/spreadsheets/d/1gIygjcHKgGvg3j0RU0LxzrPeGxNF9cJeOrxznHqwOAo/edit) を開く
2. メニュー **「拡張機能」→「Apps Script」** を選択
3. 既存のコードをすべて削除し、`monthly_goals_achievement.gs` の内容を貼り付けて保存

### 2. 権限を付与する

1. `setupMonthlyTrigger` 関数を選択して **「実行」** をクリック
2. Google アカウントの承認ダイアログが表示されたら **「許可」** をクリック
   （他のスプレッドシートへのアクセス権限が必要なため）

### 3. 月次トリガーを設定する

`setupMonthlyTrigger` 関数を1回だけ実行すると、
**毎月1日 午前9時** に `autoUpdateMonthlyGoals` が自動実行されるトリガーが登録されます。

---

## 手動で特定月のデータを取得する

```javascript
// スクリプトエディタのコンソールで実行
updateSpecificMonth(2025, 12); // 2025年12月分を取得
updateSpecificMonth(2026, 1);  // 2026年1月分を取得
```

---

## 出力フォーマット（行動目標達成率タブ）

```
| 2025年12月                                              |  ← 月ヘッダー（青背景）
| 名前    | Key Result① | 達成率① | Key Result② | 達成率② | Key Result③ | 達成率③ |
| 松元陸  | …           | 80%     | …           | 90%     | …           |         |
| 平松弥央菜 | …         | …       |             |         |             |         |
  ︙（15名分）

（2行空けて次の月）

| 2026年1月 …
```

- Key Result・達成率はメンバーの評価シート各月タブの **B21:B23 / E21:E23** から取得
- 23行目に記載がない場合はその列を空欄にする（エラーにはしない）
- 同じ月のデータが既にある場合は **上書きせずスキップ**

---

## データ取得元

| メンバー | スプレッドシート |
|---------|---------------|
| 松元陸 | [リンク](https://docs.google.com/spreadsheets/d/1no-0rtLzKWybhJYne41zINUDqWh8xagF6kh5UvifPOs) |
| 平松弥央菜 | [リンク](https://docs.google.com/spreadsheets/d/1jeLIm3kRHl5-4b3EwvgrNnwfoAFG036ymmL2BggaRks) |
| 小林陽香 | [リンク](https://docs.google.com/spreadsheets/d/1zL9jpB8WPmCgJaLudY8usZrHPHK7TBmVKLt17RAx0Yk) |
| 小林未侑 | [リンク](https://docs.google.com/spreadsheets/d/1mpuozouSmS8BJNFk2zYQAGlIp9m0M3fp7yOu3Ta_e4I) |
| 中田菜々子 | [リンク](https://docs.google.com/spreadsheets/d/1eK9tZEvv_H7iXCi7b2LsREzIEsyN17SYptklB3HXke4) |
| 久保梨生 | [リンク](https://docs.google.com/spreadsheets/d/10CU-78ByNYhzr5LuIhK8makS1uZ_LSPK8HBuFGC9hhU) |
| 宇梶知恵 | [リンク](https://docs.google.com/spreadsheets/d/1vLIsuqdOoWrmH-EXdBkUL3XSkcYxl5sEW7NGillEviI) |
| 増子真也子 | [リンク](https://docs.google.com/spreadsheets/d/1sbHXZaFivRzliSZEX72rvLFN4EU7bR6ltXbB39lZHVc) |
| 川端歩実 | [リンク](https://docs.google.com/spreadsheets/d/1sLz2fvbPOA1mwwGAUOtn2zOO97XosnbI1jXqJ2n2vlc) |
| 田中里奈 | [リンク](https://docs.google.com/spreadsheets/d/1LZisdyfMmShNsD0cgZtiLZe7uyUPfDDUrLv6U4h_ra0) |
| 山下優花 | [リンク](https://docs.google.com/spreadsheets/d/15PtZ4__btQ2UxpBNPbGdfGd8dKpjenRAT6Mrn3bMVck) |
| 中村八重子 | [リンク](https://docs.google.com/spreadsheets/d/1QI8POM4hZAkjjwSeWwamxDmoUx4-zNRD3CTLS0SJyhs) |
| 佐藤大河 | [リンク](https://docs.google.com/spreadsheets/d/1PMGKmUaU2hze5N4Ar7eCcU_uJz-jQThdq_3eGWuI_kw) |
| 青木博資 | [リンク](https://docs.google.com/spreadsheets/d/1PecGIyJDbHy2y1yXIia0Ada1HENe3qY6W-HSppiyUTc) |
| 田畑秀晃 | [リンク](https://docs.google.com/spreadsheets/d/1a7K7N062cHMRTwX8lYpujRGH6b6z1s9bDf--v_DJZ7M) |
