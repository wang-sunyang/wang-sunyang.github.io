#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""R6 收尾补丁器：修正 posts 页焦点环变量名 + 同步 verify_b.js 断言。
dry-run 默认，--apply 写盘。
"""
import os
import sys
import shutil

W = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
APPLY = "--apply" in sys.argv
BAK = os.path.join(os.path.dirname(W), "r6_backup")

errors = []
log = []


def rd(fn):
    with open(os.path.join(W, fn), "r", encoding="utf-8", newline="") as f:
        return f.read()


def wr(fn, txt):
    if not APPLY:
        return
    dst = os.path.join(BAK, fn.replace("/", "__"))
    if not os.path.exists(dst):
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        shutil.copy2(os.path.join(W, fn), dst)
    with open(os.path.join(W, fn), "w", encoding="utf-8", newline="") as f:
        f.write(txt)


def op(name, fn, old, new, expect):
    txt = rd(fn)
    n = txt.count(old)
    if n != expect:
        errors.append("[%s] %s: 命中 %d 次，预期 %d 次" % (fn, name, n, expect))
        log.append("  FAIL  %-28s %-34s %d/%d" % (fn, name, n, expect))
        return
    wr(fn, txt.replace(old, new))
    log.append("  OK    %-28s %-34s %d" % (fn, name, n))


# 1. posts 页变量体系是 --accent，不是 --acc1
for p in ["posts/handwritten-html.html", "posts/three-habits.html"]:
    op("D1 焦点环变量名对齐 --accent", p,
       "outline:2px solid var(--acc1)", "outline:2px solid var(--accent)", 3)

# 2. verify_b.js 兜底断言同步 + 反向护栏
op("V2 兜底断言 1200 -> 300", "tools/verify_b.js",
   "chk(f, 'i18n 兜底 ≤1200ms', /},1200\\);/.test(h) && !/},4000\\);/.test(h), '');",
   "chk(f, 'i18n 兜底 ≤300ms', /},300\\);/.test(h) && !/},1200\\);/.test(h), '');",
   1)

op("V2 版本基线升版", "tools/verify_b.js", "const V = '20261126';", "const V = '20261127';", 1)

# 3. 追加 R6 断言块
R6_BLOCK = r'''/* ---------- R6 首屏可见性与资源收敛 ---------- */
{
  const P6 = ['index.html', 'blog.html', '404.html', 'posts/handwritten-html.html', 'posts/three-habits.html'];
  for (const f of P6) {
    const h = fs.readFileSync(path.join(W, f), 'utf8');
    chk(f, 'R6 不再隐藏 body', !/html\.i18n-boot body\{visibility:hidden\}/.test(h), '');
    chk(f, 'R6 焦点环无硬编码色', !/rgba\(120,170,255,\.85\)/.test(h), '');
    chk(f, 'R6 锚点滚动偏移', h.includes(':target,[id]{scroll-margin-top:96px}'), '');
    chk(f, 'R6 分享图指向 jpg', !/og-cover\.png/.test(h), '');
    chk(f, 'R6 favicon 提供 webp', h.includes('favicon-512.webp'), '');
  }
  const s6 = fs.readFileSync(path.join(W, 'sw.js'), 'utf8');
  chk('sw.js', 'R6 导航 3s 竞速超时', /function navTimeout\(/.test(s6) && s6.includes('navTimeout(3000)'), '');
  chk('sw.js', 'R6 版本号已升版', s6.includes('"v20261127"'), '');
  chk('og-cover.jpg', 'R6 分享图已转 JPEG', fs.existsSync(path.join(W, 'og-cover.jpg')), '');
  for (const p of ['favicon-512.webp', 'favicon-192.webp', 'apple-touch-icon.webp']) {
    chk(p, 'R6 WebP 派生存在', fs.existsSync(path.join(W, p)), '');
  }
}

/* ---------- 输出 ---------- */'''

op("V2 追加 R6 断言块", "tools/verify_b.js", "/* ---------- 输出 ---------- */", R6_BLOCK, 1)

print("\n".join(log))
if errors:
    print("\n===== 失败 %d 项 =====" % len(errors))
    for e in errors:
        print("  ! " + e)
    sys.exit(1)
print("\n全部 %d 项命中符合预期（%s）" % (len(log), "已写盘" if APPLY else "dry-run 未写盘"))
