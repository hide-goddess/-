/**
 * ================================================================
 * CS お問い合わせ件数集計 自動反映スクリプト
 * ================================================================
 *
 * 機能:
 *   1. CS部勤務表から各日の問合せ担当者を特定
 *   2. 担当者の日報スプシから対応件数を抽出
 *   3. 【CS】お問い合わせ件数集計シートに日付・担当者・件数を記録
 *   4. 月末に翌月タブを自動作成
 *
 * 初回セットアップ手順:
 *   1. このスクリプトをお問い合わせ件数集計シートのGASに貼り付け
 *   2. 「setupDailyTrigger」を実行してトリガーを設定
 *   3. 「processMarchFromStart」を実行して3/15以降のデータを一括取得
 *
 * ================================================================
 */

// ================================================================
// スプレッドシートID設定
// ================================================================

const SS_ID = {
  schedule: '1w5nrMbL6-RbrjXlxMv_0DzlhEfX3rnUJQFyotAPj4VE', // CS部勤務表
  summary:  '1p2LzF43RpI72oP4gJph6Cazv8hPmYCN_n79aY2Bc1GE', // 【CS】お問い合わせ件数集計シート
};

// ================================================================
// スタッフ設定
// キー: CS部勤務表のD列（問合せ当番）に記載の名前
// displayName: 集計シートに書く表示名
// reportId: 日報スプレッドシートのID
// ================================================================

const STAFF = {
  'あゆみ':  { displayName: 'あゆみ',     reportId: '17YS1m15AZDCBsFKwRq0LEBGsf7jY4exCTJXyhZfDW9E' }, // yukinoさん_日報
  'ななこ':  { displayName: 'ななこ',     reportId: '1joyW47gyikwF1tRTRfgiy-ldcsNKef73Ne4JAE1Lvhs' }, // 菜々子さん_日報
  'ともえ':  { displayName: 'ともえ',     reportId: '1rKUxHw1Rwkc9BQsT9nY_15khBa2bRinJjZpDInOi7-A' }, // ともえさん_日報
  'はるか':  { displayName: 'はるかさん', reportId: '1ZRulEZaZqUxvhYIliYskskGo2_KDw2dWizN04WgOi1w' }, // はるか_日報new
  'りお':    { displayName: 'りお',       reportId: '1OLvkp5LXrCEiwnSNVfDK-mWPZ4Dka1l-l25EFRoAQgg' }, // りおさん_日報
  'ゆうか':  { displayName: 'ゆうか',     reportId: '1MaaS2V8L0KU48-0pPql9_0Sl5nE9aj6Rm6d5ONbTvFk' }, // 優花さん_日報
  'みおな':  { displayName: 'みおなさん', reportId: '1mPtv-l2u3JKBpKcRG0JZc5bSqw2e630vkfI-Je04Y6k' }, // みおなさん_日報
};

// 集計シートのデータ開始行（1〜8行目がタイトル/ヘッダー領域）
const DATA_START_ROW = 9;

// 列ヘッダー行番号
const HEADER_ROW = 8;

// ================================================================
// 毎日トリガーで実行するメイン関数
// ================================================================

function runDailyUpdate() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  Logger.log('=== 日次更新開始: ' + Utilities.formatDate(today, 'Asia/Tokyo', 'yyyy/MM/dd') + ' ===');

  try {
    processDate(today);

    // 月末チェック: 今日が月末なら翌月タブを作成
    const tomorrow = new Date(today);
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
// ================================================================

function processDate(date) {
  var year  = date.getFullYear();
  var month = date.getMonth() + 1;
  var day   = date.getDate();

  Logger.log('--- 処理日: ' + year + '/' + month + '/' + day + ' ---');

  // 1. 勤務表から担当者を取得
  var dutyPerson = getDutyPerson(year, month, day);
  if (!dutyPerson) {
    Logger.log('担当者なし（休日・未設定）');
    return;
  }
  Logger.log('担当者（勤務表）: ' + dutyPerson);

  // 2. 担当者設定を解決
  var staffConfig = resolveStaff(dutyPerson);
  if (!staffConfig) {
    Logger.log('担当者設定が未定義: ' + dutyPerson + '（STAFFオブジェクトに追加してください）');
    return;
  }

  // 3. 日報から対応件数を取得
  var count = getCountFromReport(staffConfig.reportId, year, month, day);
  Logger.log('対応件数: ' + count + '件');

  // 4. 集計シートに書き込み
  writeSummary(year, month, day, staffConfig.displayName, count);
}

// ================================================================
// CS部勤務表から担当者名を取得
//   勤務表の構造: 10行目以降、B列=日, C列=曜, D列=問合せ当番
// ================================================================

function getDutyPerson(year, month, day) {
  try {
    var ss = SpreadsheetApp.openById(SS_ID.schedule);
    var sheetName = year + '年' + month + '月';
    var sheet = ss.getSheetByName(sheetName);

    if (!sheet) {
      Logger.log('勤務表タブなし: ' + sheetName);
      return null;
    }

    var lastRow = sheet.getLastRow();
    // A列〜D列を取得（1行目から最終行まで）
    var data = sheet.getRange(1, 1, lastRow, 4).getValues();

    // 10行目（インデックス9）以降でB列（インデックス1）の値がdayと一致する行を探す
    for (var i = 9; i < data.length; i++) {
      var cellDay = data[i][1]; // B列: 日
      var dutyCell = data[i][3]; // D列: 問合せ当番

      // 数値・文字列の両方に対応
      if (Number(cellDay) === day) {
        var person = String(dutyCell || '').trim();
        return person || null;
      }
    }

    Logger.log('勤務表で' + day + '日のデータが見つかりませんでした');
    return null;

  } catch (e) {
    Logger.log('勤務表読み込みエラー: ' + e.message);
    return null;
  }
}

// ================================================================
// 担当者名からSTAFF設定を解決（部分一致・さん付き対応）
// ================================================================

function resolveStaff(dutyPerson) {
  // 完全一致
  if (STAFF[dutyPerson]) {
    return STAFF[dutyPerson];
  }

  // 「さん」「ちゃん」を除いた名前で再検索
  var cleanName = dutyPerson.replace(/さん$|ちゃん$/, '');
  if (STAFF[cleanName]) {
    return STAFF[cleanName];
  }

  // 部分一致（勤務表の名前がSTAFFキーを含む、またはその逆）
  var keys = Object.keys(STAFF);
  for (var i = 0; i < keys.length; i++) {
    var key = keys[i];
    if (dutyPerson.indexOf(key) !== -1 || key.indexOf(dutyPerson) !== -1 ||
        dutyPerson.indexOf(cleanName) !== -1 || cleanName.indexOf(key) !== -1) {
      return STAFF[key];
    }
  }

  return null;
}

// ================================================================
// 日報スプシから対応件数を取得
// ================================================================

function getCountFromReport(reportId, year, month, day) {
  try {
    var ss = SpreadsheetApp.openById(reportId);

    // タブ名候補を生成して検索
    var tabCandidates = generateTabNameCandidates(year, month, day);
    var sheet = null;

    for (var i = 0; i < tabCandidates.length; i++) {
      sheet = ss.getSheetByName(tabCandidates[i]);
      if (sheet) {
        Logger.log('日報タブ発見: "' + tabCandidates[i] + '"');
        break;
      }
    }

    if (!sheet) {
      Logger.log('日報タブが見つかりません。試行候補: [' + tabCandidates.join(', ') + ']');
      return 0;
    }

    return extractCountFromSheet(sheet);

  } catch (e) {
    Logger.log('日報読み込みエラー: ' + e.message);
    return 0;
  }
}

// ================================================================
// 日付からタブ名候補を生成
//   各スタッフの日報でタブ名フォーマットが異なるため、多様な形式を試行
// ================================================================

function generateTabNameCandidates(year, month, day) {
  var M  = String(month);
  var D  = String(day);
  var MM = (month < 10 ? '0' : '') + month;
  var DD = (day   < 10 ? '0' : '') + day;
  var YY = String(year).slice(2);

  return [
    MM + DD,                          // 0315         ← yukinoさん等の標準形式
    M + DD,                           // 315
    MM + D,                           // 0315
    M + D,                            // 315
    M + '/' + D,                      // 3/15
    MM + '/' + DD,                    // 03/15
    M + '月' + D + '日',             // 3月15日
    M + '月' + D,                     // 3月15
    String(year) + '/' + M + '/' + D, // 2026/3/15
    String(year) + MM + DD,           // 20260315
    YY + MM + DD,                     // 260315
    M + '-' + D,                      // 3-15
    M + '.' + D,                      // 3.15
    String(year) + '.' + M + '.' + D, // 2026.3.15
  ];
}

// ================================================================
// 日報シートから合計対応件数を抽出
//
// 抽出戦略（優先順位順）:
//   1. 「合計」という文字を含む行のC〜I列の数値を合計
//   2. 「お問い合わせ」「問合せ」「対応」を含む行のC〜I列を合計
//   3. 数値が入っている行のうち最も多いC〜I列の合計
// ================================================================

function extractCountFromSheet(sheet) {
  var data = sheet.getDataRange().getValues();

  // 戦略1: 「合計」を含む行
  for (var i = 0; i < data.length; i++) {
    var a = String(data[i][0] || '');
    var b = String(data[i][1] || '');
    if (a.indexOf('合計') !== -1 || b.indexOf('合計') !== -1) {
      var total = sumColumnsCI(data[i]);
      if (total > 0) {
        Logger.log('  → 「合計」行 (行' + (i + 1) + ') から取得: ' + total);
        return total;
      }
    }
  }

  // 戦略2: 「問い合わせ」「対応」を含む行の合計
  var keywordTotal = 0;
  for (var i = 0; i < data.length; i++) {
    var a = String(data[i][0] || '');
    var b = String(data[i][1] || '');
    var isKeywordRow = (
      a.indexOf('問い合わせ') !== -1 || a.indexOf('問合せ') !== -1 || a.indexOf('対応') !== -1 ||
      b.indexOf('問い合わせ') !== -1 || b.indexOf('問合せ') !== -1 || b.indexOf('対応') !== -1
    );
    if (isKeywordRow) {
      keywordTotal += sumColumnsCI(data[i]);
    }
  }
  if (keywordTotal > 0) {
    Logger.log('  → キーワード行の合計から取得: ' + keywordTotal);
    return keywordTotal;
  }

  // 戦略3: 全行のC〜I列の合計（ヘッダー行を除く）
  var grandTotal = 0;
  for (var i = 1; i < data.length; i++) {
    grandTotal += sumColumnsCI(data[i]);
  }
  Logger.log('  → 全行合計から取得: ' + grandTotal);
  return grandTotal;
}

// C列（インデックス2）〜I列（インデックス8）の正数を合計
function sumColumnsCI(row) {
  var sum = 0;
  var endCol = Math.min(row.length - 1, 8); // I列はインデックス8
  for (var c = 2; c <= endCol; c++) {
    var val = row[c];
    if (typeof val === 'number' && !isNaN(val) && val > 0) {
      sum += val;
    }
  }
  return sum;
}

// ================================================================
// 集計シートにデータを書き込む
// ================================================================

function writeSummary(year, month, day, displayName, count) {
  try {
    var ss = SpreadsheetApp.openById(SS_ID.summary);
    var sheetName = year + '年' + month + '月';
    var sheet = ss.getSheetByName(sheetName);

    if (!sheet) {
      Logger.log('集計シートタブなし: ' + sheetName);
      return;
    }

    var targetDate = new Date(year, month - 1, day);
    var targetDateStr = Utilities.formatDate(targetDate, 'Asia/Tokyo', 'yyyyMMdd');

    // 既存データの検索（同日付の行があれば更新）
    var lastRow = Math.max(sheet.getLastRow(), DATA_START_ROW);
    var rowCount = lastRow - DATA_START_ROW + 1;
    var existingData = (rowCount > 0)
      ? sheet.getRange(DATA_START_ROW, 1, rowCount, 1).getValues()
      : [];

    var writeRow = -1;
    for (var i = 0; i < existingData.length; i++) {
      var cellVal = existingData[i][0];
      if (!cellVal) continue;
      var cellDate = (cellVal instanceof Date) ? cellVal : new Date(cellVal);
      if (Utilities.formatDate(cellDate, 'Asia/Tokyo', 'yyyyMMdd') === targetDateStr) {
        writeRow = DATA_START_ROW + i;
        break;
      }
    }

    // 既存行がない場合、日付順の位置に行を挿入
    if (writeRow === -1) {
      writeRow = findSortedInsertRow(sheet, targetDate);
      if (writeRow <= sheet.getLastRow()) {
        sheet.insertRowBefore(writeRow);
      }
    }

    // A〜D列に値を書き込む
    sheet.getRange(writeRow, 1).setValue(targetDate).setNumberFormat('yyyy/m/d');
    sheet.getRange(writeRow, 2).setValue(displayName);
    sheet.getRange(writeRow, 3).setValue(count);
    sheet.getRange(writeRow, 4).setValue(''); // 備考は空白（手動記入欄）

    // 書式・色を適用
    applyRowFormat(sheet, writeRow, targetDate);

    Logger.log('書き込み完了: 行' + writeRow + ' / ' + year + '/' + month + '/' + day +
               ' / ' + displayName + ' / ' + count + '件');

  } catch (e) {
    Logger.log('集計シート書き込みエラー: ' + e.message);
  }
}

// ================================================================
// 日付順の挿入位置を探す
// ================================================================

function findSortedInsertRow(sheet, targetDate) {
  var lastRow = sheet.getLastRow();
  if (lastRow < DATA_START_ROW) return DATA_START_ROW;

  var rowCount = lastRow - DATA_START_ROW + 1;
  var values = sheet.getRange(DATA_START_ROW, 1, rowCount, 1).getValues();

  for (var i = 0; i < values.length; i++) {
    var cellVal = values[i][0];
    if (!cellVal) return DATA_START_ROW + i;
    var cellDate = (cellVal instanceof Date) ? cellVal : new Date(cellVal);
    if (cellDate > targetDate) return DATA_START_ROW + i;
  }

  return lastRow + 1;
}

// ================================================================
// データ行に書式（色・罫線・配置）を適用
//
// ※ 添付画像が確認できなかったため、代表的な配色を設定しています。
//    実際の画像の色に合わせて下記の bgWeekday/bgSat/bgSun を変更してください。
// ================================================================

function applyRowFormat(sheet, row, date) {
  var range = sheet.getRange(row, 1, 1, 4);
  var dow = date.getDay(); // 0=日, 6=土

  // --- 色設定（画像に合わせて変更してください） ---
  var bgWeekdayOdd  = '#FFFFFF'; // 平日奇数行: 白
  var bgWeekdayEven = '#F3F3F3'; // 平日偶数行: 薄グレー
  var bgSaturday    = '#DDEEFF'; // 土曜: 薄ブルー
  var bgSunday      = '#FFE4E4'; // 日曜: 薄ピンク
  // -------------------------------------------------

  var bgColor;
  if (dow === 6) {
    bgColor = bgSaturday;
  } else if (dow === 0) {
    bgColor = bgSunday;
  } else {
    bgColor = (row % 2 === 0) ? bgWeekdayEven : bgWeekdayOdd;
  }

  range.setBackground(bgColor);
  range.setBorder(
    true, true, true, true, true, true,
    '#CCCCCC', SpreadsheetApp.BorderStyle.SOLID
  );

  // 各列の配置
  sheet.getRange(row, 1).setHorizontalAlignment('center'); // 日付
  sheet.getRange(row, 2).setHorizontalAlignment('center'); // 担当者
  sheet.getRange(row, 3).setHorizontalAlignment('center'); // 対応件数
  sheet.getRange(row, 4).setHorizontalAlignment('left');   // 備考
}

// ================================================================
// 月タブを新規作成し、ヘッダーを設定
// ================================================================

function createMonthTab(year, month) {
  var ss = SpreadsheetApp.openById(SS_ID.summary);
  var sheetName = year + '年' + month + '月';

  if (ss.getSheetByName(sheetName)) {
    Logger.log('タブ既存: ' + sheetName);
    return ss.getSheetByName(sheetName);
  }

  // 既存タブの最後に追加
  var newSheet = ss.insertSheet(sheetName, ss.getSheets().length);
  setupMonthHeader(newSheet, year, month);

  Logger.log('タブ作成完了: ' + sheetName);
  return newSheet;
}

// ================================================================
// 月タブのヘッダー・列幅・ドロップダウンを設定
// ================================================================

function setupMonthHeader(sheet, year, month) {
  // --- 列幅 ---
  sheet.setColumnWidth(1, 120); // A: 日付
  sheet.setColumnWidth(2, 120); // B: 担当者
  sheet.setColumnWidth(3, 100); // C: 対応件数
  sheet.setColumnWidth(4, 280); // D: 備考

  // --- 1行目: タイトル ---
  var titleRange = sheet.getRange(1, 1, 1, 4);
  titleRange.merge()
            .setValue(year + '年' + month + '月 お問い合わせ件数集計')
            .setBackground('#2E75B6')
            .setFontColor('#FFFFFF')
            .setFontWeight('bold')
            .setFontSize(13)
            .setHorizontalAlignment('center')
            .setVerticalAlignment('middle');
  sheet.setRowHeight(1, 40);

  // --- 2〜7行目: 空白エリア（必要に応じてサマリー等を追加） ---

  // --- 8行目: 列ヘッダー ---
  var headerRange = sheet.getRange(HEADER_ROW, 1, 1, 4);
  headerRange.setValues([['日付', '担当者', '対応件数', '備考']])
             .setBackground('#4472C4')
             .setFontColor('#FFFFFF')
             .setFontWeight('bold')
             .setHorizontalAlignment('center')
             .setVerticalAlignment('middle');
  sheet.setRowHeight(HEADER_ROW, 25);

  // --- B列にプルダウン（担当者リスト）を設定 ---
  setupDropdown(sheet);
}

// ================================================================
// B列（担当者）にドロップダウンを設定
// ================================================================

function setupDropdown(sheet) {
  var names = Object.keys(STAFF).map(function(k) { return STAFF[k].displayName; });
  var rule = SpreadsheetApp.newDataValidation()
    .requireValueInList(names, true)
    .build();

  // DATA_START_ROW行目から100行分に設定
  sheet.getRange(DATA_START_ROW, 2, 100, 1).setDataValidation(rule);
}

// ================================================================
// 日付順の挿入位置を探す（既存タブ用）
// ================================================================

// ================================================================
// 3/15 以降のデータを一括処理（初回実行用）
// ================================================================

function processMarchFromStart() {
  Logger.log('=== 3月15日から本日までの一括処理開始 ===');

  var start = new Date(2026, 2, 15); // 2026/3/15
  var today = new Date();
  today.setHours(0, 0, 0, 0);

  var current = new Date(start);
  var count = 0;

  while (current <= today) {
    Logger.log('処理: ' + Utilities.formatDate(current, 'Asia/Tokyo', 'yyyy/MM/dd'));
    processDate(new Date(current));
    current.setDate(current.getDate() + 1);
    count++;

    // 20件ごとに少し待機（API制限対策）
    if (count % 20 === 0) {
      Utilities.sleep(2000);
    }
  }

  Logger.log('=== 一括処理完了: ' + count + '日分 ===');
}

// ================================================================
// 任意の期間を一括処理（手動実行用）
//   使い方: processBatch('2026/1/1', '2026/3/14') のように引数を変えて実行
// ================================================================

function processBatch() {
  var startStr = '2026/1/1';  // ← 開始日を変更してください
  var endStr   = '2026/3/14'; // ← 終了日を変更してください

  var parts = startStr.split('/');
  var start = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  parts = endStr.split('/');
  var end = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));

  var current = new Date(start);
  var count = 0;

  while (current <= end) {
    Logger.log('処理: ' + Utilities.formatDate(current, 'Asia/Tokyo', 'yyyy/MM/dd'));
    processDate(new Date(current));
    current.setDate(current.getDate() + 1);
    count++;
    if (count % 20 === 0) Utilities.sleep(2000);
  }

  Logger.log('一括処理完了: ' + count + '日分');
}

// ================================================================
// 今日のデータだけを手動処理
// ================================================================

function processToday() {
  var today = new Date();
  today.setHours(0, 0, 0, 0);
  processDate(today);
}

// ================================================================
// 既存の各月タブにドロップダウンを設定（初回セットアップ用）
// ================================================================

function initialSetupDropdowns() {
  var targets = [
    { year: 2026, month: 1 },
    { year: 2026, month: 2 },
    { year: 2026, month: 3 },
  ];

  var ss = SpreadsheetApp.openById(SS_ID.summary);
  targets.forEach(function(t) {
    var sheetName = t.year + '年' + t.month + '月';
    var sheet = ss.getSheetByName(sheetName);
    if (sheet) {
      setupDropdown(sheet);
      Logger.log('ドロップダウン設定完了: ' + sheetName);
    }
  });
}

// ================================================================
// 毎日自動実行トリガーのセットアップ（1回だけ手動実行）
// ================================================================

function setupDailyTrigger() {
  // 既存の同名トリガーを削除
  var existing = ScriptApp.getProjectTriggers();
  for (var i = 0; i < existing.length; i++) {
    if (existing[i].getHandlerFunction() === 'runDailyUpdate') {
      ScriptApp.deleteTrigger(existing[i]);
      Logger.log('既存トリガー削除');
    }
  }

  // 毎日午前7時に実行
  // ※ スクリプトのタイムゾーンを Asia/Tokyo に設定しておいてください
  //   （スクリプトエディタ > プロジェクト設定 > タイムゾーン）
  ScriptApp.newTrigger('runDailyUpdate')
    .timeBased()
    .everyDays(1)
    .atHour(7)
    .create();

  Logger.log('毎日午前7時のトリガーを設定しました');
}
