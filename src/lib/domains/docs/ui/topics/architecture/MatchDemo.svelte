<script lang="ts">
  import Alert from '$lib/components/Alert.svelte';
  import CodeBlock from '$lib/components/CodeBlock.svelte';
  import SegmentedControl from '$lib/components/SegmentedControl.svelte';
  import DocsDemo from '../../DocsDemo.svelte';
  import {
    IF_CHAIN,
    NON_EXHAUSTIVE_ERROR,
    RENAME_ARMS,
    RENAME_RESULT,
    WIDENED_RESULT,
  } from './architecture-snippets';

  type UnionState = 'today' | 'widened';

  const STATES: readonly { readonly value: UnionState; readonly label: string }[] = [
    { value: 'today', label: 'The union today' },
    { value: 'widened', label: 'Add name-too-long' },
  ];

  let shown = $state<UnionState>('today');

  const MATCH = [
    'match(written)',
    ...[RENAME_ARMS.success, RENAME_ARMS['name-taken'], RENAME_ARMS['storage-unavailable']].map(
      (arm) => arm.code.replace(/^/gmu, '  '),
    ),
    '  .exhaustive();',
  ].join('\n');
</script>

<DocsDemo label="What a new variant breaks">
  <div class="stack-md">
    <SegmentedControl label="RenameTagResult" variant="track" options={STATES} bind:value={shown} />
    <CodeBlock
      code={shown === 'today' ? RENAME_RESULT.code : WIDENED_RESULT}
      label="rename-tag.ts"
    />
    <div class="grid-2 gap-3">
      <div class="stack-sm min-w-0">
        <h3 class="m-0 text-base">With match().exhaustive()</h3>
        <CodeBlock code={MATCH} label="manage-tags.svelte.ts, the real match" />
        {#if shown === 'today'}
          <Alert variant="success" title="Compiles">Every variant has an arm.</Alert>
        {:else}
          <Alert variant="danger" title="Fails to compile at .exhaustive()">
            The new variant has no arm, so <code>.exhaustive()</code> is typed as an error.
          </Alert>
          <CodeBlock code={NON_EXHAUSTIVE_ERROR} label="tsc" />
        {/if}
      </div>
      <div class="stack-sm min-w-0">
        <h3 class="m-0 text-base">With an if chain</h3>
        <CodeBlock code={IF_CHAIN} label="The same decision, written with ifs" />
        {#if shown === 'today'}
          <Alert variant="success" title="Compiles">Every variant reaches a branch.</Alert>
        {:else}
          <Alert variant="warning" title="Still compiles">
            A name that is too long falls into the last branch, and the screen says the browser
            blocks storage.
          </Alert>
        {/if}
      </div>
    </div>
  </div>
  {#snippet caption()}
    The error text is what TypeScript printed when the widened union was compiled against a match
    with these three arms, using the installed ts-pattern 5.9. The if chain is written for this
    comparison; Dokseo has no such code.
  {/snippet}
</DocsDemo>
