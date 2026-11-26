---
AIGC:
    Label: "1"
    ContentProducer: 001191440300708461136T1XGW3
    ProduceID: c89c46a52b1993ff8b79dee75a9eac4a_58d63f46e8ed11f1aa8b525400dc9a98
    ReservedCode1: v91jl/WclKeiEV5t/LqDLJf8dW5c2PoH3I+dlo68Rrr/ccC3HlvcOu4nT4sqX7oC+KX3iJJ/nb7Z3A1Bj9UC4zgI43kXizXmDYVF9C9wSwyWOiLlq+1JZ9INQzew0vltLKI7CmRumZ4XGEwNlhJOfOVPTPn6i1YHUUTu26ZfrGo+PrvEHVPxG0xwmy0=
    ContentPropagator: 001191440300708461136T1XGW3
    PropagateID: c89c46a52b1993ff8b79dee75a9eac4a_58d63f46e8ed11f1aa8b525400dc9a98
    ReservedCode2: v91jl/WclKeiEV5t/LqDLJf8dW5c2PoH3I+dlo68Rrr/ccC3HlvcOu4nT4sqX7oC+KX3iJJ/nb7Z3A1Bj9UC4zgI43kXizXmDYVF9C9wSwyWOiLlq+1JZ9INQzew0vltLKI7CmRumZ4XGEwNlhJOfOVPTPn6i1YHUUTu26ZfrGo+PrvEHVPxG0xwmy0=
---

# tools/ —— 五页一致性校验

手写多页站的「漏改即报红」装置。无构建步骤，只在提交前跑一次。

```bash
node tools/verify_b.js    # 静态 138 条：语法 / CSS / 元信息 / aria / 兜底 / 标题层级 / 函数漂移 / R5 项
node tools/verify_rt.js   # 运行时 105 条：jsdom 逐页验证语言切换、aria 本地化、选中态语义、og 同步、主题跟随
```

- 失败时退出码为 1，可直接挂 `pre-commit` 或 CI。
- `verify_rt.js` 需要 `jsdom`：`npm i jsdom --no-save`（或装到 `tools/node_modules`）。
- `verify_baseline.json` 是共有函数体哈希基线（29 个共有，已知差异 `__renderLang`、`sync`）。**有意改动共享函数后需删掉该文件重新生成**，否则新增漂移会被判为回归。
- 断言与具体取值绑定，修改设计（如主色、文字色、兜底时长）时需同步更新断言白名单，切勿放宽到「只要不报错」。

## R5 新增守护（第 7 组）

| 断言 | 守护的设计决策 |
| --- | --- |
| `语言列表 radiogroup 语义` / `按钮 radio+aria-checked` / `选中态同步 aria-checked` | 语言面板是单选语义，选中态不能只靠 `.active` 视觉类 |
| `forced-colors 兜底` | Windows 高对比度下毛玻璃失效，须用 CanvasText / Highlight 保边界与选中态 |
| `无常驻 will-change:transform` | 常驻提升层在移动端代价大于收益，交给浏览器默认优化 |
| `backdrop-filter 未被误删` | 与上一条相反方向：防止「顺手清理性能属性」时误伤视觉层 |
| `__syncOG 定义+调用各一次` | og/twitter 标题、描述、locale 随语言切换，复用既有词典键不新增翻译 |
| `语言包带版本参数` | `?v=20261126` 与 `sw.js` 缓存版本号一致，避免语言包与 SW 缓存互相不认账 |
| `Service Worker 注册路径` | 首页/列表页用 `sw.js`，`posts/` 下用 `../sw.js`，scope 落到站点根 |
| `BlogPosting 含 image+dateModified` / `article 元信息补齐` | 文章结构化数据补 `image`、`dateModified`、`article:modified_time`、`article:author` |
| `sw.js` 系列 | 语法可解析、预缓存覆盖五页、三层策略（导航 network-first / i18n SWR / 静态 cache-first） |
| `图片体积未回退` | og-cover ≤150KB、favicon-512 ≤80KB、maskable ≤60KB、apple-touch ≤20KB |
*（内容由AI生成，仅供参考）*
