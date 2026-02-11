export async function onRequest(context) {
  const url = new URL(context.request.url);
  const targetUrl = url.searchParams.get('url');

  if (!targetUrl) return new Response('Missing URL', { status: 400 });

  // 🔥 安全防護：只允許 Google 網域
  const allowedDomains = ['googleusercontent.com', 'drive.google.com'];
  const targetObj = new URL(targetUrl);
  
  if (!allowedDomains.some(d => targetObj.hostname.endsWith(d))) {
    return new Response('Forbidden Domain', { status: 403 });
  }

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
