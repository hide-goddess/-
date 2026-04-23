import "dotenv/config";
import express from "express";
import { GoogleGenAI } from "@google/genai";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
app.use(express.json({ limit: "2mb" }));
app.use(express.static(path.join(__dirname, "public")));

const PORT = process.env.PORT || 3000;
const MODEL = process.env.GEMINI_MODEL || "gemini-2.0-flash";

const FALLBACK_MODELS = [
  MODEL,
  "gemini-2.5-flash",
];

// --- 複数APIキー対応 -------------------------------------------------------

const API_KEYS = [
  process.env.GEMINI_API_KEY_1,
  process.env.GEMINI_API_KEY_2,
  process.env.GEMINI_API_KEY_3,
  process.env.GEMINI_API_KEY, // 後方互換: GEMINI_API_KEY も使える
].filter(Boolean);

// 重複除去
const uniqueKeys = [...new Set(API_KEYS)];

if (uniqueKeys.length === 0) {
  console.warn(
    "[warn] APIキーが未設定です。.env に GEMINI_API_KEY_1 等を設定してください。"
  );
}

const clients = uniqueKeys.map((key) => new GoogleGenAI({ apiKey: key }));
let currentKeyIndex = 0;

// --- Helpers ---------------------------------------------------------------

/**
 * 指定URLのHTMLを取得し、解析しやすい形に整える。
 * 大きすぎるHTMLはトリミングして返す。
 */
async function fetchUrlContent(url) {
  const response = await fetch(url, {
    redirect: "follow",
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; WebsiteReplacementDemo/1.0; +https://example.com)",
      Accept: "text/html,application/xhtml+xml",
    },
  });

  if (!response.ok) {
    throw new Error(`URL取得失敗: ${response.status} ${response.statusText}`);
  }

  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("text/html") && !contentType.includes("xml")) {
    throw new Error(`HTMLではないコンテンツです (${contentType})`);
  }

  const html = await response.text();
  return html;
}

/**
 * HTMLから不要タグ・コメントを除き、LLMに渡しやすいサイズに圧縮する。
 */
function compactHtml(html, maxLength = 60000) {
  let cleaned = html
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  if (cleaned.length > maxLength) {
    cleaned = cleaned.slice(0, maxLength) + "\n<!-- truncated -->";
  }
  return cleaned;
}

/**
 * 指定ミリ秒だけ待機する。
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * エラーが一時的なもの (リトライすべきか) を判定する。
 * Gemini API は過負荷時に 503 UNAVAILABLE、
 * レート超過時に 429 RESOURCE_EXHAUSTED を返す。
 */
function isTransientError(err) {
  const msg = String(err?.message ?? "");
  const status = err?.status ?? err?.code;
  if (status === 503 || status === 429) return true;
  if (status === "UNAVAILABLE" || status === "RESOURCE_EXHAUSTED") return true;
  return (
    /\b503\b/.test(msg) ||
    /\b429\b/.test(msg) ||
    /UNAVAILABLE/i.test(msg) ||
    /RESOURCE_EXHAUSTED/i.test(msg) ||
    /overloaded/i.test(msg) ||
    /high demand/i.test(msg)
  );
}

/**
 * 1つのクライアント・モデルで最大 maxAttempts 回リトライする。
 */
async function tryWithRetry(client, model, prompt, maxOutputTokens, maxAttempts = 3) {
  let lastError;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await client.models.generateContent({
        model,
        contents: prompt,
        config: {
          maxOutputTokens,
          temperature: 0.7,
        },
      });
      if (attempt > 1) {
        console.log(`[gemini] ${model} attempt ${attempt} succeeded`);
      }
      return response.text ?? "";
    } catch (err) {
      lastError = err;
      if (attempt === maxAttempts || !isTransientError(err)) {
        throw err;
      }
      const backoffMs =
        3000 * Math.pow(2, attempt - 1) + Math.floor(Math.random() * 1000);
      const secs = (backoffMs / 1000).toFixed(1);
      console.warn(
        `[gemini] ${model} attempt ${attempt} failed — retrying in ${secs}s`
      );
      await sleep(backoffMs);
    }
  }
  throw lastError;
}

/**
 * Gemini にテキストプロンプトを投げ、応答テキストを返す。
 * APIキーローテーション × モデルフォールバック × リトライ の3層構造:
 *   Key1 → [model1(3回), model2(3回)]
 *   Key2 → [model1(3回), model2(3回)]
 *   Key3 → [model1(3回), model2(3回)]
 */
async function generateText(prompt, maxOutputTokens) {
  let lastError;

  for (let ki = 0; ki < clients.length; ki++) {
    const idx = (currentKeyIndex + ki) % clients.length;
    const client = clients[idx];
    console.log(`[gemini] === APIキー ${idx + 1}/${clients.length} を使用 ===`);

    for (const model of FALLBACK_MODELS) {
      try {
        console.log(`[gemini] trying model: ${model}`);
        const result = await tryWithRetry(client, model, prompt, maxOutputTokens);
        currentKeyIndex = idx;
        return result;
      } catch (err) {
        lastError = err;
        if (!isTransientError(err)) {
          throw err;
        }
        console.warn(
          `[gemini] ${model} failed — next model`
        );
      }
    }
    console.warn(`[gemini] APIキー ${idx + 1} — 全モデル失敗。次のキーへ切替…`);
  }
  throw lastError;
}

// --- API routes ------------------------------------------------------------

/**
 * ステップ1: 既存HPを読み込み、構造や内容の要約を返す。
 */
app.post("/api/analyze-existing", async (req, res) => {
  try {
    const { existingUrl } = req.body;
    if (!existingUrl) {
      return res.status(400).json({ error: "existingUrl が必要です" });
    }

    const html = await fetchUrlContent(existingUrl);
    const compact = compactHtml(html);

    const prompt =
      "あなたはWebサイトのリプレイス提案を行うUI/UXデザイナー兼フロントエンドエンジニアです。\n" +
      "次のHTMLは、これからリプレイス対象となる既存HPです。\n" +
      "構成・トーン・主要コンテンツ・課題点を日本語で簡潔に要約してください。\n\n" +
      `URL: ${existingUrl}\n\nHTML:\n${compact}`;

    const summary = await generateText(prompt, 2000);

    res.json({
      url: existingUrl,
      rawHtml: compact,
      summary,
    });
  } catch (err) {
    console.error(err);
    const friendly = isTransientError(err)
      ? "Gemini API が一時的に混雑しています。少し待ってから再度お試しください。(リトライ上限に到達)"
      : err.message;
    res.status(500).json({ error: friendly });
  }
});

/**
 * ステップ2: 新規参考URLを読み込み、既存HPの改善点を抽出する。
 */
app.post("/api/analyze-reference", async (req, res) => {
  try {
    const { existingSummary, existingUrl, referenceUrl } = req.body;
    if (!referenceUrl) {
      return res.status(400).json({ error: "referenceUrl が必要です" });
    }

    const html = await fetchUrlContent(referenceUrl);
    const compact = compactHtml(html);

    const prompt =
      "あなたはWebサイトのリプレイス提案を行うUI/UXデザイナーです。\n" +
      "以下に『既存HPの要約』と『参考にする新規URLのHTML』を示します。\n" +
      "参考サイトから得られる、既存HPをより良くするための改善アイデアを日本語で列挙してください。\n" +
      "デザイン・情報設計・CTA・キャッチコピーの観点を含めてください。\n\n" +
      `■ 既存HP URL: ${existingUrl}\n` +
      `■ 既存HP 要約:\n${existingSummary || "(未提供)"}\n\n` +
      `■ 参考新規URL: ${referenceUrl}\n` +
      `■ 参考HTML:\n${compact}`;

    const improvements = await generateText(prompt, 2000);

    res.json({
      url: referenceUrl,
      rawHtml: compact,
      improvements,
    });
  } catch (err) {
    console.error(err);
    const friendly = isTransientError(err)
      ? "Gemini API が一時的に混雑しています。少し待ってから再度お試しください。(リトライ上限に到達)"
      : err.message;
    res.status(500).json({ error: friendly });
  }
});

/**
 * ステップ3: 既存HP + 参考HP + テキスト指示 を踏まえて、
 * 完全なHTML(1ファイル)としてリプレイス後のデモHPを生成する。
 */
app.post("/api/generate-replacement", async (req, res) => {
  try {
    const {
      existingUrl,
      existingHtml,
      existingSummary,
      referenceUrl,
      referenceHtml,
      improvements,
      instructions,
    } = req.body;

    if (!existingHtml) {
      return res.status(400).json({ error: "existingHtml が必要です" });
    }

    const prompt =
      "あなたはプロのフロントエンドエンジニアです。\n" +
      "以下の情報をもとに、既存HPをリプレイスした新しいHPのデモを 1つのHTMLファイルとして生成してください。\n\n" +
      "【最重要】構成について:\n" +
      "- LP(ランディングページ)ではなく、複数ページがあるHP(ホームページ)構成にすること\n" +
      "- ナビゲーションのリンクをクリックすると、同一ページ内スクロールではなく、\n" +
      "  JavaScriptで表示ページが完全に切り替わるようにすること\n" +
      "- 各ページは <div class=\"page\" id=\"page-xxx\"> のような要素として定義し、\n" +
      "  表示中のページだけ display:block、それ以外は display:none にすること\n" +
      "- 最低でも以下のページを含めること:\n" +
      "  HOME(トップ)、会社概要、事業内容/サービス、お問い合わせ\n" +
      "  既存HPにさらにページがあればそれも含める\n" +
      "- ナビゲーションバーは全ページ共通で常に上部に固定表示\n" +
      "- ページ切り替え用のJavaScriptを <script> タグ内に含めること\n\n" +
      "その他の要件:\n" +
      "1. 既存HPの主要コンテンツ・情報を失わないこと\n" +
      "2. 参考新規URLのデザインやUXを取り入れ、より良くすること\n" +
      "3. ユーザーからのテキスト指示を最優先で反映すること\n" +
      "4. 出力は <!DOCTYPE html> から始まる完全なHTML 1ファイル(インラインCSS可、外部依存なし、日本語)\n" +
      "5. コードフェンス(```)は絶対に使わず、生のHTMLだけを返すこと\n" +
      "6. 説明文・コメント・注釈は一切出力しないこと\n\n" +
      `■ 既存HP URL: ${existingUrl}\n` +
      `■ 既存HP 要約:\n${existingSummary || "(なし)"}\n\n` +
      `■ 既存HP HTML(抜粋):\n${(existingHtml || "").slice(0, 15000)}\n\n` +
      `■ 参考新規URL: ${referenceUrl || "(なし)"}\n` +
      `■ 参考HTML(抜粋):\n${(referenceHtml || "").slice(0, 15000)}\n\n` +
      `■ 参考から得た改善案:\n${improvements || "(なし)"}\n\n` +
      `■ ユーザー指示(最優先):\n${instructions || "(特になし)"}\n`;

    const text = await generateText(prompt, 30000);

    // コードフェンスを除去し、HTMLだけを取り出す
    let html = text.trim();
    // ```html ... ``` で囲まれている場合
    if (html.includes("```")) {
      html = html.replace(/^[\s\S]*?```(?:html)?\s*\n?/i, "");
      html = html.replace(/\n?```[\s\S]*$/i, "");
      html = html.trim();
    }
    // <!DOCTYPE html> より前のテキストを除去
    const doctypeIndex = html.indexOf("<!DOCTYPE");
    if (doctypeIndex > 0) {
      html = html.slice(doctypeIndex);
    }

    console.log(`[generate] response length: ${text.length} chars, html length: ${html.length} chars`);
    console.log(`[generate] starts with: ${html.slice(0, 80)}`);

    res.json({ html });
  } catch (err) {
    console.error(err);
    const friendly = isTransientError(err)
      ? "Gemini API が一時的に混雑しています。少し待ってから再度お試しください。(リトライ上限に到達)"
      : err.message;
    res.status(500).json({ error: friendly });
  }
});

app.listen(PORT, () => {
  console.log(`Website Replacement Demo → http://localhost:${PORT}`);
  console.log(`Model: ${MODEL} (fallback: ${FALLBACK_MODELS.slice(1).join(" → ")})`);
  console.log(`API Keys: ${uniqueKeys.length}個 登録済み`);
  console.log(`Retry: 各キー×各モデル 最大3回 (計 最大${uniqueKeys.length * FALLBACK_MODELS.length * 3}回)`);
});
