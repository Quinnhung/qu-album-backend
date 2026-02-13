export async function onRequestGet(context) {
  const id = new URL(context.request.url).searchParams.get("id");
  if (!id) return new Response("Missing ID", { status: 400 });

  try {
    // 讀取二進位資料
    const { value, metadata } = await context.env.QU_ALBUM_DATA.getWithMetadata(id, "arrayBuffer");
    if (!value) return new Response(JSON.stringify({ error: "Not found" }), { status: 404 });

    const headers = new Headers();
    headers.set("Access-Control-Allow-Origin", "*");
    headers.set("Content-Type", "application/json; charset=utf-8");
    headers.set("Cache-Control", "no-cache, no-store, must-revalidate");

    const bytes = new Uint8Array(value);
    // 判斷是否為 GZIP 壓縮檔 (特徵碼 1F 8B)
    const isZipped = (metadata && metadata.zipped) || (bytes.length > 1 && bytes[0] === 0x1F && bytes[1] === 0x8B);

    if (isZipped) {
      // 🔥 在 Cloudflare 解壓縮，將乾淨的純文字交給瀏覽器
      const decompressedStream = new Response(value).body.pipeThrough(new DecompressionStream("gzip"));
      const jsonText = await new Response(decompressedStream).text();
      return new Response(jsonText, { headers });
    } else {
      return new Response(value, { headers });
    }
  } catch (e) {
    return new Response(JSON.stringify({ error: "Cloudflare 解壓縮失敗", details: e.message }), { status: 500, headers: { "Access-Control-Allow-Origin": "*" } });
  }
}
