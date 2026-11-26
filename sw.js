/* wang-sunyang.github.io —— 最小 Service Worker（R5）
 * 设计取舍：
 *   1. HTML 导航用 network-first —— 站点靠 GitHub Pages 发布，宁可多走一次网络也不让用户看到旧页面；
 *   2. i18n 语言包用 stale-while-revalidate —— 27 个外部语言包不常变，二次访问零等待；
 *   3. 图片/字体/图标 cache-first —— 内容寻址式静态资源，命中即返回；
 *   4. 离线兜底回退到已缓存的首页或 404 页，不做伪造响应。
 * 所有 cache.add 逐个 catch，单个 404 不会让整次 install 失败。
 */
var VERSION = "v20261127";
var CORE = "wsy-core-" + VERSION;
var RUNTIME = "wsy-rt-" + VERSION;

var PRECACHE = [
  "./",
  "./index.html",
  "./blog.html",
  "./404.html",
  "./posts/handwritten-html.html",
  "./posts/site-r6-optimization.html",
  "./posts/three-habits.html",
  "./assets/post.css",
  "./en/",
  "./en/index.html",
  "./site.webmanifest",
  "./favicon-512.png",
  "./apple-touch-icon.png"
];

var CACHE_FIRST_EXT = /\.(?:png|jpe?g|webp|avif|gif|svg|ico|woff2?|ttf|css)$/i;

self.addEventListener("install", function (e) {
  e.waitUntil(
    caches.open(CORE).then(function (c) {
      return Promise.all(PRECACHE.map(function (u) {
        return c.add(u).catch(function () { /* 单个资源缺失不影响安装 */ });
      }));
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) {
        if (k !== CORE && k !== RUNTIME) return caches.delete(k);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

/* stale-while-revalidate：先给缓存，后台静默更新 */
function swr(req, cacheName) {
  return caches.open(cacheName).then(function (c) {
    return c.match(req).then(function (hit) {
      var net = fetch(req).then(function (res) {
        if (res && res.ok) c.put(req, res.clone());
        return res;
      }).catch(function () { return hit; });
      return hit || net;
    });
  });
}

/* cache-first：命中即返回，未命中走网络并回填 */
function cacheFirst(req, cacheName) {
  return caches.open(cacheName).then(function (c) {
    return c.match(req).then(function (hit) {
      return hit || fetch(req).then(function (res) {
        if (res && res.ok) c.put(req, res.clone());
        return res;
      });
    });
  });
}

/* R6: 导航竞速 —— 3 秒内拿不到响应即回退缓存，避免弱网长时间白屏 */
function navTimeout(ms) {
  return new Promise(function (_, reject) {
    setTimeout(function () { reject(new Error("nav-timeout")); }, ms);
  });
}

self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET") return;

  var url;
  try { url = new URL(req.url); } catch (err) { return; }
  if (url.origin !== self.location.origin) return;

  /* 1. 页面导航：network-first，失败回退缓存 */
  if (req.mode === "navigate") {
    e.respondWith(
      Promise.race([fetch(req), navTimeout(3000)]).then(function (res) {
        if (res && res.ok) {
          var copy = res.clone();
          caches.open(RUNTIME).then(function (c) { c.put(req, copy); });
        }
        return res;
      }).catch(function () {
        return caches.match(req).then(function (hit) {
          if (hit) return hit;
          return caches.match("./index.html").then(function (home) {
            return home || caches.match("./404.html");
          });
        });
      })
    );
    return;
  }

  /* 2. 语言包：stale-while-revalidate */
  if (url.pathname.indexOf("/i18n/") !== -1) {
    e.respondWith(swr(req, RUNTIME));
    return;
  }

  /* 3. 图片/字体/图标：cache-first */
  if (CACHE_FIRST_EXT.test(url.pathname)) {
    e.respondWith(cacheFirst(req, RUNTIME));
  }
});
