/**
 * CS生産性タブ G,H,I,J,K,L列 自動記入スクリプト（v10）
 *
 * 【処理内容】
 *  G列 = B列（メンバー）と同じ
 *  H列 = J列で特定した全タスク洗い出しタブの行のD列（中カテゴリ）
 *  I列 = 空欄
 *  J列 = E列の内容 × 全タスク洗い出しタブG列="はるな"のF列から類似タスクを抽出
 *  K列 = F列（カテゴリー）と同じ
 *  L列 = J列で特定した全タスク洗い出しタブの行のI列（推定時間）
 *  C列「総時間」行 → G列のみ、H〜L空欄
 *  データ末尾にメンバーごとのK列・L列合計一覧 + 全体合計を追加
 */

// ===== 設定 =====
const CSP_CS_SHEET_NAME = "CS生産性";
const CSP_TASK_SHEET_NAME = "全タスクの洗い出し";
const CSP_HEADER_ROW = 12;
const CSP_DATA_START_ROW = 13;
const CSP_TARGET_PERSON = "はるな";

/**
 * メイン関数
 */
function fillCSProductivity() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  const csSheet = ss.getSheetByName(CSP_CS_SHEET_NAME);
  const taskSheet = ss.getSheetByName(CSP_TASK_SHEET_NAME);

  if (!csSheet) { Logger.log("エラー: 「" + CSP_CS_SHEET_NAME + "」シートが見つかりません。"); return; }
  if (!taskSheet) { Logger.log("エラー: 「" + CSP_TASK_SHEET_NAME + "」シートが見つかりません。"); return; }

  // ★★★ 最初にG〜L列を全クリア（前回実行分の残りを消す）★★★
  const maxRows = csSheet.getMaxRows();
  if (maxRows >= CSP_DATA_START_ROW) {
    csSheet.getRange(CSP_DATA_START_ROW, 7, maxRows - CSP_DATA_START_ROW + 1, 6).clearContent();
    SpreadsheetApp.flush(); // クリアを確定
  }

  // --- 全タスク洗い出しタブからデータ取得（A〜I列 = 9列） ---
  const taskLastRow = taskSheet.getLastRow();
  const taskData = taskSheet.getRange(2, 1, taskLastRow - 1, 9).getValues();

  const harunaTasks = [];
  for (let i = 0; i < taskData.length; i++) {
    const assignee = String(taskData[i][6]).trim();
    if (assignee.indexOf(CSP_TARGET_PERSON) !== -1) {
      harunaTasks.push({
        rowIndex: i,
        largeCategory: String(taskData[i][2]).trim(),
        midCategory: String(taskData[i][3]).trim(),
        smallCategory: String(taskData[i][4]).trim(),
        taskName: String(taskData[i][5]).trim(),
        assignee: assignee,
        estimatedTime: String(taskData[i][8]).trim()
      });
    }
  }

  Logger.log("はるなの担当タスク数: " + harunaTasks.length);
  if (harunaTasks.length === 0) { Logger.log("エラー: はるなが見つかりません。"); return; }

  // ★★★ クリア後にgetLastRow()で正確なA〜F列のデータ範囲を取得 ★★★
  const csLastRow = csSheet.getLastRow();
  if (csLastRow < CSP_DATA_START_ROW) { Logger.log("エラー: データ行がありません。"); return; }

  const numRows = csLastRow - CSP_DATA_START_ROW + 1;
  const csData = csSheet.getRange(CSP_DATA_START_ROW, 1, numRows, 6).getValues();

  Logger.log("データ行数: " + numRows + " (行" + CSP_DATA_START_ROW + "〜" + csLastRow + ")");

  // ==============================================================
  // 各行を処理（元データと同じ行数を維持）
  // ==============================================================
  const output = [];

  const memberTotals = {};
  const memberOrder = [];
  let currentMember = "";

  for (let r = 0; r < csData.length; r++) {
    const colB = String(csData[r][1]).trim();
    const colC = String(csData[r][2]).trim();
    const colE = String(csData[r][4]).trim();
    const colF = String(csData[r][5]).trim();

    if (colB !== "") {
      currentMember = colB;
    }

    if (colB === "" && colE === "") {
      output.push(["", "", "", "", "", ""]);
      continue;
    }

    if (colC.indexOf("総時間") !== -1) {
      output.push([currentMember, "", "", "", "", ""]);
      continue;
    }

    let bestMatch = null;
    let bestScore = 0;

    if (colE !== "") {
      for (let t = 0; t < harunaTasks.length; t++) {
        const score = cspCalculateSimilarity(colE, harunaTasks[t].taskName, colC, harunaTasks[t]);
        if (score > bestScore) {
          bestScore = score;
          bestMatch = harunaTasks[t];
        }
      }
    }

    if (bestScore < 0.2 && colC !== "") {
      for (let t = 0; t < harunaTasks.length; t++) {
        const score = cspCalculateSimilarity(colC, harunaTasks[t].taskName, colC, harunaTasks[t]);
        if (score > bestScore) {
          bestScore = score;
          bestMatch = harunaTasks[t];
        }
      }
    }

    const colG = currentMember;
    const colH = bestMatch ? bestMatch.midCategory : "";
    const colI = "";
    const colJ = bestMatch ? bestMatch.taskName : "";
    const colK = colF;
    const colL = bestMatch ? bestMatch.estimatedTime : "";

    output.push([colG, colH, colI, colJ, colK, colL]);

    if (currentMember !== "") {
      if (!memberTotals[currentMember]) {
        memberTotals[currentMember] = { kMin: 0, lMin: 0 };
        memberOrder.push(currentMember);
      }
      memberTotals[currentMember].kMin += cspParseTimeToMinutes(colK);
      memberTotals[currentMember].lMin += cspParseTimeToMinutes(colL);
    }
  }

  // ==============================================================
  // データ末尾にメンバー別合計 + 全体合計を追加
  // ==============================================================

  output.push(["", "", "", "", "", ""]);
  output.push(["メンバー", "", "", "合計区分", "K列合計", "L列合計"]);

  let grandKMin = 0;
  let grandLMin = 0;

  for (let m = 0; m < memberOrder.length; m++) {
    const name = memberOrder[m];
    const totals = memberTotals[name];
    const kFormatted = cspFormatMinutesToTime(totals.kMin);
    const lFormatted = cspFormatMinutesToTime(totals.lMin);

    output.push([name, "", "", name + " 合計", kFormatted, lFormatted]);

    grandKMin += totals.kMin;
    grandLMin += totals.lMin;

    Logger.log(name + " 合計: K=" + kFormatted + " L=" + lFormatted);
  }

  const grandKFormatted = cspFormatMinutesToTime(grandKMin);
  const grandLFormatted = cspFormatMinutesToTime(grandLMin);
  output.push(["", "", "", "全体合計", grandKFormatted, grandLFormatted]);
  Logger.log("全体合計: K=" + grandKFormatted + " L=" + grandLFormatted);

  // ==============================================================
  // G〜L列に一括書き込み
  // ==============================================================
  if (output.length > 0) {
    csSheet.getRange(CSP_DATA_START_ROW, 7, output.length, 6).setValues(output);
    Logger.log("書き込み完了: 行" + CSP_DATA_START_ROW + "〜" + (CSP_DATA_START_ROW + output.length - 1) + " (" + output.length + "行)");
  }

  Logger.log("完了！ データ行数: " + numRows + " | 出力行数: " + output.length + " | メンバー数: " + memberOrder.length);
}

// ================================================================
// 時間パース・フォーマット関数
// ================================================================

function cspParseTimeToMinutes(timeStr) {
  if (!timeStr) return 0;
  const str = String(timeStr).trim().toLowerCase();
  if (str === "" || str === "0") return 0;
  let totalMinutes = 0;
  const hMatch = str.match(/([\d.]+)\s*h/);
  const mMatch = str.match(/([\d.]+)\s*m/);
  if (hMatch) totalMinutes += parseFloat(hMatch[1]) * 60;
  if (mMatch) totalMinutes += parseFloat(mMatch[1]);
  if (!hMatch && !mMatch) {
    const numOnly = parseFloat(str);
    if (!isNaN(numOnly)) totalMinutes = numOnly * 60;
  }
  return totalMinutes;
}

function cspFormatMinutesToTime(minutes) {
  if (minutes === 0) return "0m";
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  if (hours > 0 && mins > 0) return hours + "h" + mins + "m";
  if (hours > 0) return hours + "h";
  return mins + "m";
}

// ================================================================
// 類似度計算関数群
// ================================================================

function cspCalculateSimilarity(sourceText, taskName, csCategory, task) {
  if (!sourceText || !taskName) return 0;
  const src = cspNormalizeText(sourceText);
  const tgt = cspNormalizeText(taskName);
  if (src === tgt) return 1.0;
  if (src.indexOf(tgt) !== -1 || tgt.indexOf(src) !== -1) return 0.9;
  const srcTokens = cspTokenize(src);
  const tgtTokens = cspTokenize(tgt);
  const keywordScore = cspJaccardSimilarity(srcTokens, tgtTokens);
  const bigramScore = cspBigramSimilarity(src, tgt);
  let categoryBonus = 0;
  if (csCategory) {
    const normalizedCat = cspNormalizeText(csCategory);
    const normalizedMid = cspNormalizeText(task.midCategory);
    const normalizedLarge = cspNormalizeText(task.largeCategory);
    if (normalizedCat === normalizedMid || normalizedCat === normalizedLarge) categoryBonus = 0.15;
    else if (normalizedMid.indexOf(normalizedCat) !== -1 || normalizedCat.indexOf(normalizedMid) !== -1) categoryBonus = 0.1;
  }
  const domainBonus = cspCalculateDomainBonus(src, tgt);
  return Math.min((keywordScore * 0.5) + (bigramScore * 0.3) + domainBonus + categoryBonus, 1.0);
}

function cspNormalizeText(text) {
  if (!text) return "";
  return String(text).toLowerCase().replace(/[\s　]+/g, "").replace(/[（）()「」【】]/g, "").replace(/[・、。,.\-\/]/g, "");
}

function cspTokenize(text) {
  if (!text) return [];
  const tokens = new Set();
  for (let i = 0; i < text.length - 1; i++) tokens.add(text.substring(i, i + 2));
  for (let i = 0; i < text.length - 2; i++) tokens.add(text.substring(i, i + 3));
  return Array.from(tokens);
}

function cspJaccardSimilarity(setA, setB) {
  if (setA.length === 0 && setB.length === 0) return 0;
  const a = new Set(setA); const b = new Set(setB);
  let intersection = 0;
  a.forEach(function(item) { if (b.has(item)) intersection++; });
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

function cspBigramSimilarity(str1, str2) {
  if (!str1 || !str2) return 0;
  const b1 = new Set(); const b2 = new Set();
  for (let i = 0; i < str1.length - 1; i++) b1.add(str1.substring(i, i + 2));
  for (let i = 0; i < str2.length - 1; i++) b2.add(str2.substring(i, i + 2));
  let intersection = 0;
  b1.forEach(function(bg) { if (b2.has(bg)) intersection++; });
  const union = b1.size + b2.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

function cspCalculateDomainBonus(src, tgt) {
  const dkw = {
    "入学運営": ["入学", "クラス分け", "クラススタート", "ロール付与", "入室確認"],
    "コンテンツ配信": ["アーカイブ", "格納", "配信", "ラジオ", "コンテンツ", "動画", "編集"],
    "イベント": ["イベント", "オンライン", "グルコン", "ファシリ", "周知", "スケジュール調整"],
    "カレンダー": ["カレンダー", "canva", "画像作成", "リッチメニュー", "ポータル"],
    "週報情報共有": ["週報", "リマインド", "成果報告", "情報共有"],
    "顧客対応": ["問い合わせ", "顧客対応", "クレーム", "返信", "対応"],
    "解約退会": ["解約", "退会", "クーリングオフ", "返金", "保証"],
    "スプシデータ": ["スプシ", "シート", "データ", "更新", "反映", "管理表"],
    "LINE構築": ["line", "lステップ", "リッチメニュー", "配信設定", "フォーム"],
    "マニュアル": ["マニュアル", "notion", "ドキュメント", "まとめ"],
    "ASP外部": ["asp", "otonari", "ナハト", "youtube", "外部連携"],
    "シフト": ["シフト", "入学式シフト"]
  };
  let bonus = 0;
  for (const d in dkw) {
    const kw = dkw[d]; let s = false, t = false;
    for (let k = 0; k < kw.length; k++) { if (src.indexOf(kw[k]) !== -1) s = true; if (tgt.indexOf(kw[k]) !== -1) t = true; }
    if (s && t) bonus = Math.max(bonus, 0.2);
  }
  return bonus;
}

// ================================================================
// カスタムメニュー
// ================================================================

function cspOnOpen() {
  SpreadsheetApp.getUi()
    .createMenu("🔧 CS生産性ツール")
    .addItem("G〜L列を自動記入", "fillCSProductivity")
    .addItem("G〜L列をクリア", "cspClearOutputColumns")
    .addToUi();
}

function cspClearOutputColumns() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const csSheet = ss.getSheetByName(CSP_CS_SHEET_NAME);
  if (!csSheet) { Logger.log("シートが見つかりません。"); return; }
  const lastRow = csSheet.getMaxRows();
  if (lastRow >= CSP_DATA_START_ROW) {
    csSheet.getRange(CSP_DATA_START_ROW, 7, lastRow - CSP_DATA_START_ROW + 1, 6).clearContent();
    Logger.log("G〜L列をクリアしました。");
  }
}
