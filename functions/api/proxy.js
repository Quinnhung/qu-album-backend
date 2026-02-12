export async function onRequest(context) {
  const request = context.request;
  const url = new URL(request.url);
  const targetUrl = url.searchParams.get('url');

  // 1. 基本檢查
  if (!targetUrl) return new Response('Missing URL', { status: 400 });

  // 2. 網域白名單檢查
  let targetObj;
  try {
    targetObj = new URL(targetUrl);
  } catch (e) {
    return new Response('Invalid URL', { status: 400 });
  }

  const allowedDomains = ['googleusercontent.com', 'drive.google.com'];
  if (!allowedDomains.some(d => targetObj.hostname.endsWith(d))) {
    return new Response('Forbidden Domain', { status: 403 });
  }

  // 3. 準備轉發的 Headers (關鍵修改點)
  const headers = new Headers();
  headers.set("User-Agent", "QuAlbum-Proxy/1.0");

  // 🔥 關鍵優化：轉發 'Range' 標頭
  // 如果瀏覽器要求 "bytes=0-100"，我們就如實轉達給 Google
  const range = request.headers.get("Range");
  if (range) {
    headers.set("Range", range);
  }

  try {
    // 4. 發送請求給 Google
    const response = await fetch(targetUrl, {
      method: "GET",
      headers: headers
    });

    // 5. 重組回應 (保留 Google 回傳的 206 Partial Content 狀態)
    const newHeaders = new Headers(response.headers);
    newHeaders.set("Access-Control-Allow-Origin", "*");
    newHeaders.set("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
    
    // 修正：不要強制設為 image.jpg，這會讓影片下載時檔名錯誤
    // 我們嘗試從 Content-Type 猜測，或是直接保留 Google 的設定
    if (!newHeaders.has("Content-Disposition")) {
       // 如果是影片，不要強制設為附件，讓瀏覽器可以直接播放
       const contentType = newHeaders.get("Content-Type") || "";
       if (!contentType.startsWith("video/")) {
           newHeaders.set("Content-Disposition", 'inline'); 
       }
    }

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: newHeaders
    });

  } catch (err) {
    return new Response('Error fetching resource: ' + err.message, { status: 502 });
  }
}
