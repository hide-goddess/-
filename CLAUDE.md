# プロジェクト概要: GAS CS生産性自動化ツール

Google Apps Script (GAS) で CS生産性スプレッドシートの自動記入を行うツール群。

## リポジトリ構成

```
生産性タブ/
├── fillCSProductivity.gs      # G〜L列自動記入（v16）
└── fillAchievementRates.gs    # M列 達成率自動記入
クラススタート通知/
└── クラス案内進捗管理シート.gs  # Discord通知スクリプト
```

## 対象スプレッドシート

**CS生産性タブ（メインシート）**
- ID: `1gIygjcHKgGvg3j0RU0LxzrPeGxNF9cJeOrxznHqwOAo`
- シート名: `CS生産性`
- ヘッダー行: 12行目 / データ開始: 13行目
- A列=月, B列=メンバー, C列=大カテゴリ, E列=タスク内容, F列=カテゴリー
- G〜L列: fillCSProductivity.gs が自動記入
- M列: fillAchievementRates.gs が達成率を自動記入

## メンバー一覧と定量評価シートID

| メンバー名 | スプレッドシートID | エイリアス |
|---|---|---|
| 田中春奈 | (未登録) | はるな |
| 田中里奈 | `1LZisdyfMmShNsD0cgZtiLZe7uyUPfDDUrLv6U4h_ra0` | りな |
| 平松弥央菜 | `1jeLIm3kRHl5-4b3EwvgrNnwfoAFG036ymmL2BggaRks` | みおな |
| 小林陽香 | `1zL9jpB8WPmCgJaLudY8usZrHPHK7TBmVKLt17RAx0Yk` | える |
| 中田菜々子 | `1eK9tZEvv_H7iXCi7b2LsREzIEsyN17SYptklB3HXke4` | 中田菜々子, ななこ |
| 久保梨生 | `10CU-78ByNYhzr5LuIhK8makS1uZ_LSPK8HBuFGC9hhU` | リオ, りお |
| 宇梶知恵 | `1vLIsuqdOoWrmH-EXdBkUL3XSkcYxl5sEW7NGillEviI` | ともえ |
| 増子真也子 | `1sbHXZaFivRzliSZEX72rvLFN4EU7bR6ltXbB39lZHVc` | まあや, 増子真也子 |
| 山下優花 | `15PtZ4__btQ2UxpBNPbGdfGd8dKpjenRAT6Mrn3bMVck` | 山下優花, 優花 |
| 佐藤大河 | `1PMGKmUaU2hze5N4Ar7eCcU_uJz-jQThdq_3eGWuI_kw` | 佐藤大河 |
| 西田真優 | `1pG52bm-x6xkYjknwVlgOwqhLXlBaN5D9v0AWpDII1UY` | mayu |
| 小林未侑 | `1mpuozouSmS8BJNFk2zYQAGlIp9m0M3fp7yOu3Ta_e4I` | 未侑, 小林未侑 |
| 中村八重子 | `1QI8POM4hZAkjjwSeWwamxDmoUx4-zNRD3CTLS0SJyhs` | 八重子, NYaeko |
| 松元陸 | `1no-0rtLzKWybhJYne41zINUDqWh8xagF6kh5UvifPOs` | Riku, りく |

兼業メンバー（両タブ検索）: 小林未侑, 中村八重子, 松元陸

## スクリプト詳細

### fillCSProductivity.gs（G〜L列）
- メンバーごとの担当タスクを類似度マッチングで特定
- 頻度キャップ方式でL列の時間を計算
- 月別サマリー + 全体サマリーをデータ末尾に出力
- 関数プレフィックス: `csp`

### fillAchievementRates.gs（M列）
- 各メンバーの定量評価シート「定量評価シート_N月」タブ E21:E23 の平均達成率を取得
- A列の月 × B列のメンバーの初出行のM列に「達成率XX%」形式で記入
- E21:E23が全て空 → 「達成率0%」
- 閲覧権限対応: SpreadsheetApp.openById() + Sheets APIフォールバック
- 関数プレフィックス: `ach`

## コーディング規約
- GAS（Google Apps Script）V8ランタイム対応
- 定数名: 大文字スネークケース + スクリプト固有プレフィックス（CSP_, ACH_）
- 関数名: キャメルケース + スクリプト固有プレフィックス（csp, ach）
- 同一GASプロジェクト内で複数.gsファイルが同じ名前空間を共有するため、プレフィックスで衝突回避
- コミットメッセージ: 日本語
