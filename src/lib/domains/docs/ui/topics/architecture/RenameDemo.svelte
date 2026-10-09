<script lang="ts">
  import Alert from '$lib/ui/components/Alert.svelte';
  import Button from '$lib/ui/components/Button.svelte';
  import CodeBlock from '$lib/ui/components/CodeBlock.svelte';
  import Field from '$lib/ui/components/Field.svelte';
  import Input from '$lib/ui/components/Input.svelte';
  import SegmentedControl from '$lib/ui/components/SegmentedControl.svelte';
  import Select from '$lib/ui/components/Select.svelte';
  import DocsDemo from '../../DocsDemo.svelte';
  import { RENAME_ARMS } from './architecture-snippets';
  import { RenameRehearsalView, STORE_MODES } from './rename-demo.svelte';
  import { HELD_TAGS, renameArm } from './rename-rehearsal';

  const view = new RenameRehearsalView();

  const outcome = $derived(view.outcome);

  const arm = $derived(outcome === null ? null : RENAME_ARMS[renameArm(outcome)]);

  const resultText = $derived(
    outcome?.kind === 'resolved' ? JSON.stringify(outcome.result, null, 2) : null,
  );
</script>

<DocsDemo label="renameTag with a fake port">
  <form
    class="stack-md"
    onsubmit={(event) => {
      event.preventDefault();
      void view.run();
    }}
  >
    <p class="m-0 text-sm text-muted">
      The fake store holds {HELD_TAGS.map((tag) => tag.name).join(', ')}.
    </p>
    <div class="grid-2 gap-2">
      <Field label="Tag to rename">
        {#snippet children(control)}
          <Select
            {...control}
            value={view.chosen.id}
            onchange={(event) => view.choose(event.currentTarget.value)}
          >
            {#each HELD_TAGS as tag (tag.id)}
              <option value={tag.id}>{tag.name}</option>
            {/each}
          </Select>
        {/snippet}
      </Field>
      <Field label="New name" hint="try Names, or only spaces">
        {#snippet children(control)}
          <Input {...control} bind:value={view.draft} />
        {/snippet}
      </Field>
    </div>
    <SegmentedControl
      label="The fake store"
      variant="track"
      options={STORE_MODES}
      value={view.mode}
      onvaluechange={(value) => view.chooseMode(value)}
    />
    <div><Button type="submit" variant="primary" size="sm">Run renameTag</Button></div>
  </form>
  {#if outcome !== null && arm !== null}
    <div class="stack-md mt-4">
      {#if outcome.kind === 'stopped'}
        <Alert variant="warning" title="The use case never ran">
          The view model checks for an empty name first, so the port received no call.
        </Alert>
      {:else}
        <div class="stack-sm">
          <h3 class="m-0 text-base">Calls on the port</h3>
          <ol class="col gap-1 m-0">
            {#each outcome.calls as call, index (index)}
              <li><code>{call.call}</code> returned <code>{call.result}</code></li>
            {/each}
          </ol>
        </div>
        {#if resultText !== null}
          <CodeBlock code={resultText} label="What renameTag resolved" />
        {:else if outcome.kind === 'rejected'}
          <Alert variant="danger" title="renameTag rejected">
            Nothing resolved. The mutation's <code>onError</code> shows the toast text
            <q>{outcome.message}</q>.
          </Alert>
        {/if}
      {/if}
      <div class="stack-sm">
        <h3 class="m-0 text-base">The code in ManageTags that runs next</h3>
        <CodeBlock code={arm.code} label={arm.label} />
      </div>
    </div>
  {/if}
  {#snippet caption()}
    The real <code>renameTag</code> runs against an in-memory <code>TagRepository</code> built for this
    demo, so no tag in this browser changes. Each run starts from the same three tags.
  {/snippet}
</DocsDemo>
