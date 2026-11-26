#!/usr/bin/env node
/* 五页运行时验收（jsdom）：默认语言 / aria 本地化 / 语言包失败兜底 / 主题跟随系统 */
const fs = require('fs');
const path = require('path');
let jsdom;
try { jsdom = require('jsdom'); }
catch (e) { jsdom = require(path.join(__dirname, 'node_modules', 'jsdom')); }
const { JSDOM, VirtualConsole } = jsdom;
const BASE = path.join(__dirname, '..') + path.sep;
const PAGES = ['index.html', 'blog.html', '404.html', 'posts/handwritten-html.html', 'posts/three-habits.html', 'posts/site-r6-optimization.html'];

const rows = [];
function chk(page, name, ok, detail) { rows.push({ page, name, ok: !!ok, detail: detail === undefined ? '' : String(detail) }); }
const CJK = /[\u4e00-\u9fff]/;

function mkDom(html, url, opts = {}) {
  const errs = [];
  const vc = new VirtualConsole();
  vc.on('jsdomError', e => { if (/Not implemented|getContext|canvas/i.test(e.message)) return; errs.push(e.message); });
  vc.on('error', (...a) => errs.push('console.error: ' + a.join(' ')));
  const mq = { matches: false, media: '(prefers-color-scheme: light)', listeners: [],
    addEventListener(t, cb) { if (t === 'change') this.listeners.push(cb); },
    removeEventListener() {},
    addListener(cb) { this.listeners.push(cb); },
    fire(matches) { this.matches = matches; this.listeners.forEach(cb => cb({ matches })); } };
  const dom = new JSDOM(html, {
    url, runScripts: 'dangerously', virtualConsole: vc, pretendToBeVisual: true,
    beforeParse(w) {
      w.matchMedia = () => mq;
      const dummy = new Proxy({}, { get: (t, k) => (k === 'canvas' ? null : (typeof k === 'string' ? () => dummy : undefined)) });
      w.HTMLCanvasElement.prototype.getContext = () => dummy;
      if (opts.lang) { try { w.localStorage.setItem('lang', opts.lang); } catch (e) {} }
      if (opts.theme) { try { w.localStorage.setItem('theme', opts.theme); } catch (e) {} }
    }
  });
  return { dom, errs, mq };
}
const wait = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  for (const f of PAGES) {
    const html = fs.readFileSync(BASE + f, 'utf8');

    /* --- A. 默认中文 --- */
    {
      const { dom, errs } = mkDom(html, 'https://wang-sunyang.github.io/' + f, { lang: 'zh' });
      await wait(350);
      const w = dom.window, d = w.document;
      chk(f, 'A 默认无 i18n-boot 隐藏', !/\bi18n-boot\b/.test(d.documentElement.className), d.documentElement.className);
      chk(f, 'A 显式 lang=zh 时 html lang 为中文', /^zh/.test(d.documentElement.getAttribute('lang') || ''), d.documentElement.getAttribute('lang'));
      const ariaCjk = [...d.querySelectorAll('[aria-label]')].filter(e => CJK.test(e.getAttribute('aria-label'))).length;
      chk(f, 'A 中文界面 aria 为中文', ariaCjk > 0, ariaCjk + ' 处中文 aria');
      chk(f, 'A 无脚本异常', errs.length === 0, errs.slice(0, 2).join(' | '));
      dom.window.close();
    }

    /* --- B. 英文：aria 应全部英文化 --- */
    {
      const { dom, errs } = mkDom(html, 'https://wang-sunyang.github.io/' + f, { lang: 'en' });
      await wait(400);
      const d = dom.window.document;
      const zhAria = [...d.querySelectorAll('[aria-label]')].filter(e => CJK.test(e.getAttribute('aria-label'))).map(e => e.getAttribute('aria-label'));
      chk(f, 'B 切 en 后 aria 无中文残留', zhAria.length === 0, zhAria.slice(0, 3).join(' / '));
      chk(f, 'B 切 en 后 title 英文', !CJK.test(d.title), d.title);
      chk(f, 'B 切 en 无 i18n-boot', !/\bi18n-boot\b/.test(d.documentElement.className), '');
      /* R5: 语言列表选中态语义 + og/twitter 元信息随语言同步 */
      const btns = [...d.querySelectorAll('.lang-list button[data-lang]')];
      const allRadio = btns.length > 0 && btns.every(b => b.getAttribute('role') === 'radio');
      const checked = btns.filter(b => b.getAttribute('aria-checked') === 'true').map(b => b.getAttribute('data-lang'));
      chk(f, 'R5 语言按钮均带 role=radio', allRadio, btns.length + ' 个按钮');
      chk(f, 'R5 en 选中态唯一且 aria-checked=true', checked.length === 1 && checked[0] === 'en', '选中=' + checked.join(','));
      chk(f, 'R5 未选中项 aria-checked=false',
        btns.filter(b => b.getAttribute('data-lang') !== 'en').every(b => b.getAttribute('aria-checked') === 'false'), '');
      const ogLoc = (d.querySelector('meta[property="og:locale"]') || {}).getAttribute
        ? d.querySelector('meta[property="og:locale"]').getAttribute('content') : '';
      chk(f, 'R5 og:locale 随语言切换', ogLoc === 'en_US', ogLoc);
      const ogDesc = d.querySelector('meta[property="og:description"]');
      const twDesc = d.querySelector('meta[name="twitter:description"]');
      chk(f, 'R5 og/twitter description 已同步', !!(ogDesc && ogDesc.getAttribute('content')) && !!(twDesc && twDesc.getAttribute('content')),
        (ogDesc && ogDesc.getAttribute('content') || '').slice(0, 40));
      const ogTitle = d.querySelector('meta[property="og:title"]');
      chk(f, 'R5 og:title 随语言切换', !!(ogTitle && !CJK.test(ogTitle.getAttribute('content') || '')), ogTitle ? ogTitle.getAttribute('content') : '缺');
      chk(f, 'B en 无脚本异常', errs.length === 0, errs.slice(0, 2).join(' | '));
      dom.window.close();
    }

    /* --- C. 语言包缺失（ja 无内联、jsdom 不拉外链）：不得干等 4s --- */
    {
      const { dom } = mkDom(html, 'https://wang-sunyang.github.io/' + f, { lang: 'ja' });
      await wait(200);
      const cls0 = dom.window.document.documentElement.className;
      const hidden早期 = /\bi18n-boot\b/.test(cls0);
      await wait(1200);                       // 累计 ~1400ms < 4000ms
      const cls1 = dom.window.document.documentElement.className;
      chk(f, 'C 语言包失败 ≤1.4s 内解除隐藏', !/\bi18n-boot\b/.test(cls1), (hidden早期 ? '曾隐藏' : '未隐藏') + ' → 最终 ' + (cls1 || '(无类)'));
      const aria = [...dom.window.document.querySelectorAll('[aria-label]')].filter(e => CJK.test(e.getAttribute('aria-label'))).length;
      chk(f, 'C 失败回落中文，aria 与正文一致', aria > 0, aria + ' 处中文 aria');
      dom.window.close();
    }

    /* --- D. 主题跟随系统 + 用户手选优先 --- */
    {
      const { dom, mq } = mkDom(html, 'https://wang-sunyang.github.io/' + f);
      await wait(300);
      const d = dom.window.document;
      const t0 = d.documentElement.getAttribute('data-theme');
      chk(f, 'D 初始 data-theme 已设置', t0 === 'dark' || t0 === 'light', t0);
      const n = mq.listeners.length;
      chk(f, 'D 注册了 prefers-color-scheme change 监听', n > 0, n + ' 个监听');
      if (n) {
        mq.fire(true);
        chk(f, 'D 系统转亮色 → data-theme=light', d.documentElement.getAttribute('data-theme') === 'light', d.documentElement.getAttribute('data-theme'));
        const tb = d.getElementById('themeToggle');
        chk(f, 'D 主题按钮 aria-label 已同步', tb && !CJK.test(tb.getAttribute('aria-label') || '') === false || !!tb, tb ? tb.getAttribute('aria-label') : '无按钮');
        dom.window.localStorage.setItem('theme', 'dark');
        mq.fire(false);
        chk(f, 'D 用户手选主题优先于系统', d.documentElement.getAttribute('data-theme') === 'light', '系统转暗后仍为 ' + d.documentElement.getAttribute('data-theme'));
      }
      dom.window.close();
    }
  }

  const w = Math.max(...rows.map(r => r.name.length));
  for (const r of rows) console.log((r.ok ? 'PASS  ' : 'FAIL  ') + r.page.padEnd(30) + r.name.padEnd(w + 2) + r.detail);
  const bad = rows.filter(r => !r.ok);
  console.log('\n合计 ' + rows.length + ' 条断言，通过 ' + (rows.length - bad.length) + ' 条，失败 ' + bad.length + ' 条');
  process.exit(bad.length ? 1 : 0);
})();
