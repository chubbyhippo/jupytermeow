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
  Extension,
  StateEffect,
  StateEffectType,
  StateField,
} from '@codemirror/state';
import {
  Decoration,
  DecorationSet,
  EditorView,
  Panel,
  showPanel,
  WidgetType,
} from '@codemirror/view';

class LabelWidget extends WidgetType {
  constructor(
    private readonly label: string,
    private readonly cls: string,
    private readonly style: string,
  ) {
    super();
  }

  eq(other: LabelWidget): boolean {
    return (
      other.label === this.label &&
      other.cls === this.cls &&
      other.style === this.style
    );
  }

  toDOM(): HTMLElement {
    const span = document.createElement('span');
    span.className = this.cls;
    if (this.style !== '') span.style.cssText = this.style;
    span.textContent = this.label;
    return span;
  }

  ignoreEvent(): boolean {
    return true;
  }
}

interface DecoSlot {
  set: StateEffectType<DecorationSet>;
  field: StateField<DecorationSet>;
}

function decoSlot(): DecoSlot {
  const set = StateEffect.define<DecorationSet>();
  const field = StateField.define<DecorationSet>({
    create: () => Decoration.none,
    update(value, tr) {
      let v = value.map(tr.changes);
      for (const e of tr.effects) {
        if (e.is(set)) v = e.value;
      }
      return v;
    },
    provide: (f) => EditorView.decorations.from(f),
  });
  return { set, field };
}

export const emptyDecorations: DecorationSet = Decoration.none;

export const avyMatchSlot = decoSlot();
export const avyLabelSlot = decoSlot();
export const hintSlot = decoSlot();
export const grabSlot = decoSlot();
export const cursorSlot = decoSlot();

export function labelDecorations(
  labels: Array<[number, string]>,
  docLen: number,
  cls: string,
  style = '',
): DecorationSet {
  const ranges = labels
    .filter(([off]) => off >= 0 && off <= docLen)
    .sort((a, b) => a[0] - b[0])
    .map(([off, label]) =>
      Decoration.widget({
        widget: new LabelWidget(label, cls, style),
        side: -1,
      }).range(off),
    );
  return Decoration.set(ranges);
}

export function markDecorations(
  ranges: Array<{ start: number; end: number }>,
  docLen: number,
  cls: string,
  style = '',
): DecorationSet {
  const rs = ranges
    .filter((r) => r.start >= 0 && r.start < r.end && r.end <= docLen)
    .sort((a, b) => a.start - b.start)
    .map((r) =>
      Decoration.mark(
        style === '' ? { class: cls } : { class: cls, attributes: { style } },
      ).range(r.start, r.end),
    );
  return Decoration.set(rs);
}

export function blockCursorDecorations(
  view: EditorView,
  insert: boolean,
): DecorationSet {
  if (insert) return Decoration.none;
  const head = view.state.selection.main.head;
  const doc = view.state.doc;
  if (head < doc.length && doc.sliceString(head, head + 1) !== '\n') {
    return Decoration.set([
      Decoration.mark({ class: 'jm-block-cursor' }).range(head, head + 1),
    ]);
  }
  return Decoration.set([
    Decoration.widget({
      widget: new LabelWidget(' ', 'jm-block-cursor-eol', ''),
      side: 1,
    }).range(head),
  ]);
}

export interface WhichKeyContent {
  title: string;
  rows: Array<[string, string]>;
}

export const setWhichKey = StateEffect.define<WhichKeyContent | null>();

const whichKeyField = StateField.define<WhichKeyContent | null>({
  create: () => null,
  update(value, tr) {
    let v = value;
    for (const e of tr.effects) {
      if (e.is(setWhichKey)) v = e.value;
    }
    return v;
  },
  provide: (f) =>
    showPanel.from(f, (value) => (value ? whichKeyPanel(value) : null)),
});

function whichKeyPanel(content: WhichKeyContent) {
  return (): Panel => {
    const dom = document.createElement('div');
    dom.className = 'jm-whichkey';
    const title = document.createElement('div');
    title.className = 'jm-whichkey-title';
    title.textContent = content.title;
    dom.appendChild(title);
    const rows = document.createElement('div');
    rows.className = 'jm-whichkey-rows';
    for (const [key, label] of content.rows) {
      const row = document.createElement('div');
      const keyEl = document.createElement('span');
      keyEl.className = 'jm-whichkey-key';
      keyEl.textContent = key;
      row.appendChild(keyEl);
      row.appendChild(document.createTextNode(` ${label}`));
      rows.appendChild(row);
    }
    dom.appendChild(rows);
    return { dom };
  };
}

const overlayTheme = EditorView.baseTheme({
  '.cm-line': { position: 'relative' },
  '.jm-avy-label': {
    position: 'absolute',
    top: '0',
    zIndex: '10',
    fontWeight: 'bold',
    padding: '0 2px',
  },
  '.jm-expand-hint': {
    position: 'absolute',
    top: '0',
    zIndex: '10',
    color: '#ffffff',
    fontWeight: 'bold',
    padding: '0 2px',
  },
  '.jm-avy-match': { backgroundColor: 'rgba(255, 220, 0, 0.38)' },
  '.jm-block-cursor': { backgroundColor: 'rgba(82, 139, 255, 0.55)' },
  '.jm-block-cursor-eol': {
    backgroundColor: 'rgba(82, 139, 255, 0.55)',
    display: 'inline-block',
    width: '0.6em',
  },
  '.jm-whichkey': {
    maxHeight: '10em',
    overflow: 'auto',
    fontFamily: 'var(--jp-code-font-family, monospace)',
    fontSize: 'var(--jp-code-font-size, 13px)',
    backgroundColor: 'var(--jp-layout-color1, #ffffff)',
    borderTop: '1px solid var(--jp-border-color1, #cccccc)',
    padding: '4px 8px',
  },
  '.jm-whichkey-title': { fontWeight: 'bold', marginBottom: '2px' },
  '.jm-whichkey-rows': { columnWidth: '16em' },
  '.jm-whichkey-key': { color: '#2b5db2', fontWeight: 'bold' },
});

export function overlayExtensions(): Extension {
  return [
    avyMatchSlot.field,
    avyLabelSlot.field,
    hintSlot.field,
    grabSlot.field,
    cursorSlot.field,
    whichKeyField,
    overlayTheme,
  ];
}
