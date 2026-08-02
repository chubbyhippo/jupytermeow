# jupytermeow

[meow](https://github.com/meow-edit/meow)-style modal editing for JupyterLab,
in every CodeMirror editor — notebook cells, the file editor, console prompts.

| | |
|---|---|
| States | NORMAL / INSERT / MOTION / KEYPAD |
| Model | selection-first commands, the char-thing table, digit expand, grab and sync-grab |
| Jumps | avy-style on `S` / `Q`; `SPC w w` labels the open main-area tiles for a one-key window jump |
| Keypad | `SPC` dispatches JupyterLab commands — `SPC r r` run cell, `SPC x s` save, `SPC m x` command palette |
| Bundled keymap | `.jupytermeowrc`, every key, QWERTY by default |
| Your overrides | the `rc lines` setting in the JupyterLab Settings editor, one binding per entry — `SPC c m` takes you there |

| rc target form | Means |
|---|---|
| a meow command name | a built-in meow command |
| `<action>(id)` | a JupyterLab command id |
| anything else | a replayed key sequence |

### Colors

Each a `#RRGGBB` hex, applied to both the light and dark themes.

| Line | Colors |
|---|---|
| `set overlay-color=#2ecc71` | the avy / ace-window label background |
| `set overlay-text-color=#ffffff` | that label's text |
| `set expand-hint-color=#2b5db2` | the `0`-`9` expand hint |
| `set grab-color=#4caf50` | the grab / beacon highlight |

| Case | Result |
|---|---|
| Unset | the two label colors ship at the defaults above; expand-hint and grab keep their own built-in defaults |
| Unrecognized color key | ignored |
| Malformed hex | reported like any other rc error |

## Install

```sh
./setup.sh
```

Builds the extension and installs it into the JupyterLab on your PATH; restart
JupyterLab afterwards. `pip install .` does the same thing by hand.

## Develop

| Command | Runs |
|---|---|
| `./setup.sh --core-only` | tsc + eslint + prettier + node:test, sub-second |
| `npm run lint` | the lint gates alone |
| `npm test` | type-check, lint, then the behavior suite |
| `npm run build:labextension` | type-check, lint, then the build |

| Gate | Config |
|---|---|
| eslint | `strict-type-checked` preset — no rule overrides, no suppressions |
| tsc | `strict` plus the extra checks in `tsconfig.json`, zero errors |

| Layer | What |
|---|---|
| Editing engine | plain TypeScript, no JupyterLab imports, full behavior suite |
| JupyterLab layer | a thin adapter around it |

## License

GPL-3.0-or-later
