# Kandan UI core

The framework-agnostic core of Kandan UI. It was created while working on
[Dokseo](https://github.com/jerhage/dokseo).

The core holds what every version of Kandan UI shares, and nothing that runs a component:

- `styles/`: the stylesheets (layers, tokens, themes, component classes, utilities).
- `fonts/`: the font files and the license of each font.
- `icons/`: one SVG file per icon, with Lucide's license.
- `appearance.js` and `theme-boot.js`: the theme and colour scheme attributes, and the
  first-paint script that sets them.
- `fixtures/`: the markup contract, one HTML file per component variant.
- `rules/`: the behaviour rules of the components that run a script, as data.
- `contract/`: the tools a framework version uses to compare its markup with the fixtures.

A framework version (such as `kandan-ui-svelte`) vendors the core at `core/` with git subtree,
pinned to a tag:

```sh
git subtree add --prefix=core https://github.com/jerhage/kandan-ui <tag> --squash
```

Take a newer tag the same way:

```sh
git subtree pull --prefix=core https://github.com/jerhage/kandan-ui <tag> --squash
```

Apps vendor a framework version, not the core; the core arrives inside it.

Run the checks with `npm test` (Node 24 or later, no dependencies). How the pieces fit, the
fixture format, the rules format and how to add a theme, a component or a fixture are in
[GUIDE.md](GUIDE.md).
