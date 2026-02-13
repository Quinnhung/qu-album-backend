export async function onRequest(context) {
  const request = context.request;
  const url = new URL(request.url);

  // ==========================================
  // 🟢 GET: 讀取資料給前端 (Vue.js)
  // ==========================================
  if (request.method === "GET") {
    const id = url.searchParams.get("id");
    if (!id) return new Response("Missing ID", { status: 400 });

    // 從 KV 讀取資料串流與中繼標籤
    const { value, metadata } = await context.env.QU_ALBUM_DATA.getWithMetadata(id, "stream");
    if (!value) return new Response("Not found", { status: 404 });

    const headers = new Headers();
    headers.set("Access-Control-Allow-Origin", "*");
    headers.set("Content-Type", "application/json");

    // 🔥 終極解法：如果資料在 KV 裡是壓縮過的，我們在 Worker 即時把它解壓縮！
    // 這樣瀏覽器收到的就會是標準的 JSON 文字，徹底解決  亂碼問題。
    if (metadata && metadata.zipped) {
      const decompressedStream = value.pipeThrough(new DecompressionStream("gzip"));
      return new Response(decompressedStream, { headers });
    }

    // 如果沒有壓縮（舊版資料或 IT 總表），直接回傳
    return new Response(value, { headers });
  }

  // ==========================================
  // 🔵 POST: 接收 GAS 同步資料
  // ==========================================
  if (request.method === "POST") {
    // 1. 驗證金鑰
    const secret = request.headers.get("x-auth-secret");
    if (secret !== context.env.SYNC_SECRET) {
       return new Response("Unauthorized", { status: 401 });
    }

    const contentType = request.headers.get("Content-Type") || "";

    // 情況 A：接收壓縮後的二進位流 (來自 SYNC.gs)
    if (contentType.includes("application/gzip")) {
      const id = request.headers.get("x-uuid");
      if (!id) return new Response("Missing Deployment ID", { status: 400 });

      const buffer = await request.arrayBuffer(); 
      
      // 存入 KV，並加上 metadata 標籤
      await context.env.QU_ALBUM_DATA.put(id, buffer, { metadata: { zipped: true } });
      return new Response(JSON.stringify({ status: "ok", id: id, type: "zipped" }), {
        headers: { "Content-Type": "application/json" }
      });
    } 
    // 情況 B：接收一般 JSON (來自舊版或 SYNC_MASTER.gs IT總表)
    else {
      const data = await request.json();
      const id = data.sys?.id;
      
      if (!id) return new Response("Missing Deployment ID", { status: 400 });

      await context.env.QU_ALBUM_DATA.put(id, JSON.stringify(data), { metadata: { zipped: false } });
      return new Response(JSON.stringify({ status: "ok", id: id, type: "json" }), {
        headers: { "Content-Type": "application/json" }
      });
    }
  }

  return new Response("Method Not Allowed", { status: 405 });
}
