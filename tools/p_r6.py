#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""R6 第一阶段补丁器：dry-run 默认，--apply 才写盘。
每项替换断言命中次数，不命中即报红退出（沿用 p_r5.py 模式）。
用法：python p_r6.py [--apply]
"""
import os
import re
import sys
import shutil
import io

from PIL import Image

W = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
APPLY = "--apply" in sys.argv
BAK = os.path.join(os.path.dirname(W), "r6_backup")

PAGES = ["index.html", "blog.html", "404.html",
         "posts/handwritten-html.html", "posts/three-habits.html"]

errors = []
log = []


def rd(fn):
    with open(os.path.join(W, fn), "r", encoding="utf-8", newline="") as f:
        return f.read()


def backup(fn):
    dst = os.path.join(BAK, fn.replace("/", "__"))
    if not os.path.exists(dst):
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        shutil.copy2(os.path.join(W, fn), dst)


def wr(fn, txt):
    if not APPLY:
        return
    backup(fn)
    with open(os.path.join(W, fn), "w", encoding="utf-8", newline="") as f:
        f.write(txt)


def op(name, fn, old, new, expect, use_regex=False):
    """单文件字符串替换，断言命中次数。"""
    txt = rd(fn)
    if use_regex:
        n = len(re.findall(old, txt))
        out = re.sub(old, new, txt)
    else:
        n = txt.count(old)
        out = txt.replace(old, new)
    if n != expect:
        errors.append("[%s] %s: 命中 %d 次，预期 %d 次" % (fn, name, n, expect))
        log.append("  FAIL  %-28s %-34s %d/%d" % (fn, name, n, expect))
        return
    wr(fn, out)
    log.append("  OK    %-28s %-34s %d" % (fn, name, n))


# ---------------- 1. 去掉 i18n-boot 的 body 隐藏 ----------------
for p in PAGES:
    op("A1 移除 i18n-boot 隐藏 body", p,
       "html.i18n-boot body{visibility:hidden}",
       "/* R6: 不再隐藏 body —— 语言包慢或失败时首屏直接可见，不再白屏 */",
       1)

# ---------------- 2. 1200ms 兜底 -> 300ms ----------------
for p in PAGES:
    op("A1 兜底 1200ms -> 300ms", p,
       'de.className.replace(/\\s*i18n-boot/g,"");},1200);',
       'de.className.replace(/\\s*i18n-boot/g,"");},300);',
       1)

# ---------------- 3. 焦点环硬编码 -> var(--acc1) ----------------
for p in PAGES:
    op("D1 焦点环 rgba -> var(--acc1)", p,
       "rgba(120,170,255,.85)", "var(--acc1)", 3)

# ---------------- 4. 锚点滚动偏移 ----------------
for p in PAGES:
    op("D2 :target 滚动偏移", p,
       "html.i18n-boot{background:#05060e}",
       ":target,[id]{scroll-margin-top:96px}\nhtml.i18n-boot{background:#05060e}",
       1)

# ---------------- 5. og-cover.png -> og-cover.jpg ----------------
for p in PAGES:
    exp = 4 if p.startswith("posts/") else 2
    op("B4 og-cover 引用改 jpg", p,
       "https://wang-sunyang.github.io/og-cover.png",
       "https://wang-sunyang.github.io/og-cover.jpg",
       exp)

# ---------------- 6. favicon WebP link ----------------
PNG_LINK = '<link rel="icon" type="image/png" sizes="512x512" href="https://wang-sunyang.github.io/favicon-512.png">'
WEBP_LINK = '\n<link rel="icon" type="image/webp" sizes="512x512" href="https://wang-sunyang.github.io/favicon-512.webp">'
for p in PAGES:
    op("B4 新增 favicon webp link", p, PNG_LINK, PNG_LINK + WEBP_LINK, 1)

# ---------------- 7. sw.js ----------------
op("B6 VERSION 升版", "sw.js", 'var VERSION = "v20261126";', 'var VERSION = "v20261127";', 1)
op("B6 注入 navTimeout", "sw.js",
   'self.addEventListener("fetch", function (e) {',
   '/* R6: 导航竞速 —— 3 秒内拿不到响应即回退缓存，避免弱网长时间白屏 */\n'
   'function navTimeout(ms) {\n'
   '  return new Promise(function (_, reject) {\n'
   '    setTimeout(function () { reject(new Error("nav-timeout")); }, ms);\n'
   '  });\n'
   '}\n\n'
   'self.addEventListener("fetch", function (e) {',
   1)
op("B6 导航分支加 3s 竞速", "sw.js",
   '  if (req.mode === "navigate") {\n    e.respondWith(\n      fetch(req).then(function (res) {',
   '  if (req.mode === "navigate") {\n    e.respondWith(\n      Promise.race([fetch(req), navTimeout(3000)]).then(function (res) {',
   1)

# ---------------- 8. verify_b.js 同步 ----------------
op("V1 JSON-LD 断言改 jpg", "tools/verify_b.js",
   r'og-cover\.png","width":1200', r'og-cover\.jpg","width":1200', 1)

old_caps = ("const caps = { 'og-cover.png': 150000, 'favicon-512.png': 80000, "
            "'apple-touch-icon.png': 20000, 'favicon-maskable-512.png': 60000, "
            "'favicon-192.png': 19000, 'favicon-maskable-192.png': 16000 };")
new_caps = ("const caps = { 'og-cover.jpg': 75000, 'favicon-512.png': 72000, "
            "'apple-touch-icon.png': 18000, 'favicon-maskable-512.png': 60000, "
            "'favicon-192.png': 17500, 'favicon-maskable-192.png': 16000, "
            "'favicon-512.webp': 9000, 'favicon-192.webp': 4000, "
            "'apple-touch-icon.webp': 3500 };")
op("V1 图片体积护栏更新", "tools/verify_b.js", old_caps, new_caps, 1)

# ---------------- 9. 图片转码（内存试算，apply 才写盘） ----------------
def img_ops():
    def enc_png(im):
        b = io.BytesIO()
        im.save(b, "PNG", optimize=True)
        return b.getvalue()

    def enc_webp(im, q=82):
        b = io.BytesIO()
        im.save(b, "WEBP", quality=q, method=6)
        return b.getvalue()

    src = os.path.join(W, "og-cover.png")
    im = Image.open(src).convert("RGB")
    b = io.BytesIO()
    im.save(b, "JPEG", quality=82, optimize=True, progressive=True)
    jpg = b.getvalue()
    if len(jpg) >= os.path.getsize(src):
        errors.append("[og-cover.jpg] 转码后反而更大，应回滚")
        log.append("  FAIL  og-cover.jpg 转码后 %d 字节 >= PNG" % len(jpg))
    else:
        if APPLY:
            backup("og-cover.png")
            with open(os.path.join(W, "og-cover.jpg"), "wb") as f:
                f.write(jpg)
        log.append("  OK    og-cover.jpg  %d -> %d bytes" % (os.path.getsize(src), len(jpg)))

    # favicon PNG 量化
    for name, colors in [("favicon-512.png", 256), ("favicon-192.png", 256),
                         ("apple-touch-icon.png", 256)]:
        p = os.path.join(W, name)
        orig = os.path.getsize(p)
        im = Image.open(p).convert("RGBA")
        out = enc_png(im.quantize(colors=colors, method=Image.FASTOCTREE))
        if len(out) >= orig:
            log.append("  SKIP  %-20s 量化后 %d >= %d，保留原图" % (name, len(out), orig))
            continue
        if APPLY:
            backup(name)
            with open(p, "wb") as f:
                f.write(out)
        log.append("  OK    %-20s %d -> %d bytes" % (name, orig, len(out)))

    # WebP 派生
    for src_name, dst_name in [("favicon-512.png", "favicon-512.webp"),
                               ("favicon-192.png", "favicon-192.webp"),
                               ("apple-touch-icon.png", "apple-touch-icon.webp")]:
        srcp = os.path.join(W, src_name)
        if not os.path.exists(srcp):
            continue
        ref = os.path.getsize(srcp)
        im = Image.open(os.path.join(W, src_name.split(".")[0] + ".png")).convert("RGBA")
        out = enc_webp(im)
        if APPLY:
            with open(os.path.join(W, dst_name), "wb") as f:
                f.write(out)
        log.append("  OK    %-22s %d bytes (src png %d)" % (dst_name, len(out), ref))


img_ops()

# ---------------- 输出 ----------------
print("\n".join(log))
if errors:
    print("\n===== 失败 %d 项 =====" % len(errors))
    for e in errors:
        print("  ! " + e)
    sys.exit(1)
print("\n全部 %d 项命中符合预期（%s）" % (len(log), "已写盘" if APPLY else "dry-run 未写盘"))
