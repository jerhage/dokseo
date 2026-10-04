import { anchorSlug } from '$lib/components/table-of-contents';

const RELEASE_SECTIONS = {
  path: 'From a commit to a running app',
  semver: 'Semantic versioning',
  breaking: 'Breaking, for an app with no API',
  preOne: 'Versions before 1.0',
  commits: 'Conventional Commits',
  derive: 'From commits to a version',
  releasePr: 'Release pull requests',
  ci: 'Continuous integration',
  token: 'Why one workflow cannot start another',
  secrets: 'Secrets',
  hosting: 'A static site on Cloudflare Workers',
  merging: 'Merge strategies',
  pipeline: "Dokseo's pipeline",
  ciWorkflow: 'The CI workflow',
  ladder: 'The verify ladder',
  releaseWorkflow: 'The release workflow',
  config: 'The release-please configuration',
  deploy: 'What the deploy uploads',
  version: 'The version in Settings',
  setup: 'Setting it up: what went wrong',
  one: 'Reaching 1.0',
  rules: 'Rules Dokseo keeps',
} as const;

type ReleaseSectionKey = keyof typeof RELEASE_SECTIONS;

function releaseHref(key: ReleaseSectionKey): string {
  return `#${anchorSlug(RELEASE_SECTIONS[key])}`;
}

export { RELEASE_SECTIONS, releaseHref };
export type { ReleaseSectionKey };
