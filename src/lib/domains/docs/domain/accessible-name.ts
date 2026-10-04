import { match } from 'ts-pattern';

type AccessText = { readonly kind: 'text'; readonly text: string };

type AccessElement = {
  readonly kind: 'element';
  readonly tag: string;
  readonly attributes: Readonly<Record<string, string>>;
  readonly hidden: boolean;
  readonly focusable: boolean;
  readonly children: readonly AccessNode[];
  readonly labels: readonly AccessElement[];
  readonly labelledBy: readonly AccessElement[];
  readonly describedBy: readonly AccessElement[];
};

type AccessNode = AccessText | AccessElement;

type NameSource =
  | 'aria-labelledby'
  | 'aria-label'
  | 'label'
  | 'alt'
  | 'content'
  | 'title'
  | 'placeholder'
  | 'none';

type AccessReading = {
  readonly hidden: boolean;
  readonly role: string;
  readonly name: string;
  readonly source: NameSource;
  readonly description: string;
  readonly states: readonly string[];
};

type Named = { readonly name: string; readonly source: NameSource };

const NAMED_FROM_CONTENT: ReadonlySet<string> = new Set([
  'button',
  'link',
  'heading',
  'checkbox',
  'switch',
  'radio',
  'tab',
  'option',
  'menuitem',
  'cell',
  'columnheader',
  'rowheader',
  'tooltip',
]);

const TEXT_INPUTS: ReadonlySet<string> = new Set(['', 'text', 'email', 'tel', 'url', 'password']);

const NOTHING: Named = { name: '', source: 'none' };

function flat(text: string): string {
  return text.replace(/\s+/gu, ' ').trim();
}

function attribute(element: AccessElement, name: string): string | null {
  return element.attributes[name] ?? null;
}

function inputRole(element: AccessElement): string {
  const type = (attribute(element, 'type') ?? '').toLowerCase();
  if (TEXT_INPUTS.has(type)) return 'textbox';
  return match(type)
    .with('search', () => 'searchbox')
    .with('checkbox', () => 'checkbox')
    .with('radio', () => 'radio')
    .with('range', () => 'slider')
    .with('number', () => 'spinbutton')
    .with('button', 'submit', 'reset', () => 'button')
    .otherwise(() => 'textbox');
}

function implicitRole(element: AccessElement): string {
  return match(element.tag)
    .with('button', () => 'button')
    .with('a', () => (attribute(element, 'href') === null ? 'generic' : 'link'))
    .with('input', () => inputRole(element))
    .with('textarea', () => 'textbox')
    .with('dialog', () => 'dialog')
    .with('h1', 'h2', 'h3', 'h4', 'h5', 'h6', () => 'heading')
    .with('p', () => 'paragraph')
    .with('img', () => (attribute(element, 'alt') === '' ? 'presentation' : 'img'))
    .with('nav', () => 'navigation')
    .with('ul', 'ol', () => 'list')
    .with('li', () => 'listitem')
    .otherwise(() => 'generic');
}

function roleOf(element: AccessElement): string {
  const [explicit] = (attribute(element, 'role') ?? '').trim().split(/\s+/u);
  return explicit === undefined || explicit === '' ? implicitRole(element) : explicit;
}

function contentText(element: AccessElement): string {
  return flat(
    element.children
      .map((child) => {
        if (child.kind === 'text') return child.text;
        if (child.hidden) return '';
        const label = attribute(child, 'aria-label');
        if (label !== null && flat(label) !== '') return ` ${flat(label)} `;
        if (child.tag === 'img') return ` ${attribute(child, 'alt') ?? ''} `;
        return ` ${contentText(child)} `;
      })
      .join(''),
  );
}

function fromReferences(elements: readonly AccessElement[]): string {
  return flat(elements.map((referenced) => contentText(referenced)).join(' '));
}

function hostLabel(element: AccessElement): Named {
  if (element.tag === 'img') {
    const alt = attribute(element, 'alt');
    return alt === null ? NOTHING : { name: flat(alt), source: 'alt' };
  }
  const fromLabels = fromReferences(element.labels);
  return fromLabels === '' ? NOTHING : { name: fromLabels, source: 'label' };
}

function fallback(element: AccessElement): Named {
  const title = flat(attribute(element, 'title') ?? '');
  if (title !== '') return { name: title, source: 'title' };
  const placeholder = flat(attribute(element, 'placeholder') ?? '');
  if (placeholder !== '') return { name: placeholder, source: 'placeholder' };
  return NOTHING;
}

function nameOf(element: AccessElement, role: string): Named {
  if (element.hidden) return NOTHING;
  const labelled = fromReferences(element.labelledBy);
  if (labelled !== '') return { name: labelled, source: 'aria-labelledby' };
  const label = flat(attribute(element, 'aria-label') ?? '');
  if (label !== '') return { name: label, source: 'aria-label' };
  const host = hostLabel(element);
  if (host.name !== '') return host;
  if (NAMED_FROM_CONTENT.has(role)) {
    const content = contentText(element);
    if (content !== '') return { name: content, source: 'content' };
  }
  return fallback(element);
}

function descriptionOf(element: AccessElement, named: Named): string {
  const described = fromReferences(element.describedBy);
  if (described !== '') return described;
  if (named.source === 'title') return '';
  const title = flat(attribute(element, 'title') ?? '');
  return title === named.name ? '' : title;
}

function statesOf(element: AccessElement): readonly string[] {
  const states: string[] = [element.focusable ? 'focusable' : 'not focusable'];
  if (attribute(element, 'disabled') !== null) states.push('disabled');
  if (attribute(element, 'aria-invalid') === 'true') states.push('invalid');
  const expanded = attribute(element, 'aria-expanded');
  if (expanded !== null) states.push(expanded === 'true' ? 'expanded' : 'collapsed');
  if (attribute(element, 'aria-pressed') === 'true') states.push('pressed');
  if (attribute(element, 'aria-modal') === 'true') states.push('modal');
  return states;
}

function accessReading(element: AccessElement): AccessReading {
  const role = roleOf(element);
  const named = nameOf(element, role);
  return {
    hidden: element.hidden,
    role,
    name: named.name,
    source: named.source,
    description: descriptionOf(element, named),
    states: statesOf(element),
  };
}

export { accessReading, roleOf };
export type { AccessElement, AccessNode, AccessReading, AccessText, NameSource };
