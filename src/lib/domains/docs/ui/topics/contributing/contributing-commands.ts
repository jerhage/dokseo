type CommandBlock = {
  readonly label: string;
  readonly code: string;
};

const CORE_RELEASE: CommandBlock = {
  label: 'Release a core change',
  code: `cd ~/coding/personal/kandan-ui
npm test && npm run check
git commit
git tag -a v0.10.0 -m v0.10.0
git push origin main --follow-tags`,
};

const LIBRARY_PULL: CommandBlock = {
  label: 'Pull a core tag into kandan-ui-svelte',
  code: `cd ~/coding/personal/kandan-ui-svelte
git pull --ff-only
git subtree pull --prefix=core https://github.com/jerhage/kandan-ui v0.10.0 --squash
# message: chore: pull the Kandan UI core at v0.10.0
npm run verify && npm run test:browser
git push origin main`,
};

const DOKSEO_PULL: CommandBlock = {
  label: 'Pull kandan-ui-svelte into Dokseo',
  code: `cd ~/coding/personal/reader
git fetch && git pull --ff-only
git subtree pull --prefix=src/lib/ui https://github.com/jerhage/kandan-ui-svelte main --squash
# message: chore(ui): pull kandan-ui-svelte with …
npm run verify
git push origin main`,
};

const PULL_CHECK: CommandBlock = {
  label: 'Check a pull',
  code: `git diff <squash commit> $(git write-tree --prefix=src/lib/ui/)`,
};

const AFTER_RELEASE: CommandBlock = {
  label: 'After the release pull request is merged',
  code: `git fetch && git pull --ff-only`,
};

const FORCED_VERSION: CommandBlock = {
  label: 'Force the next version',
  code: `git commit --allow-empty -m "chore: release 2.0.0" -m "Release-As: 2.0.0"`,
};

const ORDINARY_REJECTED: CommandBlock = {
  label: 'A rejected push with no subtree merge',
  code: `git log --merges origin/main..main
git pull --rebase
git push origin main`,
};

const SUBTREE_REJECTED: CommandBlock = {
  label: 'A rejected push that holds a subtree merge',
  code: `git branch before-reset
git reset --hard origin/main
git subtree pull --prefix=src/lib/ui https://github.com/jerhage/kandan-ui-svelte main --squash
git cherry-pick <each ordinary commit from before-reset>
git push origin main
git branch -D before-reset`,
};

export {
  AFTER_RELEASE,
  CORE_RELEASE,
  DOKSEO_PULL,
  FORCED_VERSION,
  LIBRARY_PULL,
  ORDINARY_REJECTED,
  PULL_CHECK,
  SUBTREE_REJECTED,
};
export type { CommandBlock };
