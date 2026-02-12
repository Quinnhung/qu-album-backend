export async function onRequestPost(context) {
  try {
    const secret = context.request.headers.get("x-auth-secret");
    if (secret !== context.env.SYNC_SECRET) {
      return new Response("Unauthorized", { status: 401 });
    }
    
    const data = await context.request.json();
    const deployId = data.sys.id; 

    // 🔥 允許寫入 Master Index 或 一般 UUID
    if (!deployId) return new Response("Missing ID", { status: 400 });

    // 寫入 KV
    await context.env.QU_ALBUM_DATA.put(deployId, JSON.stringify(data));

    return new Response(JSON.stringify({ status: "ok", id: deployId }), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (err) {
    return new Response(err.message, { status: 500 });
  }
}
