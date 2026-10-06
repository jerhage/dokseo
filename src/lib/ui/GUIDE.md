# Kandan UI guide

Kandan UI is a set of Svelte 5 base components with the stylesheets, themes, fonts and icons they
are drawn with. An app does not install it from a registry. It vendors the library: the full
source lives in the app's own repository, in one folder, and is updated with `git subtree`.

The folder holds:

- `core/`: the framework-free core, vendored from
  [kandan-ui](https://github.com/jerhage/kandan-ui) (see [The core](#the-core)). It holds the
  layered stylesheets (`core/styles/`, entry file `index.css`), the fonts and their licenses
  (`core/fonts/`), the icon sources with Lucide's license (`core/icons/`), the appearance script
  (`core/appearance.js`) and the first-paint script (`core/theme-boot.js`), the narrow-screen
  query (`core/breakpoints.js`), the tag colours (`core/tag-colours.js`), and the markup contract
  (`core/fixtures/`, `core/rules/`, `core/contract/`).
- `components/`: the Svelte components, their helpers, and the icons in `components/icons/`, one
  component per icon, generated from `core/icons/`.
- `contract/`: the cases and the specs that hold the components to the core's fixtures and
  behaviour rules.
- `playground/`: a page that shows every component and utility, for an app to mount on a
  development route.
- `scripts/`: `generate-icons.js`, which writes the icon components.
- `package.json`, `vite.config.ts`, `vitest.config.ts`, `vitest.browser.config.ts`,
  `tsconfig.json`, `.oxlintrc.json`, `.oxfmtrc.json`, `.gitignore` and `.github/`: the library's
  own tooling, used in the library's repository. An app that vendors the library ignores them (see
  [Apps ignore the library's tooling](#apps-ignore-the-librarys-tooling)).

Every file reaches the others by relative path. Nothing imports an app alias such as `$lib`, so
the folder works at any prefix. It needs Svelte 5 in runes mode, `ts-pattern`, and a Vite build
(the stylesheets name the fonts by relative URL, and the playground uses `import.meta.glob`). The
specs need Vitest.

## The core

`core/` is a copy of a tagged version of [kandan-ui](https://github.com/jerhage/kandan-ui), added
with `git subtree`. It holds what every version of Kandan UI shares and nothing that runs a
component: plain CSS, fonts, SVG icons, the appearance script in plain JavaScript with JSDoc types,
and the markup contract. Its own guide is `core/GUIDE.md`.

The library's components render the markup the core's fixtures describe, apply the classes its
stylesheets define, and behave as its rules describe; the contract specs check all three (see
[Running the library's checks](#running-the-librarys-checks)).

Files under `core/` are not edited here. A fix to a stylesheet, a fixture, a rule, an icon or the
appearance script is made in the core's repository, tagged there, and taken here with a pull.

### Taking a core update

Run it on `main`, naming the core's tag; the merge commit it makes must not be rebased:

```sh
git subtree pull --prefix=core https://github.com/jerhage/kandan-ui <tag> --squash
```

Name the tag in the commit message. Then regenerate the icons (`npm run generate:icons`), add a
case to `contract/cases.ts` and `contract/CaseMarkup.svelte` for every new fixture, add a subject
to `contract/rule-subjects.ts` for every fixture a new rule starts from, and run the checks. A new
major version of the core changes markup, a class, a token or the first-paint script; each change
must reach the components before the update is merged.

### Sending a fix back to the core

Prefer making the fix in the core's repository. When a fix was made here under `core/` (or arrived
from an app), send it on a branch of its own and merge it there:

```sh
git subtree push --prefix=core https://github.com/jerhage/kandan-ui <branch>
```

Only commits that touch `core/` travel, with `core/` as the root. Once the core has tagged the
fix, take the tag with `git subtree pull` as above.

## Vendoring with git subtree

An app keeps the library at one prefix of its choice. The examples use `src/lib/ui`.

Add a tagged version:

```sh
git subtree add --prefix=src/lib/ui https://github.com/jerhage/kandan-ui-svelte <tag> --squash
```

Take an update:

```sh
git subtree pull --prefix=src/lib/ui https://github.com/jerhage/kandan-ui-svelte <tag> --squash
```

Send a fix made in the app back to the library, on a branch of its own:

```sh
git subtree push --prefix=src/lib/ui https://github.com/jerhage/kandan-ui-svelte <branch>
```

`--squash` adds one commit holding the library's tree, so the app's history does not take in every
commit of the library. Every `add` and `pull` then records a merge commit in the app's history,
even when nothing in the folder was edited locally: that merge is how the next `pull` finds what
it already has.

Because of that merge, a library update cannot travel through a pull request that is merged with
"Rebase and merge": a rebase drops the merge and replays the squashed tree at the root of the
repository. Run `git subtree pull` on `main` directly and push the result. A local edit to the
library is an ordinary commit and goes through review like any other change; send it back with
`git subtree push` so the library has it.

With `--squash`, the next `pull` compares against the last `pull`, not the last `push`. A file that
was edited in the app, pushed, and then changed again in the library therefore conflicts on that
`pull`, even though the app holds nothing the library lacks. Resolve each such conflict by taking
the library's side (`git checkout --theirs -- <path>`, then `git add <path>`; `git write-tree`
refuses while a conflict is unstaged), then check that the folder equals the
library's tree at the pulled commit before you commit the merge:
`git diff FETCH_HEAD $(git write-tree --prefix=<prefix>/)` prints nothing (`git subtree pull`
leaves the pulled commit in `FETCH_HEAD`).

`git subtree add` refuses a prefix that already exists. To replace a copy, remove the folder in one
commit and add it in the next.

## Working on the library

A change to a component can start on either side.

- In an app. Edit the vendored folder and commit there like any other change, then send the
  commits to the library with `git subtree push --prefix=src/lib/ui <repo> <branch>` and merge
  that branch in the library's repository. Only the commits that touch the folder travel, with
  the folder as the root.
- In the library's repository. Edit, run its checks, and merge to `main`. Each app then takes the
  change with `git subtree pull --prefix=src/lib/ui <repo> main --squash`, run on the app's `main`.

Either way, run the library's own checks in its repository before a change reaches `main`. An app
runs the library's specs with its own, but it does not run the library's type check, lint or
format check with the library's settings.

A change to a stylesheet, a font, an icon or the appearance script belongs to the core (see
[Sending a fix back to the core](#sending-a-fix-back-to-the-core)). A fix made in an app under the
vendored `core/` reaches the core in two pushes: from the app to this library, then from this
library to the core.

## Running the library's checks

In a clone of the library's repository, install the dependencies once:

```sh
npm install
```

Any package manager that reads `package.json` works the same way (`pnpm install`,
`deno install`).

The scripts:

- `npm run dev`: serves the playground with Vite (`vite.config.ts`, rooted at `playground/`), at
  the address Vite prints. Its header holds the appearance switcher, which saves the choice under
  the placeholder keys `kandan.theme` and `kandan.color-scheme`.
- `npm run test`: every unit spec, once. `npm run test:unit` runs the `unit` project alone, and
  `npm run test:watch` watches.
- `npm run test:core`: the core's own specs, with `node --test`. They need no dependency.
- `npm run test:browser`: the behaviour rules in Chromium (see
  [The behaviour rules](#the-behaviour-rules)). It needs Playwright's Chromium once:
  `npx playwright install chromium`.
- `npm run generate:icons`: writes `components/icons/<Name>.svelte` from `core/icons/*.svg`.
- `npm run check`: `svelte-check` with the library's `tsconfig.json`. It also refuses an import
  of an app alias such as `$lib`, which the library's own config does not define.
- `npm run lint`: oxlint with `.oxlintrc.json`.
- `npm run format:check`: oxfmt with `.oxfmtrc.json`; `npm run format` rewrites.
- `npm run verify`: the type check, the lint, the format check, the unit specs and the core's
  specs in turn, the check to run before a change reaches `main`. It runs no browser.

The type check covers `core/` too: `tsconfig.json` sets `allowJs` and `checkJs`, so the core's
JSDoc types are checked with the library's settings. The lint, the format check and the unit
project leave `core/` out (`ignorePatterns` in `.oxlintrc.json` and `.oxfmtrc.json`, `exclude` in
`vitest.config.ts`): its files are not edited here, it has its own formatting, and its specs are
`node --test` files that `npm run test:core` runs.

The specs are `*.spec.ts` files beside the code they test. They run in Node, without a DOM, in the
`unit` project of `vitest.config.ts`, which compiles every `.svelte` file in runes mode. They read
the stylesheets and components by paths relative to themselves, so they pass at any prefix. The
specs that scan the whole tree list its files through `library-files.ts`, which skips
`node_modules/`, `build/`, `dist/`, `coverage/` and every dot folder, so a clone with its own
installed packages checks only the library's files. They check the components' markup, the
helpers, the classes the markup writes against the core's stylesheets, the icon set, the
playground's catalogs, and the contract below. The stylesheet rules themselves (layers, tokens,
themes, utilities) and the first-paint script are the core's specs.

### The markup contract

`contract/contract.spec.ts` renders every case in `contract/cases.ts` with `render` from
`svelte/server` and compares it with its fixture in `core/fixtures/` through `compareMarkup` from
`core/contract/compare.js`, which ignores what differs between frameworks (comments, attribute
order, generated ids). Each case is a snippet in `contract/CaseMarkup.svelte`, so the type check
covers the props it passes. A second test fails when a fixture has no case, or a case no fixture,
so a new fixture fails until a component renders it.

### The behaviour rules

`core/rules/*.json` describe what the scripted components do: a starting fixture, the state given
on top of it, the events, and the state and callbacks that follow. `contract/rules.svelte.spec.ts`
runs each rule against the component in Chromium: it mounts the rule's subject from
`contract/rule-subjects.ts`, reaches the given state, fires the events, and checks the result. A
rule the core marks as not certain is listed as a todo. `contract/rule-subjects.spec.ts`, a unit
spec, checks that every fixture a rule starts from has a subject, and that each subject renders as
its fixture before a rule acts.

The runner never writes the given state into the markup, since the component would not know of
it: a state that already holds is left alone, focus is moved with `focus()`, and anything else is
reached by the subject's `reach`, through the component's props or a real interaction (a click on
a tab, on a dropdown's trigger, on a popover's invoker). Keys, clicks, hovers, typing and file
choices go through `userEvent`, and presses, moves and lifts of a mouse or a touch through the
commands in `contract/rule-input.ts`, so Chromium receives trusted input and runs its own default
actions: a summary toggles, a dialog cancels, a popover is light dismissed, a button takes focus.
A drag is the exception: the runner dispatches drag events it builds, so a rule that checks the
drop effect, which only a drag the browser runs carries, is listed as a todo with that reason.
A `scroll` in a rule brings the element its `to` names to the top of the area that scrolls it, with
`scrollIntoView({ block: 'start' })`, so the area fires real scroll events. The table of contents
subject places a full-height section with a heading for each entry after the component, once it has
mounted, so its rules also cover headings that reach the page late.
A `contextmenu` in a rule is a real secondary click: the `ruleSecondaryClick` command in
`contract/rule-input.ts` presses and lifts the right mouse button on the target, so Chromium fires
its own `contextmenu` event. A `references` state passes when the attribute it names holds the id
of the element its selector finds, which is how a rule states an `aria-activedescendant`.
A `transitionend` in a rule finishes the target's running transitions, so Chromium fires the real
event with its `propertyName`. A measured style value (`{ "value": 40, "unit": "px",
"tolerance": 0.5 }`) passes when the written number is within the tolerance, since Vitest scales
the test frame and a measured size can land a fraction of a pixel off. A subject can also ask for the page layout a host gives it (`layout`), a coarse pointer
(`coarsePointer`, for a control only a touch screen shows), wiring an app would add
(`connect`), or the menu context a dropdown item needs outside a dropdown (`inMenu`). A callback's
first value is compared with the rule's `with` when it is not an object, or when both are plain
objects; any other value, such as an event, or one the rule describes in words, is not compared.

The browser project lives in `vitest.browser.config.ts`, not in `vitest.config.ts`, so
`npm run test` and `npm run verify` never start a browser; run it with `npm run test:browser`.
The workflow in `.github/workflows/ci.yml` runs `npm run verify` and then `npm run test:browser`
on every push to `main` and every pull request.

### The icons

`npm run generate:icons` writes one component per SVG in `core/icons/`, passing the SVG's shapes
to `components/icons/Icon.svelte`. A spec in `components/icons/icons.spec.ts` fails when a
committed icon component differs from what the script writes, or when an SVG has no component;
run the script after a core update that adds or changes an icon.

## Apps ignore the library's tooling

The tooling files travel with every `git subtree pull`, so they sit inside the app's vendored
folder, and so does `core/` with its own tooling (`core/package.json`, `core/jsconfig.json`) and
its `node --test` specs (`core/**/*.test.js`). They do nothing there unless the app's own tools go
looking for them:

- Package manager. A nested `package.json` is not a workspace member unless the app's own
  `package.json` (`workspaces`) or `deno.json` (`workspace`) names the folder. Do not name it: the
  app installs `svelte` and `ts-pattern` itself, and its lockfile stays its own.
- Vite and Vitest. Each loads the config at the app's root only. Vitest finds a nested
  `vitest.config.ts` only when the app's `test.projects` lists a glob that matches it; list the
  projects inline, or with a glob that does not reach the folder. Exclude the core's specs from
  every project (`src/lib/ui/core/**`): they are `node --test` files, not Vitest files. Exclude
  the library's browser specs (`src/lib/ui/**/*.svelte.spec.ts`) from the app's browser project
  unless the app wants to run the behaviour rules with its own.
- The type check. `svelte-check --tsconfig ./tsconfig.json` checks the folder with the app's
  `tsconfig.json`, not the library's.
- Vite's TypeScript transform reads the nearest `tsconfig.json` for each file, so it reads the
  library's for the files in the folder. The library sets the options that matter to the transform
  the way a SvelteKit app does (`target` `esnext`, `verbatimModuleSyntax`), and it sets no
  decorators or JSX options.
- oxlint and oxfmt. Both load a nested config file for the files under it. Run them with
  `--disable-nested-config` so the app's config decides for the whole tree, and ignore the
  vendored core (`src/lib/ui/core/**`) in the app's config, as the library does:

  ```json
  {
    "lint": "oxlint --disable-nested-config src",
    "format": "oxfmt --disable-nested-config .",
    "format:check": "oxfmt --disable-nested-config --check ."
  }
  ```

- dependency-cruiser, if the app uses it. `vite.config.ts`, `vitest.config.ts` and
  `vitest.browser.config.ts` import `vite`, `@sveltejs/vite-plugin-svelte` and
  `@vitest/browser-playwright`, which a rule that keeps the folder to `svelte`, `ts-pattern` and
  `vitest` would refuse. They are tooling, not library code, so exclude them, with the generator
  script and the core's own specs:

  ```js
  options: {
    exclude: {
      path: [
        '^src/lib/ui/vitest(\\.browser)?\\.config\\.ts$',
        '^src/lib/ui/vite\\.config\\.ts$',
        '^src/lib/ui/scripts/',
        '^src/lib/ui/core/.*\\.test\\.js$',
      ],
    },
  },
  ```

The app's own test run keeps running the library's specs: an app that runs every
`src/**/*.spec.ts` in a Node project, compiled in runes mode, runs them with its own. To run them
alone there:

```sh
npx vitest --run src/lib/ui
```

## Integrating the library into an app

### The stylesheet and the layer order

Import the entry stylesheet once, in the app's root layout:

```ts
import '$lib/ui/core/styles/index.css';
```

Declare the layer order inline in `app.html`, before `%sveltekit.head%`:

```html
<style>
  @layer open-props, reset, base, tokens, components, features, utilities, overrides;
</style>
```

A browser fixes the order of cascade layers the first time it meets each name. A component's own
stylesheet can load before `index.css` does, so the order has to come first. `index.css` repeats
the same statement and imports each file into the layer its folder names. The app's own
stylesheets go in the `features` layer, between the components and the utilities, so a utility
class still wins over them.

### Fonts

`core/styles/base/fonts.css` names each font by a URL relative to itself, such as
`url('../../fonts/geist.woff2')`, which resolves to `core/fonts/`. Vite treats these as imported assets: each font is emitted into
the build with a hashed name, so it can be cached for a long time and a changed font gets a new
URL. The app has nothing to copy into its `static/` folder.

Each font ships with its SIL Open Font License in `core/fonts/<name>.OFL.txt`. Nothing imports the
license files, so a build leaves them out. The app decides whether and where it publishes them.
A small Vite plugin, applied to the client build only, publishes them at
`/fonts/<name>.OFL.txt`:

```ts
const FONT_FOLDER = 'src/lib/ui/core/fonts';

const FONT_LICENSE = /\.OFL\.txt$/u;

function publishFontLicenses(): Plugin {
  return {
    name: 'publish-font-licenses',
    apply: 'build',
    applyToEnvironment: (environment) => environment.config.consumer === 'client',
    generateBundle() {
      for (const name of readdirSync(FONT_FOLDER)) {
        if (!FONT_LICENSE.test(name)) continue;
        this.emitFile({
          type: 'asset',
          fileName: `fonts/${name}`,
          source: readFileSync(`${FONT_FOLDER}/${name}`),
        });
      }
    },
  };
}
```

### The attribute contract

The stylesheets read two attributes on the `html` element, and nothing else about the
appearance:

- `data-theme` names one of `THEMES`: `base`, `petal`, `yorha`, `crayon`, `ember`, `mono`, `forge`
  or `moss`. `base` is the default.
- `data-color-scheme` is `light` or `dark` to pin a scheme. When it is absent, the page follows the
  system scheme.

`core/appearance.js` holds this vocabulary, as plain JavaScript with JSDoc types:

- `THEMES` and the `Theme` type derived from it, and `COLOR_SCHEMES` with the `ColorScheme` type
  (`automatic`, `light`, `dark`).
- `applyAppearance(root, appearance)` sets both attributes; `automatic` removes
  `data-color-scheme`.
- `readAppearance(root)` reads them back, falling back to `base` and `automatic` for a missing or
  unknown value.
- `pinnedScheme(scheme)` gives the value a pinned scheme stores, or `undefined` for `automatic`.

### What the app writes: saving the appearance

The library does not decide where a chosen appearance is kept. Each app writes a small module
that stores the theme and the scheme under its own keys, in its own storage, and calls
`applyAppearance`. Store the scheme only when it is pinned, and remove it for `automatic`: the
first-paint script reads a missing scheme as "follow the system".

An example with `localStorage` and the keys `app.theme` and `app.color-scheme`:

```ts
import { applyAppearance, pinnedScheme } from '$lib/ui/core/appearance.js';
import type { Appearance } from '$lib/ui/core/appearance.js';

const THEME_KEY = 'app.theme';

const SCHEME_KEY = 'app.color-scheme';

function chooseAppearance(appearance: Appearance): void {
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

The app's theme and scheme controls call this when a theme or a scheme is picked, and read the
current choice with `readAppearance(document.documentElement)`.

The library's `components/AppearanceSwitcher.svelte` is such a control: a dropdown whose trigger
shows the colour scheme's icon and the theme's name, and whose menu is
`components/AppearanceChoices.svelte`, a group of themes and a group of colour schemes. Both take
the current appearance as a bindable `appearance` and report a choice through `onchoose`; neither
reads or writes storage. `AppearanceChoices` can also sit in another dropdown's menu. The labels
are in `components/appearance-labels.ts`.

```svelte
<script lang="ts">
  import AppearanceSwitcher from '$lib/ui/components/AppearanceSwitcher.svelte';
  import { readAppearance } from '$lib/ui/core/appearance.js';
  import type { Appearance } from '$lib/ui/core/appearance.js';
  import { chooseAppearance } from './appearance';

  let appearance: Appearance = $state(readAppearance(document.documentElement));
</script>

<AppearanceSwitcher bind:appearance onchoose={chooseAppearance} />
```

The switcher is a ghost, small button with its menu aligned to the end; `variant`, `size` and
`align` change that.

### What the app writes: app.html

The saved appearance must be on the `html` element before the first paint, or the page paints in
the default theme and then switches. Modules load too late for that, so `app.html` carries an
inline script in its `head`. `themeBootScript` from `core/theme-boot.js` builds the script's
source from `THEMES`, with the app's storage keys as parameters:

```ts
themeBootScript({ themeKey: 'app.theme', schemeKey: 'app.color-scheme' });
```

It returns a block that reads both keys from `localStorage`, accepts only a known theme and a
pinned scheme, and sets `data-theme` (falling back to `base`) and, when a scheme is pinned,
`data-color-scheme`. If reading storage throws, as it does when the browser blocks storage for the
site, the defaults stay. Paste the output between `<script>` and `</script>` in `app.html`, after
the layer order and before `%sveltekit.head%`. A formatter may indent it; that does not matter.

If the app has a content security policy, admit the script by its hash in `script-src`: the
SHA-256 of the exact text between the tags, indentation included, in base64, as
`'sha256-…'`. Recompute it whenever the formatted text changes.

Keep a drift test in the app, so that a new theme in the library or an edited script fails until
`app.html` is regenerated. This one sits in `src/` beside `app.html`, compares the inline script
with the library's output line by line, ignoring indentation, and prints the text to paste in its
failure message until the script is pasted:

```ts
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { themeBootScript } from '$lib/ui/core/theme-boot.js';

const HTML = readFileSync(new URL('./app.html', import.meta.url), 'utf8');

const KEYS = { themeKey: 'app.theme', schemeKey: 'app.color-scheme' };

function inlineScripts(): readonly string[] {
  return Array.from(HTML.matchAll(/<script>([\s\S]*?)<\/script>/gu), (found) => found[1] ?? '');
}

function unindented(code: string): string {
  return code
    .split('\n')
    .map((line) => line.trim())
    .join('\n')
    .trim();
}

describe('the theme script in app.html', () => {
  it("holds the library's first-paint script for the app's storage keys", () => {
    const scripts = inlineScripts();

    expect(scripts).toHaveLength(1);
    expect(unindented(scripts[0] ?? '')).toBe(unindented(themeBootScript(KEYS)));
  });
});
```

An app with a content security policy adds a test that its `script-src` list contains the hash
of the script as written:

```ts
import { createHash } from 'node:crypto';

function hashOf(script: string): string {
  return `sha256-${createHash('sha256').update(script, 'utf8').digest('base64')}`;
}
```

### The table of contents

`TableOfContents` links each entry to the element whose id is the entry's `id`, as
`contentsEntries` makes it, so the page gives each heading that id. As the page scrolls, the
component marks the entry of the section being read with `aria-current="location"`:

- It reads where each heading sits on every scroll (a capture-phase listener, so the scroll of an
  inner area such as an app shell's main area counts too) and every resize, and passes the
  positions to `currentHeading` in `components/table-of-contents.ts`. The current entry is the last
  heading at or above a reading line a quarter of the way down the area that scrolls the headings;
  before any heading reaches it, the first entry; once the area is scrolled to its end, the last
  heading it shows, so a short last section is reached.
- A heading that is not on the page yet is skipped. While any is missing, a `MutationObserver` on
  the body waits for it and disconnects once every heading is placed. A change of `entries` starts
  over, and unmounting removes every listener.
- `current` is bindable: bind it to read the entry being read, or pass it to render a current entry
  before any script runs (a server render has none otherwise).

### Tooltip, Drawer, Combobox and ContextMenu

- `Tooltip` takes its `text` and a `trigger` snippet, and passes the snippet the props to spread on
  the trigger: its `aria-describedby` and an attachment that listens for the pointer and focus.
  The tooltip is a `popover="hint"`, shown with `showPopover()`, so a browser that does not know
  `hint` treats it as `manual` and the script still shows and hides it. It shows 400 ms after the
  pointer rests on the trigger, or at once on focus, and hides 100 ms after the pointer leaves the
  trigger and the tooltip, at once on blur, and on Escape (`tooltip-phase.ts`). It sits above the
  trigger, centred on it, or below when there is no room above (`hintPlacement` in
  `overlay-placement.ts`).
- `Drawer` is a modal dialog with the `Modal`'s lifecycle (`modal-phase.ts`): bind `open`, give a
  `title`, and choose the `side` it slides in from (`end`, the default, `start` or `bottom`). It
  takes a `footer` snippet, which gets a function that closes it, and `wrapFocus`, as the modal does.
- `Combobox` takes a `label`, the `options` as `{ value, label }` pairs, and a bindable `value`, the
  chosen option's value; `onchoose` reports a choice. The text in the field is the bindable `query`.
  While it holds the chosen option's label every option shows; any other text keeps the options
  whose label holds it, ignoring case. When focus leaves the field, the chosen label is put back.
  The field never clears a choice: the caller does, by setting `value` to `undefined`.
- `ContextMenu` wraps an area (`children`) and takes a `menu` snippet of `DropdownItem`s,
  `DropdownSeparator`s and `DropdownLabel`s, named by `label`. A secondary click on the area opens
  the menu at the pointer (`pointerPlacement` in `context-menu.ts`); Shift+F10 or the ContextMenu
  key on a focused element inside it opens the menu below that element. Choosing an item or Escape
  closes it and returns focus to the element that had it.

## Adding a theme

A theme is added in the core (its guide lists the steps: the stylesheet, its import in
`styles/index.css`, and the name in `THEMES`), and tagged as a new version, because it changes
`themeBootScript`'s output. This library takes the tag with `git subtree pull --prefix=core`. Each
app then takes the library's update with `git subtree pull`, gives the theme a label wherever its
settings name themes, pastes the new `themeBootScript` output into `app.html` and updates the
hash. Its drift test fails until it does.

## Mounting the playground

`playground/Playground.svelte` renders the whole playground: every component and utility in its
variants, sizes and states. An app mounts it on a development route, and may pass two snippets:

- `appearanceControl`, rendered at the end of the header: the app's own theme and scheme switcher,
  which saves the choice the app's way.
- `demos`, rendered after the library's sections: demos of the app's own components.

The toast demos need a toaster from an ancestor: the app's root layout calls
`setToaster(createToaster())` and renders `<ToastRegion />`, as `playground/DevPlayground.svelte`
does for `npm run dev`. Without it the playground throws "No toaster in context".

An example route, `src/routes/playground/+page.svelte`, with the app's switcher in
`$lib/ThemeSwitcher.svelte`:

```svelte
<script lang="ts">
  import ThemeSwitcher from '$lib/ThemeSwitcher.svelte';
  import Playground from '$lib/ui/playground/Playground.svelte';
</script>

<Playground>
  {#snippet appearanceControl()}
    <ThemeSwitcher />
  {/snippet}
</Playground>
```

Keeping the route out of a production build is the app's choice. A `+page.ts` can answer 404
outside development by throwing `error(404)` when `dev` from `$app/environment` is false.

## The app's checks on its use of the library

Checks about how an app uses the library (that its markup names only defined classes, that its own
stylesheets keep to the layer rules, that `app.html` holds the current script) belong to the app,
next to its own source, not in this folder.
