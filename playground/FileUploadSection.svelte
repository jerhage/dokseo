<script lang="ts">
  import { onDestroy } from 'svelte';
  import Button from '../components/Button.svelte';
  import Card from '../components/Card.svelte';
  import Dropzone from '../components/Dropzone.svelte';
  import Field from '../components/Field.svelte';
  import FileItem from '../components/FileItem.svelte';
  import FileList from '../components/FileList.svelte';
  import Toggle from '../components/Toggle.svelte';
  import WindowDropzone from '../components/WindowDropzone.svelte';
  import type { FileItemData } from '../components/file-item';
  import { describeRejection } from '../components/file-selection';
  import type { FileSelection } from '../components/file-selection';
  import DemoSection from './DemoSection.svelte';
  import { SimulatedUploads, browserClock, withUploadState } from './simulated-upload';

  const MEGABYTE = 1024 * 1024;

  let nextId = 0;
  let attachments = $state<readonly FileItemData[]>([]);
  let arrival = $state<readonly string[]>([]);
  let attachmentZone = $state<ReturnType<typeof Dropzone> | null>(null);
  let sortedDrop = $state<readonly string[]>([]);
  let windowDrop = $state(false);
  let windowDropped = $state<readonly string[]>([]);
  let avatar = $state<readonly FileItemData[]>([
    { id: 'profile-photo', name: 'profile-photo.jpg', size: 422_707, state: 'complete' },
    {
      id: 'brand-guidelines',
      name: 'brand-guidelines-2026.pdf',
      size: 3_481_190,
      state: 'uploading',
      progress: 58,
    },
  ]);

  function itemsFrom(selection: FileSelection<File>): readonly FileItemData[] {
    const accepted = selection.accepted.map((file): FileItemData => ({
      id: `file-${nextId++}`,
      name: file.name,
      size: file.size,
      state: 'pending',
    }));
    const rejected = selection.rejected.map(({ file, reason }): FileItemData => ({
      id: `file-${nextId++}`,
      name: file.name,
      size: file.size,
      state: 'error',
      message: describeRejection(reason),
    }));
    return [...accepted, ...rejected];
  }

  const uploads = new SimulatedUploads(browserClock, Math.random, (id, state) => {
    attachments = withUploadState(attachments, id, state);
  });

  onDestroy(() => uploads.cancelAll());

  function addAttachments(selection: FileSelection<File>): void {
    arrival = selection.arrived.map(({ file, verdict }) => `${file.name} (${verdict.kind})`);
    const added = itemsFrom(selection);
    attachments = [...attachments, ...added];
    for (const item of added) if (item.state === 'pending') uploads.start(item.id);
  }

  function removeAttachment(id: string): void {
    uploads.cancel(id);
    attachments = without(attachments, id);
  }

  const STATES: readonly FileItemData[] = [
    { id: 'state-pending', name: 'queued-scan.png', size: 81_920, state: 'pending' },
    {
      id: 'state-uploading',
      name: 'chapter-02.cbz',
      size: 24_117_248,
      state: 'uploading',
      progress: 40,
    },
    { id: 'state-complete', name: 'cover.jpg', size: 312_004, state: 'complete' },
    {
      id: 'state-error',
      name: 'notes.txt',
      size: 2_048,
      state: 'error',
      message: 'File type not allowed',
    },
  ];

  function byName(transfer: DataTransfer): readonly File[] {
    return [...transfer.files].toSorted((first, second) => first.name.localeCompare(second.name));
  }

  function without(items: readonly FileItemData[], id: string): readonly FileItemData[] {
    return items.filter((item) => item.id !== id);
  }
</script>

<DemoSection
  id="upload"
  title="File upload"
  classes={['dropzone', 'dropzone-sm', 'window-dropzone', 'file-list', 'file-item']}
>
  <p class="text-sm text-muted">
    Drag files onto a zone or click to browse. Files over 50 MB or of the wrong type show as errors.
  </p>
  <Card>
    <div class="grid-2 gap-5">
      <Field label="Attachments">
        {#snippet children(control)}
          <div class="stack-sm">
            <Dropzone
              bind:this={attachmentZone}
              {...control}
              multiple
              directory
              accept="image/*,.pdf,.epub"
              maxSize={50 * MEGABYTE}
              hint="PNG, JPG, PDF or EPUB · up to 50 MB each"
              onfiles={addAttachments}
            />
            <div class="row">
              <Button size="sm" variant="ghost" onclick={() => attachmentZone?.chooseDirectory()}>
                Choose a folder instead
              </Button>
            </div>
            {#if arrival.length > 0}
              <p class="text-xs text-faint">Arrival order: {arrival.join(', ')}</p>
            {/if}
            <FileList items={attachments} onremove={removeAttachment} />
          </div>
        {/snippet}
      </Field>
      <div class="stack-md">
        <Field label="Avatar">
          {#snippet children(control)}
            <div class="stack-sm">
              <Dropzone
                {...control}
                size="sm"
                accept="image/*"
                maxSize={2 * MEGABYTE}
                title="Upload an image"
                hint="Single file · replaces the current one"
                onfiles={(selection) => (avatar = itemsFrom(selection))}
              />
              <FileList items={avatar} onremove={(id) => (avatar = without(avatar, id))} />
            </div>
          {/snippet}
        </Field>
        <Field label="Contract (locked)">
          {#snippet children(control)}
            <Dropzone
              {...control}
              size="sm"
              disabled
              title="Uploads disabled"
              hint="Signed documents can't be replaced"
              onfiles={() => undefined}
            />
          {/snippet}
        </Field>
      </div>
    </div>
  </Card>
  <Card>
    <div class="grid-2 gap-5">
      <div class="stack-sm">
        <span class="eyebrow text-faint weight-semibold">A drop reader</span>
        <Dropzone
          size="sm"
          multiple
          title="Drop files to sort them by name"
          hint="readDrop decides what a drop holds; this one sorts it"
          readDrop={byName}
          onfiles={(selection) => (sortedDrop = selection.arrived.map(({ file }) => file.name))}
        />
        {#if sortedDrop.length > 0}
          <p class="text-xs text-faint">Read: {sortedDrop.join(', ')}</p>
        {/if}
      </div>
      <div class="stack-sm">
        <span class="eyebrow text-faint weight-semibold">File items, one per state</span>
        <ul class="file-list">
          {#each STATES as item (item.id)}
            <FileItem {item} onremove={() => undefined} />
          {/each}
        </ul>
      </div>
    </div>
  </Card>
  <Card>
    <div class="stack-sm">
      <Toggle bind:checked={windowDrop}>Drop anywhere in the window</Toggle>
      <p class="text-xs text-faint">
        {windowDrop
          ? 'Drag files over any part of the page. A drop on a zone above goes to that zone only.'
          : 'Off: a file dropped outside a zone is refused, not opened in the tab.'}
      </p>
      {#if windowDropped.length > 0}
        <p class="text-xs text-faint">Dropped: {windowDropped.join(', ')}</p>
      {/if}
    </div>
  </Card>
  <WindowDropzone
    disabled={!windowDrop}
    onfiles={(selection) => (windowDropped = selection.accepted.map((file) => file.name))}
  >
    Drop to log the files
  </WindowDropzone>
</DemoSection>
