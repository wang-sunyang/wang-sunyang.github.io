#!/usr/bin/env node
/* 五页一致性校验（B 路线）：语法/可访问性/CSS/元信息/主题/i18n 兜底
   用法：node tools/verify_b.js   （在仓库根或任意目录均可）*/
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const W = path.join(__dirname, '..');   // 仓库根 = tools 的上一级
const PAGES = ['index.html', 'blog.html', '404.html', 'posts/handwritten-html.html', 'posts/three-habits.html', 'posts/site-r6-optimization.html'];
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
  const css = [...h.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map(m => m[1]).join('\n');
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
    const fc = /@media \(forced-colors: active\)/.test(h);
    const fcDetail = fc && h.includes('CanvasText') && h.includes('Highlight') && h.includes('forced-color-adjust');
    chk(f, 'R5 forced-colors 兜底', fcDetail, fc ? '' : '缺 @media (forced-colors: active)');

    // 7.3 will-change:transform 已移除 / backdrop-filter 保留
    const wc = [...h.matchAll(/will-change\s*:\s*transform/g)].length;
    chk(f, 'R5 无常驻 will-change:transform', wc === 0, wc + ' 处残留');
    const bf = [...h.matchAll(/backdrop-filter/g)].length;
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

/* ---------- 输出 ---------- */
const bad = results.filter(r => !r.ok);
const w = Math.max(...results.map(r => r.name.length));
for (const r of results) {
  console.log((r.ok ? '  PASS  ' : '  FAIL  ') + r.page.padEnd(30) + r.name.padEnd(w + 2) + r.detail);
}
console.log('\n合计 ' + results.length + ' 条断言，通过 ' + (results.length - bad.length) + ' 条，失败 ' + bad.length + ' 条');
process.exit(bad.length ? 1 : 0);
