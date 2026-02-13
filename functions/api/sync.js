export async function onRequest(context) {
  const request = context.request;
  const url = new URL(request.url);

  // ==========================================
  // 🟢 GET: 讀取資料給前端 (Vue.js)
  // ==========================================
  if (request.method === "GET") {
    const id = url.searchParams.get("id");
    if (!id) return new Response("Missing ID", { status: 400 });

    // 🔥 關鍵：使用 getWithMetadata 讀取二進位串流與中繼資料
    const { value, metadata } = await context.env.KV.getWithMetadata(id, "stream");
    if (!value) return new Response("Not found", { status: 404 });

    const headers = new Headers();
    headers.set("Access-Control-Allow-Origin", "*");
    headers.set("Content-Type", "application/json");

    // 若 metadata 標記為 zipped，告訴瀏覽器這包二進位檔是 gzip，瀏覽器會「自動解壓縮」變成 JSON
    if (metadata && metadata.zipped) {
      headers.set("Content-Encoding", "gzip");
    }

    return new Response(value, { headers });
  }

  // ==========================================
  // 🔵 POST: 接收 GAS 同步資料
  // ==========================================
  if (request.method === "POST") {
    // 1. 驗證金鑰
    const secret = request.headers.get("x-auth-secret");
    // 假設您環境變數有設 KV_SECRET，這裡進行比對 (請依您原本的寫法微調)
    if (secret !== context.env.KV_SECRET) {
       return new Response("Unauthorized", { status: 401 });
    }

    const contentType = request.headers.get("Content-Type") || "";

    // 🔥 情況 A：接收壓縮後的二進位流 (來自 SYNC.gs)
    if (contentType.includes("application/gzip")) {
      const id = request.headers.get("x-uuid");
      const buffer = await request.arrayBuffer(); // 讀取為二進位
      
      // 存入 KV，並加上 metadata 標籤
      await context.env.KV.put(id, buffer, { metadata: { zipped: true } });
      return new Response("Zipped Sync OK");
    } 
    // 情況 B：接收一般 JSON (來自 SYNC_MASTER.gs IT總表)
    else {
      const data = await request.json();
      const id = data.sys.id;
      
      await context.env.KV.put(id, JSON.stringify(data), { metadata: { zipped: false } });
      return new Response("JSON Sync OK");
    }
  }

  return new Response("Method Not Allowed", { status: 405 });
}
