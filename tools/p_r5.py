#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""R5 优化补丁器：dry-run 默认，--apply 才写盘。
每项替换都断言命中次数，未命中即报红退出（漏改不静默）。"""
import os, sys, re, json

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
APPLY = "--apply" in sys.argv
PAGES = ["index.html", "blog.html", "404.html",
         "posts/handwritten-html.html", "posts/three-habits.html"]
STAMP = "20261126"

# ---------- 1. lang-list 容器：radiogroup ----------
OLD_LIST = '<div class="lang-list" id="langList"></div>'
NEW_LIST = ('<div class="lang-list" id="langList" role="radiogroup" '
            'data-i18n-aria="a11y.langPanel"></div>')

# ---------- 2. 语言按钮生成：role=radio + aria-checked ----------
OLD_GEN = "html+='<button type=\"button\" data-lang=\"'+l.code+'"
NEW_GEN = "html+='<button type=\"button\" role=\"radio\" aria-checked=\"false\" data-lang=\"'+l.code+'"

# ---------- 3. 选中态同步 aria-checked ----------
OLD_ACTIVE = 'b.classList.toggle("active",b.getAttribute("data-lang")===code);'
NEW_ACTIVE = ('var __on=(b.getAttribute("data-lang")===code);b.classList.toggle("active",__on);'
              'b.setAttribute("aria-checked",__on?"true":"false");')

# ---------- 4. mobileMenu 语义 ----------
OLD_MENU_BTN = 'aria-haspopup="menu"'
NEW_MENU_BTN = 'aria-haspopup="dialog"'
OLD_MENU_ASIDE = '<aside class="mobile-menu" id="mobileMenu"'
NEW_MENU_ASIDE = '<aside class="mobile-menu" id="mobileMenu" role="dialog" aria-modal="true"'

# ---------- 5. 语言包版本参数 ----------
OLD_SRC = 's.src=I18N_EXT_BASE+code+".js";s.async=true;'
NEW_SRC = 's.src=I18N_EXT_BASE+code+".js?v=' + STAMP + '";s.async=true;'

# ---------- 6. forced-colors 兜底 ----------
FORCE_CSS = '''/* R5: forced-colors 兜底 —— 强制配色下毛玻璃/半透明失效，改用系统色保边界与选中态 */
@media (forced-colors: active){
  .site-nav,.mobile-menu,.menu-overlay,#langPanel .lang-card,#kbdPanel .kbd-card,.card,.proj,.post-card{backdrop-filter:none!important;-webkit-backdrop-filter:none!important}
  .site-nav,.mobile-menu,.card,.proj,.post-card{border-color:CanvasText}
  .lang-list button[aria-checked="true"]{outline:2px solid Highlight;outline-offset:-2px;forced-color-adjust:none}
}
'''

# ---------- 7. og/twitter 同步函数 ----------
SYNC_OG = r'''/* R5: og/twitter 元信息随语言同步（复用既有 meta.title / 页面描述键，不新增翻译键） */
var __OG_LOCALE={"zh":"zh_CN","zh-TW":"zh_TW","en":"en_US","ja":"ja_JP","ko":"ko_KR","fr":"fr_FR","de":"de_DE","es":"es_ES","pt":"pt_BR","it":"it_IT","ru":"ru_RU","uk":"uk_UA","pl":"pl_PL","nl":"nl_NL","tr":"tr_TR","ar":"ar_AR","hi":"hi_IN","id":"id_ID","vi":"vi_VN","th":"th_TH","el":"el_GR","sv":"sv_SE","cs":"cs_CZ","ro":"ro_RO","bn":"bn_BD","ur":"ur_PK","ms":"ms_MY","tl":"tl_PH","he":"he_IL","fa":"fa_IR"};
function __syncOG(code,lang,title,desc){
  function __set(sel,val){var el=document.querySelector(sel);if(el&&val!=null&&val!=="")el.setAttribute("content",val);}
  if(title){__set('meta[property="og:title"]',title);__set('meta[name="twitter:title"]',title);}
  if(desc){var __d=String(desc).replace(/<[^>]*>/g,"").replace(/\s+/g," ").trim();__set('meta[property="og:description"]',__d);__set('meta[name="twitter:description"]',__d);__set('meta[name="description"]',__d);}
  __set('meta[property="og:locale"]',__OG_LOCALE[code]||String(code).replace("-","_"));
}
var I18N_EXT_BASE='''

# ---------- 8. SW 注册 ----------
def sw_reg(path):
    return ('<script>/* R5: PWA 离线兜底，与 site.webmanifest 能力声明对齐 */\n'
            'if("serviceWorker" in navigator)window.addEventListener("load",function(){'
            'navigator.serviceWorker.register("%s").catch(function(e){console.warn("[silent-catch]",e);});});</script>\n'
            % path)

# ---------- 9. 文章页结构化数据 ----------
ART = {
    "posts/handwritten-html.html": "2026-11-08",
    "posts/three-habits.html": "2026-10-21",
}

# 各页 __syncOG 调用锚点：(旧串, 新串)
CALLS = {
    "index.html": (
        'if(desc){document.querySelector(\'meta[name="description"]\').setAttribute("content",desc.replace(/<[^>]*>/g,""));}',
        'if(desc){document.querySelector(\'meta[name="description"]\').setAttribute("content",desc.replace(/<[^>]*>/g,""));}\n'
        '  __syncOG(code,lang,__tt,desc);'),
    "blog.html": (
        '  else if(t){document.title=t+" · "+(code==="zh-TW"?"王孫陽":"王孙阳");}\n}',
        '  else if(t){document.title=t+" · "+(code==="zh-TW"?"王孫陽":"王孙阳");}\n'
        '  __syncOG(code,lang,__mt||t,desc);\n}'),
    "404.html": (
        'if(__mt){document.title=__mt;}else{document.title="404 · "+(code==="zh-TW"?"王孫陽":"王孙阳");}',
        'if(__mt){document.title=__mt;}else{document.title="404 · "+(code==="zh-TW"?"王孫陽":"王孙阳");}\n'
        '  __syncOG(code,lang,__mt||document.title,null);'),
    "posts/handwritten-html.html": (
        'if(ogt && lang.title) ogt.setAttribute("content",lang.title);',
        'if(ogt && lang.title) ogt.setAttribute("content",lang.title);\n'
        '  __syncOG(code,lang,lang.title,lang.desc);'),
    "posts/three-habits.html": (
        'if(ogt && lang.title) ogt.setAttribute("content",lang.title);',
        'if(ogt && lang.title) ogt.setAttribute("content",lang.title);\n'
        '  __syncOG(code,lang,lang.title,lang.desc);'),
}

report = []
errors = []


def rep(where, item, n, want):
    ok = (n == want)
    report.append((where, item, n, want, ok))
    if not ok:
        errors.append("%s :: %s 命中 %d，期望 %d" % (where, item, n, want))


def patch(path):
    p = os.path.join(ROOT, path)
    s = open(p, encoding="utf-8").read()
    o = s

    # 1 radiogroup
    rep(path, "langList role=radiogroup", s.count(OLD_LIST), 1)
    s = s.replace(OLD_LIST, NEW_LIST)

    # 2 按钮 role
    rep(path, "lang button role=radio", s.count(OLD_GEN), 1)
    s = s.replace(OLD_GEN, NEW_GEN)

    # 3 aria-checked 同步
    rep(path, "aria-checked 同步", s.count(OLD_ACTIVE), 1)
    s = s.replace(OLD_ACTIVE, NEW_ACTIVE)

    # 4 mobileMenu（仅 index）
    if path == "index.html":
        rep(path, 'menuBtn haspopup=dialog', s.count(OLD_MENU_BTN), 1)
        s = s.replace(OLD_MENU_BTN, NEW_MENU_BTN)
        rep(path, "mobileMenu role=dialog", s.count(OLD_MENU_ASIDE), 1)
        s = s.replace(OLD_MENU_ASIDE, NEW_MENU_ASIDE)

    # 5 语言包版本参数
    rep(path, "lang pack ?v=", s.count(OLD_SRC), 1)
    s = s.replace(OLD_SRC, NEW_SRC)

    # 6 forced-colors
    rep(path, "</style> 注入点", s.count("</style>"), 1)
    s = s.replace("</style>", FORCE_CSS + "</style>")

    # 7 __syncOG 定义
    rep(path, "I18N_EXT_BASE 锚点", len(re.findall(r"var I18N_EXT_BASE=", s)), 1)
    s = re.sub(r"var I18N_EXT_BASE=", lambda m: SYNC_OG, s, count=1)

    # 8 __syncOG 调用
    old_c, new_c = CALLS[path]
    rep(path, "__syncOG 调用", s.count(old_c), 1)
    s = s.replace(old_c, new_c)

    # 9 SW 注册
    reg = sw_reg("../sw.js" if path.startswith("posts/") else "sw.js")
    rep(path, "</body> 注入点", s.count("</body>"), 1)
    s = s.replace("</body>", reg + "</body>")

    # 10 删 will-change:transform
    n_wc = len(re.findall(r";?will-change:\s*transform;?", s))
    if n_wc:
        s = re.sub(r";?will-change:\s*transform;?", "", s)
    report.append((path, "remove will-change:transform", n_wc, "-", True))

    # 11 文章页 JSON-LD + article meta
    if path in ART:
        d = ART[path]
        old_dp = '"datePublished":"%s"' % d
        new_dp = ('"datePublished":"%s","dateModified":"2026-11-25","image":{"@type":"ImageObject",'
                  '"url":"https://wang-sunyang.github.io/og-cover.png","width":1200,"height":630}' % d)
        rep(path, "BlogPosting dateModified+image", s.count(old_dp), 1)
        s = s.replace(old_dp, new_dp)

        old_pt = '<meta property="article:published_time" content="%s">' % d
        new_pt = ('<meta property="article:published_time" content="%s">\n'
                  '<meta property="article:modified_time" content="2026-11-25">\n'
                  '<meta property="article:author" content="https://wang-sunyang.github.io/">' % d)
        rep(path, "article:modified_time", s.count(old_pt), 1)
        s = s.replace(old_pt, new_pt)

    # 12 404 name=description
    if path == "404.html":
        anchor = '<meta property="og:description"'
        rep(path, "404 og:description 锚点", s.count(anchor), 1)
        idx = s.index(anchor)
        line = '<meta name="description" content="这一页走丢了：你找的地址不存在，或者内容已经搬走了。">\n'
        s = s[:idx] + line + s[idx:]

    if APPLY and s != o:
        open(p, "w", encoding="utf-8").write(s)
    return len(s)


print("%-32s %-34s %6s %6s %s" % ("PAGE", "ITEM", "HIT", "WANT", "OK"))
sizes = []
for pg in PAGES:
    sizes.append((pg, patch(pg)))
for r in report:
    print("%-32s %-34s %6s %6s %s" % (r[0], r[1], r[2], r[3], "OK" if r[4] else "FAIL"))
print()
for pg, n in sizes:
    print("  %-34s -> %7d bytes" % (pg, n))
print()
if errors:
    print("FAILED %d 项：" % len(errors))
    for e in errors:
        print("  -", e)
    sys.exit(1)
print("ALL GREEN" + ("  [已写盘]" if APPLY else "  [dry-run，未写盘]"))
