# wenfang-themes（DSH 主题包）

Wenfang · 文房六色 的 DeepSeek Harness 主题插件。一个包注册六个主题：

| DSH 主题 id | 名称 | colorScheme |
| --- | --- | --- |
| `文房·玄墨` | 玄墨 | dark |
| `文房·玄墨·暗` | 玄墨 Dimmed | dark |
| `文房·宣纸` | 宣纸 | light |
| `文房·宣纸·暗` | 宣纸 Dimmed | light |
| `文房·沧海` | 沧海 | dark |
| `文房·青瓷` | 青瓷 | light |

> id 同时是 dsh-market 主题卡片的显示标签；早期 ASCII id（`wenfang-xuanmo` 等）会在
> 加载时自动迁移。

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

## 实测记录（2026-11-07，隔离 profile + 无头 Chrome，两轮）

在独立 profile 里 `dsh plugin add link:…` 安装，再用 Playwright 驱动 Chrome 真实加载页面，
核对 `body` 上的内联 token。两轮共发现并修复四处问题：

1. **异步 adoption 会把主题打回内置**（第一轮：durable 偏好 = `system`）：`apply()` 里
   `setTheme()` 成功后，ui-theme 随后从 Host 设置 adopt，preference 被重置，页面停在内置
   配色（`initialized` 已写入、`active` 缺失、`body` 无 `--dsw-alias-*`）。
2. **adopt 的值不一定等于 boot 时的默认值**（第二轮：durable 偏好 = `dark`）：第一版修复
   用「preference 是否回到 boot 值」判断，durable `dark` 与 boot 默认 `system` 不同，于是被
   误判成用户选择、停止恢复。实测轨迹：500ms 时玄墨生效，800ms 被打回内置。
   最终修复：包装 `ctx.theme.setTheme` 区分「显式选择」（UI / 市场 / 我们的恢复调用）与
   「adopt」（不经 setTheme 直接改 preference）；对后者持续重新 `setTheme(target)`。
   若服务对象不可包装，退化为 6 秒窗口内对所有内置偏好重新断言。
   回归测试见 `scripts/test-client.mjs` 第 7–10 条。
3. **发送按钮不吃 brand token**：真实渲染里 `--dsw-alias-brand-primary` 已是 `#126e82`，
   发送按钮仍是内置 DeepSeek 蓝 `#4176e6`——它走 `--dsw-alias-button-info-fill`。
   已把该 token 与 hover 映射到 accent。
4. **Codex 的 `skill` 色没有 DSH 对等物**：曾映射到 `--dsw-alias-state-business-tertiary`，
   真实渲染里它给「预览版」徽章上了紫色。已移除映射，`skill` 保持 Codex-only。

验证覆盖：首次安装 → 玄墨生效（`#14131a`）并在 adopt 后保持；刷新恢复；切换到沧海
（`#0d1822`）；在设置里显式点「浅色」→ 回落内置且刷新后不被抢回；切回自选调色板正常。

## 坑（与官方契约相关）

- `inject: ['theme']` 必须声明；客户端 `apply()` 抛错会导致整页 boot 失败。
- 注册 id 不能是 `system`；重复注册同名 id 会抛错。
- `--dsw-*` 目前只对 14 个名字有显式目录，其余名字是 best-effort：
  写了但未被消费的 token 无害，但**必须真的渲染验证过**再当成能力宣传。
- 包名/`engines.dsh`/`dsh.client` 改动后要重启；纯 `lib/client.js` 改动刷新页面即可。
