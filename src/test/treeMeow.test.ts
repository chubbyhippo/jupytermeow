// Copyright (C) 2026 Chubby Hippo
// SPDX-License-Identifier: GPL-3.0-or-later
// (see LICENSE for the full GPL-3.0-or-later text)

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { Rc } from '../core/rc';
import * as TreeMeow from '../core/treeMeow';
import { freshSpec } from './helpers';

describe('TreeMeowSpec', () => {
  class TreeNode {
    children: TreeNode[] = [];
    expanded = false;

    constructor(
      readonly name: string,
      readonly parent: TreeNode | null,
    ) {}

    add(name: string): TreeNode {
      const child = new TreeNode(name, this);
      this.children.push(child);
      return child;
    }
  }

  class FakeTree {
    root = new TreeNode('root', null);
    focus = this.root;
    ran: string[] = [];

    run = async (id: string): Promise<void> => {
      const rows = this.visibleRows();
      const at = rows.indexOf(this.focus);
      switch (id) {
        case 'jupytermeow.tree.focusDown':
          this.focus = rows[Math.min(at + 1, rows.length - 1)];
          break;
        case 'jupytermeow.tree.focusUp':
          this.focus = rows[Math.max(at - 1, 0)];
          break;
        case 'filebrowser:go-up':
          if (this.focus.expanded) this.focus.expanded = false;
          else if (this.focus.parent) this.focus = this.focus.parent;
          break;
        case 'filebrowser:open':
          if (this.focus.children.length > 0 && !this.focus.expanded)
            this.focus.expanded = true;
          else if (this.focus.children.length > 0)
            this.focus = this.focus.children[0];
          break;
        default:
          this.ran.push(id);
      }
    };

    private visibleRows(): TreeNode[] {
      const rows: TreeNode[] = [];
      const walk = (n: TreeNode): void => {
        rows.push(n);
        if (n.expanded) n.children.forEach(walk);
      };
      walk(this.root);
      return rows;
    }

    select(name: string): void {
      const find = (n: TreeNode): TreeNode | null =>
        n.name === name
          ? n
          : (n.children.map(find).find((r) => r !== null) ?? null);
      this.focus = find(this.root)!;
    }

    selectedText(): string {
      return this.focus.name;
    }

    isExpanded(name: string): boolean {
      const prior = this.focus;
      this.select(name);
      const expanded = this.focus.expanded;
      this.focus = prior;
      return expanded;
    }
  }

  function givenTree(): FakeTree {
    const tree = new FakeTree();
    const a = tree.root.add('a');
    a.add('a1');
    a.add('a2');
    tree.root.add('b');
    tree.root.expanded = true;
    return tree;
  }

  it('given the bundled rc then it binds the tree keys', () => {
    freshSpec();
    const d = Rc.defaults().motion;
    assert.equal(d.get('j')?.command, 'meow-next');
    assert.equal(d.get('k')?.command, 'meow-prev');
    assert.equal(d.get('h')?.command, 'meow-left');
    assert.equal(d.get('l')?.command, 'meow-right');
    assert.equal(d.get('q')?.action, 'jupytermeow.hideView');
  });

  it('given a tree when j and k then the selection moves like the arrow keys', async () => {
    freshSpec();
    const tree = givenTree();
    await TreeMeow.dispatch(tree.run, 'j');
    assert.equal(tree.selectedText(), 'a');
    await TreeMeow.dispatch(tree.run, 'j');
    assert.equal(tree.selectedText(), 'b');
    await TreeMeow.dispatch(tree.run, 'k');
    assert.equal(tree.selectedText(), 'a');
  });

  it('given a collapsed node when l then it expands, and l again enters it', async () => {
    freshSpec();
    const tree = givenTree();
    tree.select('a');
    await TreeMeow.dispatch(tree.run, 'l');
    assert.ok(tree.isExpanded('a'), 'l on a collapsed node expands it');
    assert.equal(tree.selectedText(), 'a');
    await TreeMeow.dispatch(tree.run, 'l');
    assert.equal(tree.selectedText(), 'a1');
  });

  it('given an expanded node when h then it collapses, then goes to the parent', async () => {
    freshSpec();
    const tree = givenTree();
    tree.select('a');
    tree.focus.expanded = true;
    tree.select('a1');
    await TreeMeow.dispatch(tree.run, 'h');
    assert.equal(tree.selectedText(), 'a');
    await TreeMeow.dispatch(tree.run, 'h');
    assert.equal(
      tree.isExpanded('a'),
      false,
      'h on an expanded node collapses it',
    );
    assert.equal(tree.selectedText(), 'a');
    await TreeMeow.dispatch(tree.run, 'h');
    assert.equal(tree.selectedText(), 'root');
  });

  it('given an editor-only command in the mmap then it is inert on trees', async () => {
    const s = freshSpec();
    s.givenRc('mmap w meow-next-word');
    const tree = givenTree();
    await TreeMeow.dispatch(tree.run, 'w');
    assert.equal(
      tree.selectedText(),
      'root',
      'a word motion has no tree meaning',
    );
    assert.deepEqual(tree.ran, []);
  });

  it('given a user mmap override then it shadows the bundled defaults', async () => {
    const s = freshSpec();
    s.givenRc('mmap j ignore');
    const tree = givenTree();
    await TreeMeow.dispatch(tree.run, 'j');
    assert.equal(tree.selectedText(), 'root');
  });

  it('given a keys mapping then the replay resolves every key through the motion map', async () => {
    const s = freshSpec();
    s.givenRc('mmap g jj');
    const tree = givenTree();
    await TreeMeow.dispatch(tree.run, 'g');
    assert.equal(tree.selectedText(), 'b');
  });

  it('given a noremap replay then it skips user maps like the engine', async () => {
    const s = freshSpec();
    s.givenRc('mnoremap g jj\nmmap j ignore');
    const tree = givenTree();
    await TreeMeow.dispatch(tree.run, 'j');
    assert.equal(tree.selectedText(), 'root', 'a user-shadowed j is inert');
    await TreeMeow.dispatch(tree.run, 'g');
    assert.equal(
      tree.selectedText(),
      'b',
      'the replay resolves j via the defaults',
    );
  });

  it('given an <action> mmap then it dispatches with the tree as context', async () => {
    const s = freshSpec();
    s.givenRc('mmap z <action>(jupytermeow.test.probe)');
    const tree = givenTree();
    await TreeMeow.dispatch(tree.run, 'z');
    assert.deepEqual(tree.ran, ['jupytermeow.test.probe']);
  });

  it('given defaults and user maps then boundChars merges them', () => {
    const s = freshSpec();
    s.givenRc('mmap w meow-next-word');
    const bound = TreeMeow.boundChars();
    for (const c of 'jkhlqw') assert.ok(bound.has(c), `'${c}' must be bound`);
    assert.equal(
      bound.has('z'),
      false,
      'unmapped letters stay native (type-to-find)',
    );
  });

  it('given mmap q ignore then the key returns to the tree', () => {
    const s = freshSpec();
    s.givenRc('mmap q ignore');
    assert.equal(
      TreeMeow.boundChars().has('q'),
      false,
      'an ignored key leaves the shortcut set',
    );
    assert.ok(TreeMeow.boundChars().has('j'), 'the other defaults stay');
  });
});
