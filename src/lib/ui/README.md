# Kandan UI

Svelte 5 base components with their stylesheets, themes, fonts and icons. It was created while
working on [Dokseo](https://github.com/jerhage/dokseo).

The stylesheets, fonts, icon sources, the appearance script and the markup contract live in the
framework-free core, [kandan-ui](https://github.com/jerhage/kandan-ui), which this library vendors
at `core/`. An app vendors this library, and the core arrives inside it.

An app keeps the library in one folder of its repository, and `git subtree` keeps it up to date.
The examples use the prefix `src/lib/ui`.

Add it:

```sh
git subtree add --prefix=src/lib/ui https://github.com/jerhage/kandan-ui-svelte main --squash
```

Take an update (run it on `main`; a rebase drops the merge commit it makes):

```sh
git subtree pull --prefix=src/lib/ui https://github.com/jerhage/kandan-ui-svelte main --squash
```

Send a fix made in the app back to the library:

```sh
git subtree push --prefix=src/lib/ui https://github.com/jerhage/kandan-ui-svelte <branch>
```

Then import `core/styles/index.css` once in the app's root layout. The core, the stylesheet layers,
fonts, themes, the first-paint script, the playground and the library's own checks are covered in
[GUIDE.md](GUIDE.md).
