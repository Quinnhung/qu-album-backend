/**
 * ------------------------------------------------------------------
 * 📸 Qu相簿 - Cloudflare 接收與儲存 API (sync.js)
 * ------------------------------------------------------------------
 * * 版本：v2.0 (輕量快取版)
 * * 說明：
 * 1. 驗證 `x-auth-secret`。
 * 2. 根據 `Content-Type` 判斷上傳格式 (GZIP 或 JSON)。
 * 3. 寫入 Cloudflare KV (QU_ALBUM_DATA)，並標記 metadata。
 * ------------------------------------------------------------------
 */

export async function onRequestPost(context) {
  try {
    const secret = context.request.headers.get("x-auth-secret");
    if (secret !== context.env.SYNC_SECRET) {
       return new Response(JSON.stringify({ error: "Unauthorized" }), { 
         status: 401,
         headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
       });
    }

    const contentType = context.request.headers.get("Content-Type") || "";
    const id = context.request.headers.get("x-uuid");

    if (!id) {
      return new Response(JSON.stringify({ error: "Missing x-uuid header" }), { 
        status: 400,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } 
      });
    }

    // 處理 GZIP 壓縮檔 (由 SYNC.gs 傳送)
    if (contentType.includes("application/gzip")) {
      const buffer = await context.request.arrayBuffer();
      // 🔥 新增：在 metadata 標記版本號，方便日後維護
      await context.env.QU_ALBUM_DATA.put(id, buffer, { metadata: { zipped: true, version: "v2.0" } });
      
      return new Response(JSON.stringify({ status: "ok", id: id, type: "zipped", version: "v2.0" }), {
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
    } 
    // 處理一般 JSON (由 SYNC_MASTER.gs 傳送)
    else {
      const data = await context.request.json();
      const jsonId = data.sys?.id || id;
      
      await context.env.QU_ALBUM_DATA.put(jsonId, JSON.stringify(data), { metadata: { zipped: false, version: "v2.0" } });
      
      return new Response(JSON.stringify({ status: "ok", id: jsonId, type: "json", version: "v2.0" }), {
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
    }
  } catch (e) {
    return new Response(JSON.stringify({ error: "Cloudflare 儲存失敗", details: e.message }), { 
      status: 500, 
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } 
    });
  }
}
