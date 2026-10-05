import type { RecordedRun } from './subtree-runs';

const SPLIT_SQUASH_JOIN: RecordedRun = {
  label: 'git-subtree in Git 2.46.1, find_existing_splits: a squash commit only becomes a mapping',
  code: `END)
  debug "Main is: '$main'"
  if test -z "$main" && test -n "$sub"
  then
    # squash commits refer to a subtree
    debug "  Squash: $sq from $sub"
    cache_set "$sq" "$sub"
  fi
  if test -n "$main" && test -n "$sub"
  then
    debug "  Prior: $main -> $sub"
    cache_set $main $sub
    cache_set $sub $sub
    try_remove_previous "$main"
    try_remove_previous "$sub"
  fi`,
};

const FIRST_SPLIT: RecordedRun = {
  label: "git log --format='%h %s' ba9af91b, the history pushed to kandan-ui-svelte",
  code: `ba9af91b docs(ui): add the Kandan UI README with the vendoring and integration guide
89ba666e feat(ui): ship the playground inside the library and mount it from Dokseo's dev route
e6db9478 refactor(ui): move the check that every icon is imported into a Dokseo spec
dd2a2067 refactor(ui): split the source-styling and markup-classes specs into a library half and a Dokseo half
81831ac2 refactor(ui): split the design-system spec into a library half and a Dokseo half
4979b44f refactor: take the first-paint script in app.html from themeBootScript and check it against the library
ec75c00d feat(ui): build the first-paint theme script from THEMES and an app's storage keys
a8199c7d refactor(ui): derive Theme from an as const THEMES list
84bf4cb6 refactor(ui): move the fonts and their licenses into src/lib/ui/fonts
8b85bc05 refactor(ui): move the components, the styles and appearance.ts into src/lib/ui`,
};

const REAL_ADD: RecordedRun = {
  label: 'Vendoring kandan-ui-svelte back into Dokseo, after removing the folder',
  code: `git subtree add --prefix=src/lib/ui https://github.com/jerhage/kandan-ui-svelte main --squash`,
};

const SQUASH_COMMIT_MESSAGE: RecordedRun = {
  label: 'The squash commit the add made',
  code: `Squashed 'src/lib/ui/' content from commit ba9af91b

git-subtree-dir: src/lib/ui
git-subtree-split: ba9af91b5dabf19c505b9e9392298371ab2cccd2`,
};

const BEFORE_REWRITE: RecordedRun = {
  label: "Dokseo's branch after the add, with the removal commit under the merge",
  code: `* 7a690216 chore(ui): drop app-specific wording from the playground and a spec
*   aeb4f741 chore(ui): vendor Kandan UI from kandan-ui-svelte at ba9af91b
|\\
| * ed524ff6 Squashed 'src/lib/ui/' content from commit ba9af91b
* fa95c98b refactor(ui): remove src/lib/ui before vendoring Kandan UI back from kandan-ui-svelte
* 60116e40 fix(docs-pages): describe the finished spec split, playground move and first-paint script on the vendored UI library plan page`,
};

const BLOATED_SPLIT: RecordedRun = {
  label: 'git subtree split --prefix=src/lib/ui on that branch, then git log --graph, shortened',
  code: `* 7ff15644 docs(ui): describe the library's own checks, how apps ignore its tooling and how to work on it, with generic examples
* 411bd7f7 build(ui): give Kandan UI its own package.json, Vitest config, tsconfig, and lint and format configs
* d923dcfe chore(ui): drop app-specific wording from the playground and a spec
*   df055eb5 chore(ui): vendor Kandan UI from kandan-ui-svelte at ba9af91b
|\\
| * ba9af91b docs(ui): add the Kandan UI README with the vendoring and integration guide
| * 89ba666e feat(ui): ship the playground inside the library and mount it from Dokseo's dev route
| * …        the other eight library commits
| * 8b85bc05 refactor(ui): move the components, the styles and appearance.ts into src/lib/ui
* fa95c98b refactor(ui): remove src/lib/ui before vendoring Kandan UI back from kandan-ui-svelte
* 60116e40 fix(docs-pages): describe the finished spec split, playground move and first-paint script on the vendored UI library plan page
* …        every earlier commit of Dokseo
$ git rev-list --count 7ff15644
1245`,
};

const SPLIT_KEEPS_NO_TREE: RecordedRun = {
  label: 'git-subtree in Git 2.46.1, process_split_commit: a commit without the folder',
  code: `if test -z "$tree"
then
  set_notree "$rev"
  if test -n "$newparents"
  then
    cache_set "$rev" "$rev"
  fi
  return
fi`,
};

const SPLIT_COPIES_MERGE: RecordedRun = {
  label: 'git-subtree in Git 2.46.1, copy_or_skip: when a merge is kept',
  code: `if test -n "$identical" && test -n "$nonidentical"
then
  extras=$(git rev-list --count $identical..$nonidentical)
  if test "$extras" -ne 0
  then
    # we need to preserve history along the other branch
    copycommit=1
  fi
fi
if test -n "$identical" && test -z "$copycommit"
then
  echo $identical
else
  copy_commit "$rev" "$tree" "$p" || exit $?
fi`,
};

const REWRITE_COMMANDS: RecordedRun = {
  label: 'The rewrite, on the unpushed branch',
  code: `git replace --graft aeb4f741 60116e40 ed524ff6
git filter-branch -- 60116e40..feat/vendored-ui-library
git replace -d aeb4f741`,
};

const AFTER_REWRITE: RecordedRun = {
  label: 'The same part of the branch after the rewrite',
  code: `* cd0eef14 chore(ui): drop app-specific wording from the playground and a spec
*   71058590 chore(ui): vendor Kandan UI from kandan-ui-svelte at ba9af91b
|\\
| * ed524ff6 Squashed 'src/lib/ui/' content from commit ba9af91b
* 60116e40 fix(docs-pages): describe the finished spec split, playground move and first-paint script on the vendored UI library plan page`,
};

const CLEAN_SPLIT: RecordedRun = {
  label: 'git subtree split --prefix=src/lib/ui after the rewrite, then git log --graph, shortened',
  code: `* f3edf770 docs(ui): describe the library's own checks, how apps ignore its tooling and how to work on it, with generic examples
* 026ce380 build(ui): give Kandan UI its own package.json, Vitest config, tsconfig, and lint and format configs
* 454fd074 chore(ui): drop app-specific wording from the playground and a spec
* ba9af91b docs(ui): add the Kandan UI README with the vendoring and integration guide
* 89ba666e feat(ui): ship the playground inside the library and mount it from Dokseo's dev route
* …        the other eight library commits
* 8b85bc05 refactor(ui): move the components, the styles and appearance.ts into src/lib/ui
$ git rev-list --count f3edf770
13`,
};

export {
  AFTER_REWRITE,
  BEFORE_REWRITE,
  BLOATED_SPLIT,
  CLEAN_SPLIT,
  FIRST_SPLIT,
  REAL_ADD,
  REWRITE_COMMANDS,
  SPLIT_COPIES_MERGE,
  SPLIT_KEEPS_NO_TREE,
  SPLIT_SQUASH_JOIN,
  SQUASH_COMMIT_MESSAGE,
};
