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
  CORE_RECEIVES,
  MIDDLE_ADD,
  MIDDLE_AFTER_ADD,
  MIDDLE_PULL,
  MIDDLE_PUSH,
  MIDDLE_RECEIVES,
  NODE_TEST_RUN,
  PLAIN_PAGE_RUN,
  POPOVER_RENDER,
  ROUND_TRIP,
  SHORTCUT_SPLIT,
};
