# Wenfang · 文房六色

**Wenfang（文房六色）** 是一套中式美学外观主题系列：墨、纸、海、瓷六种气质，深浅各半。
同一套设计 token 同时产出 **Codex** 的 `codex-theme-v1:…` 配置与 **DeepSeek Harness（DSH）** 的主题插件。

- 设计源：[`themes/wenfang.json`](./themes/wenfang.json)（唯一真源）
- 生成物：`dist/codex/*.txt`（Codex 导入行）、`dist/dsh-themes.json`、`packages/dsh/lib/client.js`
- 校验：`node scripts/check.mjs`（Codex 行逐字节回归 + DSH token 形状 + WCAG 对比度报告）

> 色板灵感致敬 [Inkstone · 墨观](https://inkstone.konata9.cc/zh/) 公开色值；系列名与品牌独立，非该站点官方主题包。见 [NOTICE](./NOTICE)。

## 六主题

| 主题 | English | variant | slug | 气质 |
| --- | --- | --- | --- | --- |
| 玄墨 | Xuanmo | dark | `xuanmo` | 松烟墨底、朱砂批注；适合夜间长时间编码。 |
| 玄墨 Dimmed | Xuanmo Dimmed | dark | `xuanmo-dimmed` | 同一方墨、灯光调暗一档；适合光线柔和的房间。 |
| 宣纸 | Xuanzhi | light | `xuanzhi` | 生宣暖白、青绿设色；适合白天浅色环境。 |
| 宣纸 Dimmed | Xuanzhi Dimmed | light | `xuanzhi-dimmed` | 陈纸暖灰、墨色更深；适合低眩光阅读。 |
| 沧海 | Canghai | dark | `canghai` | 深海暮色、青绿矿物；冷静深色画布。 |
| 青瓷 | Qingci | light | `qingci` | 月白釉底、青灰题字；适合白天与浅色桌面。 |

## Codex

Codex → Settings → Appearance → 按 `variant` 选 Dark / Light → **Import** → 粘贴整行
（须含 `codex-theme-v1:` 前缀，不要带代码围栏；`codeThemeId` 必须是 Codex 内置语法主题 id，
自定义 id 会让 Import 按钮灰掉）。

每条导入行由设计源生成，可在 [`dist/codex/`](./dist/codex/) 直接复制：

| 变体 | 文件 |
| --- | --- |
| 玄墨 | [`dist/codex/xuanmo.txt`](./dist/codex/xuanmo.txt) |
| 玄墨 Dimmed | [`dist/codex/xuanmo-dimmed.txt`](./dist/codex/xuanmo-dimmed.txt) |
| 宣纸 | [`dist/codex/xuanzhi.txt`](./dist/codex/xuanzhi.txt) |
| 宣纸 Dimmed | [`dist/codex/xuanzhi-dimmed.txt`](./dist/codex/xuanzhi-dimmed.txt) |
| 沧海 | [`dist/codex/canghai.txt`](./dist/codex/canghai.txt) |
| 青瓷 | [`dist/codex/qingci.txt`](./dist/codex/qingci.txt) |

## DeepSeek Harness（DSH）

主题以客户端插件形式发布：一个包注册六个 `ThemeDefinition`（id `wenfang-<slug>`），
在 dsh-market 的**主题 Tab → 已注册调色板**里可直接切换，选择跨刷新保留。

```sh
dsh plugin --profile web add wenfang-themes      # 发布后
dsh plugin --profile web add link:/path/to/wenfang-themes/packages/dsh   # 本地开发
```

开发回路与坑见 `packages/dsh/README.zh.md`。

## 目录

```
themes/wenfang.json        设计源（6 个 variant + 单值 palette）
fixtures/codex/*.txt       现成可用的 6 条 Codex 导入行（回归基准）
scripts/lib/codex.mjs      Codex 适配器
scripts/lib/dsh.mjs        DSH 适配器（token 推导）
scripts/build.mjs          生成 dist/ 与 packages/dsh/lib/client.js
scripts/check.mjs          结构校验 + 逐字节回归 + 对比度报告
packages/dsh/              DSH 主题包（wenfang-themes）
```

## 开发

```sh
node scripts/build.mjs     # 生成全部产物
node scripts/check.mjs     # 结构校验 + Codex 逐字节回归 + 对比度报告
node scripts/test-client.mjs  # 无浏览器跑 DSH bundle 的注册/记忆逻辑（CI 同款）
```

修改配色只需改 `themes/wenfang.json`：Codex 行、DSH token、README 表格会一起更新；
`fixtures/` 只有在**有意**改变 Codex 输出时才更新。设计者想手调某个 DSH token 时，
写进该 variant 的 `dsh.tokenOverrides`（生成时会覆盖推导值）。

## 许可

代码 MIT（见 [LICENSE](./LICENSE)）；色值灵感与出处见 [NOTICE](./NOTICE)。
