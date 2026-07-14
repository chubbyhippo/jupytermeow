// Copyright (C) 2026 Chubby Hippo
//
// This program is free software: you can redistribute it and/or modify it
// under the terms of the GNU General Public License as published by the Free
// Software Foundation, either version 3 of the License, or (at your option)
// any later version.
//
// This program is distributed in the hope that it will be useful, but WITHOUT
// ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or
// FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for
// more details.
//
// You should have received a copy of the GNU General Public License along
// with this program. If not, see <https://www.gnu.org/licenses/>.
//
// SPDX-License-Identifier: GPL-3.0-or-later

import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin,
} from '@jupyterlab/application';
import { Dialog, InputDialog, showDialog } from '@jupyterlab/apputils';
import {
  EditorExtensionRegistry,
  IEditorExtensionRegistry,
} from '@jupyterlab/codemirror';
import { ISettingRegistry } from '@jupyterlab/settingregistry';
import { IStatusBar } from '@jupyterlab/statusbar';
import { Widget } from '@lumino/widgets';
import { EditorSelection, Extension, Prec } from '@codemirror/state';
import { EditorView, ViewPlugin } from '@codemirror/view';
import { undo as cmUndo } from '@codemirror/commands';

import * as Engine from '../core/engine';
import { MeowMode, MeowState } from '../core/state';
import {
  ClipboardPort,
  Ctx,
  EditorPort,
  SelRange,
  TextEdit,
  UiPort,
} from '../core/port';
import { Rc } from '../core/rc';
import { BUNDLED_RC } from './bundledRc';

class ModeStatus extends Widget {
  private restore = '';
  private timer: number | null = null;

  constructor() {
    super();
    this.addClass('jp-mod-highlighted');
    this.node.style.padding = '0 8px';
  }

  set(text: string): void {
    this.restore = text;
    if (this.timer === null) this.node.textContent = text;
  }

  flash(text: string): void {
    if (this.timer !== null) window.clearTimeout(this.timer);
    this.node.textContent = text;
    this.timer = window.setTimeout(() => {
      this.timer = null;
      this.node.textContent = this.restore;
    }, 2500);
  }
}

class CmPort implements EditorPort {
  constructor(
    private readonly view: EditorView,
    private readonly app: JupyterFrontEnd,
  ) {}

  getText(): string {
    return this.view.state.doc.toString();
  }

  getSelections(): SelRange[] {
    return this.view.state.selection.ranges.map((r) => ({
      anchor: r.anchor,
      active: r.head,
    }));
  }

  setSelections(sels: SelRange[]): void {
    if (sels.length === 0) return;
    const max = this.view.state.doc.length;
    const clamp = (n: number): number => Math.max(0, Math.min(n, max));
    this.view.dispatch({
      selection: EditorSelection.create(
        sels.map((s) => EditorSelection.range(clamp(s.anchor), clamp(s.active))),
        0,
      ),
      scrollIntoView: true,
    });
  }

  edit(edits: TextEdit[]): Promise<void> {
    this.view.dispatch({
      changes: edits.map((e) => ({ from: e.start, to: e.end, insert: e.text })),
    });
    return Promise.resolve();
  }

  isWritable(): boolean {
    return !this.view.state.readOnly;
  }

  visibleLineRange(): { first: number; last: number } | null {
    const { from, to } = this.view.viewport;
    const doc = this.view.state.doc;
    return {
      first: doc.lineAt(from).number - 1,
      last: doc.lineAt(to).number - 1,
    };
  }

  undo(): Promise<void> {
    cmUndo(this.view);
    return Promise.resolve();
  }

  async closeEditor(): Promise<void> {
    await this.app.commands.execute('application:close');
  }

  symbolRangeAt(): Promise<{ start: number; end: number } | null> {
    return Promise.resolve(null);
  }
}

class WebClipboard implements ClipboardPort {
  async read(): Promise<string | undefined> {
    try {
      return await navigator.clipboard.readText();
    } catch {
      return undefined;
    }
  }

  async write(text: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // clipboard permission denied: the kill/save still updated the selection
    }
  }
}

class LabUi implements UiPort {
  constructor(
    private readonly app: JupyterFrontEnd,
    private readonly status: ModeStatus,
    private readonly reloadRc: () => void,
  ) {}

  hint(text: string): void {
    this.status.flash(`meow: ${text}`);
  }

  info(title: string, body: string): void {
    const content = new Widget();
    content.node.style.whiteSpace = 'pre';
    content.node.style.fontFamily = 'monospace';
    content.node.textContent = body;
    void showDialog({ title, body: content, buttons: [Dialog.okButton()] });
  }

  async input(prompt: string, initial?: string): Promise<string | undefined> {
    const result = await InputDialog.getText({
      title: prompt,
      text: initial ?? '',
    });
    if (!result.button.accept) return undefined;
    return result.value ?? undefined;
  }

  async runCommand(id: string): Promise<void> {
    if (id === 'jupytermeow.editRc') {
      await this.app.commands.execute('settingeditor:open', {
        query: 'jupytermeow',
      });
      return;
    }
    if (id === 'jupytermeow.reloadRc') {
      this.reloadRc();
      this.hint('rc reloaded');
      return;
    }
    if (id.startsWith('jupytermeow.')) {
      this.hint(`${id} is not available yet`);
      return;
    }
    await this.app.commands.execute(id);
  }

  scheduleWhichKey(): void {}

  hideWhichKey(): void {}

  showExpandHints(): void {}

  clearExpandHints(): void {}

  showAvyMatches(): void {}

  showAvyLabels(): void {}

  clearAvy(): void {}

  setGrabHighlight(): void {}

  modeChanged(st: MeowState): void {
    this.refresh(st);
  }

  refresh(st: MeowState): void {
    this.status.set(`MEOW ${st.mode}`);
  }
}

class MeowView {
  readonly ctx: Ctx;

  constructor(
    view: EditorView,
    app: JupyterFrontEnd,
    status: ModeStatus,
    reloadRc: () => void,
  ) {
    const st = new MeowState();
    st.mode = MeowMode.NORMAL;
    this.ctx = {
      port: new CmPort(view, app),
      clipboard: new WebClipboard(),
      ui: new LabUi(app, status, reloadRc),
      st,
    };
  }
}

function meowExtension(
  app: JupyterFrontEnd,
  status: ModeStatus,
  reloadRc: () => void,
): Extension {
  const attachment = ViewPlugin.define(
    (view) => new MeowView(view, app, status, reloadRc),
  );

  const keys = Prec.highest(
    EditorView.domEventHandlers({
      keydown: (event, view): boolean => {
        const meow = view.plugin(attachment);
        if (!meow) return false;
        const ctx = meow.ctx;
        if (event.key === 'Escape') {
          if (Engine.escapeKey(ctx)) {
            event.preventDefault();
            return true;
          }
          return false;
        }
        if (event.ctrlKey || event.altKey || event.metaKey) return false;
        if (event.key.length !== 1) return false;
        if (ctx.st.mode === MeowMode.INSERT) return false;
        event.preventDefault();
        void Engine.handleChar(ctx, event.key);
        return true;
      },
      focus: (_event, view): boolean => {
        const meow = view.plugin(attachment);
        if (meow) meow.ctx.ui.refresh(meow.ctx.st);
        return false;
      },
    }),
  );

  return [attachment, keys];
}

const plugin: JupyterFrontEndPlugin<void> = {
  id: 'jupytermeow:plugin',
  description: 'Meow-style modal editing for every CodeMirror editor.',
  autoStart: true,
  requires: [IEditorExtensionRegistry],
  optional: [ISettingRegistry, IStatusBar],
  activate: (
    app: JupyterFrontEnd,
    registry: IEditorExtensionRegistry,
    settings: ISettingRegistry | null,
    statusBar: IStatusBar | null,
  ) => {
    Rc.initDefaults(BUNDLED_RC.split(/\r?\n/));

    const status = new ModeStatus();
    status.set('MEOW NORMAL');
    if (statusBar) {
      statusBar.registerStatusItem('jupytermeow:mode', {
        item: status,
        align: 'left',
        rank: 1,
      });
    }

    let applySettings = (): void => {};
    if (settings) {
      void settings.load('jupytermeow:plugin').then((loaded) => {
        applySettings = () => {
          const lines = (loaded.composite['rcLines'] as string) ?? '';
          Rc.setUserLines(lines.split('\n'));
        };
        applySettings();
        loaded.changed.connect(() => {
          applySettings();
        });
      });
    }

    registry.addExtension(
      Object.freeze({
        name: 'jupytermeow',
        factory: () =>
          EditorExtensionRegistry.createImmutableExtension(
            meowExtension(app, status, () => {
              applySettings();
            }),
          ),
      }),
    );
  },
};

export default plugin;
