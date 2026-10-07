import type { SourceSnippet } from '../ocr/ocr-snippets';

const CODEOWNERS: SourceSnippet = {
  label: '.github/CODEOWNERS',
  file: '.github/CODEOWNERS',
  code: `/src/lib/ui/ @jerhage

# The rules that protect the line above, and the release and deploy workflows.
/.github/ @jerhage`,
};

const CHANGELOG_SECTIONS: SourceSnippet = {
  label: 'release-please-config.json, excerpt',
  file: 'release-please-config.json',
  code: `"changelog-sections": [
    { "type": "feat", "section": "Features" },
    { "type": "fix", "section": "Fixes" },
    { "type": "perf", "section": "Performance" },
    { "type": "refactor", "section": "Refactoring", "hidden": true },
    { "type": "test", "section": "Tests", "hidden": true },
    { "type": "docs", "section": "Documentation", "hidden": true },`,
};

const DEPLOY_CONDITION: SourceSnippet = {
  label: '.github/workflows/release.yml, the deploy job',
  file: '.github/workflows/release.yml',
  code: `deploy:
    needs: release-please
    if: needs.release-please.outputs.release_created == 'true' || github.event_name == 'workflow_dispatch'`,
};

const CONTRIBUTING_SNIPPETS: readonly SourceSnippet[] = [
  CODEOWNERS,
  CHANGELOG_SECTIONS,
  DEPLOY_CONDITION,
];

export { CHANGELOG_SECTIONS, CODEOWNERS, CONTRIBUTING_SNIPPETS, DEPLOY_CONDITION };
