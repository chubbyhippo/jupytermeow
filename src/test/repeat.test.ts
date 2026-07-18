// Copyright (C) 2026 Chubby Hippo
// SPDX-License-Identifier: GPL-3.0-or-later
// (see LICENSE for the full GPL-3.0-or-later text)

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { freshSpec } from './helpers';
import * as Engine from '../core/engine';
import { Rc } from '../core/rc';
import { RcState } from '../core/rcState';
import { MeowMode, MeowState, Pending } from '../core/state';

describe('RepeatSpec', () => {
  const navRc = [
    'map <leader>tn meow-next',
    'repeat nav . meow-next',
    'repeat nav , meow-prev',
  ].join('\n');

  it('given repeat lines then named groups parse with their member targets', () => {
    const c = Rc.parse([
      'repeat nav . meow-next',
      'repeat nav , meow-prev',
      'repeat zoom i <action>(editor.action.fontZoomIn)',
    ]);
    assert.equal(c.repeat.get('nav')!.get('.')!.command, 'meow-next');
    assert.equal(c.repeat.get('nav')!.get(',')!.command, 'meow-prev');
    assert.equal(
      c.repeat.get('zoom')!.get('i')!.action,
      'editor.action.fontZoomIn',
    );
    assert.deepEqual(c.errors, []);
  });

  it('given a repeat line with a bad target then an error is collected', () => {
    const c = Rc.parse(['repeat nav . meow-frobnicate', 'repeat nav']);
    assert.equal(c.errors.length, 2);
    assert.ok(c.errors[0].includes('meow-frobnicate'));
  });

  it('given a repeat key that is not a single printable key then an error is collected', () => {
    const c = Rc.parse([
      'repeat nav ab meow-next',
      'repeat nav <Space> meow-next',
    ]);
    assert.equal(c.errors.length, 2);
  });

  it('given home rc repeat lines then they layer per key over the bundled group', () => {
    const s = freshSpec();
    s.givenRc(
      'repeat zoom , meow-prev\nrepeat zoom e <action>(application:toggle-header)',
    );
    const g = Rc.repeatGroups().get('zoom')!;
    assert.equal(g.get('i')!.action, 'application:zoom-in-widget');
    assert.equal(g.get(',')!.command, 'meow-prev');
    assert.equal(g.get('e')!.action, 'application:toggle-header');
  });

  it('given a repeat member bound to ignore then the key is given back', () => {
    const s = freshSpec();
    s.givenRc('repeat zoom 0 ignore');
    const g = Rc.repeatGroups().get('zoom')!;
    assert.equal(g.has('0'), false);
    assert.equal(g.get('i')!.action, 'application:zoom-in-widget');
  });

  it('the bundled default jupytermeowrc declares the init el repeat groups', () => {
    freshSpec();
    const d = Rc.defaults().repeat;
    assert.deepEqual(
      new Set(d.get('zoom')!.keys()),
      new Set(['i', '=', 'o', '-', 'u', '0']),
    );
    assert.equal(d.get('zoom')!.get('i')!.action, 'application:zoom-in-widget');
    assert.equal(
      d.get('zoom')!.get('u')!.action,
      'application:reset-widget-zoom',
    );
  });

  it('given the bundled rc then the tab repeat group cycles editor tabs', () => {
    freshSpec();
    const d = Rc.defaults().repeat;
    assert.equal(
      d.get('tab')!.get('n')!.action,
      'application:activate-next-tab',
    );
    assert.equal(
      d.get('tab')!.get('p')!.action,
      'application:activate-previous-tab',
    );
    assert.equal(
      d.get('tab')!.get('.')!.action,
      'application:activate-next-tab',
    );
    assert.equal(
      d.get('tab')!.get(',')!.action,
      'application:activate-previous-tab',
    );
    assert.deepEqual(
      new Set(d.get('tab')!.keys()),
      new Set(['n', 'p', '.', ',']),
    );
  });

  it('given a repeat line edit then the reload button sees a change', () => {
    freshSpec();
    Rc.setUserLines(['nmap Z ,b']);
    assert.ok(
      !RcState.equalTo(Rc.parse(['nmap Z ,b', 'repeat nav . meow-next'])),
    );
  });

  it('given a keypad nav entry in a repeat group then tapping the members keeps walking', async () => {
    const s = freshSpec();
    s.given('four lines', '<caret>one\ntwo\nthree\nfour');
    s.givenRc(navRc);
    await s.whenKeys(' tn');
    assert.equal(s.caretLine(), 1);
    await s.whenKeys('.');
    assert.equal(s.caretLine(), 2);
    await s.whenKeys('.');
    assert.equal(s.caretLine(), 3);
    await s.whenKeys(',');
    assert.equal(s.caretLine(), 2);
    s.thenMode(MeowMode.NORMAL);
  });

  it('given a normal key bound to a member target then it arms the same run', async () => {
    const s = freshSpec();
    s.given('four lines', '<caret>one\ntwo\nthree\nfour');
    s.givenRc(navRc);
    await s.whenKeys('j');
    assert.equal(s.caretLine(), 1);
    await s.whenKeys('.');
    assert.equal(s.caretLine(), 2);
  });

  it('given a run then a member tap continues after an editor switch', async () => {
    const s = freshSpec();
    s.given('four lines', '<caret>one\ntwo\nthree\nfour');
    s.givenRc(navRc);
    await s.whenKeys(' tn');
    assert.equal(s.caretLine(), 1);
    s.st = new MeowState();
    await s.whenKeys('.');
    assert.equal(s.caretLine(), 2);
  });

  it('given a non-member key then the run ends and the key keeps its normal meaning', async () => {
    const s = freshSpec();
    s.given('four lines', '<caret>one\ntwo\nthree\nfour');
    s.givenRc(navRc);
    await s.whenKeys(' tn');
    assert.notEqual(Engine.repeatMap, null);
    await s.whenKeys('w');
    s.thenSelection('two');
    assert.equal(Engine.repeatMap, null);
  });

  it('given the run over then the member keys mean their normal commands again', async () => {
    const s = freshSpec();
    s.given('four lines', '<caret>one\ntwo\nthree\nfour');
    s.givenRc(navRc);
    await s.whenKeys(' tn');
    await s.whenKeys('x');
    s.thenSelection('two');
    await s.whenKeys('.');
    assert.equal(s.st.pending, Pending.BOUNDS);
    assert.equal(s.caretLine(), 1);
  });

  it('given escape then the run ends', async () => {
    const s = freshSpec();
    s.given('four lines', '<caret>one\ntwo\nthree\nfour');
    s.givenRc(navRc);
    await s.whenKeys(' tn');
    assert.notEqual(Engine.repeatMap, null);
    s.pressEsc();
    assert.equal(Engine.repeatMap, null);
    await s.whenKeys('.');
    assert.equal(s.st.pending, Pending.BOUNDS);
    assert.equal(s.caretLine(), 1);
  });

  it('given SPC during a run then the keypad still opens', async () => {
    const s = freshSpec();
    s.given('four lines', '<caret>one\ntwo\nthree\nfour');
    s.givenRc(navRc);
    await s.whenKeys(' tn');
    await s.whenKeys(' tn');
    assert.equal(s.caretLine(), 2);
    s.thenMode(MeowMode.NORMAL);
  });

  it('given a digit during a run then it falls through as a count', async () => {
    const s = freshSpec();
    s.given('four lines', '<caret>one\ntwo\nthree\nfour');
    s.givenRc(navRc);
    await s.whenKeys(' tn');
    assert.equal(s.caretLine(), 1);
    await s.whenKeys('2j');
    assert.equal(s.caretLine(), 3);
  });

  it('given a run then the armed keys are the group members', async () => {
    const s = freshSpec();
    s.given('four lines', '<caret>one\ntwo\nthree\nfour');
    s.givenRc(navRc);
    await s.whenKeys(' tn');
    assert.deepEqual(new Set(Engine.repeatMap?.keys()), new Set(['.', ',']));
    await s.whenKeys('w');
    assert.equal(Engine.repeatMap, null);
  });

  it('given the bundled rc then SPC x z repeats the last command and bare z keeps repeating like Emacs C-x z', async () => {
    const s = freshSpec();
    s.given('delete run', '<caret>aaaaa');
    await s.whenKeys('d');
    s.thenText('aaaa');
    await s.whenKeys(' xz');
    s.thenText('aaa');
    await s.whenKeys('z');
    s.thenText('aa');
    await s.whenKeys('z');
    s.thenText('a');
    s.thenMode(MeowMode.NORMAL);
  });
});
