# Kandan UI guide

Kandan UI is a set of Svelte 5 base components with the stylesheets, themes, fonts and icons they
are drawn with. An app does not install it from a registry. It vendors the library: the full source lives in the app's own repository, in one
folder, and is updated with `git subtree`.

The folder holds:

- `components/`: the base components, their helpers, and the Lucide icons in `components/icons/`,
  one component per icon, with Lucide's license in `components/icons/LICENSE.txt`.
- `styles/`: the layered stylesheets and their entry file, `index.css`.
- `fonts/`: the font files and the license of each font.
- `appearance.ts`: the theme names, the color schemes, and the functions that apply them.
- `theme-boot.ts`: the source of the inline script that applies the saved appearance before the
  first paint.
- `playground/`: a page that shows every component and utility, for an app to mount on a
  development route.
- `package.json`, `vitest.config.ts`, `tsconfig.json`, `.oxlintrc.json`, `.oxfmtrc.json` and
  `.gitignore`: the library's own tooling, used in the library's repository. An app that vendors
  the library ignores them (see [Apps ignore the library's tooling](#apps-ignore-the-librarys-tooling)).

Every file reaches the others by relative path. Nothing imports an app alias such as `$lib`, so
the folder works at any prefix. It needs Svelte 5 in runes mode, `ts-pattern`, and a Vite build
(the stylesheets name the fonts by relative URL, and the playground uses `import.meta.glob`). The
specs need Vitest.

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
`git subtree push` so the next `pull` does not conflict with it.

`git subtree add` refuses a prefix that already exists. To replace a copy, remove the folder in one
commit and add it in the next.

## Working on the library

A change can start on either side.

- In an app. Edit the vendored folder and commit there like any other change, then send the
  commits to the library with `git subtree push --prefix=src/lib/ui <repo> <branch>` and merge
  that branch in the library's repository. Only the commits that touch the folder travel, with
  the folder as the root.
- In the library's repository. Edit, run its checks, and merge to `main`. Each app then takes the
  change with `git subtree pull --prefix=src/lib/ui <repo> main --squash`, run on the app's `main`.

Either way, run the library's own checks in its repository before a change reaches `main`. An app
runs the library's specs with its own, but it does not run the library's type check, lint or
format check with the library's settings.

## Running the library's checks

In a clone of the library's repository, install the dependencies once:

```sh
npm install
```

Any package manager that reads `package.json` works the same way (`pnpm install`,
`deno install`). The library has no browser specs, so no Playwright browser is needed.

The scripts:

- `npm run test`: every spec, once. `npm run test:unit` runs the `unit` project alone, and
  `npm run test:watch` watches.
- `npm run check`: `svelte-check` with the library's `tsconfig.json`. It also refuses an import
  of an app alias such as `$lib`, which the library's own config does not define.
- `npm run lint`: oxlint with `.oxlintrc.json`.
- `npm run format:check`: oxfmt with `.oxfmtrc.json`; `npm run format` rewrites.
- `npm run verify`: all four in turn, the check to run before a change reaches `main`.

The specs are `*.spec.ts` files beside the code they test. They run in Node, without a DOM, in the
`unit` project of `vitest.config.ts`, which compiles every `.svelte` file in runes mode. They read
the stylesheets and components by paths relative to themselves, so they pass at any prefix. The
specs that scan the whole tree list its files through `library-files.ts`, which skips
`node_modules/`, `build/`, `dist/`, `coverage/` and every dot folder, so a clone with its own
installed packages checks only the library's files. They
check the components' markup, the helpers, the layer order, the tokens and themes, the classes the
markup writes, the icon set, the first-paint script and the playground's catalogs. The library has
no browser specs, so its config has no browser project.

## Apps ignore the library's tooling

The tooling files travel with every `git subtree pull`, so they sit inside the app's vendored
folder. They do nothing there unless the app's own tools go looking for them:

- Package manager. A nested `package.json` is not a workspace member unless the app's own
  `package.json` (`workspaces`) or `deno.json` (`workspace`) names the folder. Do not name it: the
  app installs `svelte` and `ts-pattern` itself, and its lockfile stays its own.
- Vite and Vitest. Each loads the config at the app's root only. Vitest finds a nested
  `vitest.config.ts` only when the app's `test.projects` lists a glob that matches it; list the
  projects inline, or with a glob that does not reach the folder.
- The type check. `svelte-check --tsconfig ./tsconfig.json` checks the folder with the app's
  `tsconfig.json`, not the library's.
- Vite's TypeScript transform reads the nearest `tsconfig.json` for each file, so it reads the
  library's for the files in the folder. The library sets the options that matter to the transform
  the way a SvelteKit app does (`target` `esnext`, `verbatimModuleSyntax`), and it sets no
  decorators or JSX options.
- oxlint and oxfmt. Both load a nested config file for the files under it. Run them with
  `--disable-nested-config` so the app's config decides for the whole tree:

  ```json
  {
    "lint": "oxlint --disable-nested-config src",
    "format": "oxfmt --disable-nested-config .",
    "format:check": "oxfmt --disable-nested-config --check ."
  }
  ```

- dependency-cruiser, if the app uses it. `vitest.config.ts` imports
  `@sveltejs/vite-plugin-svelte`, which a rule that keeps the folder to `svelte`, `ts-pattern` and
  `vitest` would refuse. It is tooling, not library code, so exclude it:

  ```js
  options: {
    exclude: { path: ['^src/lib/ui/vitest\\.config\\.ts$'] },
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
import '$lib/ui/styles/index.css';
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

`styles/base/fonts.css` names each font by a URL relative to itself, such as
`url('../../fonts/geist.woff2')`. Vite treats these as imported assets: each font is emitted into
the build with a hashed name, so it can be cached for a long time and a changed font gets a new
URL. The app has nothing to copy into its `static/` folder.

Each font ships with its SIL Open Font License in `fonts/<name>.OFL.txt`. Nothing imports the
license files, so a build leaves them out. The app decides whether and where it publishes them.
A small Vite plugin, applied to the client build only, publishes them at
`/fonts/<name>.OFL.txt`:

```ts
const FONT_FOLDER = 'src/lib/ui/fonts';

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

`appearance.ts` holds this vocabulary:

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
import { applyAppearance, pinnedScheme } from '$lib/ui/appearance';
import type { Appearance } from '$lib/ui/appearance';

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

### What the app writes: app.html

The saved appearance must be on the `html` element before the first paint, or the page paints in
the default theme and then switches. Modules load too late for that, so `app.html` carries an
inline script in its `head`. The library builds the script's source from `THEMES`, with the app's
storage keys as parameters:

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
import { themeBootScript } from '$lib/ui/theme-boot';

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

## Adding a theme

1. Add `styles/base/themes/<name>.css`. Its first rule holds the palette and its second the role
   primitives, both under `:root[data-theme='<name>']`, and it assigns exactly the role primitives
   `base.css` assigns.
2. Import it in `styles/index.css` next to the other themes, into the `base` layer.
3. Add the name to `THEMES` in `appearance.ts`. The `Theme` type follows.

The library's specs fail until the stylesheet, `index.css` and `THEMES` agree. Each app then takes
the update with `git subtree pull`, gives the theme a label wherever its settings name themes,
pastes the new `themeBootScript` output into `app.html` and updates the hash. Its drift test fails
until it does.

## Mounting the playground

`playground/Playground.svelte` renders the whole playground: every component and utility in its
variants, sizes and states. An app mounts it on a development route, and may pass two snippets:

- `appearanceControl`, rendered at the end of the header: the app's own theme and scheme switcher,
  which saves the choice the app's way.
- `demos`, rendered after the library's sections: demos of the app's own components.

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
