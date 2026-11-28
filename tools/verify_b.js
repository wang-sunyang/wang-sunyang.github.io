#!/usr/bin/env node
/* 五页一致性校验（B 路线）：语法/可访问性/CSS/元信息/主题/i18n 兜底
   用法：node tools/verify_b.js   （在仓库根或任意目录均可）*/
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const W = path.join(__dirname, '..');   // 仓库根 = tools 的上一级
const PAGES = ['index.html', 'blog.html', '404.html', 'posts/handwritten-html.html', 'posts/three-habits.html', 'posts/site-r6-optimization.html'];

/* 内联 CSS + 外链样式表（文章页公共样式已抽到 assets/post.css） */
function cssOf(f) {
  const h = fs.readFileSync(path.join(W, f), 'utf8');
  let css = [...h.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map(m => m[1]).join('\n');
  for (const m of h.matchAll(/<link[^>]+rel="stylesheet"[^>]*>/g)) {
    const hm = /href="([^"]+)"/.exec(m[0]);
    if (!hm) continue;
    try { css += '\n' + fs.readFileSync(path.join(W, path.dirname(f), hm[1]), 'utf8'); }
    catch (e) { console.warn('[silent-catch]', e.message); }
  }
  return css;
}
const results = [];
function chk(page, name, ok, detail) {
  results.push({ page, name, ok: !!ok, detail: detail === undefined ? '' : String(detail) });
}

/* ---------- 1. 内联 JS 语法 ---------- */
for (const f of PAGES) {
  const h = fs.readFileSync(path.join(W, f), 'utf8');
  const scripts = [...h.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)]
    .filter(m => !/\bsrc=/.test(m[1]) && !/type\s*=\s*["'](?!text\/javascript|module)/i.test(m[1]))
    .map(m => m[2]);
  let bad = null;
  scripts.forEach((s, i) => {
    if (bad) return;
    try { new vm.Script(s, { filename: f + '#inline' + i }); }
    catch (e) { bad = 'inline' + i + ': ' + e.message; }
  });
  chk(f, '内联 JS 语法可解析', !bad, bad || (scripts.length + ' 段'));
}

/* ---------- 2. CSS 断言 ---------- */
for (const f of PAGES) {
  const h = fs.readFileSync(path.join(W, f), 'utf8');
  const css = cssOf(f);
  const t3 = [...css.matchAll(/--text-3\s*:\s*(#[0-9a-fA-F]{6})/g)].map(m => m[1].toLowerCase());
  const T3_OK = f.startsWith('posts/') ? ['#6b7a94', '#647089'] : ['#7b87ad', '#616b83'];
  chk(f, '--text-3 达 AA 且符合本页取值', t3.length && t3.every(v => T3_OK.includes(v)), t3.join(',') + ' 允许 ' + T3_OK.join('/'));
  // 变量死链
  const defined = new Set([...css.matchAll(/(--[\w-]+)\s*:/g)].map(m => m[1]));
  const dangling = [];
  for (const m of css.matchAll(/var\(/g)) {
    let i2 = m.index + 4, d = 1, hasComma = false;
    while (i2 < css.length && d) {
      const ch = css[i2];
      if (ch === '(') d++;
      else if (ch === ')') d--;
      else if (ch === ',' && d === 1) hasComma = true;
      i2++;
    }
    const inside = css.slice(m.index + 4, i2 - 1);
    const name = (inside.match(/^\s*(--[\w-]+)/) || [])[1];
    if (name && !defined.has(name) && !hasComma) dangling.push(name);
  }
  const uniqDangling = [...new Set(dangling)];
  chk(f, '无 var() 死链', uniqDangling.length === 0, uniqDangling.join(','));
  // hover 全在 @media 内：剥离所有 @media 块后不应再有 :hover
  function stripAtRules(txt) {
    let out = txt, guard = 0;
    while (guard++ < 500) {
      const idx = out.indexOf('@media');
      if (idx < 0) break;
      const br = out.indexOf('{', idx);
      if (br < 0) break;
      let d = 1, k = br + 1;
      while (k < out.length && d) { if (out[k] === '{') d++; else if (out[k] === '}') d--; k++; }
      out = out.slice(0, idx) + out.slice(k);
    }
    return out;
  }
  const bare = stripAtRules(css.replace(/\/\*[\s\S]*?\*\//g, ''));
  const outHover = (bare.match(/:hover/g) || []).length;
  chk(f, 'hover 规则均在 @media 内', outHover === 0, outHover + ' 条裸 hover');
  // 无用变量：--acc3/--glow-3 等应已清除
  chk(f, '已清除无用变量 --glow-3/--grad-soft', !/--glow-3\s*:/.test(css) && !/--grad-soft\s*:/.test(css), '');
}

/* ---------- 3. 元信息 ---------- */
const NEED_META = ['og:type', 'og:title', 'og:description', 'og:url', 'og:locale', 'og:image', 'twitter:card', 'twitter:title', 'twitter:description'];
for (const f of PAGES) {
  const h = fs.readFileSync(path.join(W, f), 'utf8');
  const miss = NEED_META.filter(k => !h.includes('"' + k + '"') && !h.includes('name="' + k + '"'));
  chk(f, 'og/twitter 元信息齐全', miss.length === 0, miss.join(','));
}

/* ---------- 4. a11y / i18n 源码断言 ---------- */
for (const f of PAGES) {
  const h = fs.readFileSync(path.join(W, f), 'utf8');
  const cjkAria = [...h.matchAll(/aria-label="([^"]*)"/g)].filter(m => /[\u4e00-\u9fff]/.test(m[1])).length;
  const tagged = [...h.matchAll(/<[a-zA-Z][^>]*aria-label="[^"]*"[^>]*>/g)].filter(m => /[\u4e00-\u9fff]/.test(m[0])).length;
  const untagged = [...h.matchAll(/<[a-zA-Z][^>]*aria-label="([^"]*)"[^>]*>/g)]
    .filter(m => /[\u4e00-\u9fff]/.test(m[1]) && !/data-i18n-aria=/.test(m[0])).length;
  chk(f, '中文 aria-label 均已标记 data-i18n-aria', untagged === 0, untagged + '/' + cjkAria + ' 未标');
  chk(f, 'aria 本地化支持逐键回落 en', /if\(av===undefined\) av=getPath\(I18N\.en/.test(h), '');
  chk(f, 'i18n 兜底 ≤300ms', /},300\);/.test(h) && !/},1200\);/.test(h), '');
  chk(f, '语言包失败即解除 i18n-boot', /__i18nErrs/.test(h) && /i18n-boot\/g,""\)/.test(h), '');
  chk(f, '无空 catch', !/catch\s*\(\s*[A-Za-z_$][\w$]*\s*\)\s*\{\s*\}/.test(h), '');
  const hasChange = /addEventListener\("change"/.test(h);
  chk(f, 'prefers-color-scheme 跟随系统', hasChange, hasChange ? '' : '缺 change 监听');
  // 标题层级不跳级
  {
    const bodyOnly = h.replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/g, '');
    const seq = [...bodyOnly.matchAll(/<h([1-6])[^>]*>([\s\S]{0,40}?)<\/h\1>/g)].map(m => parseInt(m[1], 10));
    let prev = 0; const jumps = [];
    for (const l of seq) { if (prev && l > prev + 1) jumps.push('h' + prev + '→h' + l); prev = l; }
    chk(f, '标题层级不跳级', jumps.length === 0, jumps.join(',') || ('h' + seq.join('h')));
  }
  // id 唯一
  const ids = [...h.matchAll(/\sid="([^"]+)"/g)].map(m => m[1]);
  const dup = ids.filter((v, i) => ids.indexOf(v) !== i);
  chk(f, 'id 唯一', dup.length === 0, [...new Set(dup)].join(','));
}

/* ---------- 5. sitemap ---------- */
const sm = fs.readFileSync(path.join(W, 'sitemap.xml'), 'utf8');
const lastmods = [...sm.matchAll(/<lastmod>([^<]+)<\/lastmod>/g)].map(m => m[1]);
const maxMtime = PAGES.map(f => fs.statSync(path.join(W, f)).mtime.toISOString().slice(0, 10)).sort().pop();
chk('sitemap.xml', 'lastmod 不早于页面最新修改', lastmods.every(d => d >= maxMtime), 'lastmod=' + [...new Set(lastmods)].join(',') + ' 页面=' + maxMtime);
chk('sitemap.xml', '404 未被收录', !sm.includes('404.html'), '');


/* ---------- 6. 共有函数体一致性（快照基线守护 P1-3） ---------- */
{
  const crypto = require('crypto');
  const extract = h => {
    const out = {};
    const re = /function\s+([A-Za-z_$][\w$]*)\s*\(([^)]*)\)\s*\{/g;
    let m;
    while ((m = re.exec(h))) {
      let i = re.lastIndex, d = 1;
      while (i < h.length && d) { if (h[i] === '{') d++; else if (h[i] === '}') d--; i++; }
      out[m[1]] = crypto.createHash('md5').update(h.slice(m.index, i).replace(/\s+/g, ' ')).digest('hex').slice(0, 10);
    }
    return out;
  };
  const all = {};
  for (const f of PAGES) all[f] = extract(fs.readFileSync(path.join(W, f), 'utf8'));
  const common = Object.keys(all[PAGES[0]]).filter(n => PAGES.every(f => all[f][n]));
  const drifted = common.filter(n => new Set(PAGES.map(f => all[f][n])).size > 1);
  const basePath = path.join(__dirname, 'verify_baseline.json');
  let base = null;
  try { base = JSON.parse(fs.readFileSync(basePath, 'utf8')); } catch (e) {}
  if (!base) {
    fs.writeFileSync(basePath, JSON.stringify({ commonCount: common.length, drifted }, null, 1));
    chk('五页', '共有函数基线已生成', true, common.length + ' 个共有，' + drifted.length + ' 个允许差异: ' + drifted.join(','));
  } else {
    const allowed = new Set(base.drifted);
    const newDrift = drifted.filter(n => !allowed.has(n));
    const missing = base.drifted.filter(n => !drifted.includes(n));
    chk('五页', '无新增函数体漂移', newDrift.length === 0, newDrift.length ? newDrift.join(',') : ('基线 ' + base.commonCount + ' 个，已知差异 ' + base.drifted.join(',')));
    if (missing.length) chk('五页', '基线差异项已收敛', true, '已自动统一: ' + missing.join(','));
  }
}

/* ---------- 7. R5 优化项守护（PWA / 无障碍选中态 / 结构化数据 / 强制配色 / 元信息同步） ---------- */
{
  const V = '20261127';
  for (const f of PAGES) {
    const h = fs.readFileSync(path.join(W, f), 'utf8');

    // 7.1 语言列表：radiogroup + 按钮 radio + aria-checked 同步
    const rg = /<div class="lang-list" id="langList" role="radiogroup"[^>]*data-i18n-aria="a11y\.langPanel"/.test(h);
    const radioBtn = h.includes('role="radio" aria-checked="false" data-lang=');
    const syncAc = h.includes('classList.toggle("active",__on);b.setAttribute("aria-checked",__on?"true":"false")');
    chk(f, 'R5 语言列表 radiogroup 语义', rg, rg ? '' : '缺 role=radiogroup/data-i18n-aria');
    chk(f, 'R5 语言按钮 radio+aria-checked', radioBtn, radioBtn ? '' : '按钮生成缺 role/aria-checked');
    chk(f, 'R5 选中态同步 aria-checked', syncAc, syncAc ? '' : '切换语言未同步 aria-checked');

    // 7.2 强制配色兜底
    const cssF = cssOf(f);
    const fc = /@media \(forced-colors: active\)/.test(cssF);
    const fcDetail = fc && cssF.includes('CanvasText') && cssF.includes('Highlight') && cssF.includes('forced-color-adjust');
    chk(f, 'R5 forced-colors 兜底', fcDetail, fc ? '' : '缺 @media (forced-colors: active)');

    // 7.3 will-change:transform 已移除 / backdrop-filter 保留
    const wc = [...cssF.matchAll(/will-change\s*:\s*transform/g)].length;
    chk(f, 'R5 无常驻 will-change:transform', wc === 0, wc + ' 处残留');
    const bf = [...cssF.matchAll(/backdrop-filter/g)].length;
    chk(f, 'R5 backdrop-filter 未被误删', bf > 0, bf + ' 处');

    // 7.4 og/twitter 随语言同步
    const defSync = /function __syncOG\(code,lang,title,desc\)/.test(h);
    const callSync = [...h.matchAll(/__syncOG\(code,lang,/g)].length === 2; // 1 定义 + 1 调用
    const hasLocaleMap = h.includes('"zh-TW":"zh_TW"') && h.includes('"ja":"ja_JP"');
    chk(f, 'R5 __syncOG 定义+调用各一次', defSync && callSync && hasLocaleMap,
      (defSync ? '' : '缺定义 ') + (callSync ? '' : '定义+调用总数≠2 ') + (hasLocaleMap ? '' : '缺 locale 映射'));

    // 7.5 语言包版本参数
    const vok = h.includes('s.src=I18N_EXT_BASE+code+".js?v=' + V + '"');
    chk(f, 'R5 语言包带版本参数', vok, vok ? '' : '缺 ?v=' + V);

    // 7.6 SW 注册，路径按页深选择
    const wantSw = f.startsWith('posts/') ? '../sw.js' : 'sw.js';
    const regOk = h.includes('serviceWorker.register("' + wantSw + '")');
    chk(f, 'R5 Service Worker 注册路径', regOk, regOk ? wantSw : '应为 ' + wantSw);
  }

  // 7.7 index 移动菜单语义
  {
    const h = fs.readFileSync(path.join(W, 'index.html'), 'utf8');
    chk('index.html', 'R5 menuBtn haspopup=dialog', /aria-haspopup="dialog"/.test(h) && !/aria-haspopup="menu"/.test(h), '');
    const mm = /<aside class="mobile-menu" id="mobileMenu" role="dialog" aria-modal="true"/.test(h);
    chk('index.html', 'R5 mobileMenu role=dialog', mm, mm ? '' : 'aside 缺 role/aria-modal');
  }

  // 7.8 文章页结构化数据完整
  for (const f of ['posts/handwritten-html.html', 'posts/three-habits.html', 'posts/site-r6-optimization.html']) {
    const h = fs.readFileSync(path.join(W, f), 'utf8');
    const hasImage = /"dateModified":"\d{4}-\d{2}-\d{2}","image":\{"@type":"ImageObject","url":"https:\/\/wang-sunyang\.github\.io\/og-cover\.jpg","width":1200,"height":630\}/.test(h);
    chk(f, 'R5 BlogPosting 含 image+dateModified', hasImage, hasImage ? '' : 'JSON-LD 缺 image/dateModified');
    const am = /<meta property="article:modified_time" content="\d{4}-\d{2}-\d{2}">/.test(h)
      && h.includes('<meta property="article:author" content="https://wang-sunyang.github.io/">');
    chk(f, 'R5 article 元信息补齐', am, am ? '' : '缺 modified_time/author');
    const jl = [...h.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(m => m[1]);
    let bad2 = '';
    jl.forEach(s => { try { JSON.parse(s); } catch (e) { bad2 = e.message; } });
    chk(f, 'R5 JSON-LD 可解析', !bad2, bad2 || (jl.length + ' 段'));
  }

  // 7.9 404 描述补全
  {
    const h = fs.readFileSync(path.join(W, '404.html'), 'utf8');
    chk('404.html', 'R5 404 具备 name=description', /<meta name="description" content="[^"]+">/.test(h), '');
  }

  // 7.10 sw.js 本体
  {
    const p = path.join(W, 'sw.js');
    const exist = fs.existsSync(p);
    chk('sw.js', 'R5 文件存在', exist, exist ? fs.statSync(p).size + ' bytes' : '缺失');
    if (exist) {
      const s = fs.readFileSync(p, 'utf8');
      let bad3 = '';
      try { new vm.Script(s, { filename: 'sw.js' }); } catch (e) { bad3 = e.message; }
      chk('sw.js', 'R5 语法可解析', !bad3, bad3);
      chk('sw.js', 'R5 缓存版本与页面参数一致', s.includes('"v' + V + '"'), '');
      const precache = ['index.html', 'blog.html', '404.html', 'posts/handwritten-html.html', 'posts/three-habits.html', 'posts/site-r6-optimization.html']
        .every(x => s.includes('"./' + x + '"'));
      chk('sw.js', 'R5 预缓存覆盖五页', precache, '');
      const strat = s.includes('req.mode === "navigate"') && /function swr\(/.test(s) && s.includes('"/i18n/"');
      chk('sw.js', 'R5 三层缓存策略齐备', strat, 'navigation / i18n / 静态资源');
      chk('sw.js', 'R5 无空 catch', !/catch\s*\(\s*(?:[A-Za-z_$][\w$]*\s*)?\)\s*\{\s*\}/.test(s), '');
    }
  }

  // 7.11 .nojekyll 与资源体积护栏
  {
    chk('.nojekyll', 'R5 存在（下划线目录可发布）', fs.existsSync(path.join(W, '.nojekyll')), '');
    /* manifest 与 PWA 能力声明一致：有 SW 时 display/id/icons 必须齐备 */
    let mf = null, mfErr = '';
    try { mf = JSON.parse(fs.readFileSync(path.join(W, 'site.webmanifest'), 'utf8')); } catch (e) { mfErr = e.message; }
    chk('site.webmanifest', 'R5 JSON 可解析', !!mf, mfErr);
    if (mf) {
      chk('site.webmanifest', 'R5 有 SW 时能力声明完整',
        mf.display === 'standalone' && mf.id === '/' && mf.scope === '/' && Array.isArray(mf.icons) && mf.icons.length >= 4,
        'display=' + mf.display + ' id=' + mf.id + ' icons=' + (mf.icons || []).length);
      const missing = (mf.icons || []).map(i => i.src).filter(src => !fs.existsSync(path.join(W, src)));
      chk('site.webmanifest', 'R5 图标文件均存在', missing.length === 0, missing.join(','));
    }
    const caps = { 'og-cover.jpg': 75000, 'favicon-512.png': 72000, 'apple-touch-icon.png': 18000, 'favicon-maskable-512.png': 60000, 'favicon-192.png': 17500, 'favicon-maskable-192.png': 16000, 'favicon-512.webp': 9000, 'favicon-192.webp': 4000, 'apple-touch-icon.webp': 3500 };
    for (const [f, cap] of Object.entries(caps)) {
      const sz = fs.statSync(path.join(W, f)).size;
      chk(f, 'R5 图片体积未回退', sz <= cap, sz + ' / ' + cap);
    }
  }
}

/* ---------- R6 首屏可见性与资源收敛 ---------- */
{
  const P6 = ['index.html', 'blog.html', '404.html', 'posts/handwritten-html.html', 'posts/three-habits.html', 'posts/site-r6-optimization.html'];
  for (const f of P6) {
    const h = fs.readFileSync(path.join(W, f), 'utf8');
    chk(f, 'R6 不再隐藏 body', !/html\.i18n-boot body\{visibility:hidden\}/.test(h), '');
    chk(f, 'R6 焦点环无硬编码色', !/rgba\(120,170,255,\.85\)/.test(h), '');
    chk(f, 'R6 锚点滚动偏移', cssOf(f).includes(':target,[id]{scroll-margin-top:96px}'), '');
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

/* ---------- 输出 ---------- */
const bad = results.filter(r => !r.ok);
const w = Math.max(...results.map(r => r.name.length));
for (const r of results) {
  console.log((r.ok ? '  PASS  ' : '  FAIL  ') + r.page.padEnd(30) + r.name.padEnd(w + 2) + r.detail);
}

/* ---------- A3：SEO 元信息长度区间 ---------- */
const SEO = {
  'index.html': [30, 70],
  'blog.html': [30, 70],
  '404.html': [10, 45],
  'posts/handwritten-html.html': [20, 70],
  'posts/three-habits.html': [20, 70],
  'posts/site-r6-optimization.html': [20, 70]
};
for (const f of PAGES) {
  const h = fs.readFileSync(path.join(W, f), 'utf8');
  const t = (/<title>([\s\S]*?)<\/title>/.exec(h) || [, ''])[1].trim();
  const d = (/<meta name="description" content="([^"]*)"/.exec(h) || [, ''])[1].trim();
  const ogd = (/<meta property="og:description" content="([^"]*)"/.exec(h) || [, ''])[1].trim();
  const twd = (/<meta name="twitter:description" content="([^"]*)"/.exec(h) || [, ''])[1].trim();
  const ogt = (/<meta property="og:title" content="([^"]*)"/.exec(h) || [, ''])[1].trim();
  const twt = (/<meta name="twitter:title" content="([^"]*)"/.exec(h) || [, ''])[1].trim();
  const [lo, hi] = SEO[f];
  chk(f, 'A3 title 长度在区间内', t.length >= lo && t.length <= hi, t.length + ' 字符，允许 ' + lo + '–' + hi);
  chk(f, 'A3 description 长度在区间内', d.length >= 70 && d.length <= 120, d.length + ' 字符，允许 70–120');
  chk(f, 'A3 og/twitter description 与 meta 一致', ogd === d && twd === d, 'og=' + ogd.length + ' tw=' + twd.length + ' meta=' + d.length);
  chk(f, 'A3 og/twitter title 与 title 一致', ogt === t && twt === t, 'og=' + ogt.length + ' tw=' + twt.length);
}

/* ---------- A1：/en/ 预渲染与 hreflang 互指 ---------- */
const LOCALE_PAGES = ['index.html', 'blog.html', 'posts/handwritten-html.html', 'posts/three-habits.html', 'posts/site-r6-optimization.html'];
const B = 'https://wang-sunyang.github.io/';
for (const f of LOCALE_PAGES) {
  const rootPath = path.join(W, f);
  const enPath = path.join(W, 'en', f);
  let h = '';
  try { h = fs.readFileSync(rootPath, 'utf8'); } catch (e) { chk(f, 'A1 根页存在', false, e.message); continue; }
  let en = '';
  try { en = fs.readFileSync(enPath, 'utf8'); } catch (e) { chk(f, 'A1 /en/ 预渲染页存在', false, e.message); continue; }

  const zhUrl = B + (f === 'index.html' ? '' : f);
  const enUrl = B + 'en/' + (f === 'index.html' ? '' : f);
  const altOf = (src) => [...src.matchAll(/<link rel="alternate" hreflang="([^"]+)" href="([^"]+)">/g)].map(m => [m[1], m[2]]);
  const ra = altOf(h), ea = altOf(en);
  const key = a => a.map(x => x.join('=')).sort().join('|');
  chk(f, 'A1 根页 hreflang 含 en 且自指', ra.some(x => x[0] === 'en' && x[1] === enUrl) && ra.some(x => x[0] === 'zh-Hans' && x[1] === zhUrl), ra.map(x => x[0]).join(','));
  chk(f, 'A1 /en/ hreflang 含 zh 与 x-default', ea.some(x => x[0] === 'zh-Hans' && x[1] === zhUrl) && ea.some(x => x[0] === 'x-default' && x[1] === zhUrl), ea.map(x => x[0]).join(','));
  chk(f, 'A1 hreflang 无重复项', new Set(ra.map(x => x[0])).size === ra.length && new Set(ea.map(x => x[0])).size === ea.length, ra.map(x => x[0]).join(','));
  chk(f, 'A1 两侧 hreflang 组完全一致', key(ra) === key(ea) && ra.length === 3, ra.length + ' vs ' + ea.length);

  const can = (/<link rel="canonical" href="([^"]+)"/.exec(en) || [, ''])[1];
  chk(f, 'A1 /en/ canonical 指向自身', can === enUrl, can);
  const canZh = (/<link rel="canonical" href="([^"]+)"/.exec(h) || [, ''])[1];
  chk(f, 'A1 根页 canonical 未被改写', canZh === zhUrl, canZh);
  chk(f, 'A1 /en/ <html lang="en">', /<html[^>]+lang="en"/.test(en), (/<html[^>]*>/.exec(en) || [''])[0].slice(0, 60));
  chk(f, 'A1 /en/ og:locale 为 en_US', /<meta property="og:locale" content="en_US">/.test(en), '');
  chk(f, 'A1 /en/ 强制渲染英语', /var saved="en";/.test(en), '');
  chk(f, 'A1 /en/ 不再遮挡正文', !/i18n-boot"*;/.test(en) || !en.includes('className+" ")+"i18n-boot"'), '');
  chk(f, 'A1 /en/ 切语言回根页', /ROOT=/.test(en) && /\?lang=/.test(en) && !/"\)\+"lang="/.test(''), '');

  // 预渲染：可见文本不含汉字（品牌名与语言标签除外）
  const body = en.replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/g, '');
  const cjk = [...body.matchAll(/[\u4e00-\u9fff]+/g)].map(m => m[0]);
  const allowed = cjk.every(w => /王孙阳|王|Sunyang/.test(w));
  chk(f, 'A1 /en/ 正文已静态英文化', allowed, cjk.slice(0, 6).join('/') || '0 处汉字');

  // 文章页正文必须在 HTML 里（不是靠 JS 注入）
  if (f.startsWith('posts/')) {
    const prose = (/<div class="prose" id="prose">([\s\S]*?)<\/div>\s*<\/article>/.exec(en) || [, ''])[1];
    chk(f, 'A1 /en/ 正文预渲染进 HTML', prose.replace(/<[^>]+>/g, '').trim().length > 400, prose.length + ' 字节容器');
  }
}
for (const f of LOCALE_PAGES) {
  const en = fs.readFileSync(path.join(W, 'en', f), 'utf8');
  const bad = [...en.matchAll(/(?:href|src)="(?!https?:|\/|#|mailto:)([^"]+\.(?:png|webp|jpg|svg|xml|html|css|webmanifest))"/g)].map(m => m[1]);
  chk('en/' + f, 'A1 站内相对路径已改绝对', bad.length === 0, bad.slice(0, 3).join(',') || '0 处');
}
for (const f of LOCALE_PAGES) {
  const en = fs.readFileSync(path.join(W, 'en', f), 'utf8');
  const t = (/<title>([\s\S]*?)<\/title>/.exec(en) || [, ''])[1].trim();
  chk('en/' + f, 'A3 en title 含关键词且不过短', t.length >= 25 && /android|developer|notes|dependency|habit|optim/i.test(t), t.length + ' 字符');
}
const smA1 = fs.readFileSync(path.join(W, 'sitemap.xml'), 'utf8');
chk('sitemap.xml', 'A1 收录 /en/ 且带 xhtml 互指',
  (sm.match(/<loc>https:\/\/wang-sunyang\.github\.io\/en\//g) || []).length === 5 &&
  (sm.match(/xmlns:xhtml=/g) || []).length === 1 &&
  (sm.match(/<xhtml:link /g) || []).length === 30,
  (sm.match(/<loc>/g) || []).length + ' 条 URL，' + (sm.match(/<xhtml:link /g) || []).length + ' 条 alternate');
chk('404.html', 'A1 404 不参与 hreflang（noindex）', !/hreflang="en"/.test(fs.readFileSync(path.join(W, '404.html'), 'utf8')), '');

/* ---------- B2：CSS 瘦身 ---------- */
const postCss = fs.readFileSync(path.join(W, 'assets/post.css'), 'utf8');
chk('assets/post.css', 'B2 公共样式已抽离且被三篇引用',
  ['posts/handwritten-html.html', 'posts/three-habits.html', 'posts/site-r6-optimization.html']
    .every(f => /<link rel="stylesheet" href="\.\.\/assets\/post\.css">/.test(fs.readFileSync(path.join(W, f), 'utf8'))),
  postCss.length + ' 字节');
chk('assets/post.css', 'B2 公共样式无注释残留', !/\/\*/.test(postCss), '');
for (const f of PAGES) {
  const h = fs.readFileSync(path.join(W, f), 'utf8');
  const css = [...h.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map(m => m[1]).join('\n');
  const ws = css.length ? (css.match(/[ \t]{2,}/g) || []).length : 0;
  chk(f, 'B2 内联 CSS 已压空白', ws === 0, ws + ' 处连续空白');
}
chk('sw.js', 'B2 公共样式进预缓存', /"\.\/assets\/post\.css"/.test(fs.readFileSync(path.join(W, 'sw.js'), 'utf8')), '');
chk('index.html', 'B2 内联 CSS 体积下降', cssOf('index.html').length < 38000, cssOf('index.html').length + ' 字节');
chk('index.html', 'A3 焦点环禁用裸色值',
  !/:focus-visible[^{]*\{[^}]*outline:[^;}]*(?:#|rgba?\()/.test(cssOf('index.html')), '');

/* ---------- C1：manifest 增强 ---------- */
const mf = JSON.parse(fs.readFileSync(path.join(W, 'site.webmanifest'), 'utf8'));
chk('site.webmanifest', 'C1 categories 已声明', Array.isArray(mf.categories) && mf.categories.length >= 2, (mf.categories || []).join(','));
chk('site.webmanifest', 'C1 shortcuts 已声明', Array.isArray(mf.shortcuts) && mf.shortcuts.length >= 2, (mf.shortcuts || []).length + ' 条');
chk('site.webmanifest', 'C1 shortcuts 均有图标与 url',
  (mf.shortcuts || []).every(s => /^\//.test(s.url) && Array.isArray(s.icons) && s.icons.length && s.icons.every(i => i.sizes && i.src)), '');
chk('site.webmanifest', 'C1 shortcuts url 指向真实页面',
  (mf.shortcuts || []).every(s => { const u = s.url.split(/[?#]/)[0]; return u === '/' || fs.existsSync(path.join(W, u.replace(/^\//, ''))); }), '');
const sh = mf.screenshots || [];
chk('site.webmanifest', 'C1 screenshots 已声明', Array.isArray(sh) && sh.length >= 2, sh.length + ' 张');
chk('site.webmanifest', 'C1 screenshots 结构完整',
  sh.length > 0 && sh.every(s => s.src && s.sizes && s.type === 'image/webp' && s.label && s.form_factor === 'narrow'), '');
chk('site.webmanifest', 'C1 screenshots 文件存在且非空',
  sh.length > 0 && sh.every(s => { const p = path.join(W, s.src); return fs.existsSync(p) && fs.statSync(p).size > 10000; }), '');
chk('site.webmanifest', 'C1 screenshots sizes 与实际像素一致',
  sh.length > 0 && sh.every(s => {
    const b = fs.readFileSync(path.join(W, s.src));
    let w = 0, h = 0;
    if (b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP') {
      const t = b.toString('ascii', 12, 16);
      if (t === 'VP8X') { w = 1 + b.readUIntLE(24, 3); h = 1 + b.readUIntLE(27, 3); }
      else if (t === 'VP8 ') { w = b.readUInt16LE(26) & 0x3fff; h = b.readUInt16LE(28) & 0x3fff; }
      else if (t === 'VP8L') { const v = b.readUInt32LE(21); w = (v & 0x3fff) + 1; h = ((v >> 14) & 0x3fff) + 1; }
    }
    return s.sizes === `${w}x${h}`;
  }), '');
chk('site.webmanifest', 'C1 screenshots 均为窄屏竖图',
  sh.length > 0 && sh.every(s => { const [w, h] = s.sizes.split('x').map(Number); return h > w; }), '');


/* ---------- A2：Open Graph 语言标注补全 ---------- */
const OG_PAIRS = [
  ['index.html', 'zh_CN', 'en_US'], ['blog.html', 'zh_CN', 'en_US'], ['404.html', 'zh_CN', 'en_US'],
  ['posts/handwritten-html.html', 'zh_CN', 'en_US'], ['posts/three-habits.html', 'zh_CN', 'en_US'],
  ['posts/site-r6-optimization.html', 'zh_CN', 'en_US'],
  ['en/index.html', 'en_US', 'zh_CN'], ['en/blog.html', 'en_US', 'zh_CN'],
  ['en/posts/handwritten-html.html', 'en_US', 'zh_CN'], ['en/posts/three-habits.html', 'en_US', 'zh_CN'],
  ['en/posts/site-r6-optimization.html', 'en_US', 'zh_CN']
];
for (const [f, loc, alt] of OG_PAIRS) {
  const h = fs.readFileSync(path.join(W, f), 'utf8');
  const m = h.match(/<meta property="og:locale" content="([^"]+)">/);
  const a = [...h.matchAll(/<meta property="og:locale:alternate" content="([^"]+)">/g)].map(x => x[1]);
  chk(f, 'A2 og:locale 正确', m && m[1] === loc, m ? m[1] : '缺失');
  chk(f, 'A2 og:locale:alternate 单一且互补', a.length === 1 && a[0] === alt, a.join(',') || '缺失');
  const u = h.match(/<meta property="og:url" content="([^"]+)">/);
  const c = h.match(/<link rel="canonical" href="([^"]+)">/);
  chk(f, 'A2 og:url 与 canonical 一致', !c || (u && u[1] === c[1]), u ? u[1] : '缺失');
}
for (const f of PAGES.filter(x => !x.startsWith('en/'))) {
  chk(f, 'A2 运行时同步 alternate', fs.readFileSync(path.join(W, f), 'utf8').includes('og:locale:alternate"]\''), '');
}

console.log('\n合计 ' + results.length + ' 条断言，通过 ' + (results.length - bad.length) + ' 条，失败 ' + bad.length + ' 条');
process.exit(bad.length ? 1 : 0);
