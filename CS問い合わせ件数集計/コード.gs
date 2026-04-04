/**
 * ================================================================
 * CS お問い合わせ件数集計 自動反映スクリプト v6
 * ================================================================
 *
 * 機能:
 *   1. 全スタッフの日報スプシを確認して対応件数・対応時間を抽出
 *   2. 対応件数が1件以上のスタッフを1行にまとめて集計シートに記録
 *   3. 担当者ごとの名前・対応時間を D〜Q列に展開
 *   4. 月末に翌月タブを自動作成
 *
 * 列構成（v6〜）:
 *   A: 日付          B: 担当者（合計）  C: 対応件数（合計）
 *   D: 担当者1       E: 対応時間1
 *   F: 担当者2       G: 対応時間2
 *   H: 担当者3       I: 対応時間3
 *   J: 担当者4       K: 対応時間4
 *   L: 担当者5       M: 対応時間5
 *   N: 担当者6       O: 対応時間6
 *   P: 担当者7       Q: 対応時間7
 *
 * 対応時間 = その日の日報でB列にカテゴリタグが入っている行数 × 30分
 *
 * 初回セットアップ手順:
 *   1. このスクリプトをお問い合わせ件数集計シートのGASに貼り付け保存
 *   2. 「setupDailyTrigger」を実行してトリガーを設定
 *   3. 「processMarchFromStart」を実行して3/13以降のデータを一括取得
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
// displayName: 集計シートに書く名前
// reportId: 日報スプレッドシートのID
// ================================================================

var STAFF_LIST = [
  // contentColIdx:  業務内容列の先頭インデックス（0始まり）
  //   C列=2 (yukinoさん/菜々子さん/ともえさん/優花さん/みおなさん)
  //   D列=3 (りおさん: C列がカテゴリ、D列が業務内容)
  //   E列=4 (はるかさん)
  // categoryColIdx: カテゴリ列のインデックス（0始まり）
  //   B列=1 (あゆみ/ななこ/ともえ/ゆうか/みおなさん)
  //   C列=2 (りおさん: C列がカテゴリ)
  //   D列=3 (はるかさん)
  // useColCTime: true のとき、対応時間はC列(index 2)の値を合計する（はるかさんのみ）
  // csCategoryFilter: 指定した場合、そのカテゴリ名を含む行のみを対応時間の計算対象にする
  //   null = 全カテゴリを対象（クラス分けは除外）
  // excludeCategories: 件数・時間の両方からカテゴリ単位で除外するカテゴリ名リスト
  //   「クラス分け」は全員に共通で除外（isClassBunkRow で処理）
  //   それ以外で個別に除外したいカテゴリをここに指定
  { displayName: 'あゆみ',     reportId: '17YS1m15AZDCBsFKwRq0LEBGsf7jY4exCTJXyhZfDW9E', contentColIdx: 2, categoryColIdx: 1, useColCTime: false, csCategoryFilter: ['LINE対応'], excludeCategories: [] },
  { displayName: 'ななこ',     reportId: '1joyW47gyikwF1tRTRfgiy-ldcsNKef73Ne4JAE1Lvhs',  contentColIdx: 2, categoryColIdx: 1, useColCTime: false, csCategoryFilter: null,         excludeCategories: [] },
  { displayName: 'ともえ',     reportId: '1rKUxHw1Rwkc9BQsT9nY_15khBa2bRinJjZpDInOi7-A', contentColIdx: 2, categoryColIdx: 1, useColCTime: false, csCategoryFilter: null,         excludeCategories: [] },
  { displayName: 'はるかさん', reportId: '1ZRulEZaZqUxvhYIliYskskGo2_KDw2dWizN04WgOi1w', contentColIdx: 4, categoryColIdx: 3, useColCTime: true,  csCategoryFilter: null,         excludeCategories: [] }, // E〜K列 / D列カテゴリ / C列時間合計
  { displayName: 'りお',       reportId: '1OLvkp5LXrCEiwnSNVfDK-mWPZ4Dka1l-l25EFRoAQgg', contentColIdx: 3, categoryColIdx: 2, useColCTime: false, csCategoryFilter: null,         excludeCategories: [] }, // D列=業務内容 / C列=カテゴリ
  { displayName: 'ゆうか',     reportId: '1MaaS2V8L0KU48-0pPql9_0Sl5nE9aj6Rm6d5ONbTvFk', contentColIdx: 2, categoryColIdx: 1, useColCTime: false, csCategoryFilter: null,         excludeCategories: ['CTO室'] }, // CTO室は件数・時間ともに除外
  { displayName: 'みおなさん', reportId: '1mPtv-l2u3JKBpKcRG0JZc5bSqw2e630vkfI-Je04Y6k', contentColIdx: 2, categoryColIdx: 1, useColCTime: false, csCategoryFilter: null,         excludeCategories: [] },
];

// 担当者列の最大スロット数（STAFF_LIST の人数に合わせる）
var MAX_STAFF_COLS = 7;

// 集計シートのデータ開始行（1〜7行目がタイトル/ヘッダー領域）
var DATA_START_ROW  = 9;
var HEADER_ROW      = 8;

// 日報の先頭何行をスキップするか（管理情報・見出し行）
var REPORT_SKIP_ROW = 6;

var DOW_JP = ['日', '月', '火', '水', '木', '金', '土'];

// ================================================================
// ヘルパー: Date から JST の { year, month, day } を取得
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
  var y   = Utilities.formatDate(date, 'Asia/Tokyo', 'yyyy');
  var m   = Utilities.formatDate(date, 'Asia/Tokyo', 'MM');
  var d   = Utilities.formatDate(date, 'Asia/Tokyo', 'dd');
  var dow = DOW_JP[Number(Utilities.formatDate(date, 'Asia/Tokyo', 'u')) % 7];
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
  var digits = s.replace(/[^0-9]/g, '');
  if (digits.length >= 8) return digits.slice(0, 8);
  return '';
}

// ================================================================
// ヘルパー: テキストから「〇件」パターンの件数合計を取得
//   全角数字（１２件）にも対応
// ================================================================

function extractKenCount(text) {
  var n = String(text || '').replace(/[０-９]/g, function(s) {
    return String.fromCharCode(s.charCodeAt(0) - 0xFEE0);
  });
  // 「クラス分け○件」を除去（他カテゴリ行の業務内容に混入するクラス分け件数を排除）
  n = n.replace(/クラス分け\s*\d+\s*件/g, '');
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
// ヘルパー: A列が時刻形式のスケジュール行かどうか判定
// ================================================================

function isScheduleRow(row) {
  var a = row[0];
  if (a instanceof Date) return true;
  return /^\d{1,2}:\d{2}/.test(String(a || ''));
}

// ================================================================
// ヘルパー: カテゴリ列が「クラス分け」の行かどうか判定
//   categoryColIdx: カテゴリ列インデックス（スタッフごとに異なる）
// ================================================================

function isClassBunkRow(row, categoryColIdx) {
  var idx = (typeof categoryColIdx === 'number') ? categoryColIdx : 1;
  return String(row[idx] || '').indexOf('クラス分け') !== -1;
}

// ================================================================
// ヘルパー: スタッフ個別の除外カテゴリに該当する行かどうか判定
//   excludeCategories: 除外するカテゴリ名リスト（例: ['CTO室']）
// ================================================================

function isExcludedCategoryRow(row, categoryColIdx, excludeCategories) {
  if (!excludeCategories || excludeCategories.length === 0) return false;
  var idx      = (typeof categoryColIdx === 'number') ? categoryColIdx : 1;
  var category = String(row[idx] || '').trim();
  for (var i = 0; i < excludeCategories.length; i++) {
    if (category.indexOf(excludeCategories[i]) !== -1) return true;
  }
  return false;
}

// ================================================================
// 毎日トリガーで実行するメイン関数
// ================================================================

function runDailyUpdate() {
  var today = new Date();
  today.setHours(0, 0, 0, 0);

  Logger.log('=== 日次更新開始: ' + Utilities.formatDate(today, 'Asia/Tokyo', 'yyyy/MM/dd') + ' ===');

  try {
    var yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    Logger.log('前日分を処理: ' + Utilities.formatDate(yesterday, 'Asia/Tokyo', 'yyyy/MM/dd'));
    processDate(yesterday);

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
  var staffData   = []; // [{name, count, time}]

  for (var i = 0; i < STAFF_LIST.length; i++) {
    var staff  = STAFF_LIST[i];
    var result = getDataFromReport(staff.reportId, year, month, day, staff.contentColIdx, staff.categoryColIdx, staff.useColCTime, staff.csCategoryFilter, staff.excludeCategories);
    if (result.count > 0) {
      respondents.push(staff.displayName);
      totalCount += result.count;
      staffData.push({ name: staff.displayName, count: result.count, time: result.time });
      Logger.log('  ' + staff.displayName + ': ' + result.count + '件 / ' + result.time + '分');
    }
  }

  if (respondents.length === 0) {
    Logger.log('対応記録なし（全スタッフ0件）');
    return;
  }

  var nameStr = respondents.join('、');
  Logger.log('合計: ' + totalCount + '件 / 担当: ' + nameStr);

  writeSummary(date, nameStr, totalCount, staffData);
}

// ================================================================
// 日報スプシから対応件数・対応時間を一度に取得
//   返値: { count: 件数, time: 対応時間(分) }
// ================================================================

function getDataFromReport(reportId, year, month, day, contentColIdx, categoryColIdx, useColCTime, csCategoryFilter, excludeCategories) {
  try {
    var ss            = SpreadsheetApp.openById(reportId);
    var tabCandidates = generateTabNameCandidates(year, month, day);
    var sheet         = null;

    for (var i = 0; i < tabCandidates.length; i++) {
      sheet = ss.getSheetByName(tabCandidates[i]);
      if (sheet) {
        Logger.log('  日報タブ発見: "' + tabCandidates[i] + '"');
        break;
      }
    }

    if (!sheet) {
      Logger.log('  日報タブなし: [' + tabCandidates.slice(0, 5).join(', ') + ' ...]');
      return { count: 0, time: 0 };
    }

    return {
      count: extractCountFromSheet(sheet, contentColIdx, categoryColIdx, excludeCategories),
      time:  extractTimeFromSheet(sheet, contentColIdx, categoryColIdx, useColCTime, csCategoryFilter, excludeCategories),
    };

  } catch (e) {
    Logger.log('  日報読み込みエラー (' + reportId.slice(0, 8) + '...): ' + e.message);
    return { count: 0, time: 0 };
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
    MM + DD,
    M  + DD,
    MM + D,
    M  + D,
    M  + '/' + D,
    MM + '/' + DD,
    M  + '月' + D + '日',
    M  + '月' + D,
    String(year) + '/' + M + '/' + D,
    String(year) + MM + DD,
    YY + MM + DD,
    M  + '-' + D,
    M  + '.' + D,
    String(year) + '.' + M + '.' + D,
  ];
}

// ================================================================
// 日報シートから合計対応件数を抽出
//   戦略1: 「〇件」パターン / 戦略2: C〜I列の数値合計（フォールバック）
// ================================================================

function extractCountFromSheet(sheet, contentColIdx, categoryColIdx, excludeCategories) {
  var all  = sheet.getDataRange().getValues();
  var data = all.slice(REPORT_SKIP_ROW);

  // 戦略1: 「〇件」パターン（全列を検索）
  var kenTotal = 0;
  for (var i = 0; i < data.length; i++) {
    if (!isScheduleRow(data[i])) continue;
    if (isClassBunkRow(data[i], categoryColIdx)) continue;
    if (isExcludedCategoryRow(data[i], categoryColIdx, excludeCategories)) continue; // 個別除外カテゴリ（CTO室等）
    for (var c = 0; c < data[i].length; c++) {
      kenTotal += extractKenCount(String(data[i][c] || ''));
    }
  }
  if (kenTotal > 0) {
    Logger.log('    → 〇件パターンから取得: ' + kenTotal);
    return kenTotal;
  }

  // 戦略2: 業務内容列（contentColIdx〜+6）の数値合計（フォールバック）
  var grandTotal = 0;
  for (var i = 0; i < data.length; i++) {
    if (!isScheduleRow(data[i])) continue;
    if (isClassBunkRow(data[i], categoryColIdx)) continue;
    if (isExcludedCategoryRow(data[i], categoryColIdx, excludeCategories)) continue; // 個別除外カテゴリ（CTO室等）
    grandTotal += sumContentCols(data[i], contentColIdx);
  }
  if (grandTotal > 0) {
    Logger.log('    → 業務内容列合計から取得: ' + grandTotal);
  }
  return grandTotal;
}

// 業務内容列（colStart〜colStart+6）の正数を合計
// 他のスタッフ: C〜I (colStart=2), はるかさん: E〜K (colStart=4)
function sumContentCols(row, colStart) {
  var sum = 0;
  var end = Math.min(row.length - 1, colStart + 6);
  for (var c = colStart; c <= end; c++) {
    var v = row[c];
    if (typeof v === 'number' && !isNaN(v) && v > 0) sum += v;
  }
  return sum;
}

// 対応時間の抽出（2ステップ方式）
//
//   ステップ1: 業務内容列に件数パターンがある行のカテゴリ名を収集
//   ステップ2: そのカテゴリ名を持つ行のうち、
//             業務内容が空でなく「クラス分け」を含まない行で時間計算
//
//   その他全員 (useColCTime=false): 対象行数 × 30分
//   はるかさん  (useColCTime=true):  対象行の C列値（h単位）× 60 を合計
//   csCategoryFilter: 指定した場合、そのカテゴリ名を含む行のみをステップ1の対象にする
function extractTimeFromSheet(sheet, contentColIdx, categoryColIdx, useColCTime, csCategoryFilter, excludeCategories) {
  var data  = sheet.getDataRange().getValues().slice(REPORT_SKIP_ROW);
  var total = 0;

  // ステップ1: 業務内容列に件数パターンがある行のカテゴリ名を収集
  var targetCategories = {};
  for (var i = 0; i < data.length; i++) {
    if (!isScheduleRow(data[i]) || isClassBunkRow(data[i], categoryColIdx)) continue;
    if (isExcludedCategoryRow(data[i], categoryColIdx, excludeCategories)) continue;
    var category = String(data[i][categoryColIdx] || '').trim();
    if (category === '') continue;

    // csCategoryFilter がある場合はそのカテゴリのみ対象
    if (csCategoryFilter && csCategoryFilter.length > 0) {
      var matched = false;
      for (var f = 0; f < csCategoryFilter.length; f++) {
        if (category.indexOf(csCategoryFilter[f]) !== -1) { matched = true; break; }
      }
      if (!matched) continue;
    }

    var content = String(data[i][contentColIdx] || '').trim();
    if (extractKenCount(content) > 0) {
      targetCategories[category] = true;
    }
  }

  Logger.log('    → 対象カテゴリ: [' + Object.keys(targetCategories).join(', ') + ']');

  // ステップ2: 対象カテゴリ × 業務内容が空でなく「クラス分け」を含まない行で時間計算
  for (var i = 0; i < data.length; i++) {
    if (!isScheduleRow(data[i]) || isClassBunkRow(data[i], categoryColIdx)) continue;
    if (isExcludedCategoryRow(data[i], categoryColIdx, excludeCategories)) continue;
    var category = String(data[i][categoryColIdx] || '').trim();
    if (category === '' || !targetCategories[category]) continue;

    var content = String(data[i][contentColIdx] || '').trim();
    if (content === '') continue;                        // 業務内容が空の行はスキップ
    if (content.indexOf('クラス分け') !== -1) continue; // 業務内容に「クラス分け」含む行はスキップ

    if (useColCTime) {
      // はるかさん: C列(index 2) の値を時間(h)として分に換算して加算
      var colC = data[i][2];
      if (typeof colC === 'number' && colC > 0) {
        total += Math.round(colC * 60); // h → 分
      } else if (colC instanceof Date) {
        total += colC.getHours() * 60 + colC.getMinutes();
      }
    } else {
      // その他全員: 1行 = 30分
      total += 30;
    }
  }

  Logger.log('    → 対応時間: ' + total + '分');
  return total;
}

// ================================================================
// 集計シートにデータを書き込む
//   同日付の既存行があれば削除してから新規挿入
// ================================================================

function writeSummary(date, nameStr, count, staffData) {
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
    var totalCols = 3 + MAX_STAFF_COLS * 2; // A〜Q

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
      for (var j = delRows.length - 1; j >= 0; j--) {
        sheet.getRange(delRows[j], 1, 1, totalCols).clearContent();
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

    // ---- A〜Q列に一括書き込み ----
    // [日付, 担当者合計, 件数合計, 担当者1名, 担当者1時間, 担当者2名, 担当者2時間, ...]
    var rowValues = [dateStr, nameStr, count];
    for (var i = 0; i < MAX_STAFF_COLS; i++) {
      if (i < staffData.length) {
        rowValues.push(staffData[i].name);
        rowValues.push(staffData[i].time + '分');
      } else {
        rowValues.push('');
        rowValues.push('');
      }
    }

    sheet.getRange(writeRow, 2).clearDataValidations();
    sheet.getRange(writeRow, 1, 1, rowValues.length).setValues([rowValues]);

    // 列の配置
    sheet.getRange(writeRow, 1).setHorizontalAlignment('right');   // A: 日付
    sheet.getRange(writeRow, 2).setHorizontalAlignment('center');  // B: 担当者合計
    sheet.getRange(writeRow, 3).setHorizontalAlignment('right');   // C: 件数合計
    for (var i = 0; i < MAX_STAFF_COLS; i++) {
      var nameCol = 4 + i * 2;
      var timeCol = 5 + i * 2;
      sheet.getRange(writeRow, nameCol).setHorizontalAlignment('center'); // 担当者名
      sheet.getRange(writeRow, timeCol).setHorizontalAlignment('right');  // 対応時間
    }

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
  var totalCols = 3 + MAX_STAFF_COLS * 2;

  sheet.setColumnWidth(1, 160); // A: 日付
  sheet.setColumnWidth(2, 180); // B: 担当者（合計）
  sheet.setColumnWidth(3, 90);  // C: 対応件数
  for (var i = 0; i < MAX_STAFF_COLS; i++) {
    sheet.setColumnWidth(4 + i * 2, 110); // 担当者名
    sheet.setColumnWidth(5 + i * 2, 80);  // 対応時間
  }

  // 1行目: タイトル
  sheet.getRange(1, 1, 1, totalCols)
       .merge()
       .setValue(year + '年' + month + '月 お問い合わせ件数集計')
       .setFontWeight('bold')
       .setFontSize(13)
       .setHorizontalAlignment('center')
       .setVerticalAlignment('middle');
  sheet.setRowHeight(1, 40);

  // 8行目: 列ヘッダー
  var headers = ['日付', '担当者（合計）', '対応件数'];
  for (var i = 1; i <= MAX_STAFF_COLS; i++) {
    headers.push('担当者' + i);
    headers.push('対応時間' + i);
  }
  sheet.getRange(HEADER_ROW, 1, 1, totalCols)
       .setValues([headers])
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
// デバッグ: 3/31 の各スタッフ日報の行データを詳細ログ出力
//   GASエディタで実行 → 「ログ」で確認してください
// ================================================================

function debugMarch31() {
  var year = 2026, month = 3, day = 31;

  for (var s = 0; s < STAFF_LIST.length; s++) {
    var staff = STAFF_LIST[s];
    Logger.log('');
    Logger.log('========== ' + staff.displayName + ' ==========');
    Logger.log('  contentColIdx=' + staff.contentColIdx + '  categoryColIdx=' + staff.categoryColIdx);

    try {
      var ss = SpreadsheetApp.openById(staff.reportId);
      var tabCandidates = generateTabNameCandidates(year, month, day);
      var sheet = null;
      for (var i = 0; i < tabCandidates.length; i++) {
        sheet = ss.getSheetByName(tabCandidates[i]);
        if (sheet) { Logger.log('  タブ発見: "' + tabCandidates[i] + '"'); break; }
      }
      if (!sheet) {
        Logger.log('  !! タブが見つかりません (候補: ' + tabCandidates.slice(0, 6).join(', ') + ')');
        continue;
      }

      var allData = sheet.getDataRange().getValues();
      Logger.log('  総行数: ' + allData.length + '  スキップ後データ行数: ' + (allData.length - REPORT_SKIP_ROW));

      // 先頭6行（スキップ行）の内容も確認
      Logger.log('  --- スキップ行 (先頭 ' + REPORT_SKIP_ROW + ' 行) ---');
      for (var r = 0; r < Math.min(REPORT_SKIP_ROW, allData.length); r++) {
        Logger.log('  行' + (r+1) + ': ' + allData[r].slice(0, 6).map(function(v){ return '"' + String(v).slice(0,20) + '"'; }).join(' | '));
      }

      var data = allData.slice(REPORT_SKIP_ROW);
      Logger.log('  --- スケジュール行の詳細 ---');
      var scheduleCount = 0;
      for (var i = 0; i < data.length; i++) {
        if (!isScheduleRow(data[i])) continue;
        scheduleCount++;

        var category   = String(data[i][staff.categoryColIdx] || '').trim();
        var content    = String(data[i][staff.contentColIdx]  || '').trim();
        var classBunk  = isClassBunkRow(data[i], staff.categoryColIdx);
        var kenCount   = extractKenCount(content);
        var colC_val   = data[i][2]; // C列（index 2）の値（はるかさん用）

        // csCategoryFilter に一致するか
        var filterMatch = '(フィルタなし)';
        if (staff.csCategoryFilter && staff.csCategoryFilter.length > 0) {
          var m = false;
          for (var f = 0; f < staff.csCategoryFilter.length; f++) {
            if (category.indexOf(staff.csCategoryFilter[f]) !== -1) { m = true; break; }
          }
          filterMatch = m ? '★フィルタ一致' : '×フィルタ不一致';
        }

        Logger.log('  行' + (i + REPORT_SKIP_ROW + 1) +
          ' A="' + String(data[i][0]).slice(0,8) + '"' +
          ' B="' + String(data[i][1]).slice(0,12) + '"' +
          ' C="' + String(data[i][2]).slice(0,12) + '"' +
          ' D="' + String(data[i][3]).slice(0,12) + '"' +
          ' E="' + String(data[i][4]).slice(0,12) + '"' +
          ' | カテゴリ[' + staff.categoryColIdx + ']="' + category + '"' +
          ' | 業務内容[' + staff.contentColIdx + ']="' + content.slice(0,20) + '"' +
          ' | クラス分け=' + classBunk +
          ' | 件数=' + kenCount +
          ' | C列値=' + colC_val +
          ' | ' + filterMatch
        );
      }
      Logger.log('  スケジュール行合計: ' + scheduleCount);

      // 最終的な集計結果
      var result = getDataFromReport(staff.reportId, year, month, day,
                                     staff.contentColIdx, staff.categoryColIdx,
                                     staff.useColCTime, staff.csCategoryFilter, staff.excludeCategories);
      Logger.log('  >>> 結果: 件数=' + result.count + '件 / 時間=' + result.time + '分');

    } catch(e) {
      Logger.log('  !! エラー: ' + e.message);
    }
  }

  Logger.log('');
  Logger.log('=== debugMarch31 完了 ===');
}

// ================================================================
// 3/13 以降のデータを一括処理（初回実行用）
// ================================================================

// 前半: 3/13 〜 3/21（まずこちらを実行）
function processMarchPart1() {
  Logger.log('=== 3月前半（3/13〜3/21）一括処理開始 ===');
  processBatchRange(new Date(2026, 2, 13), new Date(2026, 2, 21));
  Logger.log('=== 3月前半 完了 ===');
}

// 後半: 3/22 〜 本日（前半完了後に実行）
function processMarchPart2() {
  Logger.log('=== 3月後半（3/22〜本日）一括処理開始 ===');
  var today = new Date();
  today.setHours(0, 0, 0, 0);
  processBatchRange(new Date(2026, 2, 22), today);
  Logger.log('=== 3月後半 完了 ===');
}

// 共通: 指定期間をループ処理
function processBatchRange(start, end) {
  var current = new Date(start);
  var cnt     = 0;
  while (current <= end) {
    Logger.log('処理: ' + Utilities.formatDate(current, 'Asia/Tokyo', 'yyyy/MM/dd'));
    processDate(new Date(current));
    current.setDate(current.getDate() + 1);
    cnt++;
    if (cnt % 10 === 0) Utilities.sleep(3000); // 10日ごとに3秒待機
  }
  Logger.log('処理済: ' + cnt + '日分');
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
