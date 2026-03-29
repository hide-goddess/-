// ============================================================
// 行動目標達成率 月次自動更新スクリプト（横展開レイアウト版）
// レイアウト: 行 = メンバー（縦）、列 = 月（横）
//
// 【シート構造】
// 行1: A=名前, B=日報, C=評価シート | D〜: 1月[6列], 2月[6列], ... 12月[6列]
// 行2: （空）  （空）  （空）       | Key Result, 達成率 × 3セット × 各月
// 行3〜: メンバー（名前ベースで行を検索するため行数は可変）
// ============================================================

// ---- 設定 ----
// ※ GASはすべての.gsファイルがグローバルスコープを共有するため var を使用
var MAIN_SPREADSHEET_ID = '1gIygjcHKgGvg3j0RU0LxzrPeGxNF9cJeOrxznHqwOAo';
var ACHIEVEMENT_TAB_NAME = '行動目標達成率';

// レイアウト定数
var HEADER_ROW      = 1;  // 月ヘッダー行
var SUBHEADER_ROW   = 2;  // Key Result / 達成率 サブヘッダー行
var MEMBER_START_ROW = 3; // メンバーデータ開始行
var NAME_COL        = 1;  // A列: 名前
var NIPPO_COL       = 2;  // B列: 日報リンク
var EVAL_COL        = 3;  // C列: 評価シートリンク
var MONTH_START_COL = 4;  // D列: 月データ開始列
var COLS_PER_MONTH  = 6;  // 1ヶ月あたりの列数（KR①達成率①, KR②達成率②, KR③達成率③）

// メンバーリスト
var MEMBERS = [
  { name: '松元陸',    ssId: '1no-0rtLzKWybhJYne41zINUDqWh8xagF6kh5UvifPOs' },
  { name: '平松弥央菜', ssId: '1jeLIm3kRHl5-4b3EwvgrNnwfoAFG036ymmL2BggaRks', tabIds: { 2: 1824428192 } },
  { name: '小林陽香',  ssId: '1zL9jpB8WPmCgJaLudY8usZrHPHK7TBmVKLt17RAx0Yk' },
  { name: '小林未侑',  ssId: '1mpuozouSmS8BJNFk2zYQAGlIp9m0M3fp7yOu3Ta_e4I' },
  { name: '中田菜々子', ssId: '1eK9tZEvv_H7iXCi7b2LsREzIEsyN17SYptklB3HXke4' },
  { name: '久保梨生',  ssId: '10CU-78ByNYhzr5LuIhK8makS1uZ_LSPK8HBuFGC9hhU' },
  { name: '宇梶知恵',  ssId: '1vLIsuqdOoWrmH-EXdBkUL3XSkcYxl5sEW7NGillEviI' },
  { name: '増子真也子', ssId: '1sbHXZaFivRzliSZEX72rvLFN4EU7bR6ltXbB39lZHVc' },
  // tabIds: タブ名で見つからない場合にシートIDで取得するフォールバック用（月番号 → gid）
  // krRangeByMonth: 月ごとにKey Resultの取得範囲が異なる場合の上書き指定（月番号 → セル範囲）
  { name: '川端歩実',  ssId: '1sLz2fvbPOA1mwwGAUOtn2zOO97XosnbI1jXqJ2n2vlc', tabIds: { 2: 1784140390 } },
  { name: '田中里奈',  ssId: '1LZisdyfMmShNsD0cgZtiLZe7uyUPfDDUrLv6U4h_ra0' },
  { name: '山下優花',  ssId: '15PtZ4__btQ2UxpBNPbGdfGd8dKpjenRAT6Mrn3bMVck' },
  { name: '中村八重子', ssId: '1QI8POM4hZAkjjwSeWwamxDmoUx4-zNRD3CTLS0SJyhs' },
  { name: '佐藤大河',  ssId: '1PMGKmUaU2hze5N4Ar7eCcU_uJz-jQThdq_3eGWuI_kw' },
  { name: '青木博資',  ssId: '1PecGIyJDbHy2y1yXIia0Ada1HENe3qY6W-HSppiyUTc' },
  { name: '田畑秀晃',  ssId: '1a7K7N062cHMRTwX8lYpujRGH6b6z1s9bDf--v_DJZ7M' },
  { name: '田中春奈',  ssId: '1vmMTNe38hVlvcbK2s21MU70Dwi1W7VYqppLsfKJ3z2Y', tabIds: { 2: 111794697 } },
];

// ============================================================
// メイン関数（毎日 午前5時に実行）
// 1〜10日: 当月データを更新
// 11日以降: スキップ（次の1日まで待機）
// ============================================================
function autoUpdateMonthlyGoals() {
  const now   = new Date();
  const day   = now.getDate();
  const year  = now.getFullYear();
  const month = now.getMonth() + 1; // 1〜12

  if (day > 10) {
    Logger.log(`本日は${month}月${day}日のためスキップ（更新対象: 毎月1〜10日）`);
    return;
  }

  Logger.log(`実行: ${year}年${month}月${day}日 → ${month}月分を更新`);

  const mainSS    = SpreadsheetApp.openById(MAIN_SPREADSHEET_ID);
  const destSheet = mainSS.getSheetByName(ACHIEVEMENT_TAB_NAME);

  if (!destSheet) {
    Logger.log(`ERROR: シート "${ACHIEVEMENT_TAB_NAME}" が見つかりません`);
    return;
  }

  _initializeSheet(destSheet);
  _updateMonthData(destSheet, month);

  Logger.log(`${year}年${month}月分の更新が完了しました。`);
}

// ============================================================
// 手動実行用①: 当月データを日付チェックなしで即時書き込む
// ドロップダウンから選んでそのまま実行できます
// ============================================================
function runCurrentMonth() {
  const now   = new Date();
  const year  = now.getFullYear();
  const month = now.getMonth() + 1;

  Logger.log(`手動実行: ${year}年${month}月分を強制更新します`);

  const mainSS    = SpreadsheetApp.openById(MAIN_SPREADSHEET_ID);
  const destSheet = mainSS.getSheetByName(ACHIEVEMENT_TAB_NAME);
  if (!destSheet) { Logger.log(`ERROR: シート "${ACHIEVEMENT_TAB_NAME}" が見つかりません`); return; }

  _initializeSheet(destSheet);
  _updateMonthData(destSheet, month);

  Logger.log(`${year}年${month}月分の更新が完了しました。`);
}

// ============================================================
// 手動実行用②: 複数月をまとめて書き込む
// fromMonth〜toMonth の範囲を一括更新
// ============================================================
function runMonthRange() {
  var fromMonth = 1; // ← 開始月（1〜12）
  var toMonth   = 3; // ← 終了月（1〜12）

  const mainSS    = SpreadsheetApp.openById(MAIN_SPREADSHEET_ID);
  const destSheet = mainSS.getSheetByName(ACHIEVEMENT_TAB_NAME);
  if (!destSheet) { Logger.log('シートが見つかりません'); return; }

  _initializeSheet(destSheet);

  for (var m = fromMonth; m <= toMonth; m++) {
    Logger.log(`--- ${m}月分を更新中 ---`);
    _updateMonthData(destSheet, m);
  }

  Logger.log(`${fromMonth}月〜${toMonth}月分の更新が完了しました。`);
}

// ============================================================
// 手動実行用③: 月番号を1つ指定して書き込む
// コード内の数字を変えてから実行（1〜12）
// ============================================================
function runSpecificMonth() {
  var targetMonth = 3; // ← ここの数字を変えて実行（1〜12）

  if (targetMonth < 1 || targetMonth > 12) {
    Logger.log('月は 1〜12 で指定してください');
    return;
  }
  const mainSS    = SpreadsheetApp.openById(MAIN_SPREADSHEET_ID);
  const destSheet = mainSS.getSheetByName(ACHIEVEMENT_TAB_NAME);
  if (!destSheet) { Logger.log('シートが見つかりません'); return; }

  _initializeSheet(destSheet);
  _updateMonthData(destSheet, targetMonth);
  Logger.log(`${targetMonth}月分の手動更新が完了しました。`);
}

// ============================================================
// シート初期化（ヘッダー・メンバー名が未設定の場合のみ書き込む）
// ============================================================
function _initializeSheet(sheet) {
  // 既に初期化済みかチェック（メンバー名1人目が入っていれば初期化済みとみなす）
  if (sheet.getRange(MEMBER_START_ROW, NAME_COL).getValue() === MEMBERS[0].name) return;

  // ---- 固定列ヘッダー（行1） ----
  sheet.getRange(HEADER_ROW, NAME_COL).setValue('名前');
  sheet.getRange(HEADER_ROW, NIPPO_COL).setValue('日報');
  sheet.getRange(HEADER_ROW, EVAL_COL).setValue('評価シート');
  sheet.getRange(HEADER_ROW, NAME_COL, 1, 3).setFontWeight('bold').setBackground('#E8E8E8');

  // ---- 月ヘッダー（1月〜12月）& サブヘッダー（Key Result / 達成率） ----
  for (let m = 1; m <= 12; m++) {
    const startCol = _getMonthStartCol(m);

    // 行1: 月ヘッダー（6列結合）
    const hRange = sheet.getRange(HEADER_ROW, startCol, 1, COLS_PER_MONTH);
    hRange.merge();
    hRange.setValue(`${m}月`);
    hRange.setFontWeight('bold');
    hRange.setBackground('#4A90D9');
    hRange.setFontColor('#FFFFFF');
    hRange.setHorizontalAlignment('center');

    // 行2: サブヘッダー（Key Result, 達成率 × 3）
    for (let i = 0; i < 3; i++) {
      sheet.getRange(SUBHEADER_ROW, startCol + i * 2).setValue('Key Result');
      sheet.getRange(SUBHEADER_ROW, startCol + i * 2 + 1).setValue('達成率');
    }
    sheet.getRange(SUBHEADER_ROW, startCol, 1, COLS_PER_MONTH)
      .setFontWeight('bold')
      .setBackground('#D9EAF7');
  }

  // ---- メンバー名・評価シートリンクを設定（行3〜） ----
  for (let i = 0; i < MEMBERS.length; i++) {
    const row    = MEMBER_START_ROW + i;
    const member = MEMBERS[i];
    const ssUrl  = `https://docs.google.com/spreadsheets/d/${member.ssId}/edit`;

    sheet.getRange(row, NAME_COL).setValue(member.name);
    sheet.getRange(row, EVAL_COL).setFormula(`=HYPERLINK("${ssUrl}","評価シート")`);
  }

  Logger.log('シートの初期化が完了しました。');
}

// ============================================================
// 指定月のデータを全メンバー分書き込む
// A列の名前を検索して行を特定するため、シートに余分な行があっても正確に書き込める
// ============================================================
function _updateMonthData(sheet, month) {
  const startCol   = _getMonthStartCol(month);
  const srcTabName = `定量評価シート_${month}月`;

  // A列全体を読み取って「名前 → 行番号」のマップを作成
  const lastRow    = sheet.getLastRow();
  const nameValues = sheet.getRange(1, NAME_COL, lastRow, 1).getValues();
  const nameToRow  = {};
  for (let r = 0; r < nameValues.length; r++) {
    const name = String(nameValues[r][0]).trim();
    if (name) nameToRow[name] = r + 1; // 1始まりの行番号
  }

  for (let i = 0; i < MEMBERS.length; i++) {
    const member = MEMBERS[i];
    const row    = nameToRow[member.name];

    if (!row) {
      Logger.log(`${member.name}: シートのA列に名前が見つかりません → スキップ`);
      continue;
    }

    try {
      const memberSS = SpreadsheetApp.openById(member.ssId);
      let srcSheet = memberSS.getSheetByName(srcTabName);

      // タブ名で見つからない場合、tabIds に gid が指定されていればIDで再検索
      if (!srcSheet && member.tabIds && member.tabIds[month]) {
        srcSheet = _getSheetById(memberSS, member.tabIds[month]);
        if (srcSheet) {
          Logger.log(`${member.name}: タブ名 "${srcTabName}" が見つからないため、ID ${member.tabIds[month]} で "${srcSheet.getName()}" を取得`);
        }
      }

      if (!srcSheet) {
        Logger.log(`${member.name}: タブ "${srcTabName}" が見つかりません → 空欄のまま`);
        sheet.getRange(row, startCol, 1, COLS_PER_MONTH).clearContent();
        continue;
      }

      // Key Result取得範囲: メンバー・月ごとの上書き指定があればそちらを優先
      // 通常は A21:A23（A-B結合セルのため値は左端A列）、krRangeByMonth 指定時はそちらを使用
      const krRange       = (member.krRangeByMonth && member.krRangeByMonth[month]) ? member.krRangeByMonth[month] : 'A21:A23';
      const krValues      = srcSheet.getRange(krRange).getValues();
      const achieveValues = srcSheet.getRange('E21:E23').getValues();

      // 読み取り値をログ出力（デバッグ用）
      Logger.log(`${member.name} ${month}月 KR範囲=${krRange} 読取値 [0]=${krValues[0][0]} [1]=${krValues[1][0]} [2]=${krValues[2][0]} / E21=${achieveValues[0][0]} E22=${achieveValues[1][0]} E23=${achieveValues[2][0]}`);

      // 6セル分のデータを組み立て
      const rowData = [];
      for (let j = 0; j < 3; j++) {
        const kr      = krValues[j][0];
        const achieve = achieveValues[j][0];
        const hasData = (kr !== null && kr !== '' && kr !== undefined);
        rowData.push(hasData ? kr : '');
        rowData.push(hasData ? _formatPercent(achieve) : '');
      }

      const dataRange = sheet.getRange(row, startCol, 1, COLS_PER_MONTH);
      dataRange.setValues([rowData]);

      // Key Result列（startCol, startCol+2, startCol+4）を縦方向中央揃え
      for (let j = 0; j < 3; j++) {
        sheet.getRange(row, startCol + j * 2).setVerticalAlignment('middle');
      }

      Logger.log(`${member.name}: ${month}月 行${row}に書き込み完了`);

    } catch (e) {
      Logger.log(`${member.name}: ERROR - ${e.message}`);
    }
  }
}

// ============================================================
// シートID（gid）でタブを取得するヘルパー
// タブ名が標準形式と異なる場合のフォールバックとして使用
// ============================================================
function _getSheetById(ss, sheetId) {
  const sheets = ss.getSheets();
  for (let i = 0; i < sheets.length; i++) {
    if (sheets[i].getSheetId() === sheetId) return sheets[i];
  }
  return null;
}

// ============================================================
// 手動実行用④: 既存シートのメンバー名・評価シートリンクを最新化
// 新メンバー追加時や ssId 変更後に1回だけ実行してください
// ============================================================
function updateMemberLinks() {
  const mainSS    = SpreadsheetApp.openById(MAIN_SPREADSHEET_ID);
  const destSheet = mainSS.getSheetByName(ACHIEVEMENT_TAB_NAME);
  if (!destSheet) { Logger.log('シートが見つかりません'); return; }

  const lastRow    = destSheet.getLastRow();
  const nameValues = destSheet.getRange(1, NAME_COL, lastRow, 1).getValues();
  const nameToRow  = {};
  for (let r = 0; r < nameValues.length; r++) {
    const name = String(nameValues[r][0]).trim();
    if (name) nameToRow[name] = r + 1;
  }

  for (let i = 0; i < MEMBERS.length; i++) {
    const member = MEMBERS[i];
    const row    = nameToRow[member.name];
    if (!row) {
      Logger.log(`${member.name}: A列に名前が見つかりません → スキップ`);
      continue;
    }
    const ssUrl = `https://docs.google.com/spreadsheets/d/${member.ssId}/edit`;
    destSheet.getRange(row, EVAL_COL).setFormula(`=HYPERLINK("${ssUrl}","評価シート")`);
    Logger.log(`${member.name}: 行${row}に評価シートリンクを設定`);
  }
  Logger.log('メンバーリンクの更新が完了しました。');
}

// ============================================================
// 列番号計算: 月 → 開始列
//   1月 → D列（4）, 2月 → J列（10）, 3月 → P列（16）...
// ============================================================
function _getMonthStartCol(month) {
  return MONTH_START_COL + (month - 1) * COLS_PER_MONTH;
}

// ============================================================
// 達成率フォーマット
//   E列の値はすべて小数形式（例: 0.8566=86%, 1.17=117%）
//   → ×100 して切り上げで整数%表示
//   例: 0.8566 → 86%、1.17 → 117%、0.952 → 96%
// ============================================================
function _formatPercent(value) {
  if (value === null || value === '' || value === undefined) return '';
  var num = Number(value);
  if (isNaN(num)) return value;
  return Math.ceil(num * 100) + '%';
}

// ============================================================
// デバッグ用: 特定メンバーの評価シートから実際に読み取れる値をログ出力
// まずこの関数を実行して、ソース側のデータ取得状況を確認してください
// ============================================================
function debugCheckSource() {
  var results = [];

  for (var i = 0; i < MEMBERS.length; i++) {
    var member = MEMBERS[i];
    var row = { name: member.name };

    try {
      var memberSS  = SpreadsheetApp.openById(member.ssId);
      var sheetList = memberSS.getSheets().map(function(s){ return s.getName(); });
      row.tabs = sheetList.join(' / ');

      // 1月タブを確認
      var srcSheet = memberSS.getSheetByName('定量評価シート_1月');
      if (!srcSheet) {
        row.status = '定量評価シート_1月 タブなし';
      } else {
        var kr  = srcSheet.getRange('A21:A23').getValues();
        var ach = srcSheet.getRange('E21:E23').getValues();
        row.A21 = kr[0][0];  row.A22 = kr[1][0];  row.A23 = kr[2][0];
        row.E21 = ach[0][0]; row.E22 = ach[1][0]; row.E23 = ach[2][0];
        row.status = 'OK';
      }
    } catch(e) {
      row.status = 'ERROR: ' + e.message;
    }

    Logger.log(JSON.stringify(row));
  }

  Logger.log('デバッグ完了。上記ログでB21〜E23の値を確認してください。');
}

// ============================================================
// デバッグ用⑥: 宇梶知恵の2月タブを詳細調査
// 実行するとログに全タブ名・gid一覧と、各タブのA21:A23・E21:E23の値が出力される
// → 正しい 定量評価シート_2月 タブのgidを特定するために使用してください
// ============================================================
function debugUkaji2月() {
  var ssId = '1vLIsuqdOoWrmH-EXdBkUL3XSkcYxl5sEW7NGillEviI';
  var ss    = SpreadsheetApp.openById(ssId);
  var sheets = ss.getSheets();

  Logger.log('=== 宇梶知恵 スプシ全タブ一覧 ===');
  for (var i = 0; i < sheets.length; i++) {
    var s = sheets[i];
    Logger.log(`[${i}] 名前="${s.getName()}" gid=${s.getSheetId()}`);
  }

  Logger.log('=== 各タブのA21:A23 / E21:E23 ===');
  for (var i = 0; i < sheets.length; i++) {
    var s = sheets[i];
    try {
      var kr  = s.getRange('A21:A23').getValues();
      var ach = s.getRange('E21:E23').getValues();
      Logger.log(`[${s.getName()}] A21="${kr[0][0]}" A22="${kr[1][0]}" A23="${kr[2][0]}" / E21="${ach[0][0]}" E22="${ach[1][0]}" E23="${ach[2][0]}"`);
    } catch(e) {
      Logger.log(`[${s.getName()}] 読み取りエラー: ${e.message}`);
    }
  }
  Logger.log('=== デバッグ完了: 正しいタブのgidをコード内 tabIds: { 2: xxxx } に設定してください ===');
}

// ============================================================
// デバッグ用⑤: 田中春奈の2月タブを詳細調査
// 実行するとログに全タブ名・gid一覧と、各タブのA21:A23・E21:E23の値が出力される
// → 正しい 定量評価シート_2月 タブのgidを特定するために使用してください
// ============================================================
function debugTanaka2月() {
  var ssId = '1vmMTNe38hVlvcbK2s21MU70Dwi1W7VYqppLsfKJ3z2Y';
  var ss    = SpreadsheetApp.openById(ssId);
  var sheets = ss.getSheets();

  Logger.log('=== 田中春奈 スプシ全タブ一覧 ===');
  for (var i = 0; i < sheets.length; i++) {
    var s = sheets[i];
    Logger.log(`[${i}] 名前="${s.getName()}" gid=${s.getSheetId()}`);
  }

  Logger.log('=== 各タブのA21:A23 / E21:E23 ===');
  for (var i = 0; i < sheets.length; i++) {
    var s = sheets[i];
    try {
      var kr  = s.getRange('A21:A23').getValues();
      var ach = s.getRange('E21:E23').getValues();
      Logger.log(`[${s.getName()}] A21="${kr[0][0]}" A22="${kr[1][0]}" A23="${kr[2][0]}" / E21="${ach[0][0]}" E22="${ach[1][0]}" E23="${ach[2][0]}"`);
    } catch(e) {
      Logger.log(`[${s.getName()}] 読み取りエラー: ${e.message}`);
    }
  }
  Logger.log('=== デバッグ完了: 正しいタブのgidをコード内 tabIds: { 2: xxxx } に設定してください ===');
}

// ============================================================
// トリガー設定（初回1回だけ手動で実行してください）
//
// 設定内容: 毎日 午前5時に autoUpdateMonthlyGoals を実行
//   → スクリプト内で「1〜10日のみ処理」「11日以降はスキップ」と制御
//   → 毎月1〜10日は毎日データを上書き更新（評価シートへの後入力にも対応）
//   → 11日以降は自動スキップし、翌月1日から再び更新開始
// ============================================================
function setupTrigger() {
  // 既存の同名トリガーを全削除（重複防止）
  ScriptApp.getProjectTriggers()
    .filter(t => t.getHandlerFunction() === 'autoUpdateMonthlyGoals')
    .forEach(t => ScriptApp.deleteTrigger(t));

  // 毎日 午前5時に実行
  ScriptApp.newTrigger('autoUpdateMonthlyGoals')
    .timeBased()
    .everyDays(1)
    .atHour(5)
    .create();

  Logger.log('トリガー設定完了: 毎日 午前5時に実行（毎月1〜10日のみデータ更新）');
}
