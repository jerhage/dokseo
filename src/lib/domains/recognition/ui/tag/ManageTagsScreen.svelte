<script lang="ts">
  import Alert from '$lib/ui/components/Alert.svelte';
  import Badge from '$lib/ui/components/Badge.svelte';
  import Button from '$lib/ui/components/Button.svelte';
  import Dropdown from '$lib/ui/components/Dropdown.svelte';
  import DropdownItem from '$lib/ui/components/DropdownItem.svelte';
  import EmptyState from '$lib/ui/components/EmptyState.svelte';
  import Field from '$lib/ui/components/Field.svelte';
  import Input from '$lib/ui/components/Input.svelte';
  import { isComposingKey } from '$lib/shared/composing-key';
  import type { ReadState } from '$lib/shared/read-state';
  import { tagsHref } from '$lib/shared/tag-location';
  import type { SearchedBook } from '../../domain/capture/capture-results';
  import type { Tag } from '../../domain/tag/tag';
  import { TAG_COLOURS } from '../../domain/tag/tag-colour';
  import type { TagColour } from '../../domain/tag/tag-colour';
  import { captureCount, manageNotice, manageRows } from './manage-rows';
  import type { ManageTags } from './manage-tags.svelte';
  import { rejectionOf } from './manage-tags-rules';
  import { createTagEditing } from './tag-editing.svelte';
  import { tagViewOf } from './tag-view-rules';
  import type { TaggedCaptures } from './tag-view-rules';
  import TagsShell from './TagsShell.svelte';

  type Props = {
    readonly tagged: ReadState<TaggedCaptures>;
    readonly books: readonly SearchedBook[];
    readonly manage: ManageTags;
  };

  let { tagged, books, manage }: Props = $props();

  const uid = $props.id();

  const editing = createTagEditing();
  let filter = $state('');

  const read = $derived(tagViewOf({ books, wanted: null, tagged }, filter));
  const rows = $derived(manageRows(read.column));

  const notice = $derived(manageNotice(rows.length, read.status));

  function takeFocus(node: HTMLInputElement): void {
    node.focus();
    node.select();
  }

  function abandon(event: KeyboardEvent): void {
    if (isComposingKey(event)) return;
    if (event.key !== 'Escape') return;

    event.preventDefault();
    editing.abandonRename();
  }

  async function rename(tag: Tag): Promise<void> {
    const outcome = await manage.rename(tag, editing.draft);
    if (outcome.kind === 'renamed') editing.renamed();
    const rejection = rejectionOf(outcome);
    if (rejection !== null) editing.rejected(rejection);
  }

  async function recolour(tag: Tag, colour: TagColour): Promise<void> {
    const outcome = await manage.recolour(tag, colour);
    if (outcome.kind === 'recoloured') editing.recoloured();
  }

  async function remove(tag: Tag): Promise<void> {
    const outcome = await manage.remove(tag);
    if (outcome.kind === 'removed') editing.removed();
  }

  function submit(event: SubmitEvent, tag: Tag): void {
    event.preventDefault();
    void rename(tag);
  }
</script>

<TagsShell {read} current="manage" bind:filter>
  {#snippet children()}
    <header class="row wrap items-center gap-3">
      <h1 class="text-lg">Manage tags</h1>
      <Badge>{read.tags.length}</Badge>
      <Button href={tagsHref(null)} variant="ghost" size="sm" class="ms-auto">Back to tags</Button>
    </header>

    {#if read.status === 'failed'}
      <Alert variant="danger" role="alert">Your tags could not be read.</Alert>
    {/if}

    {#if notice !== null}
      <EmptyState message={notice} />
    {:else}
      <ul class="col gap-2 list-reset">
        {#each rows as row (row.id)}
          <li class="row wrap items-center gap-3 p-3 surface bordered rounded-container">
            <div class="row items-center gap-3 flex-fill">
              <Badge color={row.tag.colour} emphasis="quiet" dot aria-hidden="true" />
              {#if editing.renaming === row.id}
                <form
                  class="col gap-1 flex-1"
                  id="{uid}-rename-{row.id}"
                  onsubmit={(event) => submit(event, row.tag)}
                >
                  <Field
                    label="Rename {row.tag.name}"
                    hideLabel
                    error={editing.invalid ?? undefined}
                    announceError
                    class="gap-1"
                  >
                    {#snippet children(control)}
                      <Input
                        {...control}
                        type="text"
                        bind:value={() => editing.draft, (next) => editing.setDraft(next)}
                        onkeydown={abandon}
                        {@attach takeFocus}
                      />
                    {/snippet}
                  </Field>
                </form>
              {:else}
                <span class="flex-1 truncate weight-medium">{row.tag.name}</span>
              {/if}
            </div>
            <div class="row items-center gap-2 ms-auto">
              <span class="shrink-0 text-xs mono text-muted">{captureCount(row.count)}</span>
              {#if editing.confirming !== row.id}
                <Dropdown size="sm" variant="ghost">
                  {#snippet trigger()}
                    <Badge color={row.tag.colour} emphasis="quiet" dot>{row.tag.colour}</Badge>
                    <span class="visually-hidden">Colour for {row.tag.name}</span>
                  {/snippet}
                  {#each TAG_COLOURS as colour (colour)}
                    <DropdownItem
                      selected={colour === row.tag.colour}
                      aria-label="Make {row.tag.name} {colour}"
                      onclick={() => void recolour(row.tag, colour)}
                    >
                      <Badge color={colour} emphasis="quiet" dot>{colour}</Badge>
                    </DropdownItem>
                  {/each}
                </Dropdown>
                {#if editing.renaming === row.id}
                  <Button size="sm" variant="primary" type="submit" form="{uid}-rename-{row.id}">
                    Save
                  </Button>
                {:else}
                  <Button size="sm" variant="ghost" onclick={() => editing.startRename(row.tag)}>
                    Rename
                  </Button>
                {/if}
                <Button size="sm" variant="ghost-danger" onclick={() => editing.askRemove(row.tag)}>
                  Delete
                </Button>
              {/if}
            </div>
            {#if editing.confirming === row.id}
              <Alert
                variant="warning"
                role="alertdialog"
                class="w-full"
                aria-label="Delete {row.tag.name}"
              >
                {row.warning}
                {#snippet actions()}
                  <Button size="sm" onclick={() => editing.dismissRemove()}>Keep it</Button>
                  <Button size="sm" variant="danger" onclick={() => void remove(row.tag)}>
                    Delete
                  </Button>
                {/snippet}
              </Alert>
            {/if}
          </li>
        {/each}
      </ul>
    {/if}
  {/snippet}
</TagsShell>
