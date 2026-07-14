// Copyright (C) 2026 Chubby Hippo
// SPDX-License-Identifier: GPL-3.0-or-later
// (see LICENSE for the full GPL-3.0-or-later text)

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { Rc } from '../core/rc';
import { noWindowMessage, plan } from '../core/windmove';
import { freshSpec } from './helpers';

describe('WindmoveSpec', () => {
  it('given a direction then windmove plans the dock-area focus for it', () => {
    assert.equal(plan('left'), 'jupytermeow.focusLeft');
    assert.equal(plan('right'), 'jupytermeow.focusRight');
    assert.equal(plan('up'), 'jupytermeow.focusUp');
    assert.equal(plan('down'), 'jupytermeow.focusDown');
  });

  it('given no window in the direction then the message is Emacs verbatim', () => {
    assert.equal(
      noWindowMessage('left'),
      'No window left from selected window',
    );
    assert.equal(
      noWindowMessage('down'),
      'No window down from selected window',
    );
  });

  it('given the bundled rc then SPC w hjkl dispatch windmove', () => {
    freshSpec();
    const d = Rc.defaults().keypad;
    assert.equal(d.get('wh')?.action, 'jupytermeow.windmoveLeft');
    assert.equal(d.get('wj')?.action, 'jupytermeow.windmoveDown');
    assert.equal(d.get('wk')?.action, 'jupytermeow.windmoveUp');
    assert.equal(d.get('wl')?.action, 'jupytermeow.windmoveRight');
  });

  it('given the bundled rc then SPC w v splits the current tab', () => {
    freshSpec();
    assert.equal(
      Rc.defaults().keypad.get('wv')?.action,
      'application:split-tab',
    );
  });
});
