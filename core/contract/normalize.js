const COMMENT = /<!--[\s\S]*?-->/gu;

const SELF_CLOSING = /<([a-zA-Z][\w-]*)([^>]*?)\s*\/>/gu;

const SPACE_AFTER_TAG = />\s+/gu;

const SPACE_BEFORE_TAG = /\s+</gu;

const ANY_SPACE = /\s+/gu;

const OPENING_TAG = /<[a-zA-Z][^>]*>/gu;

const TAG_PARTS = /^<([a-zA-Z][\w-]*)([\s\S]*?)>$/u;

const ATTRIBUTE = /([^\s="'>/]+)(?:=(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/gu;

const URL_REFERENCE = /^url\(#(.+)\)$/u;

const VOID_ELEMENTS = new Set([
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'link',
  'meta',
  'source',
  'track',
  'wbr',
]);

const ID_ATTRIBUTES = new Set([
  'id',
  'for',
  'popovertarget',
  'aria-controls',
  'aria-labelledby',
  'aria-describedby',
]);

/**
 * @typedef {object} Attribute
 * @property {string} name
 * @property {string} value
 */

/**
 * @typedef {object} OpeningTag
 * @property {string} name
 * @property {readonly Attribute[]} attributes
 */

/**
 * @param {string} name
 * @returns {boolean}
 */
function isVoidElement(name) {
  return VOID_ELEMENTS.has(name.toLowerCase());
}

/**
 * @param {string} value
 * @returns {string}
 */
function sortedClasses(value) {
  return value
    .split(' ')
    .filter((name) => name !== '')
    .toSorted()
    .join(' ');
}

/**
 * @param {string} value
 * @returns {string}
 */
function sortedDeclarations(value) {
  return value
    .split(';')
    .map((declaration) => declaration.trim())
    .filter((declaration) => declaration !== '')
    .map((declaration) => {
      const colon = declaration.indexOf(':');
      if (colon === -1) return declaration;
      return `${declaration.slice(0, colon).trim()}: ${declaration.slice(colon + 1).trim()}`;
    })
    .toSorted()
    .map((declaration) => `${declaration};`)
    .join(' ');
}

/**
 * @param {string} name
 * @param {string} value
 * @returns {string}
 */
function canonicalValue(name, value) {
  if (name === 'class') return sortedClasses(value);
  if (name === 'style') return sortedDeclarations(value);
  return value;
}

/**
 * @param {Attribute} attribute
 * @returns {boolean}
 */
function carriesMeaning({ name, value }) {
  return !((name === 'class' || name === 'style') && value === '');
}

/**
 * @param {string} tag
 * @returns {OpeningTag | null}
 */
function openingTag(tag) {
  const parts = TAG_PARTS.exec(tag);
  if (parts === null) return null;
  const attributes = Array.from((parts[2] ?? '').matchAll(ATTRIBUTE), (found) => {
    const name = found[1] ?? '';
    const value = found[2] ?? found[3] ?? found[4] ?? '';
    return { name, value: canonicalValue(name, value) };
  })
    .filter(carriesMeaning)
    .toSorted((left, right) => (left.name < right.name ? -1 : left.name > right.name ? 1 : 0));
  return { name: parts[1] ?? '', attributes };
}

/**
 * @param {OpeningTag} tag
 * @returns {string}
 */
function tagText(tag) {
  const attributes = tag.attributes.map(
    ({ name, value }) => `${name}="${value.replaceAll('"', '&quot;')}"`,
  );
  return attributes.length === 0 ? `<${tag.name}>` : `<${tag.name} ${attributes.join(' ')}>`;
}

/**
 * @param {string} tag
 * @returns {string}
 */
function sortedTag(tag) {
  const parsed = openingTag(tag);
  return parsed === null ? tag : tagText(parsed);
}

/**
 * @param {string} name
 * @param {string} attributes
 * @returns {string}
 */
function expandedSelfClosing(name, attributes) {
  return isVoidElement(name) ? `<${name}${attributes}>` : `<${name}${attributes}></${name}>`;
}

/**
 * @param {Map<string, string>} placeholders
 * @param {string} id
 * @returns {string}
 */
function placeholderFor(placeholders, id) {
  const known = placeholders.get(id);
  if (known !== undefined) return known;
  const fresh = `id-${placeholders.size + 1}`;
  placeholders.set(id, fresh);
  return fresh;
}

/**
 * @param {Map<string, string>} placeholders
 * @param {Attribute} attribute
 * @returns {Attribute}
 */
function withPlaceholders(placeholders, { name, value }) {
  if (ID_ATTRIBUTES.has(name)) {
    const ids = value.split(' ').filter((id) => id !== '');
    return { name, value: ids.map((id) => placeholderFor(placeholders, id)).join(' ') };
  }
  const reference = URL_REFERENCE.exec(value);
  if (reference === null) return { name, value };
  return { name, value: `url(#${placeholderFor(placeholders, reference[1] ?? '')})` };
}

/**
 * @param {string} markup
 * @returns {string}
 */
function placeholderIds(markup) {
  /** @type {Map<string, string>} */
  const placeholders = new Map();
  return markup.replaceAll(OPENING_TAG, (tag) => {
    const parsed = openingTag(tag);
    if (parsed === null) return tag;
    const attributes = parsed.attributes.map((attribute) =>
      withPlaceholders(placeholders, attribute),
    );
    return tagText({ name: parsed.name, attributes });
  });
}

/**
 * @param {string} html
 * @returns {string}
 */
function normalizedMarkup(html) {
  const sorted = html
    .replaceAll(COMMENT, '')
    .replaceAll(SELF_CLOSING, (_tag, name, attributes) => expandedSelfClosing(name, attributes))
    .replaceAll(SPACE_AFTER_TAG, '>')
    .replaceAll(SPACE_BEFORE_TAG, '<')
    .replaceAll(ANY_SPACE, ' ')
    .replaceAll(OPENING_TAG, sortedTag)
    .trim();
  return placeholderIds(sorted);
}

export { ID_ATTRIBUTES, VOID_ELEMENTS, isVoidElement, normalizedMarkup, openingTag };
