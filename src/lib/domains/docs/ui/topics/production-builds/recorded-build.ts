type OutputGroupName =
  | 'entry'
  | 'nodes'
  | 'chunks'
  | 'assets'
  | 'workers'
  | 'app'
  | 'static'
  | 'shell';

type OutputGroup = {
  readonly name: OutputGroupName;
  readonly folder: string;
  readonly holds: string;
  readonly files: number;
  readonly bytes: number;
};

type RecordedBuild = {
  readonly bytes: number;
  readonly files: number;
  readonly precache: number;
  readonly precacheBytes: number;
  readonly preloaded: number;
  readonly preloadedBytes: number;
  readonly stubNodes: number;
  readonly guardNodes: number;
  readonly groups: readonly OutputGroup[];
};

type LargeFile = {
  readonly path: string;
  readonly bytes: number;
  readonly holds: string;
};

type BuildMilestone = {
  readonly label: string;
  readonly bytes: number;
  readonly files: number;
  readonly precache: number;
};

const GROUP_FOLDERS: Readonly<Record<OutputGroupName, string>> = {
  entry: '_app/immutable/entry/',
  nodes: '_app/immutable/nodes/',
  chunks: '_app/immutable/chunks/',
  assets: '_app/immutable/assets/',
  workers: '_app/immutable/workers/',
  app: '_app/version.json',
  static: 'copied from static/',
  shell: 'index.html, service-worker.js',
};

const BUILD_WITH_PLUGIN: RecordedBuild = {
  bytes: 6_769_949,
  files: 209,
  precache: 185,
  precacheBytes: 6_671_932,
  preloaded: 34,
  preloadedBytes: 424_695,
  stubNodes: 28,
  guardNodes: 3,
  groups: [
    {
      name: 'entry',
      folder: GROUP_FOLDERS.entry,
      holds: "SvelteKit's start script and the app",
      files: 2,
      bytes: 12_878,
    },
    {
      name: 'nodes',
      folder: GROUP_FOLDERS.nodes,
      holds: 'one node per route and layout',
      files: 44,
      bytes: 435_094,
    },
    {
      name: 'chunks',
      folder: GROUP_FOLDERS.chunks,
      holds: 'shared modules and code loaded on demand',
      files: 98,
      bytes: 1_595_218,
    },
    {
      name: 'assets',
      folder: GROUP_FOLDERS.assets,
      holds: 'extracted CSS and the pdf.js workers',
      files: 4,
      bytes: 2_761_255,
    },
    {
      name: 'workers',
      folder: GROUP_FOLDERS.workers,
      holds: 'the two OCR workers and the OPFS writer',
      files: 3,
      bytes: 1_203_712,
    },
    {
      name: 'app',
      folder: GROUP_FOLDERS.app,
      holds: 'the build version, read when checking for updates',
      files: 1,
      bytes: 27,
    },
    {
      name: 'static',
      folder: GROUP_FOLDERS.static,
      holds: 'fonts, icons, the web manifest, licenses, _headers',
      files: 55,
      bytes: 741_981,
    },
    {
      name: 'shell',
      folder: GROUP_FOLDERS.shell,
      holds: 'the fallback document and the service worker',
      files: 2,
      bytes: 19_784,
    },
  ],
};

const BUILD_WITHOUT_PLUGIN: RecordedBuild = {
  bytes: 8_790_520,
  files: 360,
  precache: 336,
  precacheBytes: 8_686_506,
  preloaded: 73,
  preloadedBytes: 440_040,
  stubNodes: 0,
  guardNodes: 0,
  groups: [
    {
      name: 'entry',
      folder: GROUP_FOLDERS.entry,
      holds: "SvelteKit's start script and the app",
      files: 2,
      bytes: 22_024,
    },
    {
      name: 'nodes',
      folder: GROUP_FOLDERS.nodes,
      holds: 'one node per route and layout',
      files: 44,
      bytes: 2_148_775,
    },
    {
      name: 'chunks',
      folder: GROUP_FOLDERS.chunks,
      holds: 'shared modules and code loaded on demand',
      files: 235,
      bytes: 1_828_486,
    },
    {
      name: 'assets',
      folder: GROUP_FOLDERS.assets,
      holds: 'extracted CSS and the pdf.js workers',
      files: 16,
      bytes: 2_816_188,
    },
    {
      name: 'workers',
      folder: GROUP_FOLDERS.workers,
      holds: 'the two OCR workers and the OPFS writer',
      files: 5,
      bytes: 1_204_488,
    },
    {
      name: 'app',
      folder: GROUP_FOLDERS.app,
      holds: 'the build version, read when checking for updates',
      files: 1,
      bytes: 27,
    },
    {
      name: 'static',
      folder: GROUP_FOLDERS.static,
      holds: 'fonts, icons, the web manifest, licenses, _headers',
      files: 55,
      bytes: 741_981,
    },
    {
      name: 'shell',
      folder: GROUP_FOLDERS.shell,
      holds: 'the fallback document and the service worker',
      files: 2,
      bytes: 28_551,
    },
  ],
};

const LARGEST_FILES: readonly LargeFile[] = [
  {
    path: '_app/immutable/assets/pdf.worker.min.BmVo14Nb.mjs',
    bytes: 1_317_034,
    holds: 'the pdf.js worker, legacy build',
  },
  {
    path: '_app/immutable/assets/pdf.worker.min.Dswkl-cV.mjs',
    bytes: 1_265_413,
    holds: 'the pdf.js worker, modern build',
  },
  {
    path: '_app/immutable/workers/paddle-ocr.worker-CFFrc18X.js',
    bytes: 601_732,
    holds: 'the PaddleOCR worker, with transformers.js',
  },
  {
    path: '_app/immutable/workers/ocr.worker-tARC61bk.js',
    bytes: 600_488,
    holds: 'the manga-ocr worker, with transformers.js',
  },
  {
    path: '_app/immutable/chunks/-yQBYl51.js',
    bytes: 487_961,
    holds: 'pdf.js, legacy build',
  },
  {
    path: '_app/immutable/chunks/DxhId6dF.js',
    bytes: 430_941,
    holds: 'pdf.js, modern build',
  },
  {
    path: '_app/immutable/nodes/34.Dj39P83h.js',
    bytes: 248_505,
    holds: 'the reader route',
  },
  {
    path: '_app/immutable/assets/0.NXypynlP.css',
    bytes: 177_122,
    holds: 'the global stylesheet',
  },
  {
    path: '_app/immutable/chunks/CCYcuKbk.js',
    bytes: 155_545,
    holds: 'zip.js, for archives and EPUBs',
  },
  {
    path: '_app/immutable/nodes/0.HVtNmsfW.js',
    bytes: 72_407,
    holds: 'the root layout',
  },
];

const BUILT_GUARD_NODE = `import{Tt as e}from"../chunks/BR-qb5ne.js";import"../chunks/xihTtKlq.js";import{t}from"../chunks/DRByVC-c.js";var n=e({load:()=>r});function r(){t(404,\`Not found\`)}function i(e){}export{i as component,n as universal};`;

const BUILT_STUB_NODE = `import"../chunks/BR-qb5ne.js";import"../chunks/xihTtKlq.js";function e(e){}export{e as component};`;

const BUILD_MILESTONES: readonly BuildMilestone[] = [
  { label: 'Everything built', bytes: 8_480_329, files: 342, precache: 318 },
  { label: '/docs left out', bytes: 6_945_257, files: 234, precache: 210 },
  {
    label: '/docs, /playground and /preview left out',
    bytes: 6_756_071,
    files: 205,
    precache: 181,
  },
];

function groupTotals(build: RecordedBuild): { readonly files: number; readonly bytes: number } {
  return {
    files: build.groups.reduce((sum, group) => sum + group.files, 0),
    bytes: build.groups.reduce((sum, group) => sum + group.bytes, 0),
  };
}

function immutableFiles(build: RecordedBuild): number {
  return build.groups
    .filter((group) => group.folder.startsWith('_app/immutable/'))
    .reduce((sum, group) => sum + group.files, 0);
}

function staticFiles(build: RecordedBuild): number {
  return build.groups.find((group) => group.name === 'static')?.files ?? 0;
}

function precachedStatic(build: RecordedBuild): number {
  return build.precache - 1 - immutableFiles(build);
}

export {
  BUILD_MILESTONES,
  BUILD_WITH_PLUGIN,
  BUILD_WITHOUT_PLUGIN,
  BUILT_GUARD_NODE,
  BUILT_STUB_NODE,
  GROUP_FOLDERS,
  LARGEST_FILES,
  groupTotals,
  immutableFiles,
  precachedStatic,
  staticFiles,
};
export type { BuildMilestone, LargeFile, OutputGroup, OutputGroupName, RecordedBuild };
