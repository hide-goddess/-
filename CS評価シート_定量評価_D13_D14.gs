// ==================================================
// GAS: CS部 評価シート 定量評価 D13・D14 記入スクリプト
//
// D13: 【CS】数値管理（新）スプシの万垢率（月未記録）タブのL列をメンバー全員のD13に記入
// D14: メンバーの日報・評価制度管理スプシから月次達成率の全体平均を全員のD14に記入
//
// ※ 他ファイルとの定数名衝突を避けるため、全設定を CS_HYOKA_CONFIG にまとめています
// ==================================================

var CS_HYOKA_CONFIG = {

  // 【CS】数値管理（新）スプシID
  csKanriSsId: '1sWv3335Fkou2Ohet6sQOuwZUysIIWZhCjUUxiSo-5Bc',

  // 万垢率シートをgidで直接指定（タブ名変更に強い）
  // URL末尾の gid=1750450396 から取得
  mankokuSheetGid: 1750450396,

  // ↓ タブ名でも探すフォールバック用（gidで見つからない場合）
  mankokuTabName: '万垢率（月未記録）',

  // メンバーの日報・評価制度管理スプシID
  nippouSsId: '1gIygjcHKgGvg3j0RU0LxzrPeGxNF9cJeOrxznHqwOAo',

  // 日報管理スプシでメンバー名が入っている列（0始まり: A列=0）
  memberNameColInNippou: 0,

  // メンバー一覧（15名）
  members: [
    { name: '松元陸',    ssId: '1no-0rtLzKWybhJYne41zINUDqWh8xagF6kh5UvifPOs' },
    { name: '平松弥央菜', ssId: '1jeLIm3kRHl5-4b3EwvgrNnwfoAFG036ymmL2BggaRks' },
    { name: '小林陽香',  ssId: '1zL9jpB8WPmCgJaLudY8usZrHPHK7TBmVKLt17RAx0Yk' },
    { name: '小林未侑',  ssId: '1mpuozouSmS8BJNFk2zYQAGlIp9m0M3fp7yOu3Ta_e4I' },
    { name: '中田菜々子', ssId: '1eK9tZEvv_H7iXCi7b2LsREzIEsyN17SYptklB3HXke4' },
    { name: '久保梨生',  ssId: '10CU-78ByNYhzr5LuIhK8makS1uZ_LSPK8HBuFGC9hhU' },
    { name: '宇梶知恵',  ssId: '1vLIsuqdOoWrmH-EXdBkUL3XSkcYxl5sEW7NGillEviI' },
    { name: '増子真也子', ssId: '1sbHXZaFivRzliSZEX72rvLFN4EU7bR6ltXbB39lZHVc' },
    { name: '川端歩実',  ssId: '1sLz2fvbPOA1mwwGAUOtn2zOO97XosnbI1jXqJ2n2vlc' },
    { name: '田中里奈',  ssId: '1LZisdyfMmShNsD0cgZtiLZe7uyUPfDDUrLv6U4h_ra0' },
    { name: '山下優花',  ssId: '15PtZ4__btQ2UxpBNPbGdfGd8dKpjenRAT6Mrn3bMVck' },
    { name: '中村八重子', ssId: '1QI8POM4hZAkjjwSeWwamxDmoUx4-zNRD3CTLS0SJyhs' },
    { name: '佐藤大河',  ssId: '1PMGKmUaU2hze5N4Ar7eCcU_uJz-jQThdq_3eGWuI_kw' },
    { name: '青木博資',  ssId: '1PecGIyJDbHy2y1yXIia0Ada1HENe3qY6W-HSppiyUTc' },
    { name: '田畑秀晃',  ssId: '1a7K7N062cHMRTwX8lYpujRGH6b6z1s9bDf--v_DJZ7M' },
  ],

  // 対象月設定（tabMonth: タブ名の月部分 / year・month: 年月マッチ用 / ymKey: 内部キー）
  // ※ 1月以降は2026年
  targetMonths: [
    { tabMonth: '12', year: 2025, month: 12, ymKey: '202512' },
    { tabMonth: '1',  year: 2026, month: 1,  ymKey: '202601' },
    // 必要に応じて追加:
    // { tabMonth: '2',  year: 2026, month: 2,  ymKey: '202602' },
    // { tabMonth: '3',  year: 2026, month: 3,  ymKey: '202603' },
  ],

  // 日報管理スプシの月別達成率設定
  // スクリーンショットより: タブ名は "12月" "1月" 形式
  // achievementColIndices: E列=4, G列=6, I列=8（0始まり）
  nippouMonthConfig: {
    '202512': {
      nippouTabName: '12月',
      nippouTabGid: null,  // gidが判明すれば数値で設定するとより確実
      achievementColIndices: [4, 6, 8],
    },
    '202601': {
      nippouTabName: '1月',
      nippouTabGid: 1754320975,  // URL gid=1754320975 より確定
      achievementColIndices: [4, 6, 8],
    },
  },
};

// ==================================================
// メイン関数（D13・D14 両方実行）
// ==================================================
function runAll() {
  Logger.log('===== D13（万垢率）記入 開始 =====');
  setRow13_MankokuRate();
  Logger.log('===== D13 完了 =====');

  Logger.log('===== D14（達成率平均）記入 開始 =====');
  setRow14_AchievementRate();
  Logger.log('===== D14 完了 =====');
}

// ==================================================
// D13: 万垢率をメンバー全員のシートD13に記入
// ==================================================
function setRow13_MankokuRate() {
  var cfg = CS_HYOKA_CONFIG;
  var csKanriSS = SpreadsheetApp.openById(cfg.csKanriSsId);

  // gid優先、見つからなければタブ名で検索
  var mankokuSheet = csHyokaGetSheetByGid(csKanriSS, cfg.mankokuSheetGid)
                   || csKanriSS.getSheetByName(cfg.mankokuTabName);

  if (!mankokuSheet) {
    Logger.log('❌ 万垢率シートが見つかりません（gid=' + cfg.mankokuSheetGid + ', タブ名=' + cfg.mankokuTabName + '）');
    Logger.log('   実在するタブ一覧: ' + csKanriSS.getSheets().map(function(s){return s.getName();}).join(', '));
    return;
  }
  Logger.log('✅ 万垢率シート取得: ' + mankokuSheet.getName());

  var data = mankokuSheet.getDataRange().getValues();
  Logger.log('万垢率シート 取得行数: ' + data.length);

  // 年月キーごとにL列（index 11）の値を取得
  var mankokuByMonth = {};

  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var cellA = String(row[0]).trim();
    if (!cellA) continue;

    for (var j = 0; j < cfg.targetMonths.length; j++) {
      var m = cfg.targetMonths[j];
      if (csHyokaIsMonthMatch(cellA, m.year, m.month)) {
        mankokuByMonth[m.ymKey] = row[11]; // L列 = index 11
        Logger.log('✅ ' + m.ymKey + ' → L列値: ' + row[11] + ' （行' + (i + 1) + '）');
        break;
      }
    }
  }

  // 見つからなかった月をログ出力
  for (var j = 0; j < cfg.targetMonths.length; j++) {
    var m = cfg.targetMonths[j];
    if (mankokuByMonth[m.ymKey] === undefined) {
      Logger.log('⚠️ ' + m.ymKey + ' のデータが万垢率シートに見つかりませんでした');
    }
  }

  // 各メンバーのシートD13に書き込み
  for (var k = 0; k < cfg.members.length; k++) {
    var member = cfg.members[k];
    try {
      var memberSS = SpreadsheetApp.openById(member.ssId);

      for (var j = 0; j < cfg.targetMonths.length; j++) {
        var m = cfg.targetMonths[j];
        var tabName = '定量評価シート_' + m.tabMonth + '月';
        var sheet = memberSS.getSheetByName(tabName);

        if (!sheet) {
          Logger.log('⚠️ ' + member.name + ': タブが見つかりません → ' + tabName);
          continue;
        }

        var value = mankokuByMonth[m.ymKey];
        if (value !== undefined) {
          sheet.getRange('D13').setValue(value);
          Logger.log('✅ ' + member.name + ' / ' + tabName + ' / D13 = ' + value);
        } else {
          Logger.log('⚠️ ' + member.name + ' / ' + tabName + ': ' + m.ymKey + ' の万垢率データなし');
        }
      }
    } catch (e) {
      Logger.log('❌ ' + member.name + ' でエラー: ' + e.message);
    }
  }
}

// ==================================================
// D14: 全メンバー達成率の平均を全員のシートD14に記入
// ==================================================
function setRow14_AchievementRate() {
  var cfg = CS_HYOKA_CONFIG;
  var nippouSS = SpreadsheetApp.openById(cfg.nippouSsId);

  for (var mi = 0; mi < cfg.targetMonths.length; mi++) {
    var m = cfg.targetMonths[mi];
    var config = cfg.nippouMonthConfig[m.ymKey];

    if (!config) {
      Logger.log('⚠️ ' + m.ymKey + ' の日報設定が nippouMonthConfig にありません');
      continue;
    }

    // gid優先、見つからなければタブ名で検索
    var nippouSheet = (config.nippouTabGid ? csHyokaGetSheetByGid(nippouSS, config.nippouTabGid) : null)
                    || nippouSS.getSheetByName(config.nippouTabName);
    if (!nippouSheet) {
      Logger.log('❌ 日報シートが見つかりません: ' + config.nippouTabName);
      Logger.log('   実在するタブ一覧: ' + nippouSS.getSheets().map(function(s){return s.getName();}).join(', '));
      continue;
    }
    Logger.log('✅ 日報シート取得: ' + nippouSheet.getName());

    var data = nippouSheet.getDataRange().getValues();
    Logger.log(m.ymKey + ' 日報シート 取得行数: ' + data.length);

    // メンバーごとの達成率平均を計算
    var totalMemberAvg = 0;
    var validMemberCount = 0;

    for (var k = 0; k < cfg.members.length; k++) {
      var member = cfg.members[k];
      var memberAvg = csHyokaCalcMemberAvg(data, member.name, config.achievementColIndices, cfg.memberNameColInNippou);

      if (memberAvg !== null) {
        totalMemberAvg += memberAvg;
        validMemberCount++;
        Logger.log('  ' + member.name + ' 達成率平均: ' + (memberAvg * 100).toFixed(2) + '%');
      } else {
        Logger.log('  ⚠️ ' + member.name + ': 達成率データが見つかりません');
      }
    }

    // 全メンバー数で割った平均
    // ※ データがあったメンバー数で割りたい場合は cfg.members.length を validMemberCount に変更
    var totalCount = cfg.members.length;
    var finalAvg = totalCount > 0 ? totalMemberAvg / totalCount : 0;

    Logger.log(m.ymKey + ' 全体達成率平均: ' + (finalAvg * 100).toFixed(2) + '% （有効: ' + validMemberCount + '/' + totalCount + '名）');

    // 各メンバーのシートD14に書き込み（全員同じ値）
    for (var k = 0; k < cfg.members.length; k++) {
      var member = cfg.members[k];
      try {
        var memberSS = SpreadsheetApp.openById(member.ssId);
        var tabName = '定量評価シート_' + m.tabMonth + '月';
        var sheet = memberSS.getSheetByName(tabName);

        if (!sheet) {
          Logger.log('⚠️ ' + member.name + ': タブが見つかりません → ' + tabName);
          continue;
        }

        sheet.getRange('D14').setValue(finalAvg);
        Logger.log('✅ ' + member.name + ' / ' + tabName + ' / D14 = ' + finalAvg);
      } catch (e) {
        Logger.log('❌ ' + member.name + ' でエラー: ' + e.message);
      }
    }
  }
}

// ==================================================
// ヘルパー: メンバーの達成率平均を計算
// ==================================================
function csHyokaCalcMemberAvg(data, memberName, colIndices, nameColIdx) {
  var sum = 0;
  var count = 0;

  for (var i = 0; i < data.length; i++) {
    var row = data[i];
    var nameCell = String(row[nameColIdx]).trim();

    if (nameCell === memberName || nameCell.indexOf(memberName) !== -1) {
      for (var j = 0; j < colIndices.length; j++) {
        var val = row[colIndices[j]];
        if (val !== null && val !== '' && !isNaN(parseFloat(val))) {
          var numVal = parseFloat(val);
          // 1より大きい場合は%表記（例: 85）→ 0〜1に変換
          sum += numVal > 1 ? numVal / 100 : numVal;
          count++;
        }
      }
    }
  }

  return count > 0 ? sum / count : null;
}

// ==================================================
// ヘルパー: シートIDでタブを取得（タブ名変更に強い）
// ==================================================
function csHyokaGetSheetByGid(ss, gid) {
  if (!gid) return null;
  var sheets = ss.getSheets();
  for (var i = 0; i < sheets.length; i++) {
    if (sheets[i].getSheetId() == gid) return sheets[i];
  }
  return null;
}

// ==================================================
// ヘルパー: 年月文字列マッチング
// ==================================================
function csHyokaIsMonthMatch(cellStr, year, month) {
  var monthStr2 = String(month).length === 1 ? '0' + month : String(month);
  var monthStr  = String(month);
  var yearStr   = String(year);

  var patterns = [
    yearStr + monthStr2,           // 202512
    yearStr + '/' + monthStr2,     // 2025/12
    yearStr + '-' + monthStr2,     // 2025-12
    yearStr + '/' + monthStr,      // 2025/1
    yearStr + '-' + monthStr,      // 2025-1
    yearStr + '年' + monthStr2 + '月', // 2025年12月
    yearStr + '年' + monthStr + '月',  // 2025年1月
  ];

  for (var i = 0; i < patterns.length; i++) {
    if (cellStr === patterns[i] || cellStr.indexOf(patterns[i]) === 0) return true;
  }
  return false;
}

// ==================================================
// デバッグ用: 万垢率シートの構造を確認
// ==================================================
function debugMankokuSheet() {
  var cfg = CS_HYOKA_CONFIG;
  var ss = SpreadsheetApp.openById(cfg.csKanriSsId);
  var sheet = ss.getSheetByName(cfg.mankokuTabName);
  if (!sheet) { Logger.log('シートが見つかりません'); return; }

  var data = sheet.getRange(1, 1, Math.min(20, sheet.getLastRow()), sheet.getLastColumn()).getValues();
  Logger.log('シート名: ' + cfg.mankokuTabName);
  Logger.log('行数: ' + sheet.getLastRow() + ', 列数: ' + sheet.getLastColumn());
  for (var i = 0; i < data.length; i++) {
    Logger.log('行' + (i + 1) + ': A=' + data[i][0] + ', L=' + data[i][11]);
  }
}

// ==================================================
// デバッグ用: 日報管理シートの構造を確認
// ==================================================
function debugNippouSheet() {
  var cfg = CS_HYOKA_CONFIG;
  var ss = SpreadsheetApp.openById(cfg.nippouSsId);
  var sheets = ss.getSheets();
  Logger.log('=== 日報管理スプシのタブ一覧 ===');
  for (var i = 0; i < sheets.length; i++) {
    Logger.log('  - ' + sheets[i].getName());
  }

  var firstSheet = sheets[0];
  var data = firstSheet.getRange(1, 1, Math.min(30, firstSheet.getLastRow()), Math.min(12, firstSheet.getLastColumn())).getValues();
  Logger.log('\n=== ' + firstSheet.getName() + ' 先頭データ ===');
  for (var i = 0; i < data.length; i++) {
    Logger.log('行' + (i + 1) + ': ' + data[i].join(' | '));
  }
}

// ==================================================
// デバッグ用: メンバーシートのタブ一覧を確認
// ==================================================
function debugMemberSheets() {
  var cfg = CS_HYOKA_CONFIG;
  for (var k = 0; k < cfg.members.length; k++) {
    var member = cfg.members[k];
    try {
      var ss = SpreadsheetApp.openById(member.ssId);
      var names = ss.getSheets().map(function(s) { return s.getName(); });
      Logger.log(member.name + ': ' + names.join(', '));
    } catch (e) {
      Logger.log(member.name + ': エラー - ' + e.message);
    }
  }
}
