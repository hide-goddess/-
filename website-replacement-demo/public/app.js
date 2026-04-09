// クライアント側の状態
const state = {
  existingUrl: "",
  existingHtml: "",
  existingSummary: "",
  referenceUrl: "",
  referenceHtml: "",
  improvements: "",
  generatedHtml: "",
};

const $ = (id) => document.getElementById(id);

function setStatus(message, kind = "") {
  const el = $("status");
  el.textContent = message;
  el.className = `status ${kind}`.trim();
}

function setResult(id, text, kind = "") {
  const el = $(id);
  el.textContent = text;
  el.className = `result ${kind}`.trim();
}

async function postJson(url, body) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || `${res.status} ${res.statusText}`);
  }
  return data;
}

// ステップ1: 既存HP読み込み
$("btn-analyze-existing").addEventListener("click", async () => {
  const url = $("existingUrl").value.trim();
  if (!url) {
    setResult("existing-result", "URLを入力してください", "err");
    return;
  }
  setResult("existing-result", "読み込み中…");
  try {
    const data = await postJson("/api/analyze-existing", { existingUrl: url });
    state.existingUrl = data.url;
    state.existingHtml = data.rawHtml;
    state.existingSummary = data.summary;
    setResult("existing-result", `[要約]\n${data.summary}`, "ok");
  } catch (err) {
    setResult("existing-result", `エラー: ${err.message}`, "err");
  }
});

// ステップ2: 参考URL読み込み
$("btn-analyze-reference").addEventListener("click", async () => {
  const url = $("referenceUrl").value.trim();
  if (!url) {
    setResult("reference-result", "URLを入力してください", "err");
    return;
  }
  if (!state.existingHtml) {
    setResult(
      "reference-result",
      "先にステップ1で既存HPを読み込んでください",
      "err"
    );
    return;
  }
  setResult("reference-result", "読み込み中…");
  try {
    const data = await postJson("/api/analyze-reference", {
      existingUrl: state.existingUrl,
      existingSummary: state.existingSummary,
      referenceUrl: url,
    });
    state.referenceUrl = data.url;
    state.referenceHtml = data.rawHtml;
    state.improvements = data.improvements;
    setResult("reference-result", `[改善案]\n${data.improvements}`, "ok");
  } catch (err) {
    setResult("reference-result", `エラー: ${err.message}`, "err");
  }
});

// ステップ3: 生成
$("demo-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!state.existingHtml) {
    setStatus("先に既存HPを読み込んでください", "err");
    return;
  }
  const instructions = $("instructions").value.trim();
  setStatus("リプレイス後のデモHPを生成中… (数十秒かかることがあります)", "loading");
  $("btn-generate").disabled = true;
  try {
    const data = await postJson("/api/generate-replacement", {
      existingUrl: state.existingUrl,
      existingHtml: state.existingHtml,
      existingSummary: state.existingSummary,
      referenceUrl: state.referenceUrl,
      referenceHtml: state.referenceHtml,
      improvements: state.improvements,
      instructions,
    });
    state.generatedHtml = data.html;
    const iframe = $("preview");
    iframe.srcdoc = data.html;
    $("btn-download").disabled = false;
    $("btn-open-new").disabled = false;
    setStatus("生成が完了しました", "ok");
  } catch (err) {
    setStatus(`エラー: ${err.message}`, "err");
  } finally {
    $("btn-generate").disabled = false;
  }
});

$("btn-download").addEventListener("click", () => {
  if (!state.generatedHtml) return;
  const blob = new Blob([state.generatedHtml], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "replacement-demo.html";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
});

$("btn-open-new").addEventListener("click", () => {
  if (!state.generatedHtml) return;
  const blob = new Blob([state.generatedHtml], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank", "noopener");
});
