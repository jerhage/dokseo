type MarkupVerdict =
  | { readonly kind: 'match'; readonly markup: string }
  | {
      readonly kind: 'mismatch';
      readonly rendered: string;
      readonly fixture: string;
      readonly firstDifference: number;
    };

const COMMENT = /<!--[\s\S]*?-->/gu;

const SELF_CLOSING = /<([a-z][\w-]*)([^>]*?)\s*\/>/gu;

const SPACE_AFTER_TAG = />\s+/gu;

const SPACE_BEFORE_TAG = /\s+</gu;

const ANY_SPACE = /\s+/gu;

const OPENING_TAG = /<[a-z][^>]*>/gu;

const TAG_PARTS = /^<([a-z][\w-]*)([\s\S]*?)>$/u;

const ATTRIBUTE = /([^\s="]+)(?:="([^"]*)")?/gu;

function sortedClasses(value: string): string {
  return value
    .split(' ')
    .filter((name) => name !== '')
    .toSorted()
    .join(' ');
}

function attributeText(name: string, value: string | undefined): string {
  const written = value ?? '';
  return `${name}="${name === 'class' ? sortedClasses(written) : written}"`;
}

function sortedTag(tag: string): string {
  const parts = TAG_PARTS.exec(tag);
  if (parts === null) return tag;
  const name = parts[1] ?? '';
  const attributes = Array.from((parts[2] ?? '').matchAll(ATTRIBUTE), (found) =>
    attributeText(found[1] ?? '', found[2]),
  ).toSorted();
  return attributes.length === 0 ? `<${name}>` : `<${name} ${attributes.join(' ')}>`;
}

function normalizedMarkup(html: string): string {
  return html
    .replaceAll(COMMENT, '')
    .replaceAll(SELF_CLOSING, '<$1$2></$1>')
    .replaceAll(SPACE_AFTER_TAG, '>')
    .replaceAll(SPACE_BEFORE_TAG, '<')
    .replaceAll(ANY_SPACE, ' ')
    .replaceAll(OPENING_TAG, sortedTag)
    .trim();
}

function firstDifference(left: string, right: string): number {
  const shorter = Math.min(left.length, right.length);
  for (let index = 0; index < shorter; index += 1) {
    if (left[index] !== right[index]) return index;
  }
  return shorter;
}

function markupVerdict(rendered: string, fixture: string): MarkupVerdict {
  const fromComponent = normalizedMarkup(rendered);
  const fromFixture = normalizedMarkup(fixture);
  if (fromComponent === fromFixture) return { kind: 'match', markup: fromComponent };
  return {
    kind: 'mismatch',
    rendered: fromComponent,
    fixture: fromFixture,
    firstDifference: firstDifference(fromComponent, fromFixture),
  };
}

export { markupVerdict, normalizedMarkup };
export type { MarkupVerdict };
