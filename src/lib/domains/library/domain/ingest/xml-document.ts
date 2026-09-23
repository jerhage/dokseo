import { MAX_MARKUP_BYTES } from './ingest-limits';

type XmlElement = {
  readonly name: string;
  readonly localName: string;
  readonly attributes: ReadonlyMap<string, string>;
  readonly children: readonly XmlElement[];
  readonly text: string;
};

type Draft = {
  readonly name: string;
  readonly attributes: ReadonlyMap<string, string>;
  readonly children: XmlElement[];
  readonly text: string[];
};

type OpenTag = {
  readonly name: string;
  readonly attributes: ReadonlyMap<string, string>;
  readonly selfClosing: boolean;
  readonly at: number;
};

type TagRest = {
  readonly attributes: ReadonlyMap<string, string>;
  readonly selfClosing: boolean;
  readonly at: number;
};

type Scanned = {
  readonly text: string;
  readonly at: number;
};

const NAMED_REFERENCES: ReadonlyMap<string, string> = new Map([
  ['amp', '&'],
  ['lt', '<'],
  ['gt', '>'],
  ['quot', '"'],
  ['apos', "'"],
]);

const HIGHEST_CODE_POINT = 0x10_ff_ff;

function isSpace(character: string): boolean {
  return character === ' ' || character === '\t' || character === '\n' || character === '\r';
}

function isNameCharacter(character: string): boolean {
  if (character === '') return false;
  if (isSpace(character)) return false;
  return !['<', '>', '/', '=', '"', "'"].includes(character);
}

function isDigitRun(digits: string, radix: number): boolean {
  if (digits.length === 0) return false;
  return [...digits].every((digit) => !Number.isNaN(Number.parseInt(digit, radix)));
}

function decodeReference(body: string): string | null {
  const named = NAMED_REFERENCES.get(body);
  if (named !== undefined) return named;
  if (!body.startsWith('#')) return null;
  const hexadecimal = body.startsWith('#x') || body.startsWith('#X');
  const digits = hexadecimal ? body.slice(2) : body.slice(1);
  const radix = hexadecimal ? 16 : 10;
  if (!isDigitRun(digits, radix)) return null;
  const code = Number.parseInt(digits, radix);
  if (code < 0 || code > HIGHEST_CODE_POINT) return null;
  return String.fromCodePoint(code);
}

function decodeEntities(raw: string): string {
  if (!raw.includes('&')) return raw;
  let decoded = '';
  let at = 0;
  for (;;) {
    const ampersand = raw.indexOf('&', at);
    if (ampersand === -1) return decoded + raw.slice(at);
    decoded += raw.slice(at, ampersand);
    const semicolon = raw.indexOf(';', ampersand + 1);
    if (semicolon === -1) return decoded + raw.slice(ampersand);
    const reference = decodeReference(raw.slice(ampersand + 1, semicolon));
    decoded += reference ?? raw.slice(ampersand, semicolon + 1);
    at = semicolon + 1;
  }
}

function localNameOf(name: string): string {
  const colon = name.indexOf(':');
  return colon === -1 ? name : name.slice(colon + 1);
}

function skipSpace(source: string, from: number): number {
  let at = from;
  while (at < source.length && isSpace(source.charAt(at))) at += 1;
  return at;
}

function skipPast(source: string, marker: string, from: number): number {
  const end = source.indexOf(marker, from);
  return end === -1 ? source.length : end + marker.length;
}

function skipDeclaration(source: string, from: number): number {
  let at = from;
  let inSubset = false;
  while (at < source.length) {
    const character = source.charAt(at);
    if (character === '[') inSubset = true;
    else if (character === ']') inSubset = false;
    else if (character === '>' && !inSubset) return at + 1;
    at += 1;
  }
  return source.length;
}

function readName(source: string, from: number): Scanned {
  let at = from;
  while (at < source.length && isNameCharacter(source.charAt(at))) at += 1;
  return { text: source.slice(from, at), at };
}

function readQuoted(source: string, from: number, quote: string): Scanned {
  const end = source.indexOf(quote, from + 1);
  const stop = end === -1 ? source.length : end;
  return { text: source.slice(from + 1, stop), at: end === -1 ? source.length : end + 1 };
}

function readAttributes(source: string, from: number): TagRest {
  const attributes = new Map<string, string>();
  let at = from;
  for (;;) {
    at = skipSpace(source, at);
    if (at >= source.length) return { attributes, selfClosing: false, at };
    const character = source.charAt(at);
    if (character === '>') return { attributes, selfClosing: false, at: at + 1 };
    if (character === '/') return { attributes, selfClosing: true, at: skipPast(source, '>', at) };
    const attribute = readName(source, at);
    if (attribute.text === '') {
      at += 1;
      continue;
    }
    at = skipSpace(source, attribute.at);
    if (source.charAt(at) !== '=') {
      attributes.set(attribute.text, '');
      continue;
    }
    at = skipSpace(source, at + 1);
    const quote = source.charAt(at);
    if (quote === '"' || quote === "'") {
      const quoted = readQuoted(source, at, quote);
      attributes.set(attribute.text, decodeEntities(quoted.text));
      at = quoted.at;
      continue;
    }
    const bare = readName(source, at);
    attributes.set(attribute.text, decodeEntities(bare.text));
    at = bare.at === at ? at + 1 : bare.at;
  }
}

function readOpenTag(source: string, from: number): OpenTag {
  const name = readName(source, from);
  const rest = readAttributes(source, name.at);
  return {
    name: name.text,
    attributes: rest.attributes,
    selfClosing: rest.selfClosing,
    at: rest.at,
  };
}

function sealed(draft: Draft): XmlElement {
  return {
    name: draft.name,
    localName: localNameOf(draft.name),
    attributes: draft.attributes,
    children: draft.children,
    text: draft.text.join(''),
  };
}

function parseXml(source: string): XmlElement | null {
  if (source.length > MAX_MARKUP_BYTES) return null;
  const open: Draft[] = [];
  let root: XmlElement | null = null;
  let at = 0;

  const addText = (raw: string, decode: boolean): void => {
    const innermost = open.at(-1);
    if (innermost === undefined) return;
    innermost.text.push(decode ? decodeEntities(raw) : raw);
  };

  const close = (draft: Draft): void => {
    const element = sealed(draft);
    const parent = open.at(-1);
    if (parent === undefined) root ??= element;
    else parent.children.push(element);
  };

  while (at < source.length) {
    const angle = source.indexOf('<', at);
    if (angle === -1) {
      addText(source.slice(at), true);
      break;
    }
    if (angle > at) addText(source.slice(at, angle), true);
    if (source.startsWith('<!--', angle)) {
      at = skipPast(source, '-->', angle + 4);
      continue;
    }
    if (source.startsWith('<![CDATA[', angle)) {
      const end = source.indexOf(']]>', angle + 9);
      addText(source.slice(angle + 9, end === -1 ? source.length : end), false);
      at = end === -1 ? source.length : end + 3;
      continue;
    }
    if (source.startsWith('<?', angle)) {
      at = skipPast(source, '?>', angle + 2);
      continue;
    }
    if (source.startsWith('<!', angle)) {
      at = skipDeclaration(source, angle + 2);
      continue;
    }
    if (source.startsWith('</', angle)) {
      const name = readName(source, angle + 2);
      at = skipPast(source, '>', name.at);
      const innermost = open.at(-1);
      if (innermost !== undefined && innermost.name === name.text) {
        open.pop();
        close(innermost);
      }
      continue;
    }
    const opened = readOpenTag(source, angle + 1);
    at = opened.at === angle ? angle + 1 : opened.at;
    if (opened.name === '') continue;
    const draft: Draft = {
      name: opened.name,
      attributes: opened.attributes,
      children: [],
      text: [],
    };
    if (opened.selfClosing) close(draft);
    else open.push(draft);
  }

  while (open.length > 0) {
    const innermost = open.pop();
    if (innermost !== undefined) close(innermost);
  }
  return root;
}

function attributeOf(element: XmlElement, localName: string): string | null {
  for (const [name, value] of element.attributes) {
    if (localNameOf(name) === localName) return value;
  }
  return null;
}

function descendantsNamed(element: XmlElement, localName: string): readonly XmlElement[] {
  const found: XmlElement[] = [];
  const pending: XmlElement[] = [element];

  while (pending.length > 0) {
    const parent = pending.pop();
    if (parent === undefined) break;

    for (let step = parent.children.length - 1; step >= 0; step -= 1) {
      const child = parent.children[step];
      if (child !== undefined) pending.push(child);
    }
    if (parent !== element && parent.localName === localName) found.push(parent);
  }

  return found;
}

function firstNamed(element: XmlElement, localName: string): XmlElement | null {
  const [first] = descendantsNamed(element, localName);
  return first ?? null;
}

export { attributeOf, descendantsNamed, firstNamed, parseXml };
export type { XmlElement };
