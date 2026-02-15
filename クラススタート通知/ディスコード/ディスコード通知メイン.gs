// クラス案内進捗管理シート → Discord送信スクリプト（メイン関数）
// スプシ2の「クラス案内進捗管理シート」タブ編集時に起動

/**
 * 編集時に動くメインの関数
 * スプシ2の「クラス案内進捗管理シート」タブのR列が「スタート」に変更されたときにDiscordへ通知
 */
function postToDiscordOnEdit(e) {
  // 1. エラー回避：eオブジェクトがない場合（手動実行時など）は終了
  if (!e) return;

  var range = e.range;
  var sheet = range.getSheet();

  // シート名が「クラス案内進捗管理シート」でなければ何もしない
  if (sheet.getName() !== "クラス案内進捗管理シート") {
    return;
  }

  // 2. 条件チェック
  // 編集されたのが「R列(18列目)」かつ、値が「スタート」であるか？
  if (range.getColumn() !== 18 || e.value !== "スタート") {
    return;
  }

  // 3. 必要なデータを取得
  var row = range.getRow();

  // E列 (5列目)：クラス名
  var className = sheet.getRange(row, 5).getValue();

  // J列 (10列目)：クラスアルファベット
  var classAlpha = sheet.getRange(row, 10).getValue();

  // O列 (15列目) と P列 (16列目) の合計
  var countO = sheet.getRange(row, 15).getValue() || 0;
  var countP = sheet.getRange(row, 16).getValue() || 0;
  var totalCount = Number(countO) + Number(countP);

  // T列 (20列目)：共同運用者有無（チェックボックス）
  var hasCoOperator = sheet.getRange(row, 20).getValue();

  // U列 (21列目)：共同運用者情報
  var coOperatorInfo = sheet.getRange(row, 21).getValue() || "";

  // 4. 共同運用者の解析
  var coOperatorText = "";
  var coOperatorGroupCount = 0;

  if (hasCoOperator === true && coOperatorInfo !== "") {
    var parsed = parseCoOperators(String(coOperatorInfo));
    coOperatorGroupCount = parsed.groupCount;
    coOperatorText = parsed.formattedText;

    // O列 + P列 + 共同運用者の組数を合計
    totalCount = totalCount + coOperatorGroupCount;
  }

  // 5. 送信するメッセージを作成
  var messageContent = "新クラススタート通知です！\n" +
    className + classAlpha + "組　" + totalCount + "名\n";

  // 共同運用者がある場合はメッセージに追加
  if (coOperatorText !== "") {
    messageContent += "共同運用者" + coOperatorGroupCount + "組\n";
    messageContent += coOperatorText + "\n";
  }

  messageContent += "よろしくお願いします！";

  // 6. Discordへ送信
  sendToDiscord(messageContent);
}
