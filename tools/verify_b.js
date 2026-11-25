#!/usr/bin/env node
/* 五页一致性校验（B 路线）：语法/可访问性/CSS/元信息/主题/i18n 兜底
   用法：node tools/verify_b.js   （在仓库根或任意目录均可）*/
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const W = path.join(__dirname, '..');   // 仓库根 = tools 的上一级
const PAGES = ['index.html', 'blog.html', '404.html', 'posts/handwritten-html.html', 'posts/three-habits.html'];
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
  chk(f, 'i18n 兜底 ≤1200ms', /},1200\);/.test(h) && !/},4000\);/.test(h), '');
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

/* ---------- 输出 ---------- */
const bad = results.filter(r => !r.ok);
const w = Math.max(...results.map(r => r.name.length));
for (const r of results) {
  console.log((r.ok ? '  PASS  ' : '  FAIL  ') + r.page.padEnd(30) + r.name.padEnd(w + 2) + r.detail);
}
console.log('\n合计 ' + results.length + ' 条断言，通过 ' + (results.length - bad.length) + ' 条，失败 ' + bad.length + ' 条');
process.exit(bad.length ? 1 : 0);
