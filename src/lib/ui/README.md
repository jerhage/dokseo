# Kandan UI

Kandan UI is a set of Svelte 5 base components with the stylesheets, themes, fonts and icons they
are drawn with. An app does not install it from a registry. It vendors the library: the full
source lives in the app's own repository, in one folder, and is updated with `git subtree`.

The folder holds:

- `components/`: the base components, their helpers, and the Lucide icons in `components/icons/`,
  one component per icon.
- `styles/`: the layered stylesheets and their entry file, `index.css`.
- `fonts/`: the font files and the license of each font.
- `appearance.ts`: the theme names, the color schemes, and the functions that apply them.
- `theme-boot.ts`: the source of the inline script that applies the saved appearance before the
  first paint.
- `playground/`: a page that shows every component and utility, for an app to mount on a
  development route.

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
Dokseo publishes them at `/fonts/<name>.OFL.txt` with a small Vite plugin, applied to the client
build only:

```ts
const FONT_FOLDER = 'src/lib/ui/fonts';

const FONT_LICENSE = /\.OFL\.txt$/u;

function fontLicensesPublished(): Plugin {
  return {
    name: 'font-licenses-published',
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

Dokseo's version, `src/lib/shared/saved-appearance.ts`. `rememberedString` is Dokseo's wrapper
around `localStorage`; another app uses its own:

```ts
const THEME_KEY = 'reader.theme';

const SCHEME_KEY = 'reader.color-scheme';

function chooseAppearance(
  root: RootAttributes,
  appearance: Appearance,
  locate?: LocateStore,
): void {
  applyAppearance(root, appearance);
  rememberedString(THEME_KEY, locate).write(appearance.theme);
  const scheme = rememberedString(SCHEME_KEY, locate);
  const pinned = pinnedScheme(appearance.colorScheme);
  if (pinned === undefined) scheme.forget();
  else scheme.write(pinned);
}
```

Dokseo's settings screen and its appearance switcher call this with `document.documentElement`
when a theme or a scheme is picked, and read the current choice with
`readAppearance(document.documentElement)`.

### What the app writes: app.html

The saved appearance must be on the `html` element before the first paint, or the page paints in
the default theme and then switches. Modules load too late for that, so `app.html` carries an
inline script in its `head`. The library builds the script's source from `THEMES`, with the app's
storage keys as parameters:

```ts
themeBootScript({ themeKey: 'reader.theme', schemeKey: 'reader.color-scheme' });
```

It returns a block that reads both keys from `localStorage`, accepts only a known theme and a
pinned scheme, and sets `data-theme` (falling back to `base`) and, when a scheme is pinned,
`data-color-scheme`. If reading storage throws, as it does when the browser blocks storage for the
site, the defaults stay. Paste the output between `<script>` and `</script>` in `app.html`, after
the layer order and before `%sveltekit.head%`. The formatter may indent it; that does not matter.

If the app has a content security policy, admit the script by its hash in `script-src`: the
SHA-256 of the exact text between the tags, indentation included, in base64, as
`'sha256-…'`. Recompute it whenever the formatted text changes.

Keep a drift test, so that a new theme in the library or an edited script fails until `app.html`
is regenerated. Dokseo's, `src/app-rules/theme-before-first-paint.spec.ts`, compares the inline
script with the library's output line by line, ignoring indentation, and checks the hash. Until
the script is pasted, its failure message prints the text to paste:

```ts
const HTML = readFileSync(new URL('../app.html', import.meta.url), 'utf8');

const KEYS = { themeKey: 'reader.theme', schemeKey: 'reader.color-scheme' };

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

function hashOf(script: string): string {
  return `sha256-${createHash('sha256').update(script, 'utf8').digest('base64')}`;
}

describe('the theme script in app.html', () => {
  it("holds the library's first-paint script for Dokseo's storage keys, as the formatter indents it", () => {
    const scripts = inlineScripts();

    expect(scripts).toHaveLength(1);
    expect(unindented(scripts[0] ?? '')).toBe(unindented(themeBootScript(KEYS)));
  });

  it('hashes to a source that script-src admits', () => {
    const scriptSources = CONTENT_SECURITY_POLICY['script-src'] ?? [];

    expect(scriptSources).toContain(hashOf(inlineScripts()[0] ?? ''));
  });
});
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

Dokseo's `src/routes/playground/+page.svelte`:

```svelte
<script lang="ts">
  import AppearanceSwitcher from '$lib/shared/AppearanceSwitcher.svelte';
  import PageTitle from '$lib/shared/PageTitle.svelte';
  import Playground from '$lib/ui/playground/Playground.svelte';
</script>

<PageTitle screen="Component library" />

<Playground>
  {#snippet appearanceControl()}
    <AppearanceSwitcher />
  {/snippet}
</Playground>
```

Keeping the route out of a production build is the app's choice. Dokseo answers 404 outside
development from the route's `+page.ts`, and a Vite plugin replaces the route's component with an
empty module in a build, so the playground never reaches the bundle.

## Running the library's specs

The specs are `*.spec.ts` files beside the code they test. They run in Node, without a DOM, and
read the stylesheets and components by paths relative to themselves, so they pass at any prefix.
They check the components' markup, the helpers, the layer order, the tokens and themes, the
classes the markup writes, the icon set, the first-paint script and the playground's catalogs.

The library has no Vitest configuration of its own: the app's configuration includes the folder,
in the `node` environment. Dokseo runs every `src/**/*.spec.ts` in its `unit` project, so
`deno task test` runs the library's specs with its own. To run the library's specs alone:

```sh
npx vitest --run src/lib/ui
```

Checks about how an app uses the library (that its markup names only defined classes, that its own
stylesheets keep to the layer rules, that `app.html` holds the current script) belong to the app,
next to its own source. Dokseo keeps them in `src/app-rules/`.
