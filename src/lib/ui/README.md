# Kandan UI

Svelte 5 base components with their stylesheets, themes, fonts and icons. It was created while
working on [Dokseo](https://github.com/jerhage/dokseo).

An app vendors the library: the full source lives in one folder of the app's repository, and
`git subtree` keeps it up to date. The examples use the prefix `src/lib/ui`.

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

Then import `styles/index.css` once in the app's root layout. The stylesheet layers, fonts,
themes, the first-paint script, the playground and the library's own checks are covered in
[GUIDE.md](GUIDE.md).
