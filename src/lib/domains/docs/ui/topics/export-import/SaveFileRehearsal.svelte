<script lang="ts">
  import Badge from '$lib/ui/components/Badge.svelte';
  import Field from '$lib/ui/components/Field.svelte';
  import SegmentedControl from '$lib/ui/components/SegmentedControl.svelte';
  import Select from '$lib/ui/components/Select.svelte';
  import { saveFile } from '$lib/platform/files/save-file';
  import type { FileToSave } from '$lib/platform/files/save-file';
  import { BookCapturesExport } from '$lib/shared/book-captures-export.svelte';
  import BookCapturesExportButton from '$lib/shared/BookCapturesExportButton.svelte';
  import { bookId } from '$lib/shared/ids';
  import {
    SHARE_SUPPORTS,
    SHEET_ENDINGS,
    isShareSupport,
    isSheetEnding,
    rehearsedSaving,
    stepText,
  } from '../../../domain/save-rehearsal';
  import type { SaveStep, ShareSupport, SheetEnding } from '../../../domain/save-rehearsal';

  type Pointer = 'touch' | 'mouse';

  const POINTERS: readonly { readonly value: Pointer; readonly label: string }[] = [
    { value: 'touch', label: 'Touch screen' },
    { value: 'mouse', label: 'Mouse only' },
  ];

  const SAMPLE_FILE: FileToSave = {
    text: '{"format":"dokseo-captures","version":1}',
    name: 'dokseo-captures-harbor-lights-volume-1-2026-10-03.json',
    type: 'application/json',
  };

  let pointer = $state<Pointer>('touch');
  let support = $state<ShareSupport>('files');
  let ending = $state<SheetEnding>('activation-lost');
  let steps = $state.raw<readonly SaveStep[]>([]);

  const saving = rehearsedSaving(() => ({ touchDevice: pointer === 'touch', support, ending }), {
    add: (step) => (steps = [...steps, step]),
  });

  const view = new BookCapturesExport(
    {
      exportBookCaptures: () =>
        Promise.resolve({ kind: 'success', exported: { file: SAMPLE_FILE, captures: 3 } }),
    },
    (file) => saveFile(saving, file),
  );
  void view.prepare(bookId('sample-book'));

  function chooseSupport(value: string): void {
    if (isShareSupport(value)) support = value;
  }

  function chooseEnding(value: string): void {
    if (isSheetEnding(value)) ending = value;
  }
</script>

<div class="stack-md">
  <div class="row wrap gap-4">
    <SegmentedControl label="Pointer" variant="track" options={POINTERS} bind:value={pointer} />
  </div>
  <Field label="Web Share in this browser">
    {#snippet children(control)}
      <Select
        {...control}
        value={support}
        onchange={(event) => chooseSupport(event.currentTarget.value)}
      >
        {#each SHARE_SUPPORTS as option (option.value)}
          <option value={option.value}>{option.label}</option>
        {/each}
      </Select>
    {/snippet}
  </Field>
  <Field label="When the share sheet opens">
    {#snippet children(control)}
      <Select
        {...control}
        value={ending}
        onchange={(event) => chooseEnding(event.currentTarget.value)}
      >
        {#each SHEET_ENDINGS as option (option.value)}
          <option value={option.value}>{option.label}</option>
        {/each}
      </Select>
    {/snippet}
  </Field>
  <BookCapturesExportButton {view} />
  <p class="row wrap items-center gap-2 m-0 text-sm">
    State <Badge variant="primary">{view.state.kind}</Badge>
  </p>
  {#if steps.length > 0}
    <ol class="col gap-1 text-sm">
      {#each steps as step, index (index)}
        <li><code>{stepText(step)}</code></li>
      {/each}
    </ol>
  {/if}
</div>
