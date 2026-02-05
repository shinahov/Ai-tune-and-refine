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

      const upstream = await fetch(endpoint, {
        method: "POST",
        headers: {
          "content-type": "application/json; charset=utf-8",
          "x-goog-api-key": env.GEMINI_API_KEY,
        },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: message }] }],
          generationConfig: { maxOutputTokens: 2048 },
        }),
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

      return json({ text });
    }

    return new Response("Not Found", { status: 404, headers: CORS_HEADERS });
  },
};
