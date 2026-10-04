type SampleFile = {
  readonly name: string;
  readonly code: string;
};

type BundledChunk = {
  readonly fileName: string;
  readonly code: string;
};

type BundleSampleId =
  | 'unused'
  | 'barrel'
  | 'barrel-pure'
  | 'pure-call'
  | 'dev-flag'
  | 'split'
  | 'minified';

type BundleSample = {
  readonly id: BundleSampleId;
  readonly title: string;
  readonly point: string;
  readonly files: readonly SampleFile[];
  readonly sideEffectFree: readonly string[];
  readonly minify: boolean;
  readonly chunks: readonly BundledChunk[];
};

const ENTRY = 'entry.js';

const PRELOAD_HELPER_REGION = /\/\/#region [^\n]*preload-helper[^\n]*\n[\s\S]*?\/\/#endregion\n/gu;

const MATH: SampleFile = {
  name: 'math.js',
  code: `export function add(a, b) {
  return a + b;
}

export function multiply(a, b) {
  return a * b;
}
`,
};

const ADD_ONLY: SampleFile = {
  name: 'math.js',
  code: `export function add(a, b) {
  return a + b;
}
`,
};

const USES_ADD: SampleFile = {
  name: ENTRY,
  code: `import { add } from './math.js';

console.log(add(2, 3));
`,
};

const USES_ADD_FROM_BARREL: SampleFile = {
  name: ENTRY,
  code: `import { add } from './tools.js';

console.log(add(2, 3));
`,
};

const BARREL: SampleFile = {
  name: 'tools.js',
  code: `export { add } from './math.js';
export { register } from './registry.js';
`,
};

const REGISTRY: SampleFile = {
  name: 'registry.js',
  code: `const plugins = [];
window.registry = plugins;

export function register(plugin) {
  plugins.push(plugin);
}
`,
};

const PURE_CALL: SampleFile = {
  name: ENTRY,
  code: `const squares = /*#__PURE__*/ buildTable();
const cubes = buildTable();

console.log('ready');

function buildTable() {
  return Array.from({ length: 256 }, (_, i) => i * i);
}
`,
};

const DEV_FLAG: SampleFile = {
  name: ENTRY,
  code: `function trace(label) {
  if (!import.meta.env.DEV) return;
  console.groupCollapsed(label);
  console.trace();
  console.groupEnd();
}

trace('opened');
console.log('done');
`,
};

const SPLIT_ENTRY: SampleFile = {
  name: ENTRY,
  code: `import { add } from './math.js';

console.log(add(2, 3));

document.body.onclick = async () => {
  const { run } = await import('./heavy.js');
  run();
};
`,
};

const HEAVY: SampleFile = {
  name: 'heavy.js',
  code: `export function run() {
  console.log('a large feature');
}
`,
};

const BUNDLE_SAMPLES: readonly BundleSample[] = [
  {
    id: 'unused',
    title: 'An unused export',
    point:
      'multiply is exported and never imported, so it is not in the output. add is, because entry.js calls it.',
    files: [USES_ADD, MATH],
    sideEffectFree: [],
    minify: false,
    chunks: [
      {
        fileName: 'assets/entry-W-lnETS_.js',
        code: `//#region math.js
function add(a, b) {
	return a + b;
}
//#endregion
//#region entry.js
console.log(add(2, 3));
//#endregion
`,
      },
    ],
  },
  {
    id: 'barrel',
    title: 'A barrel with a side effect',
    point:
      'entry.js names only add, but registry.js assigns to window when it loads. The bundler keeps that assignment, simplified to window.registry = [], because running the module has that effect; the register function goes.',
    files: [USES_ADD_FROM_BARREL, BARREL, ADD_ONLY, REGISTRY],
    sideEffectFree: [],
    minify: false,
    chunks: [
      {
        fileName: 'assets/entry-Cut_s7pE.js',
        code: `//#region math.js
function add(a, b) {
	return a + b;
}
window.registry = [];
//#endregion
//#region entry.js
console.log(add(2, 3));
//#endregion
`,
      },
    ],
  },
  {
    id: 'barrel-pure',
    title: 'The same barrel, declared free of side effects',
    point:
      'Marking the three modules free of side effects, which is what a package\'s "sideEffects": false does for its files, lets the bundler drop registry.js entirely. The output is byte for byte the first sample\'s, so its file name has the same hash.',
    files: [USES_ADD_FROM_BARREL, BARREL, ADD_ONLY, REGISTRY],
    sideEffectFree: ['tools.js', 'math.js', 'registry.js'],
    minify: false,
    chunks: [
      {
        fileName: 'assets/entry-W-lnETS_.js',
        code: `//#region math.js
function add(a, b) {
	return a + b;
}
//#endregion
//#region entry.js
console.log(add(2, 3));
//#endregion
`,
      },
    ],
  },
  {
    id: 'pure-call',
    title: 'A call marked pure',
    point:
      'Both calls build the same unused table. The annotated one is dropped. The plain one stays as a bare call, because the bundler does not treat buildTable as free of effects.',
    files: [PURE_CALL],
    sideEffectFree: [],
    minify: false,
    chunks: [
      {
        fileName: 'assets/entry-Bo1mJRtj.js',
        code: `//#region entry.js
buildTable();
console.log("ready");
function buildTable() {
	return Array.from({ length: 256 }, (_, i) => i * i);
}
//#endregion
`,
      },
    ],
  },
  {
    id: 'dev-flag',
    title: 'Code behind import.meta.env.DEV',
    point:
      'Vite replaces import.meta.env.DEV with false in a production build. The early return then always runs, so the bundler removes the rest of the body, the function and the call.',
    files: [DEV_FLAG],
    sideEffectFree: [],
    minify: false,
    chunks: [
      {
        fileName: 'assets/entry-B9QnMIvV.js',
        code: `//#region entry.js
console.log("done");
//#endregion
`,
      },
    ],
  },
  {
    id: 'split',
    title: 'A dynamic import',
    point:
      'The import() of heavy.js becomes a second file, and the entry fetches it only when the click handler runs. Vite wraps the import in its preload helper, which this view leaves out.',
    files: [SPLIT_ENTRY, ADD_ONLY, HEAVY],
    sideEffectFree: [],
    minify: false,
    chunks: [
      {
        fileName: 'assets/entry-BPc4VZ_o.js',
        code: `//#region math.js
function add(a, b) {
	return a + b;
}
//#endregion
//#region \\0vite/preload-helper.js
var scriptRel = "modulepreload";
var assetsURL = function(dep) {
	return "/" + dep;
};
var seen = {};
var __vitePreload = function preload(baseModule, deps, importerUrl) {
	let promise = Promise.resolve();
	if (deps && deps.length > 0) {
		const links = document.getElementsByTagName("link");
		const cspNonceMeta = document.querySelector("meta[property=csp-nonce]");
		const cspNonce = cspNonceMeta?.nonce || cspNonceMeta?.getAttribute("nonce");
		function allSettled(promises) {
			return Promise.all(promises.map((p) => Promise.resolve(p).then((value) => ({
				status: "fulfilled",
				value
			}), (reason) => ({
				status: "rejected",
				reason
			}))));
		}
		function importMetaResolve(specifier) {
			if (import.meta.resolve) return import.meta.resolve(specifier);
			return new URL(
				specifier,
				/** #__KEEP__ */
				import.meta.url
			).href;
		}
		promise = allSettled(deps.map((dep) => {
			dep = assetsURL(dep, importerUrl);
			dep = importMetaResolve(dep);
			if (dep in seen) return;
			seen[dep] = true;
			const isCss = dep.endsWith(".css");
			for (let i = links.length - 1; i >= 0; i--) {
				const link = links[i];
				if (link.href === dep && (!isCss || link.rel === "stylesheet")) return;
			}
			const link = document.createElement("link");
			link.rel = isCss ? "stylesheet" : scriptRel;
			if (!isCss) link.as = "script";
			link.crossOrigin = "";
			link.href = dep;
			if (cspNonce) link.setAttribute("nonce", cspNonce);
			document.head.appendChild(link);
			if (isCss) return new Promise((res, rej) => {
				link.addEventListener("load", res);
				link.addEventListener("error", () => rej(/* @__PURE__ */ new Error(\`Unable to preload CSS for \${dep}\`)));
			});
		}).filter((p) => p !== void 0));
	}
	function handlePreloadError(err) {
		const e = new Event("vite:preloadError", { cancelable: true });
		e.payload = err;
		window.dispatchEvent(e);
		if (!e.defaultPrevented) throw err;
	}
	return promise.then((res) => {
		for (const item of res || []) {
			if (item.status !== "rejected") continue;
			handlePreloadError(item.reason);
		}
		return baseModule().catch(handlePreloadError);
	});
};
//#endregion
//#region entry.js
console.log(add(2, 3));
document.body.onclick = async () => {
	const { run } = await __vitePreload(async () => {
		const { run } = await import("./heavy-CEwXW6IF.js");
		return { run };
	}, []);
	run();
};
//#endregion
`,
      },
      {
        fileName: 'assets/heavy-CEwXW6IF.js',
        code: `//#region heavy.js
function run() {
	console.log("a large feature");
}
//#endregion
export { run };
`,
      },
    ],
  },
  {
    id: 'minified',
    title: 'The first sample, minified',
    point:
      'The first sample again with minify on. Oxc renames add to e, removes the whitespace and the region comments, and the module fits on one line.',
    files: [USES_ADD, MATH],
    sideEffectFree: [],
    minify: true,
    chunks: [
      {
        fileName: 'assets/entry-Cbomm3pF.js',
        code: `function e(e,t){return e+t}console.log(e(2,3));`,
      },
    ],
  },
];

function shownCode(chunk: BundledChunk): string {
  return chunk.code.replace(PRELOAD_HELPER_REGION, '').trimEnd();
}

function bundleSample(id: BundleSampleId): BundleSample {
  const sample = BUNDLE_SAMPLES.find((candidate) => candidate.id === id);
  if (sample === undefined) throw new Error(`No bundle sample is named ${id}`);
  return sample;
}

export { BUNDLE_SAMPLES, ENTRY, bundleSample, shownCode };
export type { BundleSample, BundleSampleId, BundledChunk, SampleFile };
