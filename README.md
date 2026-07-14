# jupytermeow

Meow-style modal editing for JupyterLab's CodeMirror 6 editors: NORMAL /
INSERT / MOTION / KEYPAD states, selection-first commands, the char-thing
table, digit expand with hints, grab / swap-grab / sync-grab, and avy
jumps (`S` / `Q`). A sibling of
[codemeow](https://github.com/chubbyhippo/codemeow) (VS Code),
[ideameow](https://github.com/chubbyhippo/ideameow) (IntelliJ),
[dbmeow](https://github.com/chubbyhippo/dbmeow) (DBeaver/Eclipse), and
[notemeow-plus-plus](https://github.com/chubbyhippo/notemeow-plus-plus)
(Notepad++) — behavior-identical by construction, with a 1:1 ported BDD
spec suite.

The whole keymap lives in the bundled `.jupytermeowrc` (QWERTY by
default, every key rebindable); user rc lines override it entry by entry
through the JupyterLab Settings editor. The SPC keypad dispatches
JupyterLab commands by id (`notebook:run-cell`, `docmanager:save`, ...).

## Status

The headless core engine and its 278-spec behavior suite are complete
and green (`./setup.sh`). The JupyterLab adapter (a prebuilt lab
extension wrapping every CodeMirror 6 editor) is in progress.

## Build & test

```sh
./setup.sh        # tsc + the full behavior suite via node:test
npm run lint      # eslint
```

## License

GPL-3.0-or-later
