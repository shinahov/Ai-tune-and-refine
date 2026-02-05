export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/") {
      const html = `<!doctype html>
<html>
  <head><meta charset="utf-8"><title>Backend OK</title></head>
  <body>
    <h1>Hello world</h1>
    <p>Cloudflare Worker.</p>
  </body>
</html>`;

      return new Response(html, {
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }

    return new Response("Not Found", { status: 404 });
  },
};
