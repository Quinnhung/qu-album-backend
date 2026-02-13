export async function onRequest(context) {
  const request = context.request;
  const url = new URL(request.url);

  // ==========================================
  // 🟢 GET: 讀取資料給前端 (Vue.js)
  // ==========================================
  if (request.method === "GET") {
    const id = url.searchParams.get("id");
    if (!id) return new Response("Missing ID", { status: 400 });

    // 讀取資料為二進位陣列 (arrayBuffer)，方便我們進行精準偵測
    const { value, metadata } = await context.env.QU_ALBUM_DATA.getWithMetadata(id, "arrayBuffer");
    if (!value) return new Response("Not found", { status: 404 });

    const headers = new Headers();
    headers.set("Access-Control-Allow-Origin", "*");
    headers.set("Content-Type", "application/json");
    
    // 🔥 加入防快取標頭，強迫瀏覽器每次都抓最新解壓縮的資料
    headers.set("Cache-Control", "no-cache, no-store, must-revalidate");

    // 🔥 終極偵測：不只看 metadata，直接檢查檔案的「特徵碼 (Magic Bytes)」
    // GZIP 檔案的開頭永遠是 0x1F 和 0x8B
    const bytes = new Uint8Array(value);
    const isZipped = (metadata && metadata.zipped) || (bytes[0] === 0x1F && bytes[1] === 0x8B);

    if (isZipped) {
      // 確認是壓縮檔，轉換為 Stream 並強制解壓縮
      const response = new Response(value);
      const decompressedStream = response.body.pipeThrough(new DecompressionStream("gzip"));
      return new Response(decompressedStream, { headers });
    }

    // 如果是一般 JSON (如 IT總表)，直接回傳
    return new Response(value, { headers });
  }

  // ==========================================
  // 🔵 POST: 接收 GAS 同步資料
  // ==========================================
  if (request.method === "POST") {
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
      await context.env.QU_ALBUM_DATA.put(id, buffer, { metadata: { zipped: true } });
      
      return new Response(JSON.stringify({ status: "ok", id: id, type: "zipped" }), {
        headers: { "Content-Type": "application/json" }
      });
    } 
    // 情況 B：接收一般 JSON (來自 SYNC_MASTER.gs IT總表)
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
