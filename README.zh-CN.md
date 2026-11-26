# 王孙阳 · 个人主页

[English](README.md) · **简体中文**

纯手写 HTML / CSS / JavaScript 搭起来的个人站点，没有框架、没有构建、没有第三方依赖，界面支持 30 种语言切换。改完文件 `git push`，GitHub Pages 自动发布。

**线上地址：<https://wang-sunyang.github.io/>**

![GitHub Pages](https://img.shields.io/badge/hosting-GitHub%20Pages-2ea44f)
![No build](https://img.shields.io/badge/build-none-blue)
![No deps](https://img.shields.io/badge/dependencies-0-lightgrey)
![Languages](https://img.shields.io/badge/languages-30-0e9887)
![Theme](https://img.shields.io/badge/theme-dark%20%2F%20light-5eead4)

## 文档索引

| 入口 | 内容 |
| --- | --- |
| [笔记更新指南](docs/notes-guide.md) | 加新文章、改分类、接上一篇/下一篇、补词条的完整步骤 |
| [拾光 OneStar 文档](https://github.com/wang-sunyang/onestar/blob/main/docs/README.md) | 姊妹仓库：安卓构建与发版规范 |
| [跨平台开发与发布总纲](https://github.com/wang-sunyang/onestar/blob/main/docs/cross-platform-release-plan.md) | 六生态时间表与 12 道发布闸门 |

## 目录

- [文档索引](#文档索引)
- [仓库里有什么](#仓库里有什么)
- [页面一览](#页面一览)
- [技术实现](#技术实现)
- [界面语言](#界面语言)
- [本地预览](#本地预览)
- [写一篇新笔记](#写一篇新笔记)
- [部署方式](#部署方式)
- [命名与路径约定](#命名与路径约定)
- [浏览器支持与降级](#浏览器支持与降级)
- [刻意保留的取舍](#刻意保留的取舍)
- [近期优化记录](#近期优化记录)
- [联系方式](#联系方式)
- [版权](#版权)

## 仓库里有什么

| 路径 | 用途 | 说明 |
| --- | --- | --- |
| `index.html` | 主页 | 单页长滚动，八个区块：首屏、关于、项目、技术栈、理念、历程、联系、快捷键 |
| `blog.html` | 笔记列表页 | 卡片列表 + 分类筛选（全部 / 前端 / 效率），带空状态提示 |
| `404.html` | 404 页 | 路径不存在时 GitHub Pages 自动使用 |
| `posts/handwritten-html.html` | 第 1 篇笔记 | 《为什么我用纯手写 HTML 做个人主页》，2026-11-08 |
| `posts/three-habits.html` | 第 2 篇笔记 | 《把重复的事交给工具：三个小习惯》，2026-10-21 |
| `posts/site-r6-optimization.html` | 第 3 篇笔记 | 《给站点做一轮减法：首屏、图标和弱网》，2026-11-26 |
| `docs/notes-guide.md` | 维护文档 | 加新文章、改分类、接上一篇/下一篇、补词条的全流程 |
| `i18n/` | 外链语言包 | 5 个页面对应 5 个子目录 × 27 种语言 = 135 个 js，选中语言时才注入 |
| `feed.xml` | RSS 2.0 订阅源 | 收录全部文章，含作者、日期与正文摘要 |
| `sitemap.xml`、`robots.txt` | 抓取入口 | sitemap 列 4 个可索引页面；robots 允许全站、屏蔽 404、声明 sitemap |
| `site.webmanifest`、`favicon-192.png`、`favicon-512.webp`、`og-cover.jpg` | 站点级资产 | manifest 提供 PWA 图标（192/512）；`og-cover.jpg` 是 1200×630 分享卡片图（PNG 原图仍在仓库，但页面已不再引用） |
| `favicon.svg`、`favicon-16.png`、`favicon-32.png`、`favicon-512.png`、`apple-touch-icon.png` | 图标 | SVG 给现代浏览器，PNG 兜底老浏览器与 iOS 主屏 |
| `favicon-192.webp`、`favicon-512.webp`、`apple-touch-icon.webp` | WebP 图标派生 | 每页 `<link rel="icon">` 追加引用，体积比 PNG 小一个数量级，PNG 保留为兜底 |

五个 HTML 文件加起来约 350 KB（内联词典外链化后从 810 KB 降下来），再加 135 个按需加载的语言包、站点级资产和文档。没有 `package.json`、没有 `node_modules`、没有构建产物——克隆下来，仓库本身就是线上站点。

## 页面一览

**主页 `index.html`**

- 首屏：名字、定位（学生 · 前端 / 设计 / AI 工具）、两个入口按钮（项目 / 笔记）
- 关于：一段自我介绍和四个数字（项目、工具、笔记、语言）
- 项目：五张卡 —— 本站、笔记合集、效率小实验、安卓应用、多语言这一层本身
- 技术栈：语言与工具，写的是我实际能用的东西，不打百分比
- 理念：四条选工具的原则
- 历程：从「网站到底是怎么来的」到「探索与积累」
- 联系：邮箱、微信、工作室、GitHub
- 快捷键：键盘与手势速查

**笔记页 `posts/*.html`**

每篇都是一个独立 HTML 文件，骨架一致：`<title>` + `meta description` + `article:published_time`、`.art-meta`（分类 · 日期 · 阅读时长）、`<h1>`、`.toc`（窄屏收进抽屉）、`.prose` 正文、`.post-nav` 上一篇 / 下一篇。

## 技术实现

### 没有构建

不用 Jekyll / Hexo / Vite，理由很简单：站点就这几页，构建链意味着每次改一个词都要装环境、跑命令、等产物。现在的模式是「文件即站点」：存盘、推送、上线。任何人看 view-source，看到的就是正在跑的东西。

代价是样式在四个页面上下文中重复内联（主页、列表、404、文章模板），改一个颜色要改四处。这份重复是有意留的——换来的是零依赖和零等待。

### 双主题

- 主题由 `<html data-theme="dark|light">` 驱动，两套 CSS 变量：深色底色 `#060a14`，浅色底色 `#f6f7fb`，强调色 `#5eead4` 与 `#0e9887`
- 右上角按钮把选择写进 `localStorage`；访客没选过之前跟随系统 `prefers-color-scheme`，并监听系统变化
- 关键细节：`<head>` 里一段同步脚本在**首次绘制之前**就设好 `data-theme`，深色访客不会看到白屏闪一下
- 切换时同步更新 `meta[name="theme-color"]`，手机浏览器地址栏跟着变色

### 字体与响应式

- 系统字体栈：`-apple-system` / `Segoe UI` / `PingFang SC` / `HarmonyOS Sans SC` / `Hiragino Sans GB` / `Microsoft YaHei`，不加载网络字体，没有 FOUT
- 按文种切换字体：孟加拉语走 `Noto Sans Bengali`；阿拉伯—波斯—希伯来字体栈（`Segoe UI`、`Tahoma`、`Noto Naskh Arabic`、`Noto Sans Hebrew`）覆盖 `ar` / `he` / `fa` / `ur` / `sd` / `ps`
- 标题与间距用 `clamp()` 连续缩放（例如 `clamp(56px, 9vw, 82px)`），不是堆一堆断点
- 栅格在三档断点（920 / 820 / 620px）收窄：三列 → 两列 → 一列；两列首屏在窄屏上下堆叠

### 交互

- 顶部阅读进度条，用 `requestAnimationFrame` 节流，每帧最多算一次
- 区块淡入上移用 `IntersectionObserver`，不挂 `scroll` 监听
- 笔记列表的分类筛选是纯前端：按 `data-cat` 匹配，切换时更新 `aria-pressed`，无结果显示空状态

### 可访问性

- 每页第一个可聚焦元素都是「跳到正文」链接，指向 `#main`
- 导航、文章目录、上一篇/下一篇都带 `aria-label`；装饰性箭头与分隔符标了 `aria-hidden="true"`
- 主题按钮用 `aria-pressed` 表达状态，并改写 `aria-label` 描述目标状态（「切换到浅色模式」/「切换到深色模式」）
- 语言面板是真 `<button>`，打开后是一份列表框式清单，每项有母语名与英文名，当前项用 `aria-pressed` 标记
- `prefers-reduced-motion: reduce` 下关闭淡入与平滑滚动
- 语义结构：一个 `<h1>`，区块用 `<section>` + `<h2>`，正文用 `<p>` / `<ul>` / `<pre><code>`

### 分享与索引

- 每页都有 `canonical`、`description`、`og:*`、`twitter:card`
- 文档语言写在 `<html lang>`，方向写在 `<html dir>`：阿拉伯语、希伯来语、波斯语、乌尔都语切到 `dir="rtl"`，布局靠逻辑属性加少量 `[dir="rtl"]` 覆盖完成镜像
- favicon 是内联 `data:` SVG（深色圆角方块加一个「王」字），不额外发请求
- `meta name="color-scheme"` 声明明暗双支持，表单控件与滚动条跟随主题

## 界面语言

每页自带一份 30 语言清单（`LANGS`），但词典拆成两层：内联只放 `zh` / `zh-TW` / `en` 三种（首屏必需），其余 27 种放在同源的 `i18n/<页面>/<语言>.js` 里，选中该语言时才注入一次，之后走浏览器缓存。全站没有第三方请求：没有 Google 翻译挂件、没有 i18n 库、没有 JSON 接口。

**语言列表：** `zh` `zh-TW` `en` `ja` `ko` `fr` `de` `es` `pt` `it` `ru` `uk` `pl` `nl` `tr` `ar` `hi` `id` `vi` `th` `el` `sv` `cs` `ro` `bn` `ur` `ms` `tl` `he` `fa`

### 切换是怎么发生的

1. 右上角面板把选择写进 `localStorage.lang`
2. `applyLang(code)` 设置 `<html lang>` 与 `<html dir>`，再遍历所有带 `data-i18n="路径"`（文本）或 `data-i18n-aria="路径"`（无障碍名称）的元素，把该路径上的值写进去
3. 同时更新 `<title>`、`meta[name="description"]`、`og:title` / `og:description`、语言按钮文字、`aria-pressed` 标记与文章正文容器
4. 首次访问没有存过选择：从 `navigator.language` 取语言（`pt-BR` → `pt`），取不到回落中文

### 缺词条不会出现空白

渲染之前有一段 IIFE，会用 `I18N.en` 深度补齐每份词典：某语言没定义的键，直接从英文复制。所以只翻了一半的页面照样是完整英文，而不是空框。

**这对文章正文意味着什么。** 界面、导航、文章标题、摘要、分类、日期在 30 种语言里都是译好的；文章**正文**完整翻译的有 20 种：

| 正文覆盖 | 语言 |
| --- | --- |
| 正文已完整翻译（20） | `zh` `zh-TW` `en` `ja` `ko` `fr` `de` `es` `pt` `it` `ru` `uk` `pl` `nl` `tr` `ar` `hi` `id` `vi` `th` |
| 仅界面翻译、正文显示英文（10） | `el` `sv` `cs` `ro` `bn` `ur` `ms` `tl` `he` `fa` |

这十种语言下，页面会如实说明，而不是假装完整：正文顶部有一条提示，说明正文目前只有中文与英文版本，提示文案本身用该语言书写。提示由 `#bodyNote` 渲染，只在当前语言没有自己的正文时出现。

### 加一种语言

三步，不用构建：

1. 加一个 `I18N.xx = { ... }` 对象，想翻多少键写多少键——没翻的键自动回落到英文
2. 往 `LANGS` 里 `push` 一项 `{code:"xx", native:"…", sub:"…"}`
3. 如果这种文字不是拉丁字母，补一条 `html:lang(xx)` 字体规则

文案里的语言数量不是硬编码：项目卡与数字区在运行时读 `LANGS.length`（`{n}` 占位符 + `syncLangUI()`），加语言不需要再去正文里找数字。

## 本地预览

页面用相对路径，直接双击文件大多能看——但本地起个服务器更稳，因为 `file://` 下路径解析和 `localStorage` 行为都会变：

```bash
git clone https://github.com/wang-sunyang/wang-sunyang.github.io.git
cd wang-sunyang.github.io
python3 -m http.server 8000
# 打开 http://localhost:8000/
```

## 写一篇新笔记

完整清单在 [`docs/notes-guide.md`](docs/notes-guide.md)，要点如下：

1. 复制 `posts/three-habits.html` 当模板，改名成小写英文加短横线（例如 `css-layout-notes.html`）
2. 改六处：`<title>`、`meta description`、`article:published_time`、`.art-meta`、`<h1>`、`.prose` 正文
3. 同一页词典里把这六个值也改掉（至少 `I18N.zh` 与 `I18N.en` 的 `title`、`desc`、`cat`、`date`、`read`、`nextTitle`、`body`）——访客实际读到的是词典，不是 HTML 里的字，漏了这一步页面会显示上一篇文章的标题
4. 底部 `.post-nav`：左边指向前一篇，右边指向后一篇；没有就留 `<div class="empty-slot">`
5. 在 `blog.html` 的 `<ul class="post-list">` **最上面**插入新卡片（最新的在最前），同步改筛选按钮上的 `count`，并把这张卡的 `title` / `desc` / `date` / `read` 写进 `blog.html` 的 `I18N`
6. 推送，等 Pages 构建

## 部署方式

- 托管：GitHub Pages，源为 `main` 分支根目录
- 域名：`wang-sunyang.github.io`，没有 `CNAME`，没有自定义域名
- 没有 GitHub Actions：没有东西需要构建，Pages 直接按文件发布
- 发布延迟：推送后通常几十秒；缓存没刷就强制刷新（Ctrl/Cmd + Shift + R）

## 命名与路径约定

| 约定 | 说明 |
| --- | --- |
| 文章文件名 | 小写英文加短横线。中文名也能用，但网址会变成一长串 `%E4%B8%AD%E6%96%87`，不好分享 |
| 语言代码 | 与 `LANGS` 一致，按 BCP 47：`zh-TW` 保留地区子标签，其余都是主语言标签 |
| 相对路径 | `posts/` 内部互相链接**不加** `../`；回主页或列表页才写 `../index.html`、`../blog.html` |
| 分类一致 | 卡片的 `data-cat` 与筛选按钮的 `data-filter` 必须完全相同（含空格），差一个字就筛出空白 |
| 日期 | 文章页 `article:published_time` 与列表页 `<time datetime>` 两处都要改 |
| 代码块转义 | 正文里的 `<` 和 `>` 要写成 `&lt;` 与 `&gt;`，否则被浏览器当标签吃掉 |
| 词典键 | 嵌套路径如 `postnav.next`、`aria.articleNav`；某语言有的键必须在 `I18N.en` 里也存在，否则英文补齐无从可补 |

## 浏览器支持与降级

面向近两年主流浏览器（Chrome / Edge / Safari / Firefox，含移动端）。用到的都是稳定特性：CSS 变量、Grid、`clamp()`、`IntersectionObserver`、逻辑属性。

已有的兜底：

- `localStorage` 读写全部包在 `try/catch` 里——无痕模式会抛错，主题与语言降级到系统默认，页面不会崩
- 没有 `matchMedia(...).addEventListener` 的环境退回 `addListener`
- `prefers-reduced-motion` 生效时关掉所有动效，只留静态样式
- 当前语言缺某个键就用英文；整份词典都缺就回落中文

## 刻意保留的取舍

- **样式在四个页面上下文里重复**：主页、列表、404、文章各带一份内联 CSS。改颜色或间距要动四个文件——换来零构建、零请求
- **词典拆成内联 + 外链两层**：首屏必需的三种语言内联，其余 27 种按需加载。好处是首屏 HTML 从 247 KB 降到 106 KB；代价是首次切到冷门语言会多一次同源请求（约 4–7 KB），离线环境只能在三种内联语言之间切换，其余语言退回英文
- **十种语言的正文是英文**：把一篇五千字的文章再手翻十种语言，标签容易错、也永远不同步。提示条是诚实的折中；界面、标题、元信息在所有语言下都已翻译
- **笔记靠手动维护**：加一篇要复制模板、改内容、补词条、加卡片。超过二十篇左右，才值得写本地生成脚本
- **没有分语言网址**：没有 `/en/` 或 `?lang=` 变体，搜索引擎每个网址只索引一份页面，语言选择存在本地。要做静态分语言副本，文件数要乘 30——正好违背初衷
- **没有分语言网址的 sitemap 变体**：`sitemap.xml` 只列 4 个可索引页面（404 已排除），每个 URL 一份，不按语言拆分
- **深色模式不处理图片**：现在站内没有照片。将来要放，每张图得准备两版或加滤镜

## 近期优化记录（2026-11-26）

- **首屏可见性不再依赖隐藏 body**：此前目标语言不是中文时会隐藏正文防闪；现在改为 body 始终可见、仅靠底色防闪，并收紧 i18n 兜底到 300ms。语言包慢或失败时直接展示已渲染的内容，不再白屏。
- **分享图与图标大幅收敛**：`og-cover.png` 转为 JPEG（-58.8%），三个 favicon PNG 量化到 256 色后各省约 1–14 KB，另新增 `favicon-*.webp` 派生。`favicon-512` 每次导航都会请求，单次少下约 63 KB。
- **Service Worker 加入导航竞速**：弱网下 3 秒拿不到响应即回退缓存，避免长时间白屏；版本号升至 v20261127，五页语言包请求同步带版本参数。
- **焦点环统一为 CSS 变量**：15 处硬编码色全部改为 `var(--acc1)` / `var(--accent)`，随主题自动变色。
- **锚点滚动偏移**：新增 `:target,[id]{scroll-margin-top:96px}`，修复 sticky 顶栏下锚点跳转被标题遮挡的问题。

改动的过程、取舍和被砍掉又捡回来的方案，写在笔记里：[给站点做一轮减法：首屏、图标和弱网](posts/site-r6-optimization.html)。

## 联系方式

| 渠道 | 地址 |
| --- | --- |
| 邮箱 | [3383927177@qq.com](mailto:3383927177@qq.com) |
| 微信 | `ILOVEHUTAOMUCH` |
| GitHub | [@wang-sunyang](https://github.com/wang-sunyang) |

## 版权

仓库没有附 `LICENSE`；代码与文字的版权归作者所有。要转载文章或复用页面设计，请先通过邮箱或微信联系。
