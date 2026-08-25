// Universal Vercel Serverless Function adapter
// Handles both Web Standard (Request -> Response) and Node.js (req, res)

export function createVercelHandler(
  handler: (req: Request) => Promise<Response>
) {
  return async function (req: any, res?: any) {
    // If called with Web Standard Request (or Edge)
    if (req instanceof Request || (req && typeof req.text === "function" && !res)) {
      return handler(req);
    }

    // If called with Node.js req, res
    try {
      const protocol = req.headers["x-forwarded-proto"] || "https";
      const host = req.headers["x-forwarded-host"] || req.headers.host || "localhost";
      const url = new URL(req.url, `${protocol}://${host}`);

      let body: any = null;
      if (req.method !== "GET" && req.method !== "HEAD") {
        if (typeof req.body === "string" || Buffer.isBuffer(req.body)) {
          body = req.body;
        } else if (req.body && typeof req.body === "object") {
          body = JSON.stringify(req.body);
        } else {
          const chunks: any[] = [];
          for await (const chunk of req) {
            chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
          }
          body = Buffer.concat(chunks).toString("utf-8");
        }
      }

      const headers = new Headers();
      for (const [key, value] of Object.entries(req.headers)) {
        if (value) {
          if (Array.isArray(value)) {
            value.forEach((v) => headers.append(key, v));
          } else {
            headers.set(key, String(value));
          }
        }
      }

      const webReq = new Request(url.toString(), {
        method: req.method,
        headers,
        body,
      });

      const response = await handler(webReq);

      if (res && typeof res.status === "function") {
        res.status(response.status);
        response.headers.forEach((v, k) => {
          res.setHeader(k, v);
        });

        const contentType = response.headers.get("content-type") || "";
        if (contentType.includes("application/json")) {
          const json = await response.json().catch(() => ({}));
          return res.json(json);
        } else {
          const text = await response.text();
          return res.send(text);
        }
      }

      return response;
    } catch (err: any) {
      console.error("Vercel handler error:", err);
      if (res && typeof res.status === "function") {
        return res.status(500).json({ error: err.message || "Internal server error" });
      }
      return Response.json({ error: err.message || "Internal server error" }, { status: 500 });
    }
  };
}
