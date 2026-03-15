/**
 * ================================================================
 * CS お問い合わせ件数集計 自動反映スクリプト v5
 * ================================================================
 *
 * 機能:
 *   1. 全スタッフの日報スプシを確認して対応件数を抽出
 *   2. 対応件数が1件以上のスタッフを1行にまとめて集計シートに記録
 *   3. 月末に翌月タブを自動作成
 *
 * 初回セットアップ手順:
 *   1. このスクリプトをお問い合わせ件数集計シートのGASに貼り付け保存
 *   2. 「setupDailyTrigger」を実行してトリガーを設定
 *   3. 「processMarchFromStart」を実行して3/15以降のデータを一括取得
 *
 * ================================================================
 */

// ================================================================
// スプレッドシートID設定
// ================================================================

var SS_ID = {
  schedule: '1w5nrMbL6-RbrjXlxMv_0DzlhEfX3rnUJQFyotAPj4VE', // CS部勤務表
  summary:  '1p2LzF43RpI72oP4gJph6Cazv8hPmYCN_n79aY2Bc1GE', // 【CS】お問い合わせ件数集計シート
};

// ================================================================
// スタッフ設定（全員チェック対象）
// displayName: 集計シートB列に書く名前
// reportId: 日報スプレッドシートのID
// ================================================================

var STAFF_LIST = [
  { displayName: 'あゆみ',     reportId: '17YS1m15AZDCBsFKwRq0LEBGsf7jY4exCTJXyhZfDW9E' }, // yukinoさん_日報
  { displayName: 'ななこ',     reportId: '1joyW47gyikwF1tRTRfgiy-ldcsNKef73Ne4JAE1Lvhs' }, // 菜々子さん_日報
  { displayName: 'ともえ',     reportId: '1rKUxHw1Rwkc9BQsT9nY_15khBa2bRinJjZpDInOi7-A' }, // ともえさん_日報
  { displayName: 'はるかさん', reportId: '1ZRulEZaZqUxvhYIliYskskGo2_KDw2dWizN04WgOi1w' }, // はるか_日報new
  { displayName: 'りお',       reportId: '1OLvkp5LXrCEiwnSNVfDK-mWPZ4Dka1l-l25EFRoAQgg' }, // りおさん_日報
  { displayName: 'ゆうか',     reportId: '1MaaS2V8L0KU48-0pPql9_0Sl5nE9aj6Rm6d5ONbTvFk' }, // 優花さん_日報
  { displayName: 'みおなさん', reportId: '1mPtv-l2u3JKBpKcRG0JZc5bSqw2e630vkfI-Je04Y6k' }, // みおなさん_日報
];

// 集計シートのデータ開始行（1〜7行目がタイトル/ヘッダー領域）
var DATA_START_ROW  = 9;
var HEADER_ROW      = 8;

// 日報の先頭何行をスキップするか（管理情報・見出し行）
var REPORT_SKIP_ROW = 6;

var DOW_JP = ['日', '月', '火', '水', '木', '金', '土'];

// ================================================================
// ヘルパー: Date から JST の { year, month, day } を取得
//   プロジェクトのタイムゾーン設定に依存せず常に日本時間で返す
// ================================================================

function getJSTDate(date) {
  return {
    year:  Number(Utilities.formatDate(date, 'Asia/Tokyo', 'yyyy')),
    month: Number(Utilities.formatDate(date, 'Asia/Tokyo', 'MM')),
    day:   Number(Utilities.formatDate(date, 'Asia/Tokyo', 'dd')),
  };
}

// ================================================================
// ヘルパー: 日付を "yyyy/MM/dd(曜)" 形式の文字列にする
// ================================================================

function formatDateJP(date) {
  // Utilities.formatDate で明示的に JST で取得（プロジェクトのタイムゾーン設定に依存しない）
  var y   = Utilities.formatDate(date, 'Asia/Tokyo', 'yyyy');
  var m   = Utilities.formatDate(date, 'Asia/Tokyo', 'MM');
  var d   = Utilities.formatDate(date, 'Asia/Tokyo', 'dd');
  var dow = DOW_JP[Number(Utilities.formatDate(date, 'Asia/Tokyo', 'u')) % 7]; // u=1(月)〜7(日) → %7で0(日)〜6(土)
  return y + '/' + m + '/' + d + '(' + dow + ')';
}

// ================================================================
// ヘルパー: セル値を "yyyyMMdd" 8桁文字列に正規化
// ================================================================

function toYMD(cellVal) {
  if (!cellVal) return '';
  if (cellVal instanceof Date) {
    return Utilities.formatDate(cellVal, 'Asia/Tokyo', 'yyyyMMdd');
  }
  var s = String(cellVal);
  // "2026/03/15(日)" や "2026/3/15" などから数字だけ抽出
  var digits = s.replace(/[^0-9]/g, '');
  if (digits.length >= 8) return digits.slice(0, 8);
  return '';
}

// ================================================================
// ヘルパー: テキストから「〇件」パターンの件数合計を取得
//   全角数字（１２件）にも対応
// ================================================================

function extractKenCount(text) {
  var n = text.replace(/[０-９]/g, function(s) {
    return String.fromCharCode(s.charCodeAt(0) - 0xFEE0);
  });
  var matches = n.match(/(\d+)\s*件/g);
  if (!matches) return 0;
  var sum = 0;
  for (var i = 0; i < matches.length; i++) {
    var m = matches[i].match(/\d+/);
    if (m) sum += parseInt(m[0], 10);
  }
  return sum;
}

// ================================================================
// 毎日トリガーで実行するメイン関数
// ================================================================

function runDailyUpdate() {
  var today = new Date();
  today.setHours(0, 0, 0, 0);

  Logger.log('=== 日次更新開始: ' + Utilities.formatDate(today, 'Asia/Tokyo', 'yyyy/MM/dd') + ' ===');

  try {
    // 前日分も処理（当日に前日の日報を出した場合に対応）
    var yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    Logger.log('前日分を処理: ' + Utilities.formatDate(yesterday, 'Asia/Tokyo', 'yyyy/MM/dd'));
    processDate(yesterday);

    // 当日分を処理
    Logger.log('当日分を処理: ' + Utilities.formatDate(today, 'Asia/Tokyo', 'yyyy/MM/dd'));
    processDate(today);

    // 月末チェック: 今日が月末なら翌月タブを作成
    var tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (tomorrow.getMonth() !== today.getMonth()) {
      Logger.log('月末処理: ' + (tomorrow.getMonth() + 1) + '月タブを作成します');
      createMonthTab(tomorrow.getFullYear(), tomorrow.getMonth() + 1);
    }
  } catch (e) {
    Logger.log('エラー: ' + e.message + '\n' + e.stack);
  }

  Logger.log('=== 日次更新完了 ===');
}

// ================================================================
// 指定日のデータを処理
//   全スタッフの日報を確認し、件数が1以上のスタッフをまとめて1行書き込む
// ================================================================

function processDate(date) {
  var jst   = getJSTDate(date);
  var year  = jst.year;
  var month = jst.month;
  var day   = jst.day;

  Logger.log('--- 処理日: ' + year + '/' + month + '/' + day + ' ---');

  var respondents = [];
  var totalCount  = 0;

  for (var i = 0; i < STAFF_LIST.length; i++) {
    var staff = STAFF_LIST[i];
    var count = getCountFromReport(staff.reportId, year, month, day);
    if (count > 0) {
      respondents.push(staff.displayName);
      totalCount += count;
      Logger.log('  ' + staff.displayName + ': ' + count + '件');
    }
  }

  if (respondents.length === 0) {
    Logger.log('対応記録なし（全スタッフ0件）');
    return;
  }

  var nameStr = respondents.join('、');
  Logger.log('合計: ' + totalCount + '件 / 担当: ' + nameStr);

  writeSummary(date, nameStr, totalCount);
}

// ================================================================
// 日報スプシから対応件数を取得
// ================================================================

function getCountFromReport(reportId, year, month, day) {
  try {
    var ss = SpreadsheetApp.openById(reportId);
    var tabCandidates = generateTabNameCandidates(year, month, day);
    var sheet = null;

    for (var i = 0; i < tabCandidates.length; i++) {
      sheet = ss.getSheetByName(tabCandidates[i]);
      if (sheet) {
        Logger.log('  日報タブ発見: "' + tabCandidates[i] + '"');
        break;
      }
    }

    if (!sheet) {
      Logger.log('  日報タブなし: [' + tabCandidates.slice(0, 5).join(', ') + ' ...]');
      return 0;
    }

    return extractCountFromSheet(sheet);

  } catch (e) {
    Logger.log('  日報読み込みエラー (' + reportId.slice(0, 8) + '...): ' + e.message);
    return 0;
  }
}

// ================================================================
// 日付からタブ名候補を生成（14形式）
// ================================================================

function generateTabNameCandidates(year, month, day) {
  var M  = String(month);
  var D  = String(day);
  var MM = (month < 10 ? '0' : '') + month;
  var DD = (day   < 10 ? '0' : '') + day;
  var YY = String(year).slice(2);

  return [
    MM + DD,                           // 0315
    M  + DD,                           // 315
    MM + D,                            // 0315 (same as above when day >= 10)
    M  + D,                            // 315
    M  + '/' + D,                      // 3/15
    MM + '/' + DD,                     // 03/15
    M  + '月' + D + '日',             // 3月15日
    M  + '月' + D,                     // 3月15
    String(year) + '/' + M + '/' + D, // 2026/3/15
    String(year) + MM + DD,            // 20260315
    YY + MM + DD,                      // 260315
    M  + '-' + D,                      // 3-15
    M  + '.' + D,                      // 3.15
    String(year) + '.' + M + '.' + D, // 2026.3.15
  ];
}

// ================================================================
// 日報シートから合計対応件数を抽出
//
// 行1〜REPORT_SKIP_ROW（デフォルト6行）はスキップ
//
// カウント対象: A列に時刻（10:00 等）があるスケジュール行のみ
//   → 行37以降の空白行・集計表は自動的に除外
//
// スキップ対象:
//   - スケジュール行以外（A列が時刻でない行）
//   - B列が「クラス分け」の行
//
// 抽出戦略（優先順位順）:
//   1. 「〇件」テキストパターン合計（全角数字対応）
//   2. C〜I列の数値合計（フォールバック）
// ================================================================

function extractCountFromSheet(sheet) {
  var all  = sheet.getDataRange().getValues();
  var data = all.slice(REPORT_SKIP_ROW); // 行1〜6をスキップ

  // A列が時刻形式のスケジュール行かどうか判定
  //   例: "10:00", "10:30"、またはスプシが Date 型で保持する場合
  function isScheduleRow(row) {
    var a = row[0];
    if (a instanceof Date) return true;
    var aStr = String(a || '');
    return /^\d{1,2}:\d{2}/.test(aStr);
  }

  // B列が「クラス分け」の行かどうか判定
  function isClassBunkRow(row) {
    var b = String(row[1] || '');
    return b.indexOf('クラス分け') !== -1;
  }

  // 戦略1: 「〇件」パターン（全角数字含む）
  //   ※ スケジュール行のみ、クラス分け行はスキップ
  var kenTotal = 0;
  for (var i = 0; i < data.length; i++) {
    if (!isScheduleRow(data[i])) continue; // スケジュール行以外はスキップ
    if (isClassBunkRow(data[i])) continue; // クラス分け行はスキップ
    for (var c = 0; c < data[i].length; c++) {
      kenTotal += extractKenCount(String(data[i][c] || ''));
    }
  }
  if (kenTotal > 0) {
    Logger.log('    → 〇件パターンから取得: ' + kenTotal);
    return kenTotal;
  }

  // 戦略2: C〜I列の数値合計（フォールバック）
  //   ※ スケジュール行のみ、クラス分け行はスキップ
  var grandTotal = 0;
  for (var i = 0; i < data.length; i++) {
    if (!isScheduleRow(data[i])) continue;
    if (isClassBunkRow(data[i])) continue;
    grandTotal += sumColumnsCI(data[i]);
  }
  if (grandTotal > 0) {
    Logger.log('    → C〜I列合計から取得: ' + grandTotal);
  }
  return grandTotal;
}

// C列（インデックス2）〜I列（インデックス8）の正数を合計
function sumColumnsCI(row) {
  var sum = 0;
  var end = Math.min(row.length - 1, 8);
  for (var c = 2; c <= end; c++) {
    var v = row[c];
    if (typeof v === 'number' && !isNaN(v) && v > 0) sum += v;
  }
  return sum;
}

// ================================================================
// 集計シートにデータを書き込む
//   同日付の既存行があれば削除してから新規挿入
// ================================================================

function writeSummary(date, nameStr, count) {
  try {
    var ss    = SpreadsheetApp.openById(SS_ID.summary);
    var jst   = getJSTDate(date);
    var year  = jst.year;
    var month = jst.month;
    var sheetName = year + '年' + month + '月';
    var sheet = ss.getSheetByName(sheetName);

    if (!sheet) {
      Logger.log('集計シートタブなし: ' + sheetName + ' → タブを作成します');
      sheet = createMonthTab(year, month);
    }

    var dateStr   = formatDateJP(date);
    var targetYMD = toYMD(date);

    // ---- 同日付の既存行を後ろから削除 ----
    var lastRow = sheet.getLastRow();
    if (lastRow >= DATA_START_ROW) {
      var existVals = sheet.getRange(DATA_START_ROW, 1, lastRow - DATA_START_ROW + 1, 1).getDisplayValues();
      var delRows = [];
      for (var i = 0; i < existVals.length; i++) {
        if (toYMD(existVals[i][0]) === targetYMD) {
          delRows.push(DATA_START_ROW + i);
        }
      }
      // 後ろから削除（行番号がずれないように）
      for (var j = delRows.length - 1; j >= 0; j--) {
        sheet.getRange(delRows[j], 1, 1, 4).clearContent();
        SpreadsheetApp.flush();
        sheet.deleteRow(delRows[j]);
        SpreadsheetApp.flush();
      }
    }

    // ---- 日付順の挿入位置を探して行挿入 ----
    var writeRow = findSortedInsertRow(sheet, date);
    if (writeRow <= sheet.getLastRow()) {
      sheet.insertRowBefore(writeRow);
      SpreadsheetApp.flush();
    }

    // ---- A〜D列に一括書き込み（日付はテキスト文字列） ----
    // B列のドロップダウン入力規則が複数名を拒否するためクリアしてから書き込む
    sheet.getRange(writeRow, 2).clearDataValidations();
    sheet.getRange(writeRow, 1, 1, 4).setValues([[dateStr, nameStr, count, '']]);
    // 列の配置: A=左寄せ, B=中央, C=左寄せ
    sheet.getRange(writeRow, 1).setHorizontalAlignment('right');
    sheet.getRange(writeRow, 2).setHorizontalAlignment('center');
    sheet.getRange(writeRow, 3).setHorizontalAlignment('right');
    SpreadsheetApp.flush();

    Logger.log('書き込み完了: 行' + writeRow + ' / ' + dateStr + ' / ' + nameStr + ' / ' + count + '件');

  } catch (e) {
    Logger.log('集計シート書き込みエラー: ' + e.message + '\n' + e.stack);
  }
}

// ================================================================
// 日付順の挿入位置を返す
// ================================================================

function findSortedInsertRow(sheet, targetDate) {
  var lastRow = sheet.getLastRow();
  if (lastRow < DATA_START_ROW) return DATA_START_ROW;

  var rowCount = lastRow - DATA_START_ROW + 1;
  var vals = sheet.getRange(DATA_START_ROW, 1, rowCount, 1).getDisplayValues();

  for (var i = 0; i < vals.length; i++) {
    var cv = vals[i][0];
    if (!cv) return DATA_START_ROW + i;
    var ymd = toYMD(cv);
    var tgt = toYMD(targetDate);
    if (ymd && tgt && ymd > tgt) return DATA_START_ROW + i;
  }

  return lastRow + 1;
}

// ================================================================
// 月タブを新規作成してヘッダーを設定
// ================================================================

function createMonthTab(year, month) {
  var ss = SpreadsheetApp.openById(SS_ID.summary);
  var sheetName = year + '年' + month + '月';

  if (ss.getSheetByName(sheetName)) {
    Logger.log('タブ既存: ' + sheetName);
    return ss.getSheetByName(sheetName);
  }

  var newSheet = ss.insertSheet(sheetName, ss.getSheets().length);
  setupMonthHeader(newSheet, year, month);

  Logger.log('タブ作成完了: ' + sheetName);
  return newSheet;
}

// ================================================================
// 月タブのヘッダー・列幅を設定
// ================================================================

function setupMonthHeader(sheet, year, month) {
  sheet.setColumnWidth(1, 160); // A: 日付
  sheet.setColumnWidth(2, 160); // B: 担当者
  sheet.setColumnWidth(3, 100); // C: 対応件数
  sheet.setColumnWidth(4, 280); // D: 備考

  // 1行目: タイトル
  sheet.getRange(1, 1, 1, 4)
       .merge()
       .setValue(year + '年' + month + '月 お問い合わせ件数集計')
       .setFontWeight('bold')
       .setFontSize(13)
       .setHorizontalAlignment('center')
       .setVerticalAlignment('middle');
  sheet.setRowHeight(1, 40);

  // 8行目: 列ヘッダー
  sheet.getRange(HEADER_ROW, 1, 1, 4)
       .setValues([['日付', '担当者', '対応件数', '備考']])
       .setFontWeight('bold')
       .setHorizontalAlignment('center')
       .setVerticalAlignment('middle');
  sheet.setRowHeight(HEADER_ROW, 25);
}

// ================================================================
// 今日のデータだけを手動処理（テスト用）
// ================================================================

function processToday() {
  var today = new Date();
  today.setHours(0, 0, 0, 0);
  processDate(today);
}

// ================================================================
// 3/15 以降のデータを一括処理（初回実行用）
// ================================================================

function processMarchFromStart() {
  Logger.log('=== 3月15日から本日までの一括処理開始 ===');

  var start   = new Date(2026, 2, 13); // 2026/3/13
  var today   = new Date();
  today.setHours(0, 0, 0, 0);

  var current = new Date(start);
  var cnt     = 0;

  while (current <= today) {
    Logger.log('処理: ' + Utilities.formatDate(current, 'Asia/Tokyo', 'yyyy/MM/dd'));
    processDate(new Date(current));
    current.setDate(current.getDate() + 1);
    cnt++;
    if (cnt % 20 === 0) Utilities.sleep(2000); // API制限対策
  }

  Logger.log('=== 一括処理完了: ' + cnt + '日分 ===');
}

// ================================================================
// 任意の期間を一括処理（手動実行用）
//   processBatch() 内の日付を変更してから実行
// ================================================================

function processBatch() {
  var startStr = '2026/1/1';  // ← 開始日
  var endStr   = '2026/3/14'; // ← 終了日

  var sp = startStr.split('/');
  var ep = endStr.split('/');
  var start   = new Date(Number(sp[0]), Number(sp[1]) - 1, Number(sp[2]));
  var end     = new Date(Number(ep[0]), Number(ep[1]) - 1, Number(ep[2]));
  var current = new Date(start);
  var cnt     = 0;

  while (current <= end) {
    Logger.log('処理: ' + Utilities.formatDate(current, 'Asia/Tokyo', 'yyyy/MM/dd'));
    processDate(new Date(current));
    current.setDate(current.getDate() + 1);
    cnt++;
    if (cnt % 20 === 0) Utilities.sleep(2000);
  }

  Logger.log('一括処理完了: ' + cnt + '日分');
}

// ================================================================
// 毎日自動実行トリガーのセットアップ（1回だけ手動実行）
// ================================================================

function setupDailyTrigger() {
  var existing = ScriptApp.getProjectTriggers();
  for (var i = 0; i < existing.length; i++) {
    if (existing[i].getHandlerFunction() === 'runDailyUpdate') {
      ScriptApp.deleteTrigger(existing[i]);
      Logger.log('既存トリガー削除');
    }
  }

  ScriptApp.newTrigger('runDailyUpdate')
    .timeBased()
    .everyDays(1)
    .atHour(23)
    .nearMinute(55)
    .create();

  Logger.log('毎日23:55のトリガーを設定しました');
}
