import express from "express";
import Anthropic from "@anthropic-ai/sdk";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
app.use(express.json({ limit: "2mb" }));
app.use(express.static(path.join(__dirname, "public")));

const PORT = process.env.PORT || 3000;
const MODEL = process.env.ANTHROPIC_MODEL || "claude-opus-4-6";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

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

    const message = await client.messages.create({
      model: MODEL,
      max_tokens: 2000,
      messages: [
        {
          role: "user",
          content:
            "あなたはWebサイトのリプレイス提案を行うUI/UXデザイナー兼フロントエンドエンジニアです。\n" +
            "次のHTMLは、これからリプレイス対象となる既存HPです。\n" +
            "構成・トーン・主要コンテンツ・課題点を日本語で簡潔に要約してください。\n\n" +
            `URL: ${existingUrl}\n\nHTML:\n${compact}`,
        },
      ],
    });

    res.json({
      url: existingUrl,
      rawHtml: compact,
      summary: message.content
        .filter((b) => b.type === "text")
        .map((b) => b.text)
        .join("\n"),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
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

    const message = await client.messages.create({
      model: MODEL,
      max_tokens: 2000,
      messages: [
        {
          role: "user",
          content:
            "あなたはWebサイトのリプレイス提案を行うUI/UXデザイナーです。\n" +
            "以下に『既存HPの要約』と『参考にする新規URLのHTML』を示します。\n" +
            "参考サイトから得られる、既存HPをより良くするための改善アイデアを日本語で列挙してください。\n" +
            "デザイン・情報設計・CTA・キャッチコピーの観点を含めてください。\n\n" +
            `■ 既存HP URL: ${existingUrl}\n` +
            `■ 既存HP 要約:\n${existingSummary || "(未提供)"}\n\n` +
            `■ 参考新規URL: ${referenceUrl}\n` +
            `■ 参考HTML:\n${compact}`,
        },
      ],
    });

    res.json({
      url: referenceUrl,
      rawHtml: compact,
      improvements: message.content
        .filter((b) => b.type === "text")
        .map((b) => b.text)
        .join("\n"),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
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

    const message = await client.messages.create({
      model: MODEL,
      max_tokens: 8000,
      messages: [
        {
          role: "user",
          content:
            "あなたはプロのフロントエンドエンジニアです。\n" +
            "以下の情報をもとに、既存HPをリプレイスした新しいHPのデモを 1つのHTMLファイルとして生成してください。\n\n" +
            "要件:\n" +
            "1. 既存HPの主要コンテンツ・情報を失わないこと\n" +
            "2. 参考新規URLのデザインやUXを取り入れ、より良くすること\n" +
            "3. ユーザーからのテキスト指示を最優先で反映すること\n" +
            "4. 出力は <!DOCTYPE html> から始まる完全なHTML 1ファイル(インラインCSS可、外部依存なし、日本語)\n" +
            "5. 装飾・説明文は出力せず、HTMLコードのみを返すこと\n\n" +
            `■ 既存HP URL: ${existingUrl}\n` +
            `■ 既存HP 要約:\n${existingSummary || "(なし)"}\n\n` +
            `■ 既存HP HTML(抜粋):\n${(existingHtml || "").slice(0, 20000)}\n\n` +
            `■ 参考新規URL: ${referenceUrl || "(なし)"}\n` +
            `■ 参考HTML(抜粋):\n${(referenceHtml || "").slice(0, 20000)}\n\n` +
            `■ 参考から得た改善案:\n${improvements || "(なし)"}\n\n` +
            `■ ユーザー指示(最優先):\n${instructions || "(特になし)"}\n`,
        },
      ],
    });

    const text = message.content
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("\n");

    // ```html ... ``` フェンスが付いた場合は剥がす
    const fenceMatch = text.match(/```(?:html)?\s*([\s\S]*?)```/i);
    const html = fenceMatch ? fenceMatch[1].trim() : text.trim();

    res.json({ html });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Website Replacement Demo → http://localhost:${PORT}`);
});
