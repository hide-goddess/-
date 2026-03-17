// ==================================================
// GAS: CS部 評価シート 定量評価 D13・D14 記入スクリプト
//
// D13: 【CS】数値管理（新）スプシの万垢率（月未記録）タブのL列をメンバー全員のD13に記入
// D14: メンバーの日報・評価制度管理スプシから月次達成率の全体平均を全員のD14に記入
// ==================================================

// ==================== スプシID設定 ====================

// 【CS】数値管理（新）スプシ
const CS_KANRI_SS_ID = '1sWv3335Fkou2Ohet6sQOuwZUysIIWZhCjUUxiSo-5Bc';

// 万垢率（月未記録）タブ名
const MANKOKU_TAB_NAME = '万垢率（月未記録）';

// メンバーの日報・評価制度管理スプシ
const NIPPOU_SS_ID = '1gIygjcHKgGvg3j0RU0LxzrPeGxNF9cJeOrxznHqwOAo';

// ==================== メンバー設定（15名） ====================
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

// ==================== 対象月設定 ====================
// tabMonth: 定量評価シートのタブ名に使う月（例: "12" → 定量評価シート_12月）
// year/month: 万垢率シートの年月マッチング用
// ymKey: 内部キー（"202512" "202601" 等）
// ※ 1月以降は2026年
const TARGET_MONTHS = [
  { tabMonth: '12', year: 2025, month: 12, ymKey: '202512' },
  { tabMonth: '1',  year: 2026, month: 1,  ymKey: '202601' },
  // 必要に応じて月を追加:
  // { tabMonth: '2',  year: 2026, month: 2,  ymKey: '202602' },
  // { tabMonth: '3',  year: 2026, month: 3,  ymKey: '202603' },
];

// ==================== 日報管理スプシの月別達成率設定 ====================
// 【要確認・要設定】日報・評価制度管理スプシの実際の構造を確認して以下を設定してください
//
// nippouTabName: 日報管理スプシのタブ名（実際のタブ名に変更）
// achievementColIndices: 達成率が入っている列のインデックス（0始まり）
//   例: E列=4, G列=6, I列=8
// memberNameCol: メンバー名が入っている列のインデックス（0始まり、例: A列=0）
//
// ※ スクリプトはmemberNameColでメンバー名を検索し、
//   同じ行またはその近辺の達成率列を読み取ります
const NIPPOU_MONTH_CONFIG = {
  '202512': {
    nippouTabName: '2025年12月', // ← 実際のタブ名に変更してください
    achievementColIndices: [4, 6, 8], // E列=4, G列=6, I列=8（0始まり）
  },
  '202601': {
    nippouTabName: '2026年1月',  // ← 実際のタブ名に変更してください
    achievementColIndices: [4, 6, 8], // E列=4, G列=6, I列=8（0始まり）
  },
};

// 日報管理スプシでメンバー名が入っている列（0始まり）
// 例: A列 = 0, B列 = 1
const MEMBER_NAME_COL_IN_NIPPOU = 0;

// ==================================================
// メイン関数（両方実行）
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
  const csKanriSS = SpreadsheetApp.openById(CS_KANRI_SS_ID);
  const mankokuSheet = csKanriSS.getSheetByName(MANKOKU_TAB_NAME);

  if (!mankokuSheet) {
    Logger.log(`❌ シートが見つかりません: ${MANKOKU_TAB_NAME}`);
    return;
  }

  const data = mankokuSheet.getDataRange().getValues();
  Logger.log(`万垢率シート 取得行数: ${data.length}`);

  // 年月キーごとにL列（index 11）の値を取得
  // A列に年月情報（例: "2025/12", "202512", "2025年12月" など）があると仮定
  const mankokuByMonth = {};

  for (let i = 1; i < data.length; i++) { // 1行目ヘッダーをスキップ
    const row = data[i];
    const cellA = String(row[0]).trim();
    if (!cellA) continue;

    for (const m of TARGET_MONTHS) {
      if (isMonthMatch(cellA, m.year, m.month)) {
        mankokuByMonth[m.ymKey] = row[11]; // L列 = index 11
        Logger.log(`✅ ${m.ymKey} → L列値: ${row[11]} （行${i + 1}）`);
        break;
      }
    }
  }

  // 見つからなかった月をログ出力
  for (const m of TARGET_MONTHS) {
    if (mankokuByMonth[m.ymKey] === undefined) {
      Logger.log(`⚠️ ${m.ymKey} のデータが万垢率シートに見つかりませんでした`);
    }
  }

  // 各メンバーのシートD13に書き込み
  for (const member of MEMBERS) {
    try {
      const memberSS = SpreadsheetApp.openById(member.ssId);

      for (const m of TARGET_MONTHS) {
        const tabName = `定量評価シート_${m.tabMonth}月`;
        const sheet = memberSS.getSheetByName(tabName);

        if (!sheet) {
          Logger.log(`⚠️ ${member.name}: タブが見つかりません → ${tabName}`);
          continue;
        }

        const value = mankokuByMonth[m.ymKey];
        if (value !== undefined) {
          sheet.getRange('D13').setValue(value);
          Logger.log(`✅ ${member.name} / ${tabName} / D13 = ${value}`);
        } else {
          Logger.log(`⚠️ ${member.name} / ${tabName}: ${m.ymKey} の万垢率データなし`);
        }
      }
    } catch (e) {
      Logger.log(`❌ ${member.name} でエラー: ${e.message}`);
    }
  }
}

// ==================================================
// D14: 全メンバー達成率の平均を全員のシートD14に記入
// ==================================================
function setRow14_AchievementRate() {
  const nippouSS = SpreadsheetApp.openById(NIPPOU_SS_ID);

  for (const m of TARGET_MONTHS) {
    const config = NIPPOU_MONTH_CONFIG[m.ymKey];
    if (!config) {
      Logger.log(`⚠️ ${m.ymKey} の日報設定が NIPPOU_MONTH_CONFIG にありません`);
      continue;
    }

    const nippouSheet = nippouSS.getSheetByName(config.nippouTabName);
    if (!nippouSheet) {
      Logger.log(`❌ 日報シートが見つかりません: ${config.nippouTabName}`);
      continue;
    }

    const data = nippouSheet.getDataRange().getValues();
    Logger.log(`${m.ymKey} 日報シート 取得行数: ${data.length}`);

    // メンバーごとの達成率平均を計算
    let totalMemberAvg = 0;
    let validMemberCount = 0;

    for (const member of MEMBERS) {
      const memberAvg = calcMemberAchievementAvg(data, member.name, config.achievementColIndices);

      if (memberAvg !== null) {
        totalMemberAvg += memberAvg;
        validMemberCount++;
        Logger.log(`  ${member.name} 達成率平均: ${(memberAvg * 100).toFixed(2)}%`);
      } else {
        Logger.log(`  ⚠️ ${member.name}: 達成率データが見つかりません`);
      }
    }

    // 全メンバー数（16人）で割る（データがなかったメンバーは0として扱う）
    // ※ 実際にデータがあったメンバー数で割る場合は MEMBERS.length を validMemberCount に変更
    const TOTAL_MEMBER_COUNT = MEMBERS.length; // 15名（リストに基づく）
    const finalAvg = TOTAL_MEMBER_COUNT > 0 ? totalMemberAvg / TOTAL_MEMBER_COUNT : 0;

    Logger.log(`${m.ymKey} 全体達成率平均: ${(finalAvg * 100).toFixed(2)}% （有効: ${validMemberCount}/${TOTAL_MEMBER_COUNT}名）`);

    // 各メンバーのシートD14に書き込み（全員同じ値）
    for (const member of MEMBERS) {
      try {
        const memberSS = SpreadsheetApp.openById(member.ssId);
        const tabName = `定量評価シート_${m.tabMonth}月`;
        const sheet = memberSS.getSheetByName(tabName);

        if (!sheet) {
          Logger.log(`⚠️ ${member.name}: タブが見つかりません → ${tabName}`);
          continue;
        }

        sheet.getRange('D14').setValue(finalAvg);
        Logger.log(`✅ ${member.name} / ${tabName} / D14 = ${finalAvg}`);
      } catch (e) {
        Logger.log(`❌ ${member.name} でエラー: ${e.message}`);
      }
    }
  }
}

// ==================================================
// ヘルパー: メンバーの達成率平均を計算
// ==================================================
/**
 * 日報シートのデータからメンバー名を検索し、
 * achievementColIndices 列の達成率を平均して返す
 *
 * @param {Array[][]} data - シートのデータ全体
 * @param {string} memberName - メンバー名
 * @param {number[]} colIndices - 達成率列インデックス（0始まり）
 * @returns {number|null} 達成率の平均（0〜1）またはnull
 */
function calcMemberAchievementAvg(data, memberName, colIndices) {
  let sum = 0;
  let count = 0;

  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    const nameCell = String(row[MEMBER_NAME_COL_IN_NIPPOU]).trim();

    // メンバー名が含まれる行を検索（部分一致も対応）
    if (nameCell === memberName || nameCell.includes(memberName)) {
      for (const colIdx of colIndices) {
        const val = row[colIdx];
        if (val !== null && val !== '' && !isNaN(parseFloat(val))) {
          // パーセント表示（例: 85 や 0.85）両方に対応
          const numVal = parseFloat(val);
          // 1より大きい場合は%表記（85%）→ 0〜1に変換
          sum += numVal > 1 ? numVal / 100 : numVal;
          count++;
        }
      }
      // メンバー名が見つかった行のみ処理（複数行ある場合は全て処理）
    }
  }

  return count > 0 ? sum / count : null;
}

// ==================================================
// ヘルパー: 年月文字列マッチング
// ==================================================
/**
 * セルの文字列が指定した年月を表しているか判定
 * 対応フォーマット:
 *   "202512", "2025/12", "2025-12", "2025年12月",
 *   "2025/12/01" など
 */
function isMonthMatch(cellStr, year, month) {
  const monthStr2 = String(month).padStart(2, '0');
  const monthStr  = String(month);
  const yearStr   = String(year);

  const patterns = [
    `${yearStr}${monthStr2}`,           // 202512
    `${yearStr}/${monthStr2}`,          // 2025/12
    `${yearStr}-${monthStr2}`,          // 2025-12
    `${yearStr}/${monthStr}`,           // 2025/1
    `${yearStr}-${monthStr}`,           // 2025-1
    `${yearStr}年${monthStr2}月`,       // 2025年12月
    `${yearStr}年${monthStr}月`,        // 2025年1月
  ];

  for (const p of patterns) {
    if (cellStr === p || cellStr.startsWith(p)) return true;
  }
  return false;
}

// ==================================================
// デバッグ用: 万垢率シートの構造を確認する
// ==================================================
function debugMankokuSheet() {
  const ss = SpreadsheetApp.openById(CS_KANRI_SS_ID);
  const sheet = ss.getSheetByName(MANKOKU_TAB_NAME);
  if (!sheet) { Logger.log('シートが見つかりません'); return; }

  const data = sheet.getRange(1, 1, Math.min(20, sheet.getLastRow()), sheet.getLastColumn()).getValues();
  Logger.log(`シート名: ${MANKOKU_TAB_NAME}`);
  Logger.log(`行数: ${sheet.getLastRow()}, 列数: ${sheet.getLastColumn()}`);
  data.forEach((row, i) => {
    Logger.log(`行${i + 1}: A=${row[0]}, L=${row[11]}`);
  });
}

// ==================================================
// デバッグ用: 日報管理シートの構造を確認する
// ==================================================
function debugNippouSheet() {
  const ss = SpreadsheetApp.openById(NIPPOU_SS_ID);
  const sheets = ss.getSheets();
  Logger.log('=== 日報管理スプシのタブ一覧 ===');
  sheets.forEach(s => Logger.log(`  - ${s.getName()}`));

  // 最初のタブの先頭20行を確認
  const firstSheet = sheets[0];
  const data = firstSheet.getRange(1, 1, Math.min(30, firstSheet.getLastRow()), Math.min(12, firstSheet.getLastColumn())).getValues();
  Logger.log(`\n=== ${firstSheet.getName()} 先頭データ ===`);
  data.forEach((row, i) => {
    Logger.log(`行${i + 1}: ${row.join(' | ')}`);
  });
}

// ==================================================
// デバッグ用: メンバーシートのタブ一覧を確認する
// ==================================================
function debugMemberSheets() {
  for (const member of MEMBERS) {
    try {
      const ss = SpreadsheetApp.openById(member.ssId);
      const sheets = ss.getSheets().map(s => s.getName());
      Logger.log(`${member.name}: ${sheets.join(', ')}`);
    } catch (e) {
      Logger.log(`${member.name}: エラー - ${e.message}`);
    }
  }
}
