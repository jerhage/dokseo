<script lang="ts">
  import Alert from '$lib/components/Alert.svelte';
  import Badge from '$lib/components/Badge.svelte';
  import Button from '$lib/components/Button.svelte';
  import Dropdown from '$lib/components/Dropdown.svelte';
  import DropdownItem from '$lib/components/DropdownItem.svelte';
  import CircleX from '$lib/components/icons/CircleX.svelte';
  import Input from '$lib/components/Input.svelte';
  import { tagsHref } from '$lib/shared/tag-location';
  import type { Tag } from '../../domain/tag/tag';
  import { TAG_COLOURS } from '../../domain/tag/tag-colour';
  import { captureCount, manageNotice, manageRows } from './manage-rows';
  import type { ManageTagsView } from './manage-tags.svelte';
  import type { TagView } from './tag-view.svelte';
  import TagsShell from './TagsShell.svelte';

  type Props = {
    readonly view: TagView;
    readonly manage: ManageTagsView;
  };

  let { view, manage }: Props = $props();

  const uid = $props.id();

  const rows = $derived(manageRows(view.column));

  const notice = $derived(manageNotice(rows.length, view.status));

  function takeFocus(node: HTMLInputElement): void {
    node.focus();
    node.select();
  }

  function abandon(event: KeyboardEvent): void {
    if (event.key !== 'Escape') return;

    event.preventDefault();
    manage.abandonRename();
  }

  function submit(event: SubmitEvent, tag: Tag): void {
    event.preventDefault();
    void manage.rename(tag);
  }
</script>

<TagsShell {view} current="manage">
  {#snippet children()}
    <header class="row wrap items-center gap-3">
      <h1 class="text-lg">Manage tags</h1>
      <Badge>{view.tags.length}</Badge>
      <Button href={tagsHref(null)} variant="ghost" size="sm" class="ms-auto">Back to tags</Button>
    </header>

    {#if view.status === 'failed'}
      <Alert variant="danger" role="alert">Your tags could not be read.</Alert>
    {/if}

    {#if notice !== null}
      <p class="text-sm text-muted">{notice}</p>
    {:else}
      <ul class="col gap-2 list-reset">
        {#each rows as row (row.id)}
          <li class="row wrap items-center gap-3 p-3 surface bordered rounded-container">
            <div class="row items-center gap-3 flex-fill">
              <Badge colour={row.tag.colour} quiet dot aria-hidden="true" />
              {#if manage.renaming === row.id}
                <form
                  class="col gap-1 flex-1"
                  id="{uid}-rename-{row.id}"
                  onsubmit={(event) => submit(event, row.tag)}
                >
                  <label class="visually-hidden" for="{uid}-name-{row.id}">
                    Rename {row.tag.name}
                  </label>
                  <Input
                    id="{uid}-name-{row.id}"
                    type="text"
                    aria-invalid={manage.invalid !== null}
                    aria-describedby={manage.invalid === null ? undefined : `${uid}-invalid`}
                    bind:value={manage.draft}
                    onkeydown={abandon}
                    {@attach takeFocus}
                  />
                  {#if manage.invalid !== null}
                    <p class="field-error" id="{uid}-invalid" role="alert">
                      <CircleX class="field-error-icon" />{manage.invalid}
                    </p>
                  {/if}
                </form>
              {:else}
                <span class="flex-1 truncate weight-medium">{row.tag.name}</span>
              {/if}
            </div>
            <div class="row items-center gap-2 ms-auto">
              <span class="shrink-0 text-xs mono text-muted">{captureCount(row.count)}</span>
              {#if manage.confirming !== row.id}
                <Dropdown size="sm" variant="ghost">
                  {#snippet trigger()}
                    <Badge colour={row.tag.colour} quiet dot>{row.tag.colour}</Badge>
                    <span class="visually-hidden">Colour for {row.tag.name}</span>
                  {/snippet}
                  {#each TAG_COLOURS as colour (colour)}
                    <DropdownItem
                      selected={colour === row.tag.colour}
                      aria-label="Make {row.tag.name} {colour}"
                      onclick={() => void manage.recolour(row.tag, colour)}
                    >
                      <Badge {colour} quiet dot>{colour}</Badge>
                    </DropdownItem>
                  {/each}
                </Dropdown>
                {#if manage.renaming === row.id}
                  <Button size="sm" variant="primary" type="submit" form="{uid}-rename-{row.id}">
                    Save
                  </Button>
                {:else}
                  <Button size="sm" variant="ghost" onclick={() => manage.startRename(row.tag)}>
                    Rename
                  </Button>
                {/if}
                <Button size="sm" variant="ghost-danger" onclick={() => manage.askRemove(row.tag)}>
                  Delete
                </Button>
              {/if}
            </div>
            {#if manage.confirming === row.id}
              <Alert
                variant="warning"
                role="alertdialog"
                class="w-full"
                aria-label="Delete {row.tag.name}"
              >
                {row.warning}
                {#snippet actions()}
                  <Button size="sm" onclick={() => manage.dismissRemove()}>Keep it</Button>
                  <Button size="sm" variant="danger" onclick={() => void manage.remove(row.tag)}>
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
