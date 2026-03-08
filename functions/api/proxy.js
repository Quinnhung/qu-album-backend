/**
 * ------------------------------------------------------------------
 * 📸 Qu相簿 - 影音串流代理 API (proxy.js)
 * ------------------------------------------------------------------
 * * 版本：v2.0 (輕量快取版)
 * * 說明：
 * 1. 解決 Google Drive 檔案直連的 CORS 跨域問題。
 * 2. 支援 HTTP Range Requests，確保影片可秒開與任意拖拉進度。
 * 3. 處理 OPTIONS 預檢請求，加速播放器初始化。
 * 4. 強制替換 attachment 為 inline，避免觸發實體下載。
 * ------------------------------------------------------------------
 */

export async function onRequest(context) {
  const request = context.request;

  // --- 1. 處理 CORS 預檢請求 (OPTIONS) ---
  // 瀏覽器對於帶有 Range 的請求會先發出 OPTIONS 進行跨域確認
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
        "Access-Control-Allow-Headers": "Range, Content-Type",
        "Access-Control-Max-Age": "86400"
      }
    });
  }

  const url = new URL(request.url);
  const targetUrl = url.searchParams.get('url');

  // --- 2. 基本檢查與網域白名單 ---
  if (!targetUrl) return new Response('Missing URL', { status: 400 });

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

  // --- 3. 準備轉發的 Headers ---
  const headers = new Headers();
  headers.set("User-Agent", "QuAlbum-Proxy/2.0");

  // 關鍵：將前端要求播放到哪裡的 Range 轉發給 Google
  const range = request.headers.get("Range");
  if (range) {
    headers.set("Range", range);
  }

  try {
    // --- 4. 發送請求給 Google ---
    const response = await fetch(targetUrl, {
      method: request.method, // 支援 GET 與 HEAD
      headers: headers
    });

    // --- 5. 重組回應 Headers ---
    const newHeaders = new Headers(response.headers);
    newHeaders.set("Access-Control-Allow-Origin", "*");
    newHeaders.set("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
    
    // 🔥 關鍵修正 1：暴露串流標頭，確保播放器能讀取影片總長度，才能拖拉進度條
    newHeaders.set("Access-Control-Expose-Headers", "Content-Length, Content-Range, Accept-Ranges");

    // 🔥 關鍵修正 2：攔截 Google 的 attachment 設定，強制改為 inline 讓影片能在網頁內播放
    const disposition = newHeaders.get("Content-Disposition");
    if (disposition && disposition.includes("attachment")) {
        newHeaders.set("Content-Disposition", disposition.replace("attachment", "inline"));
    } else if (!disposition) {
        newHeaders.set("Content-Disposition", "inline");
    }

    // --- 6. 回傳資料 ---
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: newHeaders
    });

  } catch (err) {
    return new Response('Error fetching resource: ' + err.message, { status: 502 });
  }
}
