type Env = { GEMINI_API_KEY: string };

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
    Math.max(1, Math.min(2048, Number(maxRaw ?? 2048) || 2048));

  const cfg: Record<string, any> = { maxOutputTokens };

  const temperature = reqGen?.temperature;
  const topP = reqGen?.topP;
  const topK = reqGen?.topK;
  const stopSequences = reqGen?.stopSequences;

  if (typeof temperature === "number") cfg.temperature = temperature;
  if (typeof topP === "number") cfg.topP = topP;
  if (typeof topK === "number") cfg.topK = topK;
  if (Array.isArray(stopSequences)) cfg.stopSequences = stopSequences;

  return cfg;
}

function getSystemInstruction(body: any) {
  const sys = String(body?.systemInstruction ?? "").trim();
  if (!sys) return null;
  return { parts: [{ text: sys }] };
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

      const model = String(body?.model ?? "gemma-3-1b-it").trim();
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
        model
      )}:generateContent`;

      const generationConfig = getGenerationConfig(body);
      const systemInstruction = getSystemInstruction(body);

      const payload: any = {
        contents: [{ role: "user", parts: [{ text: message }] }],
        generationConfig,
      };
      if (systemInstruction) payload.systemInstruction = systemInstruction;

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

    return new Response("Not Found", { status: 404, headers: CORS_HEADERS });
  },
};
