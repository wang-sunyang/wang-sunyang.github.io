# Wang Sunyang · Personal Website

**English** · [简体中文](README.zh-CN.md)

A personal site built by hand in plain HTML / CSS / JavaScript — no framework, no build
step, no third-party dependencies, and an interface that switches between 30 languages.
Edit a file, `git push`, GitHub Pages publishes it.

**Live: <https://wang-sunyang.github.io/>**

![GitHub Pages](https://img.shields.io/badge/hosting-GitHub%20Pages-2ea44f)
![No build](https://img.shields.io/badge/build-none-blue)
![No deps](https://img.shields.io/badge/dependencies-0-lightgrey)
![Languages](https://img.shields.io/badge/languages-30-0e9887)
![Theme](https://img.shields.io/badge/theme-dark%20%2F%20light-5eead4)

## Documentation

| Entry | Covers |
| --- | --- |
| [Note workflow guide](docs/notes-guide.md) | Adding a post, categories, prev/next wiring, dictionary entries — the full checklist |
| [OneStar docs](https://github.com/wang-sunyang/onestar/blob/main/docs/README.md) | Sister repo: Android build and release specs |
| [OneStar cross-platform plan](https://github.com/wang-sunyang/onestar/blob/main/docs/cross-platform-release-plan.md) | Six-ecosystem timeline and the 12 release gates |

## Contents

- [Documentation](#documentation)
- [What is in the repository](#what-is-in-the-repository)
- [Pages](#pages)
- [How it is built](#how-it-is-built)
- [Interface languages](#interface-languages)
- [Local preview](#local-preview)
- [Writing a new note](#writing-a-new-note)
- [Deployment](#deployment)
- [Naming and path conventions](#naming-and-path-conventions)
- [Browser support and fallbacks](#browser-support-and-fallbacks)
- [Deliberate trade-offs](#deliberate-trade-offs)
- [Recent optimizations](#recent-optimizations)
- [Contact](#contact)
- [Copyright](#copyright)

## What is in the repository

| Path | Purpose | Notes |
| --- | --- | --- |
| `index.html` | Home page | Single long-scroll page, eight sections: hero, about, projects, stack, philosophy, journey, contact, shortcuts |
| `blog.html` | Notes list | Card list plus category filter (all / frontend / productivity), with an empty-state hint |
| `404.html` | 404 page | GitHub Pages serves this automatically for unmatched paths |
| `posts/handwritten-html.html` | Note 1 | "Why I build my personal site in hand-written HTML", 2026-11-08 |
| `posts/three-habits.html` | Note 2 | "Hand the repetitive work to tools: three small habits", 2026-10-21 |
| `posts/site-r6-optimization.html` | Note 3 | "A round of subtraction: first paint, icons and weak networks", 2026-11-26 |
| `docs/notes-guide.md` | Maintenance doc | Full steps for adding a post, changing categories, wiring prev/next, adding dictionary entries |
| `i18n/` | On-demand language packs | Five page directories x 27 languages = 135 JS files, injected only when that language is picked |
| `feed.xml` | RSS 2.0 feed | Every post, with author, date and body excerpt |
| `sitemap.xml`, `robots.txt` | Crawl entry points | sitemap lists the 4 indexable pages; robots allows the site, blocks 404 and declares the sitemap |
| `site.webmanifest`, `favicon-192.png`, `favicon-512.webp`, `og-cover.jpg` | Site-level assets | manifest supplies the 192/512 PWA icons; `og-cover.jpg` is the 1200x630 share card (the PNG original is still in the repo but no longer referenced) |
| `favicon.svg`, `favicon-16.png`, `favicon-32.png`, `favicon-512.png`, `apple-touch-icon.png` | Icons | SVG for modern browsers, PNG fallbacks for older ones and the iOS home screen |
| `favicon-192.webp`, `favicon-512.webp`, `apple-touch-icon.webp` | WebP icon derivatives | Extra `<link rel="icon">` entries on every page; an order of magnitude smaller than the PNGs, which stay as fallbacks |

Five HTML files, about 350 KB in total (down from 810 KB once the dictionaries moved off-page),
plus 135 on-demand language packs, site-level assets and docs. No `package.json`, no
`node_modules`, no build output — clone it and the repository *is* the published site.

## Pages

**Home `index.html`**

- Hero: name, positioning (student · frontend / design / AI tooling), two entry buttons (projects / notes)
- About: a short self-introduction and four figures (projects, tools, notes, languages)
- Projects: five cards — this site, the notes collection, small productivity experiments, an Android app, and the i18n layer itself
- Stack: languages and tools, described as things I can actually use, no percentages
- Philosophy: four principles on how I choose tools
- Journey: from "how does a website even work" to "exploring and accumulating"
- Contact: email, WeChat, studio, GitHub
- Shortcuts: a keyboard and gesture cheatsheet

**Notes `posts/*.html`**

Each post is a standalone HTML file with the same skeleton: `<title>` + `meta description` +
`article:published_time`, `.art-meta` (category · date · reading time), `<h1>`, `.toc` (collapses
into a drawer on narrow screens), `.prose` body, and `.post-nav` for previous / next.

## How it is built

### No build step

I chose hand-written HTML over Jekyll / Hexo / Vite for a simple reason: the site is a handful of
pages, and a build chain means installing an environment, running a command and waiting for output
every time a single word changes. The current model is "the file is the site": save, push, live.
What anyone sees in view-source is exactly what is running.

The cost is that styles are duplicated inline across four page contexts (home, list, 404, article
template), so a colour change happens in four places. That repetition is deliberate — it buys zero
dependencies and zero waiting.

### Dual theme

- Theme is driven by `<html data-theme="dark|light">` with two sets of CSS variables: dark
  background `#060a14`, light background `#f6f7fb`, accents `#5eead4` and `#0e9887`
- The button in the top-right corner writes the choice to `localStorage`; until the visitor picks
  one, it follows the system `prefers-color-scheme` and listens for changes
- The important detail: a small synchronous script in `<head>` sets `data-theme` **before the first
  paint**, so a dark-mode visitor never sees a white flash
- Switching also updates `meta[name="theme-color"]`, so the mobile browser address bar follows

### Typography and responsive layout

- System font stack: `-apple-system` / `Segoe UI` / `PingFang SC` / `HarmonyOS Sans SC` /
  `Hiragino Sans GB` / `Microsoft YaHei`. No web fonts are loaded, so there is no FOUT
- Script-specific stacks kick in via `html:lang(...)`: Bengali (`Noto Sans Bengali`), and a
  Arabic–Persian–Hebrew stack (`Segoe UI`, `Tahoma`, `Noto Naskh Arabic`, `Noto Sans Hebrew`)
  for `ar` / `he` / `fa` / `ur` / `sd` / `ps`
- Headings and spacing scale fluidly with `clamp()` (e.g. `clamp(56px, 9vw, 82px)`) instead of a
  pile of breakpoints
- The grid narrows at three breakpoints (920 / 820 / 620px): three columns → two → one; the
  two-column hero stacks vertically on small screens

### Interaction

- A reading-progress bar at the top, throttled with `requestAnimationFrame` to at most one
  calculation per frame
- Sections fade and rise into view via `IntersectionObserver` rather than a `scroll` listener
- Category filtering on the notes list is pure frontend: match on `data-cat`, update
  `aria-pressed` on toggle, show or hide the empty state

### Accessibility

- The first focusable element on every page is a "skip to main content" link pointing at `#main`
- Navigation, article TOC and prev/next links all carry `aria-label`; decorative arrows and
  separators are marked `aria-hidden="true"`
- The theme button expresses state with `aria-pressed` and rewrites its `aria-label` to describe
  the target state ("switch to light mode" / "switch to dark mode")
- The language panel is a real `<button>` that opens a listbox-like panel; every entry has its
  native name plus an English exonym, and `aria-pressed` marks the active one
- Under `prefers-reduced-motion: reduce`, fades and smooth scrolling are turned off
- Semantic structure: one `<h1>`, sections as `<section>` + `<h2>`, body copy as `<p>` / `<ul>` /
  `<pre><code>`

### Sharing and indexing

- Every page has `canonical`, `description`, `og:*` and `twitter:card`
- Document language is set on `<html lang>` and direction on `<html dir>`; `dir="rtl"` is applied
  for Arabic, Hebrew, Persian and Urdu, and the layout mirrors through logical properties and a
  few explicit `[dir="rtl"]` overrides
- The favicon is an inline `data:` SVG (dark rounded square with the character 王) — no extra request
- `meta name="color-scheme"` declares light and dark support so form controls and scrollbars follow
  the theme

## Interface languages

Every page carries the same 30-language list (`LANGS`), but the dictionary is split in two layers:
`zh` / `zh-TW` / `en` are inlined (what the first screen needs), the other 27 live in same-origin
files at `i18n/<page>/<code>.js` and are injected once when that language is picked, then served
from cache. Nothing comes from a third party: no Google Translate widget, no i18n library, no JSON
endpoint.

**Languages:** `zh` `zh-TW` `en` `ja` `ko` `fr` `de` `es` `pt` `it` `ru` `uk` `pl` `nl` `tr` `ar`
`hi` `id` `vi` `th` `el` `sv` `cs` `ro` `bn` `ur` `ms` `tl` `he` `fa`

### How switching works

1. The panel in the top-right writes the choice to `localStorage.lang`
2. `applyLang(code)` sets `<html lang>` and `<html dir>`, then walks every element carrying
   `data-i18n="path.to.key"` (text) or `data-i18n-aria="path.to.key"` (accessible name) and writes
   the value found at that path
3. It also updates `<title>`, `meta[name="description"]`, `og:title` / `og:description`, the
   language button label, the `aria-pressed` marks and the article body container
4. On first visit there is no stored choice: the code is taken from `navigator.language`
   (`pt-BR` → `pt`), falling back to Chinese

### Missing keys never show blanks

Before any rendering, an IIFE deep-fills every dictionary from `I18N.en`: any key a language does
not define is copied from English. So a partially translated page still renders complete text in
English instead of empty boxes.

**What that means for article bodies.** The interface, navigation, article titles, descriptions,
categories and dates are translated in all 30 languages. The article *body* is fully translated in
20 of them:

| Body coverage | Languages |
| --- | --- |
| Full translated article body (20) | `zh` `zh-TW` `en` `ja` `ko` `fr` `de` `es` `pt` `it` `ru` `uk` `pl` `nl` `tr` `ar` `hi` `id` `vi` `th` |
| Interface only, body shown in English (10) | `el` `sv` `cs` `ro` `bn` `ur` `ms` `tl` `he` `fa` |

For those ten, the page says so instead of pretending: a small notice above the article text states
that the body is currently available in Chinese and English only, and the notice itself is
translated into that language. The notice is rendered by `#bodyNote` and only appears when the
active language has no body of its own.

### Adding a language

Three steps, no build:

1. Add an object `I18N.xx = { ... }` with as many keys as you want to translate — untranslated keys
   fall back to English automatically
2. Push `{code:"xx", native:"…", sub:"…"}` into `LANGS`
3. If the script is not Latin, add a `html:lang(xx)` font rule

Language counts in the copy are not hard-coded: the projects card and the stats block read
`LANGS.length` at runtime (`{n}` placeholder + `syncLangUI()`), so adding a language never requires
hunting for numbers in prose.

## Local preview

Pages use relative paths, so double-clicking a file mostly works — but a local server is better,
because `file://` changes path resolution and `localStorage` behaviour:

```bash
git clone https://github.com/wang-sunyang/wang-sunyang.github.io.git
cd wang-sunyang.github.io
python3 -m http.server 8000
# open http://localhost:8000/
```

## Writing a new note

The full checklist lives in [`docs/notes-guide.md`](docs/notes-guide.md). The essentials:

1. Copy `posts/three-habits.html` as the template and rename it to lowercase English with hyphens
   (e.g. `css-layout-notes.html`)
2. Change six places: `<title>`, `meta description`, `article:published_time`, `.art-meta`, `<h1>`,
   and the `.prose` body
3. Change the same six values inside the page dictionary (`I18N.zh` and `I18N.en` at minimum:
   `title`, `desc`, `cat`, `date`, `read`, `nextTitle`, `body`) — the dictionary, not the markup,
   is what visitors actually read, so skipping this step makes the page show the old article's
   title
4. Update `.post-nav` at the bottom: left points to the previous post, right to the next; leave
   `<div class="empty-slot">` where there is none
5. Insert the new card at the **top** of `<ul class="post-list">` in `blog.html` (newest first),
   update the `count` in the filter buttons, and add the card's `title` / `desc` / `date` / `read`
   entries to `I18N` in `blog.html`
6. Push and wait for the Pages build

## Deployment

- Hosting: GitHub Pages, source = `main` branch, repository root
- Domain: `wang-sunyang.github.io` — no `CNAME` file, no custom domain
- No GitHub Actions workflow: nothing needs building, Pages just serves the files as they are
- Publish delay: usually a few tens of seconds after pushing; force-reload (Ctrl/Cmd + Shift + R) if
  a cache is still warm

## Naming and path conventions

| Convention | Notes |
| --- | --- |
| Post filename | Lowercase English with hyphens. Chinese names work, but the URL becomes a long `%E4%B8%AD%E6%96%87` string that is awkward to share |
| Language codes | BCP 47 as used by `LANGS`: `zh-TW` keeps its region subtag, everything else is a bare primary tag |
| Relative paths | Links between files inside `posts/` **omit** `../`; links back to the homepage or list use `../index.html`, `../blog.html` |
| Category consistency | A card's `data-cat` and a filter button's `data-filter` must match exactly, spaces included — one character off and the filter shows nothing |
| Dates | Both the post's `article:published_time` and the list's `<time datetime>` must be updated |
| Escaping in code blocks | `<` and `>` in body text must be written `&lt;` and `&gt;`, or the browser eats them as tags |
| Dictionary keys | Nested paths such as `postnav.next` or `aria.articleNav`; a key present in one language must exist in `I18N.en`, or the English fill has nothing to copy |

## Browser support and fallbacks

Targets the major browsers of the last two years (Chrome / Edge / Safari / Firefox, mobile
included). Everything used is a stable feature: CSS variables, Grid, `clamp()`,
`IntersectionObserver`, logical properties.

Fallbacks in place:

- All `localStorage` reads and writes are wrapped in `try/catch` — private mode throws, and both
  theme and language degrade to the system default without breaking the page
- Where `matchMedia(...).addEventListener` is unavailable, it falls back to `addListener`
- With `prefers-reduced-motion` active, all motion is disabled and only static styling remains
- If a dictionary key is missing in the active language, English is used; if the whole dictionary
  is, the page falls back to Chinese

## Deliberate trade-offs

- **Styles duplicated across four page contexts**: home, list, 404 and article each carry their own
  inline CSS. A colour or spacing change touches four files — the payoff is zero build and zero
  requests
- **Dictionary split into inline + on-demand layers**: the three languages the first screen needs
  are inlined, the other 27 load on demand. The upside is first-paint HTML of 106 KB instead of
  247 KB; the cost is one same-origin request (4-7 KB) the first time a rarer language is picked,
  and offline visitors can only switch among the three inlined languages - everything else falls
  back to English
- **Ten languages show an English article body**: translating a 5,000-character article into ten
  more languages by hand is error-prone in markup and impossible to keep in sync. The notice bar is
  the honest compromise; UI, titles and metadata are translated everywhere
- **Posts are maintained by hand**: adding one means copying the template, editing content,
  extending the dictionary and adding a card. A local generator becomes worth writing past roughly
  twenty posts
- **No per-language URLs**: there is no `/en/` or `?lang=` variant, so search engines index one
  page per URL and the choice is stored locally. Adding static per-language copies would multiply
  the file count by 30 — the opposite of the whole idea
- **No per-language sitemap variants**: `sitemap.xml` lists the 4 indexable pages (404 excluded),
  one URL each, not split by language
- **No dark-mode image handling**: the site uses no photos today. If that changes, each image needs
  two variants or a filter

## Recent optimizations (2026-11-26)

- **First-screen visibility no longer hides the body**: previously, when the target language was
  not Chinese, `body{visibility:hidden}` was used to avoid a flash of untranslated text; the body
  now stays visible with only a background colour for flash prevention, and the i18n fallback was
  tightened from 1200ms to 300ms — if a language pack is slow or fails, already-rendered content
  appears immediately instead of a blank screen
- **Share card and icons shrank**: `og-cover.png` converted to JPEG (-58.8%, 142 KB → 57 KB, PSNR
  39.88 dB); three favicon PNGs quantised to 256 colours (‑79% to ‑89%); new `favicon-*.webp`
  derivatives added as `<link>` entries. `favicon-512` is requested on every navigation, so each
  visit now downloads roughly 63 KB less
- **Service Worker navigation race**: `sw.js` now injects a 3-second `navTimeout` that falls back to
  the cached copy on weak networks instead of waiting indefinitely; cache version bumped to
  `v20261127` and the five pages' language-pack URLs carry `?v=20261127`
- **Focus ring unified into a CSS variable**: 15 hard-coded `rgba(120,170,255,.85)` values replaced
  with `var(--acc1)` / `var(--accent)`, so the ring follows the theme — note that the home / list /
  404 pages use `--acc1` while the two article pages use `--accent`, and the two naming systems are
  not interchangeable
- **Anchor scroll offset**: `:target,[id]{scroll-margin-top:96px}` added to all five pages so that
  jumping to a heading no longer hides it under the sticky header

The reasoning, the trade-offs and the options I tried and dropped are in the note:
[A round of subtraction: first paint, icons and weak networks](posts/site-r6-optimization.html).

## Contact

| Channel | Address |
| --- | --- |
| Email | [3383927177@qq.com](mailto:3383927177@qq.com) |
| WeChat | `ILOVEHUTAOMUCH` |
| GitHub | [@wang-sunyang](https://github.com/wang-sunyang) |

## Copyright

No `LICENSE` file is attached; copyright in the code and the text belongs to the author. To
republish an article or reuse the page design, get in touch by email or WeChat first.
