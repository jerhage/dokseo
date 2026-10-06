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

The `appearance-switcher` and `appearance-choices` fixtures are the markup of a menu that picks
both. It shows the appearance it is given and reports a choice through `onchoose`
(`rules/appearance-choices.json`); the app saves it, as above.

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

- comments (such as hydration markers), the empty comment `<!>` among them;
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

A state that a script sets and that a component also renders from its props has a fixture of its
own. The table of contents marks the entry of the section being read with
`aria-current="location"` on its link: a script moves it as the page scrolls, and the base fixture,
like a server render, has no current entry; `table-of-contents/current-entry.html` is the markup
with one, rendered from the props, and its rules describe how the script moves it.

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
the twenty-one components that have one. A rule is a state before, an event, and a state after,
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
  `pointerdown`, `contextmenu`, `dragenter` with `files`, …), or one of: `set` (a prop or setting
  changes: `prop`, `value`), `call` (a method is called: `method`, `value`), `time` (`ms` pass),
  `mount`, `unmount`, `animationsend` (the element's running animations finish), `scroll` (`to`).
  `target` is a selector, or `window` or `document`. A `contextmenu` is the secondary button's
  press, as a user makes it, not a dispatched event.
- A `scroll` names, in `to`, the element it brings to the top of the area that scrolls it, as
  `element.scrollIntoView({ block: 'start' })` does; the area then fires its own scroll events. It
  states a place, not a distance, so the rule holds whatever layout the page gives the content
  around the component. The element `to` names may lie outside the fixture (a heading the page
  holds); the rule's `note` then says what the page must hold.
- A pointer gesture is written whole: a `pointermove`, `pointerup` or `pointercancel` follows a
  `pointerdown` (or `mousedown`) earlier in the same `when`, and its `dx` and `dy` are its travel
  from that press. A lift with no press before it ends nothing.
- `then` lists element states after the triggers: `attributes` (a value, or `null` for absent),
  `classes` (present or not), `style` (a custom property's value, `set` for any value, `null`, or
  a measured value), `properties` (DOM properties such as `value`), `focused`, `open` (a popover
  or a dialog is open), `present` (the element exists) and `references`.
- `references` maps an attribute that holds a generated id to a selector: the attribute must hold
  the id of the element the selector finds. It states what a value cannot, since the id differs
  from one render to the next:

  ```json
  "references": { "aria-activedescendant": ".combobox-option:nth-child(2)" }
  ```

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
2. Add one fixture per variant under `fixtures/<component>/`. When a framework version already
   implements the component, render each variant, pass the markup through `fixtureText`, and save
   it. A new component's fixtures may be written first, by hand and passed through `fixtureText`,
   so the framework versions are built to them; before the release that adds them, each must match
   the first framework version's render, and a fixture that does not is changed in that release.
3. If it runs a script, add `rules/<component>.json`.

### A fixture

Render the variant in a framework version, write `fixtureText(rendered)` to
`fixtures/<component>/<variant>.html`, and add the variant to the framework version's table.

## Adding or changing a component, from the core to an app

The core says what a component looks like and what its markup is; a framework version says how to
produce that markup and adds script only where the platform cannot do the work. Every change starts
here and travels down: core, then each framework version, then the apps that vendor it.

### First, ask what CSS and HTML can do

Before any script, check in this order:

1. A class or a modifier class (`.block`, `.block-part`, `.block-modifier`) in the `components`
   layer.
2. A media query or a container query, for anything that depends on the screen or the container
   size. A presentation that changes at a breakpoint is a modifier with a query, never a script that
   watches the width and swaps components.
3. A native element or attribute: `<dialog>`, `popover` (`auto`, `manual`, `hint`), `<details>`,
   form controls and their states, `:has()`, `:focus-visible`, `:popover-open`.
4. A token or a custom property with a fallback, for a value that varies.

What remains is script, in the framework version: moving focus, keyboard handling beyond the
native element's, measuring and placing an overlay, timing, and wiring callbacks. Write that
behaviour down as rules here, so every framework version implements the same thing.

Two lessons recorded as specs: an element that holds a panel off screen uses `overflow: clip`, not
`hidden`, because `hidden` is still a scroll container and focus can scroll it; and an anchored
overlay is placed again when its own size changes, not only on scroll and resize.

### The steps

1. **Core.** Change or add the stylesheet, the fixtures and the rules; see A component and A
   fixture below. Run `npm test` and `npm run check`. Commit, and tag the release (see Versions: a
   new component or fixture is a minor release, a changed fixture or rule a major one, a stylesheet
   change that keeps every fixture a patch). Push with `git push origin main --follow-tags`.
2. **Framework version.** On its `main`, pull the tag from the remote:
   `git subtree pull --prefix=core https://github.com/jerhage/kandan-ui <tag> --squash`. Then build
   or change the component until its contract spec matches every fixture and its rules pass, add or
   update its playground demo, and run the version's checks and its browser rules. Commit and push.
3. **App.** On its `main`, pull the framework version from the remote with `git subtree pull`, as
   its own guide says. Update anything in the app that names the changed paths or counts, run the
   app's checks, commit and push.

Pull from the remote, never from a local folder, and push in this order, so no repository refers to
a commit its remote does not have yet. Never rebase a branch that holds a subtree merge.

If a framework version finds a fixture or a rule that is wrong or cannot be built, fix it here in a
new release and pull that, rather than bending the component or editing the vendored `core/`.

### Changing an existing component

Change the stylesheet, then the fixtures the change affects (regenerate them through
`fixtureText`), then the rules if behaviour changes, and release at the level the change needs.
Each framework version's contract spec fails until its component renders the new fixtures, which
is the point: the change cannot reach an app until every version follows it.

## The core's own checks

`npm test` runs `node --test`, which finds every `*.test.js`:

- `appearance.test.js`, `theme-boot.test.js`: the appearance functions, the first-paint script's
  behaviour and its exact text, and that `THEMES` matches the theme stylesheets.
- `contract/*.test.js`: the normalizer, the formatter and the comparison.
- `fixtures/fixtures.test.js`: every fixture is at a valid path, in canonical form, holds no
  comment, is balanced, uses only placeholder ids, and names only classes the stylesheets define.
- `rules/rules.test.js`: every rules file is well formed, names a fixture that exists, starts
  from elements its fixture holds, and explains every uncertain rule.
- `icons/icons.test.js`: every icon is one SVG root with the expected attributes and shape
  elements only, and the license is present.
- `styles/design-system.test.js`, `styles/source-styling.test.js`: the stylesheet rules (layers,
  tokens, themes, component classes, utilities, motion, breakpoints).
- `library-files.test.js`: the file walker the specs use.

`npm run check` type-checks the JSDoc types with `tsc --noEmit -p jsconfig.json`;
`jsconfig.json` enables `checkJs`. Run `npm install` once first.
