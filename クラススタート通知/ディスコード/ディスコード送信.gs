// Discord送信用の関数

/**
 * Discord送信用のサブ関数
 */
function sendToDiscord(text) {
  // ウェブフックURL2
  var webhookUrl = "https://discord.com/api/webhooks/1469964798539071626/ZWs7XKqk4urHoWnemh_B9L0mgP7vVnaVRXDFEqzJKHtSHVjMvbgqMDffWqjWu4Qp6nz-";
  // スレッドID2
  var threadId = "1445399709312090236";

  // スレッド指定用のURLを作成
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
