/* 回家吧 — 離線支援：第一次連網開啟後，沒網路也能開啟並使用 */
const CACHE = "go-home-v1";
const CORE = ["./", "./index.html", "./firebase-config.js", "./manifest.json", "./icons/icon-192.png", "./icons/icon-512.png", "./apple-touch-icon.png", "./assets/Yozai-Regular.ttf"];
self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => Promise.all(CORE.map(u => c.add(u).catch(() => {})))));
  self.skipWaiting();
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
function put(req, res){ if(res && (res.status === 200 || res.type === "opaque")){ const cp = res.clone(); caches.open(CACHE).then(c => c.put(req, cp)); } return res; }
self.addEventListener("fetch", e => {
  const req = e.request;
  if(req.method !== "GET") return;
  const u = new URL(req.url);
  // Firestore / Auth 的即時連線交給 Firebase 自己處理
  if(/googleapis\.com|firebaseio\.com|identitytoolkit|securetoken/.test(u.host) && !/gstatic/.test(u.host)) return;
  if(/jsdelivr|githubusercontent/.test(u.host)) return; // 假日資料由頁面自己快取
  if(u.origin === location.origin && !/\/assets\//.test(u.pathname)){
    // 自己的頁面：有網路就拿最新版，沒網路用存起來的
    e.respondWith(fetch(req).then(r => put(req, r)).catch(() => caches.match(req).then(m => m || caches.match("./index.html"))));
  } else {
    // 字型、Firebase 程式庫、假日資料：存過就直接用
    e.respondWith(caches.match(req).then(m => m || fetch(req).then(r => put(req, r))));
  }
});
