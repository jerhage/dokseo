import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { normalizedMarkup } from './normalize.js';

const SERVER_ACCORDION =
  '<!--[--><details class="accordion-item"><summary class="accordion-trigger"><!--[0-->Details<!--]--> <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" class="lucide lucide-chevron-down accordion-icon"><!--[--><!----><path d="m6 9 6 6 6-6"><!----></path><!----><!--]--><!----></svg><!----></summary> <div class="accordion-body"><!---->Body<!----></div></details><!--]-->';

const WRITTEN_ACCORDION = `<details class="accordion-item">
  <summary class="accordion-trigger">
    Details
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
      stroke-linejoin="round" aria-hidden="true" class="lucide lucide-chevron-down accordion-icon">
      <path d="m6 9 6 6 6-6" />
    </svg>
  </summary>
  <div class="accordion-body">Body</div>
</details>`;

const SERVER_FIELD =
  '<!--[--><!--$s1--><div class="field"><label class="field-label" for="s1-control">Name</label> <div class="field-control"><input id="s1-control" aria-describedby="s1-hint" class="input"/><!----></div> <!--[0--><p class="field-hint" id="s1-hint">As it appears on the cover</p><!--]--> <!--[-1--><!--]--></div><!--]-->';

describe('normalizedMarkup', () => {
  it('reads a server render with hydration comments as the same markup as a hand-written form', () => {
    assert.equal(normalizedMarkup(SERVER_ACCORDION), normalizedMarkup(WRITTEN_ACCORDION));
  });

  it('drops comments', () => {
    assert.equal(normalizedMarkup('<p><!-- note -->Text<!----></p>'), '<p>Text</p>');
  });

  it('writes an end tag for a self-closing element and none for a void element', () => {
    assert.equal(normalizedMarkup('<svg><path d="M1" /></svg>'), '<svg><path d="M1"></path></svg>');
    assert.equal(
      normalizedMarkup('<p><input class="input"/><br /></p>'),
      '<p><input class="input"><br></p>',
    );
  });

  it('drops white space next to tags and collapses the rest to one space', () => {
    assert.equal(
      normalizedMarkup('<p>\n  Two   words\n  <b> bold </b>\n</p>'),
      '<p>Two words<b>bold</b></p>',
    );
  });

  it('sorts attributes by name and class names alphabetically', () => {
    assert.equal(
      normalizedMarkup('<button type="button" class="btn-sm btn" aria-label="Save">'),
      '<button aria-label="Save" class="btn btn-sm" type="button">',
    );
  });

  it('gives a valueless attribute the empty value and reads single-quoted and unquoted values', () => {
    assert.equal(
      normalizedMarkup(`<input disabled type=checkbox name='box'>`),
      '<input disabled="" name="box" type="checkbox">',
    );
  });

  it('drops an empty class or style attribute and sorts style declarations', () => {
    assert.equal(normalizedMarkup('<td class=""></td>'), '<td></td>');
    assert.equal(
      normalizedMarkup('<div style="--b:2px;--a: 1px"></div>'),
      '<div style="--a: 1px; --b: 2px;"></div>',
    );
  });

  it('replaces every id and every reference to one with a placeholder in order of first appearance', () => {
    assert.equal(
      normalizedMarkup(SERVER_FIELD),
      '<div class="field"><label class="field-label" for="id-1">Name</label><div class="field-control"><input aria-describedby="id-2" class="input" id="id-1"></div><p class="field-hint" id="id-2">As it appears on the cover</p></div>',
    );
  });

  it('numbers the ids of a tag in the sorted order of its attributes, whatever order it was written in', () => {
    const one =
      '<button id="tab" aria-controls="panel"></button><div id="panel" aria-labelledby="tab"></div>';
    const other =
      '<button aria-controls="p" id="t"></button><div aria-labelledby="t" id="p"></div>';

    assert.equal(normalizedMarkup(one), normalizedMarkup(other));
    assert.equal(
      normalizedMarkup(one),
      '<button aria-controls="id-1" id="id-2"></button><div aria-labelledby="id-2" id="id-1"></div>',
    );
  });

  it('replaces each id of a list and the ids of popovertarget and url() references', () => {
    assert.equal(
      normalizedMarkup('<input aria-describedby="h e"><p id="h"></p><p id="e"></p>'),
      '<input aria-describedby="id-1 id-2"><p id="id-1"></p><p id="id-2"></p>',
    );
    assert.equal(
      normalizedMarkup('<button popovertarget="s1-popover"></button><div id="s1-popover"></div>'),
      '<button popovertarget="id-1"></button><div id="id-1"></div>',
    );
    assert.equal(
      normalizedMarkup('<marker id="s1-arrow"></marker><line marker-end="url(#s1-arrow)"></line>'),
      '<marker id="id-1"></marker><line marker-end="url(#id-1)"></line>',
    );
  });

  it('returns its own output unchanged', () => {
    const once = normalizedMarkup(SERVER_ACCORDION + SERVER_FIELD);

    assert.equal(normalizedMarkup(once), once);
  });
});
