# wenfang-themes (DeepSeek Harness theme bundle)

Six Chinese-aesthetic appearance palettes for DeepSeek Harness — ink, paper, sea and
porcelain, three dark and three light. One package registers all six; switching is
instant and the choice survives reloads.

| DSH theme id | Name | colorScheme |
| --- | --- | --- |
| `文房·玄墨` | Xuanmo | dark |
| `文房·玄墨·暗` | Xuanmo Dimmed | dark |
| `文房·宣纸` | Xuanzhi | light |
| `文房·宣纸·暗` | Xuanzhi Dimmed | light |
| `文房·沧海` | Canghai | dark |
| `文房·青瓷` | Qingci | light |

## Install

```sh
dsh plugin --profile web add wenfang-themes                    # npm (after publishing)
dsh plugin --profile web add github:zhangcaiqian/wenfang-themes#path:/packages/dsh
```

Restart DSH (or reload the page), then open **Settings → Plugin market → Themes →
registered palettes** and pick one. On first install the bundle selects the closest
dark/light variant for the current appearance preference.

## How it works

- `lib/client.js` is generated from `themes/wenfang.json` — do not edit it by hand.
- Six `ThemeDefinition`s are registered in `apply()`; the active choice is stored in
  `localStorage` (`wenfang-themes:active`) and replayed on the next boot, because
  third-party theme ids never reach the settings schema.
- Token derivation lives in `scripts/lib/dsh.mjs`: five hand-tuned Codex colors
  (surface / ink / accent / diffAdded / diffRemoved) expand into ~30 `--dsw-*` tokens
  per variant; a designer can pin any value with `dsh.tokenOverrides`.
- `ctx.theme.setTheme` is wrapped to tell the theme service's asynchronous settings
  adoption apart from an explicit user choice, so an adopted built-in preference does
  not knock the selected palette out after boot.

## Notes

- `inject: ['theme']` is mandatory; a throw inside a client `apply()` fails the whole
  web boot.
- Theme ids must stay short: the market renders the id as the palette card label, and
  long ids push the card's action button onto two lines.
- `--dsw-*` has an explicit directory of only 14 names; everything else is
  best-effort and must be verified in a real render.

License MIT. Palette inspiration: Inkstone · 墨观 (see NOTICE).
