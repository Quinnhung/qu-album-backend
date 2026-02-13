export async function onRequestPost(context) {
  try {
    const secret = context.request.headers.get("x-auth-secret");
    if (secret !== context.env.SYNC_SECRET) {
       return new Response("Unauthorized", { status: 401 });
    }

    const contentType = context.request.headers.get("Content-Type") || "";
    const id = context.request.headers.get("x-uuid");

    // 處理 GZIP 壓縮檔
    if (contentType.includes("application/gzip")) {
      if (!id) return new Response("Missing Deployment ID", { status: 400 });
      const buffer = await context.request.arrayBuffer();
      await context.env.QU_ALBUM_DATA.put(id, buffer, { metadata: { zipped: true } });
      return new Response(JSON.stringify({ status: "ok", id: id, type: "zipped" }), {
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
    } 
    // 處理一般 JSON
    else {
      const data = await context.request.json();
      const jsonId = data.sys?.id || id;
      if (!jsonId) return new Response("Missing Deployment ID", { status: 400 });
      await context.env.QU_ALBUM_DATA.put(jsonId, JSON.stringify(data), { metadata: { zipped: false } });
      return new Response(JSON.stringify({ status: "ok", id: jsonId, type: "json" }), {
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
    }
  } catch (e) {
    return new Response(JSON.stringify({ error: "Cloudflare 儲存失敗", details: e.message }), { status: 500, headers: { "Access-Control-Allow-Origin": "*" } });
  }
}
