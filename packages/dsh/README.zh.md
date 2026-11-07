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

## 坑（与官方契约相关）

- `inject: ['theme']` 必须声明；客户端 `apply()` 抛错会导致整页 boot 失败。
- 注册 id 不能是 `system`；重复注册同名 id 会抛错。
- `--dsw-*` 目前只对 14 个名字有显式目录，其余名字是 best-effort：
  写了但未被消费的 token 无害，但**必须真的渲染验证过**再当成能力宣传。
- 包名/`engines.dsh`/`dsh.client` 改动后要重启；纯 `lib/client.js` 改动刷新页面即可。
