type SourceSnippet = {
  readonly label: string;
  readonly file: string;
  readonly code: string;
};

const CI_WORKFLOW: SourceSnippet = {
  label: 'The CI workflow',
  file: '.github/workflows/ci.yml',
  code: `name: CI

on:
  pull_request:
  push:
    branches: [main]

permissions:
  contents: read

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5

      - uses: denoland/setup-deno@v2
        with:
          deno-version: v2.9.7

      - run: deno install --frozen

      - run: deno task verify:ci`,
};

const RELEASE_TRIGGER: SourceSnippet = {
  label: 'When Release runs, and the release-please job',
  file: '.github/workflows/release.yml',
  code: `on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read

jobs:
  release-please:
    runs-on: ubuntu-latest
    permissions:
      contents: write
      pull-requests: write
    outputs:
      release_created: \${{ steps.release.outputs.release_created }}
      tag_name: \${{ steps.release.outputs.tag_name }}
    steps:
      - id: release
        uses: googleapis/release-please-action@v4
        with:
          config-file: release-please-config.json
          manifest-file: .release-please-manifest.json`,
};

const DEPLOY_JOB: SourceSnippet = {
  label: 'The deploy job',
  file: '.github/workflows/release.yml',
  code: `  deploy:
    needs: release-please
    if: needs.release-please.outputs.release_created == 'true' || github.event_name == 'workflow_dispatch'
    runs-on: ubuntu-latest
    concurrency:
      group: deploy
      cancel-in-progress: false
    steps:
      - id: tag
        env:
          GH_TOKEN: \${{ github.token }}
          CREATED_TAG: \${{ needs.release-please.outputs.tag_name }}
        run: |
          if [ -n "$CREATED_TAG" ]; then
            echo "name=$CREATED_TAG" >> "$GITHUB_OUTPUT"
          else
            echo "name=$(gh release view --repo "$GITHUB_REPOSITORY" --json tagName --jq .tagName)" >> "$GITHUB_OUTPUT"
          fi

      - uses: actions/checkout@v5
        with:
          ref: \${{ steps.tag.outputs.name }}

      - uses: denoland/setup-deno@v2
        with:
          deno-version: v2.9.7

      - run: deno install --frozen

      - run: deno task build

      - env:
          CLOUDFLARE_API_TOKEN: \${{ secrets.CLOUDFLARE_API_TOKEN }}
          CLOUDFLARE_ACCOUNT_ID: \${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
        run: ./node_modules/.bin/wrangler deploy`,
};

const RELEASE_CONFIG: SourceSnippet = {
  label: 'release-please-config.json',
  file: 'release-please-config.json',
  code: `{
  "$schema": "https://raw.githubusercontent.com/googleapis/release-please/main/schemas/config.json",
  "include-v-in-tag": true,
  "include-component-in-tag": false,
  "bootstrap-sha": "5624d69ad43d878cfee0134204fb061e8d4ae085",
  "bump-minor-pre-major": true,
  "bump-patch-for-minor-pre-major": true,
  "changelog-sections": [
    { "type": "feat", "section": "Features" },
    { "type": "fix", "section": "Fixes" },
    { "type": "perf", "section": "Performance" },
    { "type": "refactor", "section": "Refactoring", "hidden": true },
    { "type": "test", "section": "Tests", "hidden": true },
    { "type": "docs", "section": "Documentation", "hidden": true },
    { "type": "chore", "section": "Chores", "hidden": true },
    { "type": "style", "section": "Style", "hidden": true },
    { "type": "build", "section": "Build", "hidden": true },
    { "type": "ci", "section": "CI", "hidden": true }
  ],
  "packages": {
    ".": {
      "release-type": "node",
      "package-name": "reader"
    }
  }
}`,
};

const WRANGLER_CONFIG: SourceSnippet = {
  label: 'wrangler.jsonc',
  file: 'wrangler.jsonc',
  code: `{
  "name": "dokseo",
  "compatibility_date": "2026-09-21",
  "workers_dev": false,
  "preview_urls": true,
  "observability": {
    "enabled": true,
    "head_sampling_rate": 1,
  },
  "assets": {
    "directory": "./build/",
    "not_found_handling": "single-page-application",
  },
}`,
};

const VERIFY_SCRIPTS: SourceSnippet = {
  label: 'The verify scripts in package.json',
  file: 'package.json',
  code: `    "test": "vitest --run",
    "test:watch": "vitest",
    "test:ci": "vitest --run --project unit",
    "verify:static": "npm run check && npm run lint && npm run format:check && npm run lint:deps",
    "verify:tests": "npm run verify:static && npm run test",
    "verify": "npm run verify:tests && npm run build",
    "verify:ci": "npm run verify:static && npm run test:ci && npm run build",`,
};

const PACKAGE_VERSION: SourceSnippet = {
  label: 'vite.config.ts reads the version from package.json',
  file: 'vite.config.ts',
  code: `function packageVersion(): string {
  const manifest: unknown = JSON.parse(readFileSync('package.json', 'utf8'));
  if (
    typeof manifest === 'object' &&
    manifest !== null &&
    'version' in manifest &&
    typeof manifest.version === 'string'
  )
    return manifest.version;
  throw new Error('package.json has no version');
}`,
};

const APP_VERSION_DEFINE: SourceSnippet = {
  label: 'and defines it for the app',
  file: 'vite.config.ts',
  code: `define: { 'import.meta.env.APP_VERSION': JSON.stringify(packageVersion()) },`,
};

const APP_VERSION_SHOWN: SourceSnippet = {
  label: 'Settings, App shows both',
  file: 'src/routes/settings/AppSettings.svelte',
  code: `<Stat class="p-0" label="Version" value={APP_VERSION} size="sm" />
        <span class="text-xs text-faint">Build {version}</span>`,
};

const RELEASE_SNIPPETS: readonly SourceSnippet[] = [
  CI_WORKFLOW,
  RELEASE_TRIGGER,
  DEPLOY_JOB,
  RELEASE_CONFIG,
  WRANGLER_CONFIG,
  VERIFY_SCRIPTS,
  PACKAGE_VERSION,
  APP_VERSION_DEFINE,
  APP_VERSION_SHOWN,
];

export {
  APP_VERSION_DEFINE,
  APP_VERSION_SHOWN,
  CI_WORKFLOW,
  DEPLOY_JOB,
  PACKAGE_VERSION,
  RELEASE_CONFIG,
  RELEASE_SNIPPETS,
  RELEASE_TRIGGER,
  VERIFY_SCRIPTS,
  WRANGLER_CONFIG,
};
export type { SourceSnippet };
