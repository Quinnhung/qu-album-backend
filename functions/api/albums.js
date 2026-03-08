/**
 * ------------------------------------------------------------------
 * 📸 Qu相簿 - Cloudflare 讀取與解壓縮 API (albums.js)
 * ------------------------------------------------------------------
 * * 版本：v2.0 (輕量快取版)
 * * 說明：
 * 1. 根據 ID 從 Cloudflare KV 讀取相簿資料。
 * 2. 自動偵測是否為 GZIP 壓縮檔 (Metadata 或二進位特徵碼)。
 * 3. 透過 Edge 節點的 DecompressionStream 即時解壓縮，降低前端負擔。
 * ------------------------------------------------------------------
 */

export async function onRequestGet(context) {
  // 統一定義標準回傳標頭
  const defaultHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Content-Type": "application/json; charset=utf-8"
  };

  const id = new URL(context.request.url).searchParams.get("id");
  if (!id) {
    return new Response(JSON.stringify({ error: "Missing ID" }), { 
      status: 400, 
      headers: defaultHeaders 
    });
  }

  try {
    // 讀取二進位資料與 metadata
    const { value, metadata } = await context.env.QU_ALBUM_DATA.getWithMetadata(id, "arrayBuffer");
    
    if (!value) {
      return new Response(JSON.stringify({ error: "Not found" }), { 
        status: 404, 
        headers: defaultHeaders 
      });
    }

    const headers = new Headers(defaultHeaders);
    headers.set("Cache-Control", "no-cache, no-store, must-revalidate");

    const bytes = new Uint8Array(value);
    // 判斷是否為 GZIP 壓縮檔 (依賴 metadata 標記 或 特徵碼 1F 8B)
    const isZipped = (metadata && metadata.zipped) || (bytes.length > 1 && bytes[0] === 0x1F && bytes[1] === 0x8B);

    if (isZipped) {
      // 🔥 在 Cloudflare 邊緣節點即時解壓縮，將乾淨的 JSON 拋給前端瀏覽器
      const decompressedStream = new Response(value).body.pipeThrough(new DecompressionStream("gzip"));
      const jsonText = await new Response(decompressedStream).text();
      return new Response(jsonText, { headers });
    } else {
      // 一般 JSON (如 IT 總表) 直接回傳
      return new Response(value, { headers });
    }
  } catch (e) {
    return new Response(JSON.stringify({ error: "Cloudflare 解壓縮或讀取失敗", details: e.message }), { 
      status: 500, 
      headers: defaultHeaders 
    });
  }
}
