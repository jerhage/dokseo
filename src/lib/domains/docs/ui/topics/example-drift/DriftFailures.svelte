<script lang="ts">
  import DocsCode from '../../DocsCode.svelte';
  import DocsSection from '../../DocsSection.svelte';
  import { DRIFT_SECTIONS, TESTING_LADDER_HREF, driftHref } from './drift-sections';
  import { CI_SCRIPTS, CI_STEP, CI_TRIGGER, UNIT_PROJECT, VERIFY_CI } from './drift-snippets';
  import {
    FILE_BEFORE,
    MOVED_FILE_REPORT,
    QUOTED_LINE_BEFORE,
    QUOTED_LINE_NOW,
    RENAME_REPORT_CHANGE,
    RENAME_REPORT_END,
    RENAME_REPORT_HEAD,
  } from './recorded-failures';
</script>

<DocsSection title={DRIFT_SECTIONS.failure}>
  <p>
    The rename from the first section really happened, and the drift specs caught it. To show the
    failure, I put the OCR page's quote of the decode loop back the way it was before the rename.
    One line differs from the file today:
  </p>
  <DocsCode label="The quoted line before the rename" code={QUOTED_LINE_BEFORE} />
  <DocsCode label="The line in src/workers/ocr.worker.ts today" code={QUOTED_LINE_NOW} />
  <p>
    Then I ran the OCR page's spec alone with Vitest 4.1.11. The report below leaves out its first
    line, which names the checkout's folder, and its last two, which time the run. It starts:
  </p>
  <DocsCode label="The start of the report" code={RENAME_REPORT_HEAD} />
  <p>
    The failed test is named after the quote's label, so the report says which quote broke. The
    message line cuts both strings short, so on its own it says only that the file did not contain
    the quote. Under it, Vitest prints a diff between the quote (Expected, marked <code>-</code>)
    and the whole file after <code>unindented</code> (Received, marked <code>+</code>). The diff
    first lists more than a hundred lines of the file above the quote, every one of them flush left.
    The line that matters comes much further down:
  </p>
  <DocsCode label="The changed line, in the second part of the diff" code={RENAME_REPORT_CHANGE} />
  <p>The report ends on the assertion that failed:</p>
  <DocsCode label="The end of the report" code={RENAME_REPORT_END} />
  <p>
    The fix is to copy the line from the file into the quote, then read the prose around the quote
    again, since a renamed function often means a sentence names the old one.
  </p>
</DocsSection>

<DocsSection title={DRIFT_SECTIONS.moved}>
  <p>
    The same change also moved the function. The Unicode page quoted it from its old file,
    <code>{FILE_BEFORE}</code>. With that quote put back as it was, its spec fails before it
    compares anything, because <code>readFileSync</code> throws:
  </p>
  <DocsCode label="The report for a quote whose file is gone" code={MOVED_FILE_REPORT} />
  <p>
    The test name shows the quote's old label, and the error names the old path. Fixing it took the
    new path, the new label and the new name. The sentence above that quote had said that the worker
    removes the whitespace; it now names <code>jaOcrText</code> and the file it lives in. No test
    asked for that sentence to change (<a href={driftHref('limits')}>What the checks miss</a>).
  </p>
</DocsSection>

<DocsSection title={DRIFT_SECTIONS.ci}>
  <p>
    The snippet specs are ordinary unit tests. They use <code>node:fs</code>, need no browser, and
    their names end in <code>.spec.ts</code>, so Vitest's unit project includes them:
  </p>
  <DocsCode label={UNIT_PROJECT.label} code={UNIT_PROJECT.code} />
  <p>
    On my machine they run with every other test in <code>deno task verify:tests</code> (<a
      href={TESTING_LADDER_HREF}>The verify ladder</a
    >). On GitHub, the CI workflow runs on every pull request and on every push to
    <code>main</code>:
  </p>
  <DocsCode label={CI_TRIGGER.label} code={CI_TRIGGER.code} />
  <p>
    Its one job checks out the code, sets up Deno, installs the locked dependencies and runs one
    task:
  </p>
  <DocsCode label={CI_STEP.label} code={CI_STEP.code} />
  <p>
    <code>deno task</code> runs the <code>package.json</code> script of that name. It runs the static
    checks, then the unit project alone, then the build:
  </p>
  <DocsCode label={VERIFY_CI.label} code={VERIFY_CI.code} />
  <DocsCode label={CI_SCRIPTS.label} code={CI_SCRIPTS.code} />
  <p>
    So a quote that no longer matches fails the pull request that broke it, even when that pull
    request never touched a docs page. The failure reaches the change that caused it, while the
    change is still open.
  </p>
</DocsSection>
