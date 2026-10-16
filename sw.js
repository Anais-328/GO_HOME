/* 回家吧 — 離線支援：第一次連網開啟後，沒網路也能開啟並使用 */
const CACHE = "go-home-v1";
const CORE = ["./", "./index.html", "./firebase-config.js", "./manifest.json", "./icons/icon-192.png", "./icons/icon-512.png", "./apple-touch-icon.png", "./assets/Yozai-Regular.ttf"];
// 貼紙圖片：安裝時一次存好，沒網路也看得到
const STICKERS = ["car", "bus", "tram", "plane", "ship", "bike", "scooter", "taxi", "train", "map", "pin", "suitcase", "camera", "passport", "tickets", "ticket", "calendar", "clock", "coffee", "boba", "juice", "cake", "ramen", "rice", "cutlery", "pizza", "burger", "pin-heart", "music", "headphones", "book", "laptop", "cat", "night", "sprout", "bolt", "flower", "smile", "heart", "star", "rainbow", "sun", "party", "sparkles", "paws", "clover", "tulip-pink", "cloud", "moon", "bow", "umbrella", "tulip", "flower-orange", "cherry", "dolphin", "bear", "bunny", "planet", "butterfly", "snowflake", "mushroom", "soda", "star-blue", "heart-pink", "lavender"].map(n => "./assets/stickers/" + n + ".png");
// Firebase 程式庫（登入＋資料庫）：沒存好的話，斷網時整個雲端功能會載不進來，所以安裝時就先存
const FIREBASE_LIBS = ["app", "auth", "firestore"].map(n => "https://www.gstatic.com/firebasejs/10.12.2/firebase-" + n + "-compat.js");
self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => Promise.all(
    CORE.concat(STICKERS).map(u => c.add(u).catch(() => {}))
      .concat(FIREBASE_LIBS.map(u => c.match(u).then(m => m || fetch(u, { mode: "no-cors" }).then(r => c.put(u, r))).catch(() => {})))
  )));
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
    // 網路慢或半斷不斷時不要乾等：4 秒沒回應就先用存起來的
    const fromCache = () => caches.match(req).then(m => m || caches.match("./index.html"));
    e.respondWith(new Promise(resolve => {
      let done = false;
      const timer = setTimeout(() => { if(!done) fromCache().then(m => { if(m && !done){ done = true; resolve(m); } }); }, 4000);
      fetch(req).then(r => { if(done) return put(req, r); done = true; clearTimeout(timer); resolve(put(req, r)); })
        .catch(() => { if(done) return; clearTimeout(timer); fromCache().then(m => { done = true; resolve(m || Response.error()); }); });
    }));
  } else {
    // 字型、Firebase 程式庫、假日資料：存過就直接用
    e.respondWith(caches.match(req).then(m => m || fetch(req).then(r => put(req, r))));
  }
});
