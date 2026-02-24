type Env = { GEMINI_API_KEY: string };
const DEFAULT_MODEL = "gemma-3-27b-it";
const GEMMA_3_27B_OUTPUT_LIMIT = 8192;

const CORS_HEADERS: Record<string, string> = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET,POST,OPTIONS",
  "access-control-allow-headers": "content-type",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", ...CORS_HEADERS },
  });
}

function getGenerationConfig(body: any) {
  const reqGen = body?.generationConfig ?? {};

  const maxRaw = body?.maxOutputTokens ?? reqGen?.maxOutputTokens;
  const maxOutputTokens =
    Math.max(1, Math.min(GEMMA_3_27B_OUTPUT_LIMIT, Number(maxRaw ?? 256) || 256));

  const cfg: Record<string, any> = { maxOutputTokens };

  const temperature = reqGen?.temperature;
  const topP = reqGen?.topP;
  const topK = reqGen?.topK;
  const stopSequences = reqGen?.stopSequences;

  cfg.temperature = typeof temperature === "number" ? temperature : 1;
  cfg.topP = typeof topP === "number" ? topP : 0.95;
  cfg.topK = typeof topK === "number" ? topK : 64;
  if (Array.isArray(stopSequences)) cfg.stopSequences = stopSequences;

  return cfg;
}

function getSystemInstruction(body: any) {
  const sys = String(body?.systemInstruction ?? "").trim();
  if (!sys) return null;
  return { parts: [{ text: sys }] };
}

function supportsSystemInstruction(model: string) {
  return !model.startsWith("gemma-3");
}

function buildExplainPrompt(text: string) {
  return [
    "Explain the selected text in simple, precise plain text.",
    "Rules:",
    "- Output plain text only (no markdown, no bullets, no headings).",
    "- Keep it short: maximum 2 sentences.",
    "- Focus on the exact selected text only.",
    "",
    `Selected text: "${text}"`,
  ].join("\n");
}

function normalizePlainText(text: string) {
  return text
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/`(.*?)`/g, "$1")
    .replace(/^[-*]\s+/gm, "")
    .replace(/\s+/g, " ")
    .trim();
}


export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    if (request.method === "GET" && url.pathname === "/") {
      return new Response("<h1>OK</h1>", {
        headers: { "content-type": "text/html; charset=utf-8", ...CORS_HEADERS },
      });
    }

    if (request.method === "POST" && url.pathname === "/generate") {
      let body: any;
      try {
        body = await request.json();
      } catch {
        return json({ error: "Invalid JSON" }, 400);
      }

      const message = String(body?.message ?? "").trim();
      if (!message) return json({ error: "Message is required" }, 400);

      const model = String(body?.model ?? DEFAULT_MODEL).trim();
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
        model
      )}:generateContent`;

      const generationConfig = getGenerationConfig(body);
      const systemInstruction = getSystemInstruction(body);

      const payload: any = {
        contents: [{ role: "user", parts: [{ text: message }] }],
        generationConfig,
      };
      if (systemInstruction && supportsSystemInstruction(model)) {
        payload.systemInstruction = systemInstruction;
      }

      const upstream = await fetch(endpoint, {
        method: "POST",
        headers: {
          "content-type": "application/json; charset=utf-8",
          "x-goog-api-key": env.GEMINI_API_KEY,
        },
        body: JSON.stringify(payload),
      });


      if (!upstream.ok) {
        const errorText = await upstream.text();
        return json(
          { error: `Gemini API error: ${upstream.status} ${upstream.statusText}`, details: errorText },
          502
        );
      }

      const data: any = await upstream.json();
      const text =
        data?.candidates?.[0]?.content?.parts?.map((p: any) => p?.text).filter(Boolean).join("") ?? "";

      return json({
        text,
        build: "2026-02-14-2",
        model,
        effectiveGenerationConfig: payload.generationConfig,
        finishReason: data?.candidates?.[0]?.finishReason ?? null,
        usage: data?.usageMetadata ?? null,
      });


    }

    if (request.method === "POST" && url.pathname === "/explain") {
      let body: any;
      try {
        body = await request.json();
      } catch {
        return json({ error: "Invalid JSON" }, 400);
      }

      const selectedText = String(body?.text ?? "").trim();
      if (!selectedText) return json({ error: "Text is required" }, 400);

      const model = String(body?.model ?? DEFAULT_MODEL).trim();
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
        model
      )}:generateContent`;

      const payload: any = {
        contents: [{ role: "user", parts: [{ text: buildExplainPrompt(selectedText) }] }],
        generationConfig: {
          maxOutputTokens: 120,
          temperature: 0.1,
          topP: 0.95,
          topK: 64,
        },
      };

      const upstream = await fetch(endpoint, {
        method: "POST",
        headers: {
          "content-type": "application/json; charset=utf-8",
          "x-goog-api-key": env.GEMINI_API_KEY,
        },
        body: JSON.stringify(payload),
      });

      if (!upstream.ok) {
        const errorText = await upstream.text();
        return json(
          { error: `Gemini API error: ${upstream.status} ${upstream.statusText}`, details: errorText },
          502
        );
      }

      const data: any = await upstream.json();
      const explanationRaw =
        data?.candidates?.[0]?.content?.parts?.map((p: any) => p?.text).filter(Boolean).join("") ?? "";
      const explanation = normalizePlainText(explanationRaw);

      return json({
        text: explanation,
        model,
        finishReason: data?.candidates?.[0]?.finishReason ?? null,
        usage: data?.usageMetadata ?? null,
      });
    }

    return new Response("Not Found", { status: 404, headers: CORS_HEADERS });
  },
};
