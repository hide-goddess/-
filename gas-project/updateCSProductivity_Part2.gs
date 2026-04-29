/**
 * CS生産性タブ 自動集計スクリプト（Part2: 後半7名）
 * 対象: 増子真也子、田中里奈、山下優花、中村八重子、松元陸、佐藤大河、西田真優
 *
 * A列: 年月（月の先頭行のみ）
 * B列: メンバー名（全行に記載）
 * C列: 「〇〇総時間」→ その下にカテゴリー名
 * D列: 合計時間（総時間行）→ その下は空白
 * E列: 業務内容
 * F列: 業務内容ごとの実働時間
 *
 * ※ 2025年12月以降のデータのみ出力
 * ※ Part1を先に実行 → Part2で追記
 */

// ========== 設定 ==========
var OUTPUT_SS_ID_P2 = '1gIygjcHKgGvg3j0RU0LxzrPeGxNF9cJeOrxznHqwOAo';
var OUTPUT_SHEET_NAME_P2 = 'CS生産性';
var DATA_START_ROW_P2 = 8;
var MINUTES_PER_SLOT_P2 = 30;

var MEMBERS_P2 = [
  { ssId: '1l0S0Cgr4mgmOGq6Rdwsc65OgTQiUqllmzlTFGt1Fw34', name: '増子真也子' },
  { ssId: '1Q_u5T3h-9BHKDWrxUowB6C_zFRYUifR4hvDwq-RkWbc', name: '田中里奈' },
  { ssId: '1MaaS2V8L0KU48-0pPql9_0Sl5nE9aj6Rm6d5ONbTvFk', name: '山下優花' },
  { ssId: '1Tu8IYFlSl4xUAQp6Adsl1XoaAw7yCQ_qBR6jDfVHx2c', name: '中村八重子' },
  { ssId: '1easwi2P5CVfy5VPEvN7D5Ko5I4kneXmcOeVL0DgJ0Wk', name: '松元陸' },
  { ssId: '1RCfsAlJuGUQWI5du1URYLvxHvdDCYFj5EK_w4fMLkqk', name: '佐藤大河' },
  { ssId: '1uehvBlQm2Ekv3rdpUuM6cLjpOXREQxwZXr_tlUiW5TM', name: '西田真優' },
];

var SKIP_KEYWORDS_P2 = ['集計', 'テンプレ', 'マスター', 'シート', 'クラス分け', 'まとめ', '合計'];
var SKIP_EXACT_P2 = ['0401−0417', '0401-0417'];

// ========== メイン関数（Part2） ==========

function updateCSProductivity_Part2() {
  var targetSS = SpreadsheetApp.openById(OUTPUT_SS_ID_P2);
  var targetSheet = targetSS.getSheetByName(OUTPUT_SHEET_NAME_P2);

  if (!targetSheet) {
    throw new Error('「' + OUTPUT_SHEET_NAME_P2 + '」シートが見つかりません。');
  }

  // Part2はPart1の後に追記する
  var appendStartRow = targetSheet.getLastRow() + 1;

  var memberMonthlyData_P2 = {};

  MEMBERS_P2.forEach(function(member) {
    try {
      Logger.log('========== 処理中: ' + member.name + ' ==========');
      var ss = SpreadsheetApp.openById(member.ssId);
      var sheets = ss.getSheets();
      var monthlyData = {};

      sheets.forEach(function(sheet) {
        var sheetName = sheet.getName().trim();
        if (shouldSkipSheet_P2(sheetName)) return;

        var normalizedName = normalizeSheetName_P2(sheetName);
        var dateInfo = parseSheetDate_P2(normalizedName);
        if (!dateInfo || !isTargetMonth_P2(dateInfo)) return;

        var monthKey = dateInfo.year + '年' + dateInfo.month + '月';
        if (!monthlyData[monthKey]) {
          monthlyData[monthKey] = {};
        }

        var sheetLastRow = sheet.getLastRow();
        if (sheetLastRow < DATA_START_ROW_P2) return;

        var numRows = sheetLastRow - DATA_START_ROW_P2 + 1;
        var dataRange = sheet.getRange(DATA_START_ROW_P2, 2, numRows, 8);
        var values = dataRange.getValues();

        values.forEach(function(row) {
          var cat = (row[0] || '').toString().trim();
          if (cat === '') return;

          if (/^\d+(\.\d+)?$/.test(cat)) return;

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

      memberMonthlyData_P2[member.name] = monthlyData;
      Logger.log(member.name + ' 完了: ' + Object.keys(monthlyData).length + 'ヶ月分');

    } catch (e) {
      Logger.log('エラー (' + member.name + '): ' + e.message);
    }
  });

  // ---------- 出力データ構築 ----------
  var outputValues = [];

  MEMBERS_P2.forEach(function(member) {
    var monthlyData = memberMonthlyData_P2[member.name];
    if (!monthlyData) return;

    var sortedMonths = Object.keys(monthlyData).sort(function(a, b) {
      return monthKeyToSortValue_P2(a) - monthKeyToSortValue_P2(b);
    });

    sortedMonths.forEach(function(monthKey) {
      var catData = monthlyData[monthKey];
      var sortedCats = Object.keys(catData).sort();

      var isFirstCatInMonth = true;

      sortedCats.forEach(function(cat) {
        var data = catData[cat];
        var totalCount = data._total;
        var totalHours = (totalCount * MINUTES_PER_SLOT_P2) / 60;

        var taskKeys = Object.keys(data).filter(function(k) { return k !== '_total'; }).sort();

        var monthCell = isFirstCatInMonth ? monthKey : '';
        outputValues.push([monthCell, member.name, cat + '総時間', formatHours_P2(totalHours), '', '']);
        isFirstCatInMonth = false;

        taskKeys.forEach(function(task) {
          var taskCount = data[task];
          var taskHours = (taskCount * MINUTES_PER_SLOT_P2) / 60;
          outputValues.push(['', member.name, cat, '', task, formatHours_P2(taskHours)]);
        });
      });
    });
  });

  if (outputValues.length === 0) {
    Logger.log('Part2: 書き込むデータがありませんでした。');
    return;
  }

  // ---------- 書き込み（Part1の後に追記） ----------
  targetSheet.getRange(appendStartRow, 1, outputValues.length, 6).setValues(outputValues);

  Logger.log('===== Part2 完了 =====');
  Logger.log('開始行: ' + appendStartRow + ' | 合計 ' + outputValues.length + ' 行書き込み');
  SpreadsheetApp.flush();
}

// ========== ヘルパー関数（_P2サフィックス） ==========

function formatHours_P2(hours) {
  if (hours % 1 === 0) {
    return hours + 'h';
  } else {
    return hours.toFixed(1) + 'h';
  }
}

function normalizeSheetName_P2(name) {
  return name
    .replace(/−/g, '-')
    .replace(/–/g, '-')
    .replace(/—/g, '-')
    .replace(/－/g, '-')
    .replace(/ｰ/g, '-')
    .trim();
}

function parseSheetDate_P2(sheetName) {
  var month, day;

  var matchJP = sheetName.match(/^(\d{1,2})月(\d{1,2})日$/);
  if (matchJP) {
    month = parseInt(matchJP[1], 10);
    day = parseInt(matchJP[2], 10);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return { year: getYear_P2(month), month: month, day: day };
    }
    return null;
  }

  var match4 = sheetName.match(/^(\d{4})$/);
  if (match4) {
    month = parseInt(sheetName.substring(0, 2), 10);
    day = parseInt(sheetName.substring(2, 4), 10);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return { year: getYear_P2(month), month: month, day: day };
    }
    return null;
  }

  var match3 = sheetName.match(/^(\d{3})$/);
  if (match3) {
    month = parseInt(sheetName.substring(0, 1), 10);
    day = parseInt(sheetName.substring(1, 3), 10);
    if (month >= 1 && month <= 9 && day >= 1 && day <= 31) {
      return { year: getYear_P2(month), month: month, day: day };
    }
    return null;
  }

  var match2 = sheetName.match(/^(\d{1,2})[\/\-](\d{1,2})$/);
  if (match2) {
    month = parseInt(match2[1], 10);
    day = parseInt(match2[2], 10);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return { year: getYear_P2(month), month: month, day: day };
    }
    return null;
  }

  var matchFull = sheetName.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
  if (matchFull) {
    var year = parseInt(matchFull[1], 10);
    month = parseInt(matchFull[2], 10);
    day = parseInt(matchFull[3], 10);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return { year: year, month: month, day: day };
    }
    return null;
  }

  return null;
}

function getYear_P2(month) {
  if (month >= 4 && month <= 12) {
    return 2025;
  } else {
    return 2026;
  }
}

function isTargetMonth_P2(dateInfo) {
  if (dateInfo.year > 2025) return true;
  if (dateInfo.year === 2025 && dateInfo.month >= 12) return true;
  return false;
}

function shouldSkipSheet_P2(sheetName) {
  var normalized = normalizeSheetName_P2(sheetName);
  for (var i = 0; i < SKIP_EXACT_P2.length; i++) {
    if (normalized === SKIP_EXACT_P2[i]) return true;
  }
  for (var j = 0; j < SKIP_KEYWORDS_P2.length; j++) {
    if (normalized.indexOf(SKIP_KEYWORDS_P2[j]) !== -1) return true;
  }
  if (/^\d{1}$/.test(normalized)) return true;
  return false;
}

function monthKeyToSortValue_P2(monthKey) {
  var match = monthKey.match(/(\d{4})年(\d{1,2})月/);
  if (!match) return 0;
  return parseInt(match[1]) * 100 + parseInt(match[2]);
}
