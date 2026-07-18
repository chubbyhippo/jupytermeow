# jupytermeow

Meow-style modal editing for JupyterLab, in every CodeMirror editor —
notebook cells, the file editor, and console prompts.

Modal editing in the [meow](https://github.com/meow-edit/meow) tradition:
NORMAL / INSERT / MOTION / KEYPAD states, selection-first commands, the
char-thing table, digit expand, grab and sync-grab, and avy-style jumps
on `S` / `Q`. `SPC` opens a keypad that dispatches JupyterLab commands —
`SPC r r` runs the current cell, `SPC x s` saves, `SPC m x` opens the
command palette.

The whole keymap is plain text: the bundled `.jupytermeowrc` defines
every key (QWERTY by default), and you override it in the JupyterLab
Settings editor, where the `rc lines` setting is a list with one binding
per entry (`SPC c m` takes you there). Bind any key to a meow command, to
a JupyterLab command id with `<action>(...)`, or to a replayed key
sequence.

## Install

```sh
./setup.sh
```

builds the extension and installs it into the JupyterLab on your PATH,
then restart JupyterLab. `pip install .` does the same thing by hand.

## Develop

```sh
./setup.sh --core-only   # the behavior suite: tsc + node:test, sub-second
npm run lint
```

The editing engine is plain TypeScript with no JupyterLab imports and a
full behavior suite; the JupyterLab layer is a thin adapter around it.

## License

GPL-3.0-or-later
