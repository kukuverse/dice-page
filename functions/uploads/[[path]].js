export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const objectKey = url.pathname.replace(/^\/uploads\//, "");

  if (!objectKey) {
    return new Response("Not found", { status: 404 });
  }

  const object = await env.UPLOADS_BUCKET.get(objectKey);
  if (!object) {
    return new Response("Not found", {
      status: 404,
      headers: {
        "Content-Type": "text/plain; charset=utf-8"
      }
    });
  }

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);
  headers.set("Cache-Control", "public, max-age=31536000, immutable");

  if (request.method === "HEAD") {
    return new Response(null, { headers });
  }

  return new Response(object.body, { headers });
}
