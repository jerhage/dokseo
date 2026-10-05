import { isVoidElement, normalizedMarkup, openingTag } from './normalize.js';

const PIECE = /<\/[a-zA-Z][\w-]*>|<[a-zA-Z][^>]*>|[^<]+/gu;

const CLOSING = /^<\/([a-zA-Z][\w-]*)>$/u;

const INDENT = '  ';

const LINE_WIDTH = 100;

const KEPT_WHOLE = new Set(['pre', 'textarea']);

/**
 * @typedef {{ readonly kind: 'open'; readonly name: string; readonly text: string }
 *   | { readonly kind: 'void'; readonly name: string; readonly text: string }
 *   | { readonly kind: 'close'; readonly name: string; readonly text: string }
 *   | { readonly kind: 'text'; readonly text: string }} Piece
 */

/**
 * @param {string} text
 * @returns {Piece}
 */
function piece(text) {
  const closing = CLOSING.exec(text);
  if (closing !== null) return { kind: 'close', name: closing[1] ?? '', text };
  if (!text.startsWith('<')) return { kind: 'text', text };
  const name = openingTag(text)?.name ?? '';
  return isVoidElement(name) ? { kind: 'void', name, text } : { kind: 'open', name, text };
}

/**
 * @param {string} tag
 * @param {string} indent
 * @returns {readonly string[]}
 */
function tagLines(tag, indent) {
  if (indent.length + tag.length <= LINE_WIDTH) return [indent + tag];
  const parsed = openingTag(tag);
  if (parsed === null) return [indent + tag];
  const attributes = parsed.attributes.map(
    ({ name, value }) => `${indent}${INDENT}${name}="${value.replaceAll('"', '&quot;')}"`,
  );
  return [`${indent}<${parsed.name}`, ...attributes, `${indent}>`];
}

/**
 * @param {readonly Piece[]} pieces
 * @param {number} at
 * @returns {boolean}
 */
function holdsOneLine(pieces, at) {
  const open = pieces[at];
  const next = pieces[at + 1];
  const after = pieces[at + 2];
  if (open?.kind !== 'open') return false;
  if (next?.kind === 'close' && next.name === open.name) return true;
  return next?.kind === 'text' && after?.kind === 'close' && after.name === open.name;
}

/**
 * @param {readonly Piece[]} pieces
 * @param {number} at
 * @returns {number}
 */
function closingIndex(pieces, at) {
  const open = pieces[at];
  if (open?.kind !== 'open') return at;
  let depth = 0;
  for (let index = at; index < pieces.length; index += 1) {
    const current = pieces[index];
    if (current?.kind === 'open' && current.name === open.name) depth += 1;
    if (current?.kind === 'close' && current.name === open.name) depth -= 1;
    if (depth === 0) return index;
  }
  return pieces.length - 1;
}

/**
 * @param {string} markup
 * @returns {string}
 */
function formattedMarkup(markup) {
  const pieces = Array.from(normalizedMarkup(markup).matchAll(PIECE), (found) => piece(found[0]));
  /** @type {string[]} */
  const lines = [];
  let depth = 0;
  for (let at = 0; at < pieces.length; at += 1) {
    const current = pieces[at];
    if (current === undefined) continue;
    const indent = INDENT.repeat(depth);
    if (current.kind === 'open' && KEPT_WHOLE.has(current.name)) {
      const end = closingIndex(pieces, at);
      lines.push(
        indent +
          pieces
            .slice(at, end + 1)
            .map((part) => part.text)
            .join(''),
      );
      at = end;
      continue;
    }
    if (holdsOneLine(pieces, at)) {
      const inner =
        pieces[at + 1]?.kind === 'text' ? [pieces[at + 1], pieces[at + 2]] : [pieces[at + 1]];
      const whole = [current, ...inner].map((part) => part?.text ?? '').join('');
      if (indent.length + whole.length <= LINE_WIDTH) {
        lines.push(indent + whole);
        at += inner.length;
        continue;
      }
    }
    if (current.kind === 'close') {
      depth = Math.max(depth - 1, 0);
      lines.push(INDENT.repeat(depth) + current.text);
    } else if (current.kind === 'text') {
      lines.push(indent + current.text);
    } else {
      lines.push(...tagLines(current.text, indent));
      if (current.kind === 'open') depth += 1;
    }
  }
  return lines.join('\n');
}

/**
 * @param {string} markup
 * @returns {string}
 */
function fixtureText(markup) {
  const formatted = formattedMarkup(markup);
  return formatted === '' ? '' : `${formatted}\n`;
}

export { LINE_WIDTH, fixtureText, formattedMarkup };
