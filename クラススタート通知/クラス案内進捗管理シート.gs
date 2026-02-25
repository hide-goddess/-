// クラススタート通知 → Discord送信スクリプト
// スプシ3の全タブ編集時に起動
/**
 * 編集時に動くメインの関数
 * スプシ3の全タブのR列が「スタート」に変更されたときにDiscordへ通知
 */
function postToDiscordOnEdit(e) {
  // 1. エラー回避：eオブジェクトがない場合（手動実行時など）は終了
  if (!e) return;
  var range = e.range;
  var sheet = range.getSheet();
  // 2. 条件チェック
  // 編集されたのが「R列(18列目)」かつ、値が「スタート」であるか？
  if (range.getColumn() !== 18 || e.value !== "スタート") {
    return;
  }
  // 3. 必要なデータを取得
  var row = range.getRow();
  // E列 (5列目)：クラス名（結合セル対応：値が空の場合、上方向に値を探す）
  var className = sheet.getRange(row, 5).getValue();
  if (!className || className === "") {
    for (var r = row - 1; r >= 1; r--) {
      var val = sheet.getRange(r, 5).getValue();
      if (val && val !== "") {
        className = val;
        break;
      }
    }
  }
  // J列 (10列目)：クラスアルファベット
  var classAlpha = sheet.getRange(row, 10).getValue();
  // O列 (15列目) と P列 (16列目) の合計
  var countO = sheet.getRange(row, 15).getValue() || 0;
  var countP = sheet.getRange(row, 16).getValue() || 0;
  var totalCount = Number(countO) + Number(countP);
  // S列 (19列目)：共同運用者有無（チェックボックス）
  var hasCoOperator = sheet.getRange(row, 19).getValue();
  // T列 (20列目)：共同運用者情報
  var coOperatorInfo = sheet.getRange(row, 20).getValue() || "";
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
  // 5. 送信するメッセージを作成（ID11のメンション付き）
  var messageContent = "<@1394490476488298568>\n" +
    "新クラススタート通知です！\n" +
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
/**
 * 共同運用者情報をパースする関数
 * 入力例1: "１組目・A様・B様"
 * 入力例2: "１組目・A様・B様、2組目・C様・D様"
 *
 * 返却: { groupCount: 組数, formattedText: 整形済みテキスト }
 */
function parseCoOperators(text) {
  if (!text || text.trim() === "") {
    return { groupCount: 0, formattedText: "" };
  }
  // 「X組目」で分割（全角・半角数字対応）
  var groupPattern = /[０-９\d]+組目/g;
  var matches = [];
  var match;
  while ((match = groupPattern.exec(text)) !== null) {
    matches.push({ index: match.index, text: match[0] });
  }
  var groups = [];
  if (matches.length === 0) {
    // 「X組目」パターンがない場合、全体を1グループとして扱う
    var members = extractMembers(text);
    if (members.length > 0) {
      groups.push(members);
    }
  } else {
    // 各グループを抽出
    for (var i = 0; i < matches.length; i++) {
      var startIdx = matches[i].index + matches[i].text.length;
      var endIdx = (i + 1 < matches.length) ? matches[i + 1].index : text.length;
      var groupText = text.substring(startIdx, endIdx);
      var members = extractMembers(groupText);
      if (members.length > 0) {
        groups.push(members);
      }
    }
  }
  var groupCount = groups.length;
  // フォーマット：各グループのメンバーを「・名前」で改行、グループ間を「--------」で区切り
  var formattedParts = [];
  for (var g = 0; g < groups.length; g++) {
    var memberLines = [];
    for (var m = 0; m < groups[g].length; m++) {
      memberLines.push("・" + groups[g][m]);
    }
    formattedParts.push(memberLines.join("\n"));
  }
  var formattedText = formattedParts.join("\n--------\n");
  return { groupCount: groupCount, formattedText: formattedText };
}
/**
 * テキストからメンバー名を抽出する関数
 * 「・」区切りでメンバーを取得
 */
function extractMembers(text) {
  var members = [];
  var parts = text.split("・");
  for (var i = 0; i < parts.length; i++) {
    var name = parts[i].replace(/^[\s、,，]+/, "").replace(/[\s、,，]+$/, "").trim();
    if (name !== "") {
      members.push(name);
    }
  }
  return members;
}
/**
 * Discord送信用のサブ関数
 */
function sendToDiscord(text) {
  // ウェブフックURL3
  var webhookUrl = "https://discord.com/api/webhooks/1469967076906242068/aJ-tCA_CWTCUgFdcrPdYz-tjz7woQMnn_hNZeG76Dypb7Uk0Izu51iCbkpMrS9vFGeyl";
  // スレッドID3
  var threadId = "1362697796976775302";
  var targetUrl = webhookUrl + "?thread_id=" + threadId;
  var payload = {
    content: text
  };
  var options = {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };
  try {
    UrlFetchApp.fetch(targetUrl, options);
  } catch (err) {
    console.log("Discord送信エラー: " + err);
  }
}
