export async function onRequestPost(context) {
  try {
    const { request, env } = context;

    // 1. 安全驗證 (檢查 Header 中的密鑰)
    const secret = request.headers.get("x-auth-secret");
    if (!secret || secret !== env.SYNC_SECRET) {
      return new Response("Unauthorized: Invalid Secret", { status: 403 });
    }

    // 2. 讀取 GAS 推送的 JSON
    const data = await request.json();
    const albumId = data.sys.id; // 這是 GAS 生成的 UUID

    if (!albumId) {
      return new Response("Bad Request: Missing ID", { status: 400 });
    }

    // 3. 寫入 Cloudflare KV
    // 將 JSON 轉為字串存入，並設定 10 分鐘快取 (依需求調整)
    await env.QU_ALBUM_DATA.put(albumId, JSON.stringify(data));

    return new Response(JSON.stringify({ status: "ok", id: albumId }), {
      headers: { "Content-Type": "application/json" },
    });

  } catch (err) {
    return new Response(`Error: ${err.message}`, { status: 500 });
  }
}
