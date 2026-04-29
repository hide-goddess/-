/**
 * CS生産性タブ M列 自動記入スクリプト
 *
 * 各メンバーの定量評価シートから月ごとの達成率（E21:E23の平均）を取得し、
 * CS生産性タブのM列に記入する。
 *
 * 【処理内容】
 *  - A列の月情報を参考に、各月ブロック内でメンバーが初めて出現する行のM列に記載
 *  - 対象セル: 各メンバーの定量評価シート「定量評価シート_N月」タブ E21:E23
 *  - E21:E23が全て空の場合は「達成率0%」と記載
 *  - 一部のみ記入がある場合は、記入セルのみの平均を算出
 *  - 外部スプレッドシートは閲覧権限でアクセス可能（SpreadsheetApp + Sheets APIフォールバック）
 */

// ===== 設定 =====
var ACH_CS_SHEET_NAME = "CS生産性";
var ACH_DATA_START_ROW = 13;

// メンバー名（CS生産性タブB列の表記）→ 定量評価スプレッドシートID
var ACH_MEMBER_SHEET_MAP = {
  "田中里奈":   "1LZisdyfMmShNsD0cgZtiLZe7uyUPfDDUrLv6U4h_ra0",
  "平松弥央菜": "1jeLIm3kRHl5-4b3EwvgrNnwfoAFG036ymmL2BggaRks",
  "小林陽香":   "1zL9jpB8WPmCgJaLudY8usZrHPHK7TBmVKLt17RAx0Yk",
  "中田菜々子": "1eK9tZEvv_H7iXCi7b2LsREzIEsyN17SYptklB3HXke4",
  "久保梨生":   "10CU-78ByNYhzr5LuIhK8makS1uZ_LSPK8HBuFGC9hhU",
  "宇梶知恵":   "1vLIsuqdOoWrmH-EXdBkUL3XSkcYxl5sEW7NGillEviI",
  "増子真也子": "1sbHXZaFivRzliSZEX72rvLFN4EU7bR6ltXbB39lZHVc",
  "山下優花":   "15PtZ4__btQ2UxpBNPbGdfGd8dKpjenRAT6Mrn3bMVck",
  "佐藤大河":   "1PMGKmUaU2hze5N4Ar7eCcU_uJz-jQThdq_3eGWuI_kw",
  "西田真優":   "1pG52bm-x6xkYjknwVlgOwqhLXlBaN5D9v0AWpDII1UY",
  "小林未侑":   "1mpuozouSmS8BJNFk2zYQAGlIp9m0M3fp7yOu3Ta_e4I",
  "中村八重子": "1QI8POM4hZAkjjwSeWwamxDmoUx4-zNRD3CTLS0SJyhs",
  "松元陸":     "1no-0rtLzKWybhJYne41zINUDqWh8xagF6kh5UvifPOs"
};

/**
 * メイン関数: CS生産性タブのM列に各メンバーの月ごと平均達成率を記入
 */
function fillAchievementRates() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var csSheet = ss.getSheetByName(ACH_CS_SHEET_NAME);
  if (!csSheet) {
    Logger.log("エラー: 「" + ACH_CS_SHEET_NAME + "」シートが見つかりません");
    return;
  }

  var lastRow = csSheet.getLastRow();
  if (lastRow < ACH_DATA_START_ROW) {
    Logger.log("エラー: データ行がありません");
    return;
  }

  var numRows = lastRow - ACH_DATA_START_ROW + 1;
  var data = csSheet.getRange(ACH_DATA_START_ROW, 1, numRows, 2).getValues();

  // M列をクリア
  csSheet.getRange(ACH_DATA_START_ROW, 13, numRows, 1).clearContent();
  SpreadsheetApp.flush();

  // 月-メンバーの初出行を特定
  var currentMonth = "";
  var entries = [];
  var seen = {};

  for (var r = 0; r < data.length; r++) {
    var colA = data[r][0];
    var colB = String(data[r][1]).trim();

    var extracted = achExtractMonth(colA);
    if (extracted !== "") {
      currentMonth = extracted;
    }

    if (colB !== "" && currentMonth !== "") {
      var key = currentMonth + "|" + colB;
      if (!seen[key]) {
        seen[key] = true;
        entries.push({
          month: currentMonth,
          monthNum: currentMonth.replace("月", ""),
          member: colB,
          row: ACH_DATA_START_ROW + r
        });
      }
    }
  }

  Logger.log("対象エントリ数: " + entries.length);

  // メンバーごとにグループ化（同じスプレッドシートを1回だけ開く）
  var memberGroups = {};
  for (var i = 0; i < entries.length; i++) {
    var e = entries[i];
    if (!memberGroups[e.member]) memberGroups[e.member] = [];
    memberGroups[e.member].push(e);
  }

  var results = [];

  for (var member in memberGroups) {
    var sheetId = ACH_MEMBER_SHEET_MAP[member];
    var group = memberGroups[member];

    if (!sheetId) {
      Logger.log("警告: " + member + " のスプレッドシートIDが未登録 → スキップ");
      continue;
    }

    // SpreadsheetApp.openById()を試行（閲覧権限で動作可能）
    var memberSs = null;
    var useApi = false;
    try {
      memberSs = SpreadsheetApp.openById(sheetId);
    } catch (err) {
      Logger.log(member + ": SpreadsheetApp失敗 → Sheets APIにフォールバック (" + err.message + ")");
      useApi = true;
    }

    for (var j = 0; j < group.length; j++) {
      var entry = group[j];
      var tabName = "定量評価シート_" + entry.monthNum + "月";
      var rate;

      if (useApi) {
        rate = achFetchViaApi(sheetId, tabName);
      } else {
        rate = achGetRate(memberSs, tabName);
      }

      results.push({ row: entry.row, value: rate });
      Logger.log(member + " " + entry.month + ": " + rate + " → 行" + entry.row);
    }
  }

  // M列に書き込み
  for (var i = 0; i < results.length; i++) {
    csSheet.getRange(results[i].row, 13).setValue(results[i].value);
  }

  SpreadsheetApp.flush();
  Logger.log("完了: " + results.length + "件の達成率をM列に書き込みました");
}

// ================================================================
// 達成率取得（SpreadsheetApp経由 — 閲覧権限で動作）
// ================================================================

/**
 * SpreadsheetApp経由で定量評価シートのE21:E23を読み取り、平均達成率を返す
 * @param {Spreadsheet} spreadsheet - メンバーのスプレッドシート
 * @param {string} tabName - タブ名（例: "定量評価シート_12月"）
 * @return {string} 達成率文字列（例: "達成率85%"）
 */
function achGetRate(spreadsheet, tabName) {
  try {
    var sheet = spreadsheet.getSheetByName(tabName);
    if (!sheet) {
      Logger.log("タブ未検出: " + tabName);
      return "達成率0%";
    }
    var values = sheet.getRange("E21:E23").getValues();
    return achCalcAverage(values);
  } catch (e) {
    Logger.log("読み取りエラー (" + tabName + "): " + e.message);
    return "達成率0%";
  }
}

// ================================================================
// 達成率取得（Sheets API経由 — SpreadsheetApp失敗時のフォールバック）
// ================================================================

/**
 * Google Sheets API経由で定量評価シートのE21:E23を読み取り、平均達成率を返す
 * SpreadsheetApp.openById()が失敗した場合のフォールバック
 * @param {string} spreadsheetId - スプレッドシートID
 * @param {string} tabName - タブ名（例: "定量評価シート_12月"）
 * @return {string} 達成率文字列
 */
function achFetchViaApi(spreadsheetId, tabName) {
  var range = tabName + "!E21:E23";
  var url = "https://sheets.googleapis.com/v4/spreadsheets/" + spreadsheetId
    + "/values/" + encodeURIComponent(range)
    + "?valueRenderOption=UNFORMATTED_VALUE";

  try {
    var response = UrlFetchApp.fetch(url, {
      headers: { "Authorization": "Bearer " + ScriptApp.getOAuthToken() },
      muteHttpExceptions: true
    });

    var code = response.getResponseCode();
    if (code !== 200) {
      Logger.log("Sheets API エラー (" + code + "): " + response.getContentText());
      return "達成率0%";
    }

    var json = JSON.parse(response.getContentText());
    var apiValues = json.values || [];

    // getValues()と同じ2次元配列形式に変換
    var values = [];
    for (var i = 0; i < 3; i++) {
      if (i < apiValues.length && apiValues[i].length > 0) {
        values.push([apiValues[i][0]]);
      } else {
        values.push([""]);
      }
    }

    return achCalcAverage(values);
  } catch (e) {
    Logger.log("Sheets APIフォールバック失敗: " + e.message);
    return "達成率0%";
  }
}

// ================================================================
// 平均達成率計算
// ================================================================

/**
 * E21:E23の値から平均達成率を計算する
 * - 全て空 → "達成率0%"
 * - 一部記入あり → 記入セルのみで平均を算出
 * - Google Sheets の % 書式（内部値 0.85 = 85%）と文字列 "85%" の両方に対応
 *
 * @param {Array<Array>} values - [[E21], [E22], [E23]] 形式の2次元配列
 * @return {string} 達成率文字列（例: "達成率85%"）
 */
function achCalcAverage(values) {
  var sum = 0;
  var count = 0;
  var allEmpty = true;

  for (var i = 0; i < values.length; i++) {
    var val = values[i][0];
    if (val === "" || val === null || val === undefined) continue;

    allEmpty = false;
    var pct;

    if (typeof val === "number") {
      // Google Sheets: パーセント書式のセルは内部値が小数（0.85 = 85%）
      pct = val * 100;
    } else {
      var str = String(val).replace(/%/g, "").replace(/\s/g, "");
      var num = parseFloat(str);
      if (isNaN(num)) continue;
      // "0.85" のような小数文字列はパーセントに変換、"85" はそのまま
      if (num > -1 && num <= 2 && str.indexOf(".") !== -1) {
        pct = num * 100;
      } else {
        pct = num;
      }
    }

    if (!isNaN(pct)) {
      sum += pct;
      count++;
    }
  }

  if (allEmpty) return "達成率0%";

  var avg = count > 0 ? sum / count : 0;
  return "達成率" + Math.round(avg) + "%";
}

// ================================================================
// 月抽出ヘルパー
// ================================================================

/**
 * A列の値から月ラベルを抽出する
 * Date型、"12月"、"2024年12月"、数値(1〜12) に対応
 * @param {*} value - A列のセル値
 * @return {string} 月ラベル（例: "12月"）。判定不能なら空文字
 */
function achExtractMonth(value) {
  if (!value) return "";
  if (value instanceof Date && !isNaN(value.getTime())) {
    return (value.getMonth() + 1) + "月";
  }
  var s = String(value).trim();
  if (s === "") return "";
  var monthMatch = s.match(/(\d{1,2})月/);
  if (monthMatch) return monthMatch[1] + "月";
  var num = parseInt(s, 10);
  if (!isNaN(num) && num >= 1 && num <= 12) return num + "月";
  return s;
}

// ================================================================
// カスタムメニュー（既存の cspOnOpen に追加する場合は不要）
// ================================================================

function achOnOpen() {
  SpreadsheetApp.getUi()
    .createMenu("📊 達成率ツール")
    .addItem("M列に達成率を記入", "fillAchievementRates")
    .addToUi();
}
