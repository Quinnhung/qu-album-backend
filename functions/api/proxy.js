export async function onRequestGet(context) {
  const url = new URL(context.request.url).searchParams.get("url");

  if (!url) return new Response("Missing URL", { status: 400 });

  // 1. 抓取目標圖片 (Google Drive / lh3)
  const imageResponse = await fetch(url, {
    headers: {
      "User-Agent": "QuAlbum-Proxy/1.0"
    }
  });

  // 2. 重組回應，加上 CORS
  const newResponse = new Response(imageResponse.body, imageResponse);
  newResponse.headers.set("Access-Control-Allow-Origin", "*");
  
  // 如果是 Google Drive 連結，強制設定檔名 (解決下載變成無名檔案的問題)
  if (!newResponse.headers.get("Content-Disposition")) {
      newResponse.headers.set("Content-Disposition", 'attachment; filename="download.jpg"');
  }

  return newResponse;
}
