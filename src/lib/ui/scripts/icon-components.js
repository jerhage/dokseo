import { readFileSync, readdirSync } from 'node:fs';

/**
 * @typedef {{ readonly kind: 'text'; readonly value: string }} TextDoc
 * @typedef {{ readonly kind: 'line'; readonly flat: string }} LineDoc
 * @typedef {{ readonly kind: 'if-broken'; readonly value: string }} IfBrokenDoc
 * @typedef {{ readonly kind: 'concat'; readonly parts: readonly Doc[] }} ConcatDoc
 * @typedef {{ readonly kind: 'indent'; readonly contents: Doc }} IndentDoc
 * @typedef {{ readonly kind: 'group'; readonly contents: Doc; broken: boolean }} GroupDoc
 * @typedef {TextDoc | LineDoc | IfBrokenDoc | ConcatDoc | IndentDoc | GroupDoc} Doc
 * @typedef {'flat' | 'broken'} Mode
 * @typedef {{ readonly depth: number; readonly mode: Mode; readonly doc: Doc }} Command
 * @typedef {readonly [string, Readonly<Record<string, string>>]} IconShape
 * @typedef {{ readonly file: string; readonly source: string }} IconComponent
 */

const PRINT_WIDTH = 100;

const INDENT_WIDTH = 2;

const IDENTIFIER = /^[A-Za-z_$][\w$]*$/u;

const SCRIPT = [
  '<script lang="ts">',
  "  import Icon from './Icon.svelte';",
  "  import type { IconProps } from './icon';",
  '',
  '  let props: IconProps = $props();',
  '</script>',
  '',
].join('\n');

/** @type {LineDoc} */
const LINE = { kind: 'line', flat: ' ' };

/** @type {LineDoc} */
const SOFT_LINE = { kind: 'line', flat: '' };

/** @type {IfBrokenDoc} */
const TRAILING_COMMA = { kind: 'if-broken', value: ',' };

/**
 * @param {string} value
 * @returns {TextDoc}
 */
function text(value) {
  return { kind: 'text', value };
}

/**
 * @param {readonly Doc[]} parts
 * @returns {ConcatDoc}
 */
function concat(parts) {
  return { kind: 'concat', parts };
}

/**
 * @param {readonly Doc[]} parts
 * @returns {IndentDoc}
 */
function indent(parts) {
  return { kind: 'indent', contents: concat(parts) };
}

/**
 * @param {readonly Doc[]} parts
 * @param {boolean} broken
 * @returns {GroupDoc}
 */
function group(parts, broken = false) {
  return { kind: 'group', contents: concat(parts), broken };
}

/**
 * @param {readonly Doc[]} items
 * @returns {Doc}
 */
function commaSeparated(items) {
  return concat(items.flatMap((item, index) => (index === 0 ? [item] : [text(','), LINE, item])));
}

/**
 * @param {string} value
 * @returns {string}
 */
function quoted(value) {
  return `'${value.replaceAll('\\', '\\\\').replaceAll("'", "\\'")}'`;
}

/**
 * @param {Readonly<Record<string, string>>} attributes
 * @returns {Doc}
 */
function objectDoc(attributes) {
  const properties = Object.entries(attributes).map(([name, value]) =>
    text(`${IDENTIFIER.test(name) ? name : quoted(name)}: ${quoted(value)}`),
  );
  return group([
    text('{'),
    indent([LINE, commaSeparated(properties)]),
    TRAILING_COMMA,
    LINE,
    text('}'),
  ]);
}

/**
 * @param {readonly Doc[]} elements
 * @param {boolean} broken
 * @returns {Doc}
 */
function arrayDoc(elements, broken) {
  return group(
    [
      text('['),
      indent([SOFT_LINE, commaSeparated(elements)]),
      TRAILING_COMMA,
      SOFT_LINE,
      text(']'),
    ],
    broken,
  );
}

/**
 * @param {readonly IconShape[]} shapes
 * @returns {Doc}
 */
function iconNodeDoc(shapes) {
  const elements = shapes.map(([element, attributes]) =>
    arrayDoc([text(quoted(element)), objectDoc(attributes)], false),
  );
  return arrayDoc(elements, shapes.length > 1);
}

/**
 * @param {Doc} doc
 * @returns {boolean}
 */
function propagateBreaks(doc) {
  switch (doc.kind) {
    case 'concat':
      return doc.parts.map(propagateBreaks).some(Boolean);
    case 'indent':
      return propagateBreaks(doc.contents);
    case 'group': {
      const inner = propagateBreaks(doc.contents);
      doc.broken = doc.broken || inner;
      return doc.broken;
    }
    case 'text':
    case 'line':
    case 'if-broken':
      return false;
  }
}

/**
 * @param {Command} command
 * @returns {readonly Command[]}
 */
function children(command) {
  const { depth, mode, doc } = command;
  switch (doc.kind) {
    case 'concat':
      return doc.parts.map((part) => ({ depth, mode, doc: part }));
    case 'indent':
      return [{ depth: depth + INDENT_WIDTH, mode, doc: doc.contents }];
    case 'group':
    case 'text':
    case 'line':
    case 'if-broken':
      return [];
  }
}

/**
 * @param {Command} next
 * @param {readonly Command[]} rest
 * @param {number} width
 * @returns {boolean}
 */
function fits(next, rest, width) {
  /** @type {Command[]} */
  const commands = [next];
  let restIndex = rest.length;
  let remaining = width;
  while (remaining >= 0) {
    if (commands.length === 0) {
      if (restIndex === 0) return true;
      restIndex -= 1;
      commands.push(...rest.slice(restIndex, restIndex + 1));
    }
    const command = commands.pop();
    if (command === undefined) return true;
    const { depth, mode, doc } = command;
    if (doc.kind === 'text') remaining -= doc.value.length;
    if (doc.kind === 'if-broken' && mode === 'broken') remaining -= doc.value.length;
    if (doc.kind === 'line' && mode === 'broken') return true;
    if (doc.kind === 'line') remaining -= doc.flat.length;
    if (doc.kind === 'group') {
      commands.push({ depth, mode: doc.broken ? 'broken' : mode, doc: doc.contents });
    }
    commands.push(...children(command).toReversed());
  }
  return false;
}

/**
 * @param {Doc} doc
 * @returns {string}
 */
function printed(doc) {
  propagateBreaks(doc);
  let output = '';
  let column = 0;
  /** @type {Command[]} */
  const commands = [{ depth: 0, mode: 'broken', doc }];
  for (let command = commands.pop(); command !== undefined; command = commands.pop()) {
    const { depth, mode, doc: current } = command;
    if (current.kind === 'text' || (current.kind === 'if-broken' && mode === 'broken')) {
      output += current.value;
      column += current.value.length;
    }
    if (current.kind === 'line' && mode === 'flat') {
      output += current.flat;
      column += current.flat.length;
    }
    if (current.kind === 'line' && mode === 'broken') {
      output += `\n${' '.repeat(depth)}`;
      column = depth;
    }
    if (current.kind === 'group') {
      /** @type {Command} */
      const flat = { depth, mode: 'flat', doc: current.contents };
      const fitsFlat = !current.broken && fits(flat, commands, PRINT_WIDTH - column);
      commands.push(fitsFlat ? flat : { depth, mode: 'broken', doc: current.contents });
    }
    commands.push(...children(command).toReversed());
  }
  return output;
}

/**
 * @param {string} tag
 * @returns {Readonly<Record<string, string>>}
 */
function attributesOf(tag) {
  return Object.fromEntries(
    Array.from(tag.matchAll(/\s([\w-]+)="([^"]*)"/gu), (found) => [found[1] ?? '', found[2] ?? '']),
  );
}

/**
 * @param {string} svg
 * @returns {readonly IconShape[]}
 */
function shapesOf(svg) {
  const body = svg.slice(svg.indexOf('>') + 1, svg.lastIndexOf('</svg>'));
  return Array.from(body.matchAll(/<([a-z]+)(\s[^>]*?)?\s*\/>/gu), (found) => [
    found[1] ?? '',
    attributesOf(found[2] ?? ''),
  ]);
}

/**
 * @param {string} name
 * @returns {string}
 */
function componentName(name) {
  return name
    .split('-')
    .map((word) => `${word.slice(0, 1).toUpperCase()}${word.slice(1)}`)
    .join('');
}

/**
 * @param {string} name
 * @param {string} svg
 * @returns {string}
 */
function iconComponentSource(name, svg) {
  const element = group([
    text('<Icon'),
    indent([
      LINE,
      text('{...props}'),
      LINE,
      text(`name="${name}"`),
      LINE,
      text('iconNode={'),
      iconNodeDoc(shapesOf(svg)),
      text('}'),
    ]),
    LINE,
    text('/>'),
  ]);
  return `${SCRIPT}\n${printed(element)}\n`;
}

/**
 * @param {URL} folder
 * @returns {readonly IconComponent[]}
 */
function iconComponents(folder) {
  return readdirSync(folder)
    .filter((file) => file.endsWith('.svg'))
    .toSorted()
    .map((file) => {
      const name = file.slice(0, -'.svg'.length);
      return {
        file: `${componentName(name)}.svelte`,
        source: iconComponentSource(name, readFileSync(new URL(file, folder), 'utf8')),
      };
    });
}

export { componentName, iconComponentSource, iconComponents };
