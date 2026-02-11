export async function onRequest(context) {
  // 1. 解析請求
  const reqUrl = new URL(context.request.url);
  const targetUrl = reqUrl.searchParams.get('url');

  if (!targetUrl) return new Response('Missing URL', { status: 400 });

  // 2. URL 格式檢查與安全驗證
  let targetObj;
  try {
    targetObj = new URL(targetUrl);
  } catch (e) {
    return new Response('Invalid URL format', { status: 400 });
  }

  // 🔥 安全防護：只允許 Google 網域
  const allowedDomains = ['googleusercontent.com', 'drive.google.com'];
  
  if (!allowedDomains.some(d => targetObj.hostname.endsWith(d))) {
    return new Response('Forbidden Domain', { status: 403 });
  }

  // 3. 抓取目標圖片 (修正點：這裡要 fetch targetUrl)
  try {
    const imageResponse = await fetch(targetUrl, {
      headers: {
        "User-Agent": "QuAlbum-Proxy/1.0"
      }
    });

    // 4. 重組回應，加上 CORS
    const newResponse = new Response(imageResponse.body, imageResponse);
    newResponse.headers.set("Access-Control-Allow-Origin", "*");
    
    // 如果是 Google Drive 連結，強制設定檔名 (解決下載變成無名檔案的問題)
    if (!newResponse.headers.get("Content-Disposition")) {
       newResponse.headers.set("Content-Disposition", 'attachment; filename="image.jpg"');
    }

    return newResponse;

  } catch (err) {
    return new Response('Error fetching image', { status: 502 });
  }
}
