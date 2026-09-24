<script lang="ts">
  import Card from '$lib/components/Card.svelte';
  import Dropzone from '$lib/components/Dropzone.svelte';
  import Field from '$lib/components/Field.svelte';
  import FileList from '$lib/components/FileList.svelte';
  import Toggle from '$lib/components/Toggle.svelte';
  import WindowDropzone from '$lib/components/WindowDropzone.svelte';
  import type { FileItemData } from '$lib/components/file-item';
  import { describeRejection } from '$lib/components/file-selection';
  import type { FileSelection } from '$lib/components/file-selection';
  import DemoSection from './DemoSection.svelte';
  import { SimulatedUploads, browserClock, withUploadState } from './simulated-upload';

  const MEGABYTE = 1024 * 1024;

  let nextId = 0;
  let attachments = $state<readonly FileItemData[]>([]);
  let arrival = $state<readonly string[]>([]);
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

  $effect(() => () => uploads.cancelAll());

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

  function without(items: readonly FileItemData[], id: string): readonly FileItemData[] {
    return items.filter((item) => item.id !== id);
  }
</script>

<DemoSection
  id="upload"
  title="File upload"
  classes={['dropzone', 'dropzone-compact', 'window-drop', 'file-list', 'file-item']}
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
              {...control}
              multiple
              accept="image/*,.pdf,.epub"
              maxSize={50 * MEGABYTE}
              hint="PNG, JPG, PDF or EPUB · up to 50 MB each"
              onfiles={addAttachments}
            />
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
                compact
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
              compact
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
    onfiles={(files) => (windowDropped = files.map((file) => file.name))}
  >
    Drop to log the files
  </WindowDropzone>
</DemoSection>
