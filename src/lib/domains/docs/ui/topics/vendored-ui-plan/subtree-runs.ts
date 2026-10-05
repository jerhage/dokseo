type RecordedRun = {
  readonly label: string;
  readonly code: string;
};

const ADD_COMMAND: RecordedRun = {
  label: 'In app A: vendor tag v1.0.0 of the library at src/lib/ui',
  code: `git subtree add --prefix=src/lib/ui ../ui-lib v1.0.0 --squash`,
};

const ADD_HISTORY: RecordedRun = {
  label: "git log --graph --format='%h %s', after the add",
  code: `*   501aa03 Merge commit 'ba921a0d41cb32f846ad7879c210b16d8214bd5e' as 'src/lib/ui'
|\\
| * ba921a0 Squashed 'src/lib/ui/' content from commit c71a4fc
* 6d0a052 chore: start app A`,
};

const ADD_SQUASH_MESSAGE: RecordedRun = {
  label: 'The full message of the squash commit',
  code: `Squashed 'src/lib/ui/' content from commit c71a4fc

git-subtree-dir: src/lib/ui
git-subtree-split: c71a4fcb41d3aa5c24660dcb931cb8752b62b969`,
};

const ADD_TREE: RecordedRun = {
  label: 'git ls-tree -r HEAD, after the add',
  code: `100644 blob 8fcd1142e2c19f7dd69ff7618d46ac3006cc15f6	README.md
100644 blob 8f82ad98663a1f671178269ad4cba80fb85ac13a	src/lib/ui/components/Button.svelte
100644 blob ca73f663913128b2cf70ae7c2b90326575b40ad2	src/lib/ui/tokens.css`,
};

const SUBMODULE_TREE: RecordedRun = {
  label: 'git ls-tree -r HEAD, in app C with the library as a submodule',
  code: `100644 blob 98b8db806905cb7d1f44fa3e076f71a0f848aa7c	.gitmodules
160000 commit 3843b932d3337758c7290e262fa10c562739617b	src/lib/ui`,
};

const NO_SQUASH_HISTORY: RecordedRun = {
  label: 'App B after git subtree add without --squash',
  code: `*   67db604 Add 'src/lib/ui/' from commit '3843b932d3337758c7290e262fa10c562739617b'
|\\
| * 3843b93 feat: style Button by variant
| *   da7582f chore(ui): update the UI library to v1.1.0
| |\\
| | * c87f970 feat: give Button a variant
| | * 033e250 feat: add a larger spacing token
| * | dfa8634 fix(ui): give Button an explicit type
| |/
| * c71a4fc feat: give Button a size
| * 1fcd136 feat: add Button and spacing tokens
* 8f4403a chore: start app B`,
};

const BEFORE_PULL: RecordedRun = {
  label: 'App A before the pull: one local fix to the library, one app commit',
  code: `* 6d4ae09 docs: describe app A
* 054d890 fix(ui): give Button an explicit type
*   501aa03 Merge commit 'ba921a0d41cb32f846ad7879c210b16d8214bd5e' as 'src/lib/ui'
|\\
| * ba921a0 Squashed 'src/lib/ui/' content from commit c71a4fc
* 6d0a052 chore: start app A`,
};

const PULL_COMMAND: RecordedRun = {
  label: 'In app A: update to tag v1.1.0',
  code: `git subtree pull --prefix=src/lib/ui ../ui-lib v1.1.0 --squash \\
  -m "chore(ui): update the UI library to v1.1.0"`,
};

const PULL_OUTPUT: RecordedRun = {
  label: 'What the pull printed after fetching',
  code: `Auto-merging src/lib/ui/components/Button.svelte
Merge made by the 'ort' strategy.
 src/lib/ui/components/Button.svelte | 2 +-
 src/lib/ui/tokens.css               | 1 +
 2 files changed, 2 insertions(+), 1 deletion(-)`,
};

const AFTER_PULL: RecordedRun = {
  label: 'App A after the pull',
  code: `*   11dd010 chore(ui): update the UI library to v1.1.0
|\\
| * 7b12207 Squashed 'src/lib/ui/' changes from c71a4fc..c87f970
* | 6d4ae09 docs: describe app A
* | 054d890 fix(ui): give Button an explicit type
* | 501aa03 Merge commit 'ba921a0d41cb32f846ad7879c210b16d8214bd5e' as 'src/lib/ui'
|\\|
| * ba921a0 Squashed 'src/lib/ui/' content from commit c71a4fc
* 6d0a052 chore: start app A`,
};

const PULL_SQUASH_MESSAGE: RecordedRun = {
  label: 'The second squash commit lists the library commits it stands for',
  code: `Squashed 'src/lib/ui/' changes from c71a4fc..c87f970

c87f970 feat: give Button a variant
033e250 feat: add a larger spacing token

git-subtree-dir: src/lib/ui
git-subtree-split: c87f970fcc8a83e1bd5bcaaae2cb9c0b4898c098`,
};

const MERGED_BUTTON: RecordedRun = {
  label:
    "src/lib/ui/components/Button.svelte after the pull: the library's line 2, the app's line 5",
  code: `<script>
  let { label, size = "md", variant = "primary" } = $props();
</script>

<button type="button" class="button button-{size}">{label}</button>`,
};

const CONFLICT_OUTPUT: RecordedRun = {
  label: 'Pulling v1.2.0 after an app edit to the same line',
  code: `Auto-merging src/lib/ui/components/Button.svelte
CONFLICT (content): Merge conflict in src/lib/ui/components/Button.svelte
Automatic merge failed; fix conflicts and then commit the result.`,
};

const CONFLICT_FILE: RecordedRun = {
  label: 'The conflicted line',
  code: `<<<<<<< HEAD
<button type="button" class="button button-{size}" {disabled}>{label}</button>
=======
<button type="button" class="button button-{size} button-{variant}">{label}</button>
>>>>>>> a9a0089c2fb998aa4a3cdd5dcda1df76b6872657`,
};

const PULL_REFUSALS: RecordedRun = {
  label: 'A pull of the version already vendored, then a pull with an uncommitted edit',
  code: `Subtree is already at commit 3843b932d3337758c7290e262fa10c562739617b.
fatal: working tree has modifications.  Cannot add.`,
};

const REBASED_PULL: RecordedRun = {
  label: 'git rebase of a branch holding a subtree pull, onto a main that moved on',
  code: `CONFLICT (modify/delete): components/Button.svelte deleted in HEAD and modified in 0f9dfd3 (Squashed 'src/lib/ui/' changes from c71a4fc..c87f970).  Version 0f9dfd3 (Squashed 'src/lib/ui/' changes from c71a4fc..c87f970) of components/Button.svelte left in tree.
error: could not apply 0f9dfd3... Squashed 'src/lib/ui/' changes from c71a4fc..c87f970`,
};

const PUSH_COMMAND: RecordedRun = {
  label: 'In app A: send the library part of its history to a branch',
  code: `git subtree push --prefix=src/lib/ui ../ui-lib button-type`,
};

const AFTER_PUSH: RecordedRun = {
  label: 'The library repository after the push',
  code: `*   da7582f chore(ui): update the UI library to v1.1.0
|\\
| * c87f970 feat: give Button a variant
| * 033e250 feat: add a larger spacing token
* | dfa8634 fix(ui): give Button an explicit type
|/
* c71a4fc feat: give Button a size
* 1fcd136 feat: add Button and spacing tokens`,
};

const PUSHED_FIX: RecordedRun = {
  label: 'git show --stat dfa8634, in the library',
  code: `dfa8634 fix(ui): give Button an explicit type

 components/Button.svelte | 2 +-
 1 file changed, 1 insertion(+), 1 deletion(-)`,
};

const SPLIT_SOURCE: RecordedRun = {
  label: "An app that grew its library in place: git log --format='%h %s' --name-only",
  code: `ed96c4f feat(settings): add a settings screen

src/routes/page.svelte
60f459c feat(library): add a shelf with spaced cards

src/lib/ui/tokens.css
src/routes/page.svelte
a7a12c7 feat(components): add Button

src/lib/ui/components/Button.svelte
270bd8a feat(reader): open a book

src/routes/page.svelte`,
};

const SPLIT_COMMAND: RecordedRun = {
  label: 'Split the library out to a branch',
  code: `git subtree split --prefix=src/lib/ui -b ui-library`,
};

const SPLIT_HISTORY: RecordedRun = {
  label: "git log --format='%h %s' --name-only ui-library",
  code: `02d6cc4 feat(library): add a shelf with spaced cards

tokens.css
99108a3 feat(components): add Button

components/Button.svelte`,
};

const SPLIT_AFTER_MOVE: RecordedRun = {
  label: 'Splitting a folder that was moved into place',
  code: `$ git log --format='%h %s'
305bacc refactor(ui): move the components into src/lib/ui
69e06fe fix(components): change Button
342aefc feat(components): add Button
$ git subtree split --prefix=src/lib/ui -b lib
$ git log --format='%h %s' lib
4d85d16 refactor(ui): move the components into src/lib/ui`,
};

const ADD_EXISTING: RecordedRun = {
  label: 'Adding at a prefix that still exists',
  code: `$ git subtree add --prefix=src/lib/ui ../dokseo-ui main --squash
fatal: prefix 'src/lib/ui' already exists.`,
};

const REVENDOR_HISTORY: RecordedRun = {
  label: 'After removing the folder and adding the new library repository back',
  code: `*   35ba0c3 Merge commit '4ec4ac32b04b4335c912ed8990129c9b96e40cf0' as 'src/lib/ui'
|\\
| * 4ec4ac3 Squashed 'src/lib/ui/' content from commit 02d6cc4
* 8e217c7 refactor(ui): remove the in-tree UI library before vendoring it
* ed96c4f feat(settings): add a settings screen
* 60f459c feat(library): add a shelf with spaced cards
* a7a12c7 feat(components): add Button
* 270bd8a feat(reader): open a book`,
};

const COPY_MANIFEST: RecordedRun = {
  label: 'A manifest a copy tool could write, with the real hashes of the two library files',
  code: `{
  "library": "ui-lib",
  "version": "v1.0.0",
  "files": {
    "components/Button.svelte": "sha256-32f958427a3a42d136ec19da9f53d2e742d57ea293045c1737b5da999ecb6169",
    "tokens.css": "sha256-d8b1822cde43d7ecab397ba1e5a77cc14ad248b871802b910aa2b71b09d022aa"
  }
}`,
};

const LOCAL_EDIT_HASH: RecordedRun = {
  label: 'The same Button after the explicit type fix',
  code: `818107ea4546104be30caba1214f1fd24de4326f8b140b88ca76cdf13d02c0d4  components/Button.svelte`,
};

export {
  ADD_COMMAND,
  ADD_EXISTING,
  ADD_HISTORY,
  ADD_SQUASH_MESSAGE,
  ADD_TREE,
  AFTER_PULL,
  AFTER_PUSH,
  BEFORE_PULL,
  CONFLICT_FILE,
  CONFLICT_OUTPUT,
  COPY_MANIFEST,
  LOCAL_EDIT_HASH,
  MERGED_BUTTON,
  NO_SQUASH_HISTORY,
  PULL_COMMAND,
  PULL_OUTPUT,
  PULL_REFUSALS,
  PULL_SQUASH_MESSAGE,
  PUSHED_FIX,
  REBASED_PULL,
  PUSH_COMMAND,
  REVENDOR_HISTORY,
  SPLIT_AFTER_MOVE,
  SPLIT_COMMAND,
  SPLIT_HISTORY,
  SPLIT_SOURCE,
  SUBMODULE_TREE,
};
export type { RecordedRun };
