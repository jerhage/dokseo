# Kandan UI core guide

## What the core is

Kandan UI exists in framework versions, such as `kandan-ui-svelte`. Each one renders the same
markup, styled by the same stylesheets, and behaves the same way. The core is the part they
share:

| Folder or file | What it holds |
| --- | --- |
| `styles/` | Plain CSS joined by relative `@import` statements in `styles/index.css`. |
| `fonts/` | The `woff2` files and their SIL Open Font Licenses (`<name>.OFL.txt`). |
| `icons/` | One SVG per icon and Lucide's license (`icons/LICENSE.txt`). |
| `appearance.js` | The theme and colour scheme vocabulary and the functions that read and write it. |
| `theme-boot.js` | The first-paint script that applies a saved appearance. |
| `breakpoints.js` | `NARROW_SCREEN_QUERY`, the media query the narrow layouts switch at. |
| `tag-colours.js` | `TAG_COLOURS`, the colours a tag and a badge can take. |
| `fixtures/` | The markup contract: one HTML file per component variant. |
| `rules/` | The behaviour rules of the components that run a script, as JSON. |
| `contract/` | The normalizer, the formatter and the comparison a framework version's spec calls. |

The core holds no component behaviour. A framework version implements each component, and its
specs prove that the markup matches the fixtures and that the behaviour follows the rules.

Everything is plain JavaScript with JSDoc types, checked with `checkJs`, and runs in Node 24 or
any browser with no build step and no runtime dependency.

## Versions

The core is released as semver tags (`v1.4.0`). A framework version pulls a tag, never a branch,
and names the tag in the pull's commit message.

- Major: a fixture changes the markup of an existing variant, a rule changes an existing
  behaviour, a class, token or attribute is renamed or removed, or an export of `appearance.js`,
  `theme-boot.js` or `contract/` changes its signature. Every framework version must change.
- Minor: a new component, variant, fixture, rule, theme, token, utility or icon. Nothing that
  exists changes.
- Patch: a stylesheet fix that changes no class, token or fixture; a documentation fix.

A change to `themeBootScript`'s output is major even when its behaviour is the same, because
every app that admits the script by its hash must update the hash.

## Vendoring

A framework version vendors the core with git subtree at `core/`:

```sh
git subtree add --prefix=core https://github.com/jerhage/kandan-ui v1.4.0 --squash
git subtree pull --prefix=core https://github.com/jerhage/kandan-ui v1.5.0 --squash
```

Run the pull on the default branch; a rebase drops the merge commit it makes. Files under
`core/` are not edited in the framework version: a fix to them is made here, tagged, and pulled.
A fix found in an app travels app → framework version → core.

Paths inside the core are relative to the core, so it works at any prefix.

## The stylesheets

`styles/index.css` is the one entry point. Link or import it once:

```html
<link rel="stylesheet" href="/vendor/kandan/core/styles/index.css">
```

It declares the cascade layer order and imports each file into the layer its folder names:

```css
@layer open-props, reset, base, tokens, components, features, utilities, overrides;
```

A browser fixes the order of cascade layers the first time it meets each name. If any of the
page's own stylesheets can load before `index.css`, declare the same order first, inline in the
page's head:

```html
<style>
  @layer open-props, reset, base, tokens, components, features, utilities, overrides;
</style>
```

An app's own styles go in the `features` layer, between the components and the utilities, so a
utility class still wins over them.

### Fonts

`styles/base/fonts.css` names each font by a URL relative to itself, such as
`url('../../fonts/geist.woff2')`. Served unbuilt, the browser resolves it to the `fonts/` folder
beside `styles/`. A bundler treats the URLs as assets and emits the files itself. Keep `styles/`
and `fonts/` side by side.

Each font ships with its license in `fonts/<name>.OFL.txt`. Nothing imports the license files, so
a bundler leaves them out; the app decides whether and where it publishes them.

## The attribute contract

The stylesheets read two attributes on the `html` element, and nothing else about the appearance:

- `data-theme` names one of `THEMES`: `base`, `petal`, `yorha`, `crayon`, `ember`, `mono`,
  `forge` or `moss`. `base` is the default.
- `data-color-scheme` is `light` or `dark` to pin a scheme. When it is absent, the page follows
  the system scheme.

`appearance.js` holds the vocabulary:

- `THEMES` (and the `Theme` type), `COLOR_SCHEMES` (and `ColorScheme`: `automatic`, `light`,
  `dark`), `THEME_ATTRIBUTE` and `SCHEME_ATTRIBUTE`.
- `applyAppearance(root, appearance)` sets both attributes; `automatic` removes
  `data-color-scheme`.
- `readAppearance(root)` reads them back, falling back to `base` and `automatic` for a missing or
  unknown value.
- `pinnedScheme(scheme)` gives the value a pinned scheme stores, or `undefined` for `automatic`.

### Saving an appearance

The core does not decide where a chosen appearance is kept. The app stores the theme and the
scheme under its own keys and calls `applyAppearance`. Store the scheme only when it is pinned,
and remove it for `automatic`: the first-paint script reads a missing scheme as "follow the
system".

```js
import { applyAppearance, pinnedScheme } from './core/appearance.js';

const THEME_KEY = 'app.theme';

const SCHEME_KEY = 'app.color-scheme';

function chooseAppearance(appearance) {
  applyAppearance(document.documentElement, appearance);
  try {
    localStorage.setItem(THEME_KEY, appearance.theme);
    const pinned = pinnedScheme(appearance.colorScheme);
    if (pinned === undefined) localStorage.removeItem(SCHEME_KEY);
    else localStorage.setItem(SCHEME_KEY, pinned);
  } catch {
    return;
  }
}
```

### The first-paint script

The saved appearance must be on the `html` element before the first paint, or the page paints
in the default theme and then switches. Modules load too late for that, so the page carries an
inline script in its head. `themeBootScript` builds its source from `THEMES`, with the app's
storage keys as parameters:

```js
import { themeBootScript } from './core/theme-boot.js';

themeBootScript({ themeKey: 'app.theme', schemeKey: 'app.color-scheme' });
```

It returns a block that reads both keys from `localStorage`, accepts only a known theme and a
pinned scheme, and sets `data-theme` (falling back to `base`) and, when a scheme is pinned,
`data-color-scheme`. If reading storage throws, the defaults stay. Paste the output between
`<script>` and `</script>` in the page's head, after the layer order.

With a content security policy, admit the script by its hash in `script-src`: the SHA-256 of the
exact text between the tags, indentation included, in base64, as `'sha256-…'`. The output is
fixed byte for byte for given keys (a spec pins it), so the hash changes only when the core
changes the script, which is a major version. Keep a drift test in the app that compares the
inline script with `themeBootScript`'s output, so a new theme fails until the page is updated.

## Icons

`icons/<name>.svg` holds one icon, named in kebab case: a Lucide icon, or one drawn on Lucide's
grid in its style (`selected-shelf`). Each file is a standalone SVG with the attributes every Kandan icon renders:

```html
<svg
  xmlns="http://www.w3.org/2000/svg"
  width="24"
  height="24"
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width="2"
  stroke-linecap="round"
  stroke-linejoin="round"
  aria-hidden="true"
  class="lucide lucide-check"
>
  <path d="M20 6 9 17l-5-5" />
</svg>
```

The icon takes the text colour. It is decorative by default (`aria-hidden="true"`); a framework
version drops that attribute when the icon is given an accessible name, a `role` or a `title`.
The stroke width is the theme's (`styles/components/icon.css`) unless an icon fixes its own; a
framework version marks a fixed stroke with `data-fixed-stroke`.

A framework version generates its icon components from these files and checks they are current.
Lucide's license must ship with the icons: keep `icons/LICENSE.txt` beside them.

## The markup contract

### A fixture

`fixtures/<component>/<variant>.html` is the markup one component renders for one variant: a
set of props, sizes or states that changes the markup. The component and the variant are in
kebab case: `fixtures/badge/success.html`, `fixtures/modal/fill-narrow.html`.

```html
<span class="badge badge-success">Read</span>
```

A fixture is the markup as the component renders it before any script runs (a server render),
for the content the variant names. The text inside (`Read`, `Save`) is part of the fixture: the
framework spec renders the variant with the same content.

Each fixture is written in one canonical form, so a diff of a fixture is a diff of the contract:

- Attributes are sorted by name, class names alphabetically, and style declarations by name.
- Every element is closed; void elements (`input`, `img`, `br`, `hr` and the rest) are not.
  A valueless attribute is written with the empty value (`hidden=""`).
- Each tag and each text is on its own line, indented two spaces per level. An element holding
  only one text, or nothing, stays on one line. A tag longer than 100 characters has one
  attribute per line. A `pre` or a `textarea` stays whole on one line.
- Generated ids are placeholders: `id-1`, `id-2`, numbered in order of first appearance.

`fixtureText(markup)` from `contract/format.js` writes exactly this form, and a spec checks that
every fixture already is in it.

### What the comparison ignores

`normalizedMarkup` in `contract/normalize.js` reduces both sides to one string before they are
compared. It ignores what differs between frameworks and does not change what the user gets:

- comments (such as hydration markers);
- the self-closing form (`<path />` and `<path></path>`, `<input />` and `<input>`);
- white space next to a tag, and any run of white space elsewhere (collapsed to one space);
- the order of attributes, of class names and of style declarations, and the spacing inside a
  style declaration;
- an empty `class` or `style` attribute;
- the value of a generated id. Every distinct value of `id`, `for`, `popovertarget`,
  `aria-controls`, `aria-labelledby` and `aria-describedby` (each id of a list), and the id in a
  `url(#…)` reference (an SVG `marker-end`), becomes `id-1`, `id-2`, … in order of first
  appearance, reading the attributes of each tag in sorted order. Two attributes that named the
  same id still name the same placeholder.

Because white space next to a tag is ignored, `a <b>b</b>` and `a<b>b</b>` compare equal: the
contract does not cover the space between inline text and an element.

### What is not a fixture

A fixture never holds markup that only a script produces. Where a script adds an element or a
state (an open menu, a drawn selection box, a leaving toast), the rules describe it, and the
fixture shows the starting markup. Two fixtures are empty, because the component renders nothing
until a script acts: `toast-clearance/default.html` and `window-dropzone/idle.html`.

### Running the contract spec in a framework version

The framework spec renders each variant, then calls `compareMarkup(rendered, fixture)` from
`contract/compare.js`. The result always carries both sides, normalized and formatted alike, so
a plain equality assertion prints a readable line diff:

```js
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { it } from 'node:test';
import { compareMarkup } from '../core/contract/compare.js';

const FIXTURES = new URL('../core/fixtures/', import.meta.url);

function fixture(path) {
  return readFileSync(new URL(`${path}.html`, FIXTURES), 'utf8');
}

it('renders badge/success as its fixture describes', () => {
  const result = compareMarkup(renderBadge({ variant: 'success', text: 'Read' }), fixture('badge/success'));

  assert.equal(result.rendered, result.fixture);
});
```

With Vitest, `expect(result.rendered).toBe(result.fixture)` does the same. `result.kind` is
`match` or `mismatch`; a mismatch also carries `line`, the first differing line, and `message`,
which names it with both sides.

Keep one table in the framework version that maps every fixture path to the props that render
it, and check that every file under `core/fixtures/` has an entry, so a new fixture fails until
the framework renders it.

## The behaviour rules

`rules/<component>.json` describes what a component's script (or a native element) does, for
the fifteen components that have one. A rule is a state before, an event, and a state after,
read against a fixture:

```json
{
  "name": "shows a tab when it is clicked",
  "fixture": "tabs/underline",
  "when": [{ "event": "click", "target": ".tab:nth-child(2)" }],
  "then": [
    {
      "selector": ".tab:nth-child(2)",
      "attributes": { "aria-selected": "true", "tabindex": "0" },
      "classes": { "is-active": true }
    }
  ],
  "emits": [{ "callback": "onselectedchange", "with": "notes" }],
  "source": "Tabs.svelte (select, keydown), roving.ts (tabMove, landOn), tabs.ts (shownTab)",
  "certain": true
}
```

- `fixture` is the starting markup. `given` adds state on top of it (focus, an open popover);
  `options` names settings that change no markup (`{ "wrapFocus": true }`).
- `when` is a list of triggers. `event` is a DOM event (`click`, `keydown` with `key`,
  `pointerdown`, `dragenter` with `files`, …), or one of: `set` (a prop or setting changes:
  `prop`, `value`), `call` (a method is called: `method`, `value`), `time` (`ms` pass), `mount`,
  `unmount`, `animationsend` (the element's running animations finish). `target` is a selector,
  or `window` or `document`.
- A pointer gesture is written whole: a `pointermove`, `pointerup` or `pointercancel` follows a
  `pointerdown` (or `mousedown`) earlier in the same `when`, and its `dx` and `dy` are its travel
  from that press. A lift with no press before it ends nothing.
- `then` lists element states after the triggers: `attributes` (a value, or `null` for absent),
  `classes` (present or not), `style` (a custom property's value, `set` for any value, `null`, or
  a measured value), `properties` (DOM properties such as `value`), `focused`, `open` (a popover
  or a dialog is open) and `present` (the element exists).
- A measured value states a number the component computes from the pointer or the layout, which
  a host that scales the page can move by a fraction of a pixel. It names the number, its unit and
  how far the written value may differ from it:

  ```json
  "style": { "--rect-height": { "value": 40, "unit": "px", "tolerance": 0.5 } }
  ```

  The written value must end in the unit, and the number before it must lie within the tolerance
  of `value`. Use it only for a measured value; a value the component writes from a token or a
  constant is stated exactly.
- `emits` lists the callbacks the component calls; `event` states what happens to the triggering
  event (`defaultPrevented`, `dropEffect`).
- `source` names where the behaviour lives in the reference implementation. `certain` is false
  when the rule could not be stated exactly from the code, and `note` then says why. A `note`
  also carries detail a selector cannot express.

`rules/schema.js` holds the JSDoc types and `rulesFileProblems(file)`, which lists what is wrong
with a rules file. A framework version runs each rule against its own component: render the
fixture's variant, apply `given`, fire `when`, and check `then`, `emits` and `event`.

## Adding things

### A theme

1. Add `styles/base/themes/<name>.css`. Its first rule holds the palette and its second the role
   primitives, both under `:root[data-theme='<name>']`, and it assigns exactly the role
   primitives `base.css` assigns.
2. Import it in `styles/index.css` next to the other themes, into the `base` layer.
3. Add the name to `THEMES` in `appearance.js`.

The specs fail until the stylesheet, `index.css` and `THEMES` agree. A new theme changes
`themeBootScript`'s output; see Versions.

### A component

1. Add its stylesheet under `styles/components/` and import it in `styles/index.css` into the
   `components` layer. Every custom property it reads at runtime gets a fallback.
2. Add one fixture per variant under `fixtures/<component>/`. Write it with the framework version
   that implements the component first: render each variant, pass the markup through
   `fixtureText`, and save it. Never write a fixture by hand that no component renders.
3. If it runs a script, add `rules/<component>.json`.

### A fixture

Render the variant in a framework version, write `fixtureText(rendered)` to
`fixtures/<component>/<variant>.html`, and add the variant to the framework version's table.

## The core's own checks

`npm test` runs `node --test`, which finds every `*.test.js`:

- `appearance.test.js`, `theme-boot.test.js`: the appearance functions, the first-paint script's
  behaviour and its exact text, and that `THEMES` matches the theme stylesheets.
- `contract/*.test.js`: the normalizer, the formatter and the comparison.
- `fixtures/fixtures.test.js`: every fixture is at a valid path, in canonical form, balanced, uses
  only placeholder ids, and names only classes the stylesheets define.
- `rules/rules.test.js`: every rules file is well formed, names a fixture that exists, starts
  from elements its fixture holds, and explains every uncertain rule.
- `icons/icons.test.js`: every icon is one SVG root with the expected attributes and shape
  elements only, and the license is present.
- `styles/design-system.test.js`, `styles/source-styling.test.js`: the stylesheet rules (layers,
  tokens, themes, component classes, utilities, motion, breakpoints).
- `library-files.test.js`: the file walker the specs use.

`npm run check` type-checks the JSDoc types with `tsc --noEmit -p jsconfig.json`;
`jsconfig.json` enables `checkJs`. Run `npm install` once first.
