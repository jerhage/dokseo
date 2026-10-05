import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { compareMarkup } from './compare.js';

const FIXTURE = '<button class="btn btn-primary btn-sm" type="button">Save</button>\n';

describe('compareMarkup', () => {
  it('reports a match for the same markup written another way, with both sides formatted alike', () => {
    const result = compareMarkup(
      '<!--[--><button type="button" class="btn-sm btn btn-primary">Save</button><!--]-->',
      FIXTURE,
    );

    assert.equal(result.kind, 'match');
    assert.equal(result.rendered, result.fixture);
  });

  it('reports a mismatch with the first differing line and both formatted sides', () => {
    const result = compareMarkup('<button type="button" class="btn btn-sm">Save</button>', FIXTURE);

    assert.equal(result.kind, 'mismatch');
    assert.notEqual(result.rendered, result.fixture);
    if (result.kind !== 'mismatch') return;
    assert.equal(result.line, 1);
    assert.equal(
      result.message,
      [
        'The rendered markup differs from the fixture at line 1.',
        '  fixture:  <button class="btn btn-primary btn-sm" type="button">Save</button>',
        '  rendered: <button class="btn btn-sm" type="button">Save</button>',
      ].join('\n'),
    );
  });

  it('names the line where one side ends early', () => {
    const result = compareMarkup('<p>One</p>', '<p>One</p>\n<p>Two</p>\n');

    assert.equal(result.kind, 'mismatch');
    if (result.kind !== 'mismatch') return;
    assert.equal(result.line, 2);
    assert.match(result.message, /rendered: \(nothing\)/u);
  });
});
