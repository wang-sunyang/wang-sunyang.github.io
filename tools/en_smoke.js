/* /en/ 预渲染页冒烟：不依赖语言包即可呈现英文 */
const fs = require('fs'), path = require('path'), { JSDOM } = require('jsdom');
const W = path.join(__dirname, '..');
const CJK = /[\u4e00-\u9fff]/g;
const ALLOW = /王孙阳|Wang Sunyang|简体中文|繁體中文|日本語|한국어|中文/;
let bad = 0;
function chk(page, name, ok, detail) {
  if (!ok) bad++;
  console.log((ok ? 'PASS' : 'FAIL') + '  ' + page + ' ' + name + (detail ? '  ' + detail : ''));
}
for (const f of ['index.html', 'blog.html', 'posts/three-habits.html']) {
  const html = fs.readFileSync(path.join(W, 'en', f), 'utf8');
  const dom = new JSDOM(html, {
    url: 'https://wang-sunyang.github.io/en/' + (f === 'index.html' ? '' : f),
    runScripts: 'dangerously', pretendToBeVisual: true,
    virtualConsole: new (require('jsdom').VirtualConsole)(),
    beforeParse(w) { w.HTMLCanvasElement.prototype.getContext = function () { return null; }; }
  });
  const d = dom.window.document;
  const title = d.title || '';
  chk('en/' + f, '标题为英文', title.length > 10 && !CJK.test(title), title.slice(0, 44));
  CJK.lastIndex = 0;
  const clone = d.body.cloneNode(true);
  clone.querySelectorAll('script,style,noscript').forEach(n => n.remove());
  const text = (clone.textContent || '').replace(/\s+/g, ' ');
  const hits = (text.match(/[\u4e00-\u9fff]+/g) || []).filter(w => !ALLOW.test(w));
  chk('en/' + f, '可见文本英文化', hits.length === 0, hits.slice(0, 4).join('/') || '0 处');
  chk('en/' + f, 'html lang=en', d.documentElement.getAttribute('lang') === 'en', '');
  chk('en/' + f, '未挂 i18n-boot', !d.documentElement.className.includes('i18n-boot'), d.documentElement.className || '');
  if (f.startsWith('posts/')) {
    const prose = d.querySelector('#prose');
    const len = (prose ? prose.textContent : '').trim().length;
    chk('en/' + f, '正文静态可见', len > 500, len + ' 字符');
  }
}
console.log('\n合计失败 ' + bad + ' 条');
process.exit(bad ? 1 : 0);
