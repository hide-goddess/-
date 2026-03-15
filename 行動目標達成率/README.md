# 行動目標達成率 月次自動更新 GAS

## シートレイアウト（横展開）

```
行1: | 名前 | 日報 | 評価シート | 1月[←6列→] | 2月[←6列→] | … | 12月[←6列→] |
行2: |      |      |            | KR① 達成率① KR② 達成率② KR③ 達成率③ | … |
行3: | 松元陸     | …  | リンク | ←当月データ→                          | … |
行4: | 平松弥央菜 | …  | リンク |                                        | … |
  ︙（15名）
```

- **行（縦）= メンバー**、**列（横）= 月**
- 1月〜12月が D列から右へ展開（1ヶ月 = 6列）
- 月ヘッダーは青背景で6列結合表示

---

## 更新タイミング

| 期間 | 動作 |
|------|------|
| 毎月 **1〜10日** | 毎日 午前9時に当月データを上書き更新 |
| 毎月 **11日以降** | 自動スキップ（翌月1日まで待機） |

> **なぜ10日まで毎日更新するか？**
> 月初に評価シートへの記入が遅れた場合でも、10日までなら自動で取り込めます。

---

## セットアップ手順

### 1. GAS プロジェクトを作成する

1. [メンバーの日報・評価制度管理スプシ](https://docs.google.com/spreadsheets/d/1gIygjcHKgGvg3j0RU0LxzrPeGxNF9cJeOrxznHqwOAo/edit) を開く
2. メニュー **「拡張機能」→「Apps Script」** を選択
3. 既存のコードをすべて削除し、`monthly_goals_achievement.gs` の内容を貼り付けて保存（Ctrl+S）

### 2. 初回シート初期化 + トリガー設定（1回だけ実行）

1. 関数の選択で **`setupTrigger`** を選んで **「実行」**
2. 権限承認ダイアログが表示されたら **「許可」** をクリック
3. 続けて **`autoUpdateMonthlyGoals`** を実行すると当月分のデータが即座に書き込まれます

---

## 手動で特定月のデータを取得する

```javascript
updateSpecificMonth(12); // 12月分を取得
updateSpecificMonth(1);  // 1月分を取得
```

---

## データ取得元（各メンバー評価シート）

| メンバー | 取得タブ | 取得セル |
|---------|---------|---------|
| 全メンバー共通 | `定量評価シート_◯月` | Key Result: B21:B23 / 達成率: E21:E23 |

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
