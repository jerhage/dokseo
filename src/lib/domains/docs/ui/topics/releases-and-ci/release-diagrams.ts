import type { DiagramBox, DiagramEdge, DiagramNode, DiagramTone } from '$lib/ui/components/diagram';

type Diagram = {
  readonly label: string;
  readonly width: number;
  readonly height: number;
  readonly nodes: readonly DiagramNode[];
  readonly edges: readonly DiagramEdge[];
};

const DIAGRAM_WIDTH = 360;

const BOX_HEIGHT = 48;

const LEFT_X = 4;

const RIGHT_X = 188;

const COLUMN_WIDTH = 168;

function box(
  x: number,
  y: number,
  label: string,
  detail: string,
  tone: DiagramTone = 'neutral',
): DiagramBox {
  return { kind: 'box', x, y, width: COLUMN_WIDTH, height: BOX_HEIGHT, label, detail, tone };
}

const ciPush = box(LEFT_X, 8, 'Push or pull request', 'to main, or any PR');
const ciVerify = box(RIGHT_X, 8, 'CI: verify job', 'npm run verify:ci', 'primary');
const ciCheck = box(RIGHT_X, 88, 'A check on the commit', 'passed or failed');

const CI_FLOW: Diagram = {
  label:
    'A push to main or a pull request starts the CI workflow. Its verify job runs npm run verify:ci, and the result shows as a check on the commit or pull request.',
  width: DIAGRAM_WIDTH,
  height: 144,
  nodes: [ciPush, ciVerify, ciCheck],
  edges: [
    { from: ciPush, to: ciVerify },
    { from: ciVerify, to: ciCheck },
  ],
};

const commitsReachMain = box(LEFT_X, 8, 'Commits reach main', 'feat, fix, perf, …');
const firstRun = box(RIGHT_X, 8, 'release-please job', 'on the push', 'primary');
const releasePr = box(RIGHT_X, 88, 'Release pull request', 'version and changelog');
const personMerges = box(LEFT_X, 88, 'A person merges it', 'rebase and merge');
const secondRun = box(LEFT_X, 168, 'release-please job', 'on the merge push', 'primary');
const tagged = box(RIGHT_X, 168, 'Tag and GitHub Release', 'v0.9.5, by GITHUB_TOKEN');
const deployJob = box(RIGHT_X, 248, 'deploy job', 'release_created is true', 'accent');
const workers = box(LEFT_X, 248, 'Cloudflare Workers', 'wrangler deploy');

const RELEASE_FLOW: Diagram = {
  label:
    'Commits reach main and the release-please job opens or updates a release pull request with the next version and changelog. A person merges it. The next run of the release-please job tags the merge, creates the GitHub Release and sets release_created, so the deploy job in the same workflow builds the tag and deploys it to Cloudflare Workers.',
  width: DIAGRAM_WIDTH,
  height: 304,
  nodes: [
    commitsReachMain,
    firstRun,
    releasePr,
    personMerges,
    secondRun,
    tagged,
    deployJob,
    workers,
  ],
  edges: [
    { from: commitsReachMain, to: firstRun },
    { from: firstRun, to: releasePr, label: 'opens' },
    { from: releasePr, to: personMerges },
    { from: personMerges, to: secondRun, label: 'push' },
    { from: secondRun, to: tagged },
    { from: tagged, to: deployJob, label: 'same run' },
    { from: deployJob, to: workers },
  ],
};

const LADDER_WIDTH = 200;

const LADDER_HEIGHT = 56;

function rung(y: number, label: string, detail: string, tone: DiagramTone = 'neutral'): DiagramBox {
  return {
    kind: 'box',
    x: LEFT_X,
    y,
    width: LADDER_WIDTH,
    height: LADDER_HEIGHT,
    label,
    detail,
    tone,
  };
}

const staticRung = rung(8, 'verify:static', 'check, lint, format, deps');
const testsRung = rung(104, 'verify:tests', '+ unit and browser tests', 'primary');
const verifyRung = rung(200, 'verify', '+ build');
const ciRung: DiagramBox = {
  kind: 'box',
  x: 236,
  y: 104,
  width: 120,
  height: LADDER_HEIGHT,
  label: 'verify:ci',
  detail: '+ unit tests, build',
  tone: 'accent',
};

const VERIFY_LADDER: Diagram = {
  label:
    'verify:static runs the type check, lint, format check and dependency rules. verify:tests adds the unit and browser tests, and verify adds the build. verify:ci starts from verify:static and adds only the unit tests and the build.',
  width: DIAGRAM_WIDTH,
  height: 264,
  nodes: [staticRung, testsRung, verifyRung, ciRung],
  edges: [
    { from: staticRung, to: testsRung },
    { from: testsRung, to: verifyRung },
    { from: staticRung, to: ciRung },
  ],
};

const RELEASE_DIAGRAMS: readonly Diagram[] = [CI_FLOW, RELEASE_FLOW, VERIFY_LADDER];

export { CI_FLOW, RELEASE_DIAGRAMS, RELEASE_FLOW, VERIFY_LADDER };
export type { Diagram };
