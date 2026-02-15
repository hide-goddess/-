/**
 * CS生産性タブ 自動集計スクリプト
 * 対象: 田中春奈、平松弥央菜、小林陽香、小林未侑、中田菜々子
 *
 * A列: 年月（月の先頭行のみ）
 * B列: メンバー名（全行に記載）
 * C列: 「〇〇総時間」→ その下にカテゴリー名（プルダウン）
 * D列: 合計時間（総時間行）→ その下は空白
 * E列: 業務内容
 * F列: 業務内容ごとの実働時間
 *
 * ※ 2025年12月以降のデータのみ出力
 */

// ========== 設定 ==========
var OUTPUT_SS_ID = '1gIygjcHKgGvg3j0RU0LxzrPeGxNF9cJeOrxznHqwOAo';
var OUTPUT_SHEET_NAME = 'CS生産性';
var DATA_START_ROW = 8;
var OUTPUT_START_ROW = 13;
var MINUTES_PER_SLOT = 30;

var MEMBERS = [
  { ssId: '1_RLt8CB6oVzDNUqhH6PyyA6d7dWIrIv3PITca8M0bJU', name: '田中春奈' },
  { ssId: '1mPtv-l2u3JKBpKcRG0JZc5bSqw2e630vkfI-Je04Y6k', name: '平松弥央菜' },
  { ssId: '1OJJbpaFjmJQtAngQW3ZUYZOLqj-wJzFxTo1r0OfFtpc', name: '小林陽香' },
  { ssId: '1uucx-hS0G8IuDkKkokKu2JvNhIc0Ae35rH9tERZ6eJY', name: '小林未侑' },
  { ssId: '1joyW47gyikwF1tRTRfgiy-ldcsNKef73Ne4JAE1Lvhs', name: '中田菜々子' },
];

// スキップするシート名キーワード
var SKIP_KEYWORDS = ['集計', 'テンプレ', 'マスター', 'シート', 'クラス分け', 'まとめ', '合計'];
// 完全一致でスキップ
var SKIP_EXACT = ['0401−0417', '0401-0417'];

// ========== メイン関数 ==========

function updateCSProductivity() {
  var targetSS = SpreadsheetApp.openById(OUTPUT_SS_ID);
  var targetSheet = targetSS.getSheetByName(OUTPUT_SHEET_NAME);

  if (!targetSheet) {
    throw new Error('「' + OUTPUT_SHEET_NAME + '」シートが見つかりません。');
  }

  var lastRow = targetSheet.getLastRow();
  if (lastRow >= OUTPUT_START_ROW) {
    targetSheet.getRange(OUTPUT_START_ROW, 1, lastRow - OUTPUT_START_ROW + 1, 6).clearContent();
    targetSheet.getRange(OUTPUT_START_ROW, 3, lastRow - OUTPUT_START_ROW + 1, 1).clearDataValidations();
  }

  var allUniqueCategories = {};
  var memberMonthlyData = {};

  MEMBERS.forEach(function(member) {
    try {
      Logger.log('========== 処理中: ' + member.name + ' ==========');
      var ss = SpreadsheetApp.openById(member.ssId);
      var sheets = ss.getSheets();
      var monthlyData = {};

      sheets.forEach(function(sheet) {
        var sheetName = sheet.getName().trim();
        if (shouldSkipSheet(sheetName)) return;

        var normalizedName = normalizeSheetName(sheetName);
        var dateInfo = parseSheetDate(normalizedName);
        if (!dateInfo || !isTargetMonth(dateInfo)) return;

        var monthKey = dateInfo.year + '年' + dateInfo.month + '月';
        if (!monthlyData[monthKey]) {
          monthlyData[monthKey] = {};
        }

        var sheetLastRow = sheet.getLastRow();
        if (sheetLastRow < DATA_START_ROW) return;

        var numRows = sheetLastRow - DATA_START_ROW + 1;
        var dataRange = sheet.getRange(DATA_START_ROW, 2, numRows, 8);
        var values = dataRange.getValues();

        values.forEach(function(row) {
          var cat = (row[0] || '').toString().trim();
          if (cat === '') return;

          allUniqueCategories[cat] = true;

          if (!monthlyData[monthKey][cat]) {
            monthlyData[monthKey][cat] = { _total: 0 };
          }
          monthlyData[monthKey][cat]._total += 1;

          var taskFound = false;
          for (var col = 1; col <= 7; col++) {
            var task = (row[col] || '').toString().trim();
            if (task !== '') {
              monthlyData[monthKey][cat][task] = (monthlyData[monthKey][cat][task] || 0) + 1;
              taskFound = true;
            }
          }

          if (!taskFound) {
            var emptyKey = '（業務内容なし）';
            monthlyData[monthKey][cat][emptyKey] = (monthlyData[monthKey][cat][emptyKey] || 0) + 1;
          }
        });
      });

      memberMonthlyData[member.name] = monthlyData;
      Logger.log(member.name + ' 完了: ' + Object.keys(monthlyData).length + 'ヶ月分');

    } catch (e) {
      Logger.log('エラー (' + member.name + '): ' + e.message);
    }
  });

  // ---------- 出力データ構築 ----------
  var outputValues = [];
  var catDropdownRows = [];
  var dropdownList = Object.keys(allUniqueCategories).sort();

  MEMBERS.forEach(function(member) {
    var monthlyData = memberMonthlyData[member.name];
    if (!monthlyData) return;

    var sortedMonths = Object.keys(monthlyData).sort(function(a, b) {
      return monthKeyToSortValue(a) - monthKeyToSortValue(b);
    });

    sortedMonths.forEach(function(monthKey) {
      var catData = monthlyData[monthKey];
      var sortedCats = Object.keys(catData).sort();

      var isFirstCatInMonth = true;

      sortedCats.forEach(function(cat) {
        var data = catData[cat];
        var totalCount = data._total;
        var totalHours = (totalCount * MINUTES_PER_SLOT) / 60;

        var taskKeys = Object.keys(data).filter(function(k) { return k !== '_total'; }).sort();

        // ===== 1行目: カテゴリー総時間ヘッダー =====
        var monthCell = isFirstCatInMonth ? monthKey : '';
        outputValues.push([monthCell, member.name, cat + '総時間', formatHours(totalHours), '', '']);
        isFirstCatInMonth = false;

        // ===== 2行目以降: カテゴリー + 業務内容明細 =====
        taskKeys.forEach(function(task) {
          var taskCount = data[task];
          var taskHours = (taskCount * MINUTES_PER_SLOT) / 60;

          outputValues.push(['', member.name, cat, '', task, formatHours(taskHours)]);
          catDropdownRows.push(OUTPUT_START_ROW + outputValues.length - 1);
        });
      });
    });
  });

  if (outputValues.length === 0) {
    Logger.log('書き込むデータがありませんでした。');
    return;
  }

  // ---------- 書き込み ----------
  targetSheet.getRange(OUTPUT_START_ROW, 1, outputValues.length, 6).setValues(outputValues);

  // ---------- C列プルダウン設定（明細行のみ） ----------
  if (dropdownList.length > 0) {
    var rule = SpreadsheetApp.newDataValidation()
      .requireValueInList(dropdownList, true)
      .setAllowInvalid(false)
      .build();

    catDropdownRows.forEach(function(row) {
      targetSheet.getRange(row, 3).setDataValidation(rule);
    });
  }

  Logger.log('===== 完了 =====');
  Logger.log('合計 ' + outputValues.length + ' 行書き込み');
  SpreadsheetApp.flush();
}

// ========== ヘルパー関数 ==========

function formatHours(hours) {
  if (hours % 1 === 0) {
    return hours + 'h';
  } else {
    return hours.toFixed(1) + 'h';
  }
}

function normalizeSheetName(name) {
  return name
    .replace(/\u2212/g, '-')
    .replace(/\u2013/g, '-')
    .replace(/\u2014/g, '-')
    .replace(/\uFF0D/g, '-')
    .replace(/\uFF70/g, '-')
    .trim();
}

function parseSheetDate(sheetName) {
  var month, day;

  // パターン1: 「X月Y日」形式（例: 1月11日、12月3日）
  var matchJP = sheetName.match(/^(\d{1,2})月(\d{1,2})日$/);
  if (matchJP) {
    month = parseInt(matchJP[1], 10);
    day = parseInt(matchJP[2], 10);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return { year: getYear(month), month: month, day: day };
    }
    return null;
  }

  // パターン2: 4桁数字（例: 0401 → 4月1日）
  var match4 = sheetName.match(/^(\d{4})$/);
  if (match4) {
    month = parseInt(sheetName.substring(0, 2), 10);
    day = parseInt(sheetName.substring(2, 4), 10);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return { year: getYear(month), month: month, day: day };
    }
    return null;
  }

  // パターン3: 「M/D」または「M-D」形式（例: 4/1、12-3）
  var match2 = sheetName.match(/^(\d{1,2})[\/\-](\d{1,2})$/);
  if (match2) {
    month = parseInt(match2[1], 10);
    day = parseInt(match2[2], 10);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return { year: getYear(month), month: month, day: day };
    }
    return null;
  }

  return null;
}

function getYear(month) {
  if (month >= 4 && month <= 12) {
    return 2025;
  } else {
    return 2026;
  }
}

function isTargetMonth(dateInfo) {
  if (dateInfo.year > 2025) return true;
  if (dateInfo.year === 2025 && dateInfo.month >= 12) return true;
  return false;
}

function shouldSkipSheet(sheetName) {
  var normalized = normalizeSheetName(sheetName);
  for (var i = 0; i < SKIP_EXACT.length; i++) {
    if (normalized === SKIP_EXACT[i]) return true;
  }
  for (var j = 0; j < SKIP_KEYWORDS.length; j++) {
    if (normalized.indexOf(SKIP_KEYWORDS[j]) !== -1) return true;
  }
  if (/^\d{1}$/.test(normalized)) return true;
  return false;
}

function monthKeyToSortValue(monthKey) {
  var match = monthKey.match(/(\d{4})年(\d{1,2})月/);
  if (!match) return 0;
  return parseInt(match[1]) * 100 + parseInt(match[2]);
}
