export async function onRequest(context) {
  const request = context.request;
  const url = new URL(request.url);

  // ==========================================
  // 🟢 GET: 讀取資料給前端 (Vue.js)
  // ==========================================
  if (request.method === "GET") {
    const id = url.searchParams.get("id");
    if (!id) return new Response("Missing ID", { status: 400 });

    try {
      // 讀取為二進位陣列，確保我們能精準操作
      const { value, metadata } = await context.env.QU_ALBUM_DATA.getWithMetadata(id, "arrayBuffer");
      if (!value) return new Response(JSON.stringify({ error: "Not found" }), { status: 404 });

      const headers = new Headers();
      headers.set("Access-Control-Allow-Origin", "*");
      headers.set("Content-Type", "application/json; charset=utf-8"); // 強制 UTF-8
      headers.set("Cache-Control", "no-cache, no-store, must-revalidate"); // 防快取干擾

      // 檢查特徵碼 (GZIP 檔頭永遠是 1F 8B)
      const bytes = new Uint8Array(value);
      const isZipped = (metadata && metadata.zipped) || (bytes.length > 1 && bytes[0] === 0x1F && bytes[1] === 0x8B);

      if (isZipped) {
        // 🔥 終極殺招：在 Cloudflare 內部強制解壓縮，轉成純文字再送給瀏覽器
        const decompressedStream = new Response(value).body.pipeThrough(new DecompressionStream("gzip"));
        const jsonText = await new Response(decompressedStream).text();
        return new Response(jsonText, { headers });
      } else {
        // 沒壓縮過的直接回傳
        return new Response(value, { headers });
      }

    } catch (e) {
      // 如果解壓縮失敗，回傳清楚的錯誤訊息而不是亂碼
      return new Response(JSON.stringify({ error: "Cloudflare 解壓縮失敗", details: e.message }), { 
        status: 500, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } 
      });
    }
  }

  // ==========================================
  // 🔵 POST: 接收 GAS 同步資料
  // ==========================================
  if (request.method === "POST") {
    try {
      const secret = request.headers.get("x-auth-secret");
      if (secret !== context.env.SYNC_SECRET) {
         return new Response("Unauthorized", { status: 401 });
      }

      const contentType = request.headers.get("Content-Type") || "";
      const id = request.headers.get("x-uuid") || url.searchParams.get("id");

      if (contentType.includes("application/gzip")) {
        if (!id) return new Response("Missing Deployment ID", { status: 400 });
        const buffer = await request.arrayBuffer(); 
        await context.env.QU_ALBUM_DATA.put(id, buffer, { metadata: { zipped: true } });
        return new Response(JSON.stringify({ status: "ok", id: id, type: "zipped" }), {
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
        });
      } 
      else {
        const data = await request.json();
        const jsonId = data.sys?.id || id;
        if (!jsonId) return new Response("Missing Deployment ID", { status: 400 });
        await context.env.QU_ALBUM_DATA.put(jsonId, JSON.stringify(data), { metadata: { zipped: false } });
        return new Response(JSON.stringify({ status: "ok", id: jsonId, type: "json" }), {
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
        });
      }
    } catch (e) {
      return new Response(JSON.stringify({ error: "Cloudflare 儲存失敗", details: e.message }), { 
        status: 500, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
    }
  }

  return new Response("Method Not Allowed", { status: 405 });
}
