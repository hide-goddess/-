// ============================================================
// 行動目標達成率 月次自動更新スクリプト
// 毎月1日に前月分の各メンバーのKey Result・達成率を
// 「メンバーの日報・評価制度管理」スプシの行動目標達成率タブへ書き込む
// ============================================================

// ---- 設定 ----
const MAIN_SPREADSHEET_ID = '1gIygjcHKgGvg3j0RU0LxzrPeGxNF9cJeOrxznHqwOAo';
const ACHIEVEMENT_TAB_NAME = '行動目標達成率';

// メンバーリスト（名前 と 評価シートのスプレッドシートID）
const MEMBERS = [
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
];

// ============================================================
// メイン関数（毎月1日に自動実行 → 前月分を集計）
// ============================================================
function autoUpdateMonthlyGoals() {
  const now = new Date();
  // 毎月1日実行 → 前月を対象にする
  const targetDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const targetYear  = targetDate.getFullYear();
  const targetMonth = targetDate.getMonth() + 1; // 1〜12

  Logger.log(`対象月: ${targetYear}年${targetMonth}月`);
  _updateForMonth(targetYear, targetMonth);
}

// ============================================================
// 任意の月を手動で再実行したいときに使う関数
// 例: updateSpecificMonth(2025, 12)
// ============================================================
function updateSpecificMonth(year, month) {
  _updateForMonth(year, month);
}

// ============================================================
// 内部処理
// ============================================================
function _updateForMonth(year, month) {
  const mainSS = SpreadsheetApp.openById(MAIN_SPREADSHEET_ID);
  const destSheet = mainSS.getSheetByName(ACHIEVEMENT_TAB_NAME);

  if (!destSheet) {
    Logger.log(`ERROR: シート "${ACHIEVEMENT_TAB_NAME}" が見つかりません`);
    return;
  }

  const srcTabName  = `定量評価シート_${month}月`;
  const monthLabel  = `${year}年${month}月`;

  // --- 同月分が既に書き込まれているか確認（重複防止） ---
  const existingData = destSheet.getDataRange().getValues();
  for (let r = 0; r < existingData.length; r++) {
    if (existingData[r][0] === monthLabel) {
      Logger.log(`${monthLabel} のデータは既に存在します。上書きをスキップします。`);
      return;
    }
  }

  // --- 書き込み開始行の決定（最終行の2行下） ---
  const lastRow = destSheet.getLastRow();
  let writeRow  = (lastRow === 0) ? 1 : lastRow + 2;

  // --- 月ヘッダー ---
  _writeMonthHeader(destSheet, writeRow, monthLabel);
  writeRow++;

  // --- 列ヘッダー ---
  _writeColumnHeader(destSheet, writeRow);
  writeRow++;

  // --- 各メンバーのデータ ---
  for (const member of MEMBERS) {
    _writeMemberRow(destSheet, writeRow, member, srcTabName);
    writeRow++;
  }

  Logger.log(`${monthLabel} の書き込みが完了しました。`);
}

// --- 月ヘッダー行を書き込む ---
function _writeMonthHeader(sheet, row, monthLabel) {
  const cell = sheet.getRange(row, 1);
  cell.setValue(monthLabel);
  cell.setFontWeight('bold');
  cell.setFontSize(12);
  cell.setBackground('#4A90D9');
  cell.setFontColor('#FFFFFF');
  // A〜G列を結合して見栄えを整える
  sheet.getRange(row, 1, 1, 7).merge();
}

// --- 列ヘッダー行を書き込む ---
function _writeColumnHeader(sheet, row) {
  const headers = [
    '名前',
    'Key Result ①', '達成率 ①',
    'Key Result ②', '達成率 ②',
    'Key Result ③', '達成率 ③',
  ];
  const range = sheet.getRange(row, 1, 1, headers.length);
  range.setValues([headers]);
  range.setFontWeight('bold');
  range.setBackground('#D9EAF7');
}

// --- メンバー1人分のデータ行を書き込む ---
function _writeMemberRow(sheet, row, member, srcTabName) {
  // デフォルト値（エラー時）
  let rowData = [member.name, '', '', '', '', '', ''];

  try {
    const memberSS  = SpreadsheetApp.openById(member.ssId);
    const srcSheet  = memberSS.getSheetByName(srcTabName);

    if (!srcSheet) {
      Logger.log(`${member.name}: タブ "${srcTabName}" が見つかりません`);
      rowData[1] = `タブ "${srcTabName}" なし`;
    } else {
      // B21:B23（Key Result）と E21:E23（達成率）を取得
      const krValues      = srcSheet.getRange('B21:B23').getValues(); // [[kr1],[kr2],[kr3]]
      const achieveValues = srcSheet.getRange('E21:E23').getValues(); // [[a1],[a2],[a3]]

      for (let i = 0; i < 3; i++) {
        const kr      = krValues[i][0];
        const achieve = achieveValues[i][0];
        // 空欄の場合はそのまま空欄にする
        if (kr !== '' && kr !== null && kr !== undefined) {
          rowData[1 + i * 2] = kr;
          rowData[2 + i * 2] = achieve;
        }
      }
      Logger.log(`${member.name}: OK`);
    }
  } catch (e) {
    Logger.log(`${member.name}: ERROR - ${e.message}`);
    rowData[1] = `エラー: ${e.message}`;
  }

  sheet.getRange(row, 1, 1, rowData.length).setValues([rowData]);
}

// ============================================================
// トリガー設定関数（初回のみ手動で1度だけ実行）
// ============================================================
function setupMonthlyTrigger() {
  // 既存の同名トリガーを削除してから再登録（重複防止）
  const triggers = ScriptApp.getProjectTriggers();
  for (const trigger of triggers) {
    if (trigger.getHandlerFunction() === 'autoUpdateMonthlyGoals') {
      ScriptApp.deleteTrigger(trigger);
    }
  }

  // 毎月1日 午前9時に実行
  ScriptApp.newTrigger('autoUpdateMonthlyGoals')
    .timeBased()
    .onMonthDay(1)
    .atHour(9)
    .create();

  Logger.log('毎月1日 午前9時のトリガーを設定しました。');
}
