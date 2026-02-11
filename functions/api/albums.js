export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const id = url.searchParams.get("id");

  // CORS Header (允許前端存取)
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Content-Type": "application/json",
    "Cache-Control": "public, max-age=60" // 瀏覽器快取 60 秒
  };

  if (!id) {
    return new Response(JSON.stringify({ error: "Missing ID" }), { headers });
  }

  // 從 KV 讀取資料
  const data = await env.QU_ALBUM_DATA.get(id);

  if (!data) {
    return new Response(JSON.stringify({ error: "Album not found" }), { status: 404, headers });
  }

  return new Response(data, { headers });
}
