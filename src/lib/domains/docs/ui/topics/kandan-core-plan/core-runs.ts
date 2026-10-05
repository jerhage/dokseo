import type { RecordedRun } from '../vendored-ui/subtree-runs';

const BUTTON_RENDER: RecordedRun = {
  label: 'render(Button, { props: { variant: "primary", size: "sm", children } }).body',
  code: `<!--[--><!--[0--><button type="button" class="btn btn-primary btn-sm"><span>Save</span><!----></button><!--]--><!--]-->`,
};

const BADGE_RENDER: RecordedRun = {
  label: 'render(Badge, { props: { variant: "success", children } }).body',
  code: `<!--[--><span class="badge badge-success"><span>Read</span><!----></span><!--]-->`,
};

const ACCORDION_RENDER: RecordedRun = {
  label: 'render(AccordionItem, { props: { title: "Details", children } }).body',
  code: `<!--[--><details class="accordion-item"><summary class="accordion-trigger"><!--[0-->Details<!--]--> <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" class="lucide lucide-chevron-down accordion-icon"><!--[--><!----><path d="m6 9 6 6 6-6"><!----></path><!----><!--]--><!----></svg><!----></summary> <div class="accordion-body"><span>Body</span><!----></div></details><!--]-->`,
};

const POPOVER_RENDER: RecordedRun = {
  label: 'render(Popover, { props: { label: "About", trigger, children } }).body, twice',
  code: `<!--[--><!--$s1--><button popovertarget="s1-popover">i</button><!----> <div id="s1-popover" popover="auto" role="dialog" aria-label="About" class="popover"><span>Details</span><!----></div><!--]-->`,
};

const CONTRACT_FAILURE: RecordedRun = {
  label: 'The contract spec after the Badge case was changed to render the warning variant',
  code: `FAIL  |unit| src/lib/domains/docs/ui/topics/kandan-core-plan/contract-cases.spec.ts > the contract cases of the Kandan core plan > renders Badge, success on the server exactly as its fixture describes
AssertionError: expected '<span class="badge badge-warning"><sp…' to be '<span class="badge badge-success"><sp…' // Object.is equality

Expected: "<span class="badge badge-success"><span>Read</span></span>"
Received: "<span class="badge badge-warning"><span>Read</span></span>"`,
};

const NODE_TEST_RUN: RecordedRun = {
  label:
    'Copies of appearance.ts and theme-boot.ts, with match replaced by an object lookup and .ts added to the import, under node --test',
  code: `$ node --version
v24.14.0
$ node --test boot.test.ts
✔ builds the script (0.434833ms)
ℹ tests 1
ℹ suites 0
ℹ pass 1
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 93.659416`,
};

const PLAIN_PAGE_RUN: RecordedRun = {
  label:
    'A plain index.html with data-theme="ember" that links ui/styles/index.css, served by python3 -m http.server and opened in Chromium',
  code: `requests:      96 CSS files, 1 font (ui/fonts/figtree.woff2), none failed
.badge         background-color oklch(0.965 0.03 150), border-radius 999px
.btn           background-color oklch(0.6 0.16 40)
body           font-family Figtree, system-ui, sans-serif
document.fonts loaded: Figtree`,
};

const MIDDLE_ADD: RecordedRun = {
  label: 'In kandan-ui-svelte: vendor tag v0.1.0 of the core at core/',
  code: `$ git subtree add --prefix=core ../core v0.1.0 --squash
git fetch ../core v0.1.0
From ../core
 * tag               v0.1.0     -> FETCH_HEAD
Added dir 'core'`,
};

const MIDDLE_AFTER_ADD: RecordedRun = {
  label: 'kandan-ui-svelte: git log --graph and git ls-tree -r --name-only HEAD',
  code: `*   5b6f999 Merge commit '5ba11de46852521c94c9fea6dd9e4a40c0d229be' as 'core'
|\\
| * 5ba11de Squashed 'core/' content from commit 5556f0c
* 9ad3c46 feat: add Badge

Badge.svelte
core/fixtures/badge.html
core/styles/badge.css`,
};

const APP_ADD: RecordedRun = {
  label: 'In the app: vendor kandan-ui-svelte at src/lib/ui',
  code: `$ git subtree add --prefix=src/lib/ui ../middle main --squash
git fetch ../middle main
From ../middle
 * branch            main       -> FETCH_HEAD
Added dir 'src/lib/ui'`,
};

const APP_AFTER_ADD: RecordedRun = {
  label: 'The app: git log --graph and git ls-tree -r --name-only HEAD',
  code: `*   53dc6f3 Merge commit 'a085b75584b4ab3ed276a49a9cb7b5af7a9e021c' as 'src/lib/ui'
|\\
| * a085b75 Squashed 'src/lib/ui/' content from commit 5b6f999
* 6b25e49 chore: start the app

README.md
src/lib/ui/Badge.svelte
src/lib/ui/core/fixtures/badge.html
src/lib/ui/core/styles/badge.css`,
};

const MIDDLE_PULL: RecordedRun = {
  label:
    'The core commits "fix: give the badge more room" and tags v0.2.0; kandan-ui-svelte pulls it',
  code: `$ git subtree pull --prefix=core ../core v0.2.0 --squash -m 'chore(core): update the core to v0.2.0'
From ../core
 * tag               v0.2.0     -> FETCH_HEAD
Merge made by the 'ort' strategy.
 core/styles/badge.css | 2 +-
 1 file changed, 1 insertion(+), 1 deletion(-)`,
};

const APP_PULL: RecordedRun = {
  label: 'The app pulls kandan-ui-svelte',
  code: `$ git subtree pull --prefix=src/lib/ui ../middle main --squash -m 'chore(ui): update Kandan UI'
From ../middle
 * branch            main       -> FETCH_HEAD
Merge made by the 'ort' strategy.
 src/lib/ui/core/styles/badge.css | 2 +-
 1 file changed, 1 insertion(+), 1 deletion(-)

$ cat src/lib/ui/core/styles/badge.css
.badge { padding: 0 6px; }`,
};

const APP_AFTER_PULL: RecordedRun = {
  label: 'The app after the pull: git log --graph',
  code: `*   31afa30 chore(ui): update Kandan UI
|\\
| * fe5f0aa Squashed 'src/lib/ui/' changes from 5b6f999..3158832
* | 53dc6f3 Merge commit 'a085b75584b4ab3ed276a49a9cb7b5af7a9e021c' as 'src/lib/ui'
|\\|
| * a085b75 Squashed 'src/lib/ui/' content from commit 5b6f999
* 6b25e49 chore: start the app`,
};

const APP_PUSH: RecordedRun = {
  label:
    'The app commits "fix(ui): round the badge" in src/lib/ui/core/styles/badge.css and pushes the library folder (progress counter left out)',
  code: `$ git subtree push --prefix=src/lib/ui ../middle fix-from-app
git push using:  ../middle fix-from-app
To ../middle
 * [new branch]      d83018af61094f7f9446f22dc6345d4d6fdf75ff -> fix-from-app`,
};

const MIDDLE_RECEIVES: RecordedRun = {
  label: 'kandan-ui-svelte: the pushed branch, then a fast-forward of main',
  code: `$ git log --graph --format='%h %s' fix-from-app
* d83018a fix(ui): round the badge
*   3158832 chore(core): update the core to v0.2.0
|\\
| * e6d9a7c Squashed 'core/' changes from 5556f0c..c85426e
* | 5b6f999 Merge commit '5ba11de46852521c94c9fea6dd9e4a40c0d229be' as 'core'
|\\|
| * 5ba11de Squashed 'core/' content from commit 5556f0c
* 9ad3c46 feat: add Badge

$ git merge --ff-only fix-from-app
Updating 3158832..d83018a
Fast-forward
 core/styles/badge.css | 2 +-
 1 file changed, 1 insertion(+), 1 deletion(-)`,
};

const MIDDLE_PUSH: RecordedRun = {
  label: 'kandan-ui-svelte pushes its core/ folder to the core (progress counter left out)',
  code: `$ git subtree push --prefix=core ../core fix-from-middle
git push using:  ../core fix-from-middle
To ../core
 * [new branch]      70c9f3b0bed510842924438283703684ccf72b76 -> fix-from-middle`,
};

const CORE_RECEIVES: RecordedRun = {
  label: 'The core: the pushed branch, then a fast-forward of main',
  code: `$ git log --graph --format='%h %s' fix-from-middle
* 70c9f3b fix(ui): round the badge
* c85426e fix: give the badge more room
* 5556f0c feat: add the badge class and its fixture

$ git merge --ff-only fix-from-middle
Updating c85426e..70c9f3b
Fast-forward
 styles/badge.css | 2 +-
 1 file changed, 1 insertion(+), 1 deletion(-)

$ cat styles/badge.css
.badge { padding: 0 6px; border-radius: 4px; }`,
};

const ROUND_TRIP: RecordedRun = {
  label: 'The core tags v0.3.0; kandan-ui-svelte pulls it, then the app pulls kandan-ui-svelte',
  code: `$ git subtree pull --prefix=core ../core v0.3.0 --squash -m 'chore(core): update the core to v0.3.0'
From ../core
 * tag               v0.3.0     -> FETCH_HEAD
Merge made by the 'ort' strategy.

$ git subtree pull --prefix=src/lib/ui ../middle main --squash -m 'chore(ui): update Kandan UI'
From ../middle
 * branch            main       -> FETCH_HEAD
Merge made by the 'ort' strategy.

$ git diff HEAD~1 HEAD --stat`,
};

const SHORTCUT_SPLIT: RecordedRun = {
  label: 'In the app: split the nested core folder directly (progress counter left out)',
  code: `$ git subtree split --prefix=src/lib/ui/core
fatal: no new revisions were found`,
};

const CORE_MISMATCH: RecordedRun = {
  label:
    'compareMarkup from the core, given the library rendering badge/warning and the fixture badge/success: the message',
  code: `The rendered markup differs from the fixture at line 1.
  fixture:  <span class="badge badge-success">Read</span>
  rendered: <span class="badge badge-warning">Read</span>`,
};

const CORE_LOG: RecordedRun = {
  label: 'kandan-ui: git log --oneline v0.1.0',
  code: `8d9b277 docs: point the guide at the check script
6ea72cc build: type-check the JSDoc types with tsc as the check script
48130eb chore: license the core under MIT and describe the layer order and the reset without naming a framework
075c11a docs: add the README and the guide to the core, its contract and its versions
cb606cc test: port the stylesheet checks that need no framework to node --test
3d45fc3 feat: add the narrow-screen query and the tag colours as plain modules
eb1541a feat: add the behaviour rules of the fifteen scripted components as data
19efddc feat: add the markup fixtures of the components that run a script or a native behaviour
517a40b feat: add the markup fixtures of the components that render markup only
c4297c0 feat: add the markup normalizer, the fixture formatter and the comparison a framework spec calls
3520e7b feat: add the icons as standalone SVG files with Lucide's license
dcdba5e chore: add the file walker the specs use to list the library's files
3cccc3e feat: add the appearance script and the first-paint theme script as plain JS with JSDoc types
9e449e7 build: add the package manifest, node --test as the test runner, and the checkJs config
876fce1 feat: add the stylesheets and the fonts with their licenses`,
};

const SVELTE_HISTORY: RecordedRun = {
  label: "kandan-ui-svelte: git log --graph from the removal commit to the guide's update",
  code: `* b14a681 docs: describe the vendored core, its update and fix paths, the new import paths, and the contract and rules specs
* 245dca2 chore: license the library under MIT
* 7c8c19f ci: verify the library and run the browser rules on every push to main and every pull request
* 1ee9569 build: run the core's behaviour rules against the components in a browser project kept out of verify
* c7f6159 test: render a subject for every fixture a core behaviour rule starts from, and check it matches the fixture
* 35a98f9 test: render a case for every core fixture and compare its markup with the fixture
* d7bb34c feat: generate the icon components from the core's SVG files, and check the committed ones are current
* e9a2e8a build: leave core/ to its own checks, and run its node --test specs in verify
*   5d23901 chore: vendor the Kandan UI core at core/ from kandan-ui v0.1.0
|\\
| * 63fc9f7 Squashed 'core/' content from commit 8d9b277
* fef5218 refactor: remove the stylesheets, fonts, appearance scripts and icon license the core now holds, and import them from core/`,
};

const SVELTE_SPLIT: RecordedRun = {
  label: 'kandan-ui-svelte: what a split of core/ holds (progress counter left out)',
  code: `$ git subtree split --prefix=core
8d9b277416f83b7f3cf7f7656836fb86cf371b88
$ git rev-list --count 8d9b277
15`,
};

const DOKSEO_PULL: RecordedRun = {
  label: 'Dokseo: git log --graph after the pull',
  code: `*   30eab44f chore(ui): pull kandan-ui-svelte at b14a6816, which vendors the Kandan UI core at core/
|\\
| * 57e5fe25 Squashed 'src/lib/ui/' changes from ba9af91b..b14a6816
* | 993ed733 fix(library): make adding a book finishable after any interruption`,
};

const DOKSEO_TREE_BEFORE: RecordedRun = {
  label: "Dokseo's src/lib/ui/ just before the pull, against the library commit it had last pushed",
  code: `$ git rev-parse 993ed733:src/lib/ui
9b8fefeec0bf666fae3901f4bdd032055e2eaecd
$ git -C kandan-ui-svelte rev-parse 'e83e7d8^{tree}'
9b8fefeec0bf666fae3901f4bdd032055e2eaecd`,
};

const PULL_CONFLICTS: RecordedRun = {
  label:
    'The same merge replayed in kandan-ui-svelte: base the last pull, one side what Dokseo held, the other the pulled commit',
  code: `$ git merge-tree --write-tree --name-only --merge-base=ba9af91 e83e7d8 b14a681
5289d7ca20d1d93b0f114b93ba19600538d1d53f
.oxfmtrc.json
.oxlintrc.json
GUIDE.md
README.md
core/styles/design-system.test.js
markup-classes.spec.ts
package.json
source-styling.spec.ts
tsconfig.json
vitest.config.ts

$ git ls-tree -r --name-only 5289d7c | grep LICENSE
LICENSE
components/icons/LICENSE.txt
core/LICENSE
core/icons/LICENSE.txt`,
};

const DOKSEO_TREE_AFTER: RecordedRun = {
  label: "Dokseo's src/lib/ui/ after the merge, against the pulled commit",
  code: `$ git rev-parse 30eab44f:src/lib/ui 'b14a6816^{tree}'
a718516cfb3e1ca9986ddedcf3abeda33fcea39b
a718516cfb3e1ca9986ddedcf3abeda33fcea39b`,
};

export {
  ACCORDION_RENDER,
  APP_ADD,
  APP_AFTER_ADD,
  APP_AFTER_PULL,
  APP_PULL,
  APP_PUSH,
  BADGE_RENDER,
  BUTTON_RENDER,
  CONTRACT_FAILURE,
  CORE_LOG,
  CORE_MISMATCH,
  CORE_RECEIVES,
  DOKSEO_PULL,
  DOKSEO_TREE_AFTER,
  DOKSEO_TREE_BEFORE,
  MIDDLE_ADD,
  MIDDLE_AFTER_ADD,
  MIDDLE_PULL,
  MIDDLE_PUSH,
  MIDDLE_RECEIVES,
  NODE_TEST_RUN,
  PLAIN_PAGE_RUN,
  POPOVER_RENDER,
  PULL_CONFLICTS,
  ROUND_TRIP,
  SHORTCUT_SPLIT,
  SVELTE_HISTORY,
  SVELTE_SPLIT,
};
