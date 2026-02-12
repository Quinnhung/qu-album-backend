export async function onRequestPost(context) {
  try {
    // 1. 安全驗證 (檢查 Sync Secret)
    const secret = context.request.headers.get("x-auth-secret");
    if (secret !== context.env.SYNC_SECRET) {
      return new Response("Unauthorized", { status: 401 });
    }

    // 2. 解析資料
    const data = await context.request.json();
    const deployId = data.sys?.id; // 可能是 UUID 或 '_MASTER_INDEX'

    if (!deployId) {
      return new Response("Missing Deployment ID", { status: 400 });
    }

    // 3. 寫入 KV 資料庫
    // 請確認 Cloudflare 後台已綁定 KV Namespace 為 "QU_ALBUM_DATA"
    await context.env.QU_ALBUM_DATA.put(deployId, JSON.stringify(data));

    // 4. 回傳成功
    return new Response(JSON.stringify({ status: "ok", id: deployId }), {
      headers: { "Content-Type": "application/json" }
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
