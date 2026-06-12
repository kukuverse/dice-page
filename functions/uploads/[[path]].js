export async function onRequest(context) {
  return new Response("Legacy /uploads routes are disabled. Migrate existing assets to Cloudinary and re-seed content URLs.", {
    status: 404,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}
