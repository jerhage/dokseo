import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { fixtureText, formattedMarkup } from './format.js';
import { normalizedMarkup } from './normalize.js';

describe('formattedMarkup', () => {
  it('puts each tag and each text on its own line, indented by depth', () => {
    assert.equal(
      formattedMarkup('<ul class="list"><li>One<b>two</b></li></ul>'),
      ['<ul class="list">', '  <li>', '    One', '    <b>two</b>', '  </li>', '</ul>'].join('\n'),
    );
  });

  it('keeps an element holding only text, or nothing, on one line', () => {
    assert.equal(
      formattedMarkup('<p><span>Read</span><i></i></p>'),
      '<p>\n  <span>Read</span>\n  <i></i>\n</p>',
    );
  });

  it('writes one attribute per line when a tag is longer than the line width', () => {
    const long = `<div class="${'x'.repeat(60)}" title="${'y'.repeat(40)}">Text</div>`;

    assert.equal(
      formattedMarkup(long),
      [
        '<div',
        `  class="${'x'.repeat(60)}"`,
        `  title="${'y'.repeat(40)}"`,
        '>',
        '  Text',
        '</div>',
      ].join('\n'),
    );
  });

  it('keeps a pre element whole on one line', () => {
    assert.equal(
      formattedMarkup('<div><pre class="codeblock"><code>const a = 1;</code></pre></div>'),
      '<div>\n  <pre class="codeblock"><code>const a = 1;</code></pre>\n</div>',
    );
  });

  it('formats markup so that normalizing it gives the markup back', () => {
    const markup =
      '<nav aria-label="Pages"><a class="item" href="/1">1</a>text<input disabled=""></nav>';

    assert.equal(normalizedMarkup(formattedMarkup(markup)), normalizedMarkup(markup));
  });
});

describe('fixtureText', () => {
  it('ends the formatted markup with a newline and returns its own output unchanged', () => {
    const text = fixtureText('<span class="badge badge-success">Read</span>');

    assert.equal(text, '<span class="badge badge-success">Read</span>\n');
    assert.equal(fixtureText(text), text);
  });

  it('returns an empty text for markup that renders nothing', () => {
    assert.equal(fixtureText('<!--[--><!--]-->'), '');
  });
});
