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
node tools/verify_b.js    # 静态 73 条：语法 / CSS / 元信息 / aria / 兜底 / 标题层级 / 函数漂移
node tools/verify_rt.js   # 运行时 75 条：jsdom 逐页验证语言切换、aria 本地化、主题跟随
```

- 失败时退出码为 1，可直接挂 `pre-commit` 或 CI。
- `verify_rt.js` 需要 `jsdom`：`npm i jsdom --no-save`（或装到 `tools/node_modules`）。
- `verify_baseline.json` 是共有函数体哈希基线（27 个共有，已知差异 `__renderLang`、`sync`）。**有意改动共享函数后需删掉该文件重新生成**，否则新增漂移会被判为回归。
- 断言与具体取值绑定，修改设计（如主色、文字色、兜底时长）时需同步更新断言白名单，切勿放宽到「只要不报错」。
*（内容由AI生成，仅供参考）*
