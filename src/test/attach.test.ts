// Copyright (C) 2026 Chubby Hippo
// SPDX-License-Identifier: GPL-3.0-or-later
// (see LICENSE for the full GPL-3.0-or-later text)

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { attachMode, isWritableSurface } from '../core/attachPolicy';
import { MeowMode } from '../core/state';

describe('AttachSpec', () => {
  it('given a notebook code cell then meow attaches in NORMAL', () => {
    assert.equal(attachMode('notebook-cell'), MeowMode.NORMAL);
  });

  it('given a markdown cell editor then meow attaches in NORMAL', () => {
    assert.equal(attachMode('markdown-cell'), MeowMode.NORMAL);
  });

  it('given a file editor then meow attaches in NORMAL', () => {
    assert.equal(attachMode('file-editor'), MeowMode.NORMAL);
  });

  it('given the console prompt then meow attaches in NORMAL', () => {
    assert.equal(attachMode('console-prompt'), MeowMode.NORMAL);
  });

  it('given a locked cell then NORMAL, reported read-only', () => {
    assert.equal(attachMode('locked-cell'), MeowMode.NORMAL);
    assert.equal(isWritableSurface('locked-cell'), false);
  });

  it('given a read-only document then NORMAL, reported read-only', () => {
    assert.equal(attachMode('read-only-document'), MeowMode.NORMAL);
    assert.equal(isWritableSurface('read-only-document'), false);
  });

  it('given search and console-banner inputs then meow stays away', () => {
    assert.equal(attachMode('search-input'), null);
    assert.equal(attachMode('console-banner'), null);
  });
});
