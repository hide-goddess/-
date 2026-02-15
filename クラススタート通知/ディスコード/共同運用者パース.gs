// 共同運用者情報のパース関数群

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
