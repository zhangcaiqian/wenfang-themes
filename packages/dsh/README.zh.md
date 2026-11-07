# wenfang-themes（DSH 主题包）

Wenfang · 文房六色 的 DeepSeek Harness 主题插件。一个包注册六个主题：

| DSH 主题 id | 名称 | colorScheme |
| --- | --- | --- |
| `wenfang-xuanmo` | 玄墨 | dark |
| `wenfang-xuanmo-dimmed` | 玄墨 Dimmed | dark |
| `wenfang-xuanzhi` | 宣纸 | light |
| `wenfang-xuanzhi-dimmed` | 宣纸 Dimmed | light |
| `wenfang-canghai` | 沧海 | dark |
| `wenfang-qingci` | 青瓷 | light |

## 安装

```sh
dsh plugin --profile web add wenfang-themes          # 发布后
dsh plugin --profile web add link:/abs/path/to/wenfang-themes/packages/dsh   # 本地开发
```

装完重启 DSH（或刷新页面）。在 **设置 → 插件市场 → 主题 Tab → 已注册调色板**里切换；
市场会把本包当成一个主题条目（互斥开关），六套配色在包内切换。

## 机制

- `lib/client.js` 由 `scripts/build.mjs` 从 `themes/wenfang.json` 生成，**不要手改**。
- 六个 `ThemeDefinition` 在 `apply()` 里一次注册；选中项存 `localStorage`
  （`wenfang-themes:active`），下次启动重放——第三方主题 id 不会进 DSH 的 settings schema。
- 首次安装时按当前明暗偏好自动选最接近的一套（`wenfang-themes:initialized` 只写一次）；
  之后用户切回内置 light/dark，本插件不会再抢。
- token 推导见 `scripts/lib/dsh.mjs`：五个 Codex 颜色（surface / ink / accent /
  diffAdded / diffRemoved）推出一组 `--dsw-*`；设计者要钉某个值就写该 variant 的
  `dsh.tokenOverrides`。

## 实测记录（2026-11-07，隔离 profile + 无头 Chrome）

在 `DSH_HOME=/tmp/dsh-wf-home` 的独立 profile 里 `dsh plugin add link:…` 安装，再用
Playwright 驱动 Chrome 真实加载页面核对 `body` 上的内联 token，发现并修了三处问题：

1. **异步 adoption 会把主题打回内置**：`apply()` 里 `setTheme()` 成功后，
   ui-theme 随后从 Host 设置 adopt `system/light/dark`，preference 被重置，页面停在
   内置配色（当时 `wenfang-themes:initialized` 已写入、`active` 缺失、`body` 没有任何
   `--dsw-alias-*`）。修复：4 秒 restore 窗口内，只要 preference 回到 boot 时的内置值
   就重新 `setTheme(target)`（最多 8 次）；换成**另一个**内置值视为用户选择，立即停手。
   回归测试见 `scripts/test-client.mjs` 的第 7、8 条。
2. **发送按钮不吃 brand token**：真实渲染里 `--dsw-alias-brand-primary` 已是
   `#126e82`，发送按钮仍是内置 DeepSeek 蓝 `#4176e6`——它走
   `--dsw-alias-button-info-fill`。已把该 token 及 hover 映射到 accent。
3. **Codex 的 `skill` 色没有 DSH 对等物**：曾映射到 `--dsw-alias-state-business-tertiary`，
   真实渲染里它给「预览版」徽章上了紫色。已移除映射，`skill` 保持 Codex-only。

验证覆盖：首次安装 → 玄墨生效（`#14131a`）；刷新恢复；切到青瓷（`#e8f0ec`，明色）；
清空选择后回落到内置（无 token 覆盖）。

## 坑（与官方契约相关）

- `inject: ['theme']` 必须声明；客户端 `apply()` 抛错会导致整页 boot 失败。
- 注册 id 不能是 `system`；重复注册同名 id 会抛错。
- `--dsw-*` 目前只对 14 个名字有显式目录，其余名字是 best-effort：
  写了但未被消费的 token 无害，但**必须真的渲染验证过**再当成能力宣传。
- 包名/`engines.dsh`/`dsh.client` 改动后要重启；纯 `lib/client.js` 改动刷新页面即可。
