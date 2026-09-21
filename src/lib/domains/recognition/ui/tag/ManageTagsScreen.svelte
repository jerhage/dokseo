<script lang="ts">
  import { match } from 'ts-pattern';
  import type { TagId } from '$lib/shared/ids';
  import { tagsHref } from '$lib/shared/tag-location';
  import type { Tag } from '../../domain/tag/tag';
  import { TAG_COLOURS } from '../../domain/tag/tag-colour';
  import { removalWarning, tagRemoval } from './tag-removal';
  import type { TagView } from './tag-view.svelte';
  import type { ManageTagsView } from './manage-tags.svelte';

  type Props = {
    readonly view: TagView;
    readonly manage: ManageTagsView;
  };

  type Row = {
    readonly id: TagId;
    readonly tag: Tag;
    readonly count: number;
    readonly warning: string;
  };

  let { view, manage }: Props = $props();

  const rows = $derived.by<readonly Row[]>(() =>
    view.column.map((option) => ({
      id: option.tag.id,
      tag: option.tag,
      count: option.count,
      warning: removalWarning(tagRemoval(option.tag.name, option.count)),
    })),
  );

  const empty = $derived.by<string | null>(() => {
    if (rows.length > 0) return null;

    return match(view.status)
      .with('idle', 'loading', () => 'Reading your tags…')
      .with(
        'ready',
        'failed',
        () => 'No tags yet. Tag a capture in the reader and it appears here.',
      )
      .exhaustive();
  });

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

<div class="screen">
  <nav class="rail" aria-label="Sections">
    <a class="mark" href="/" aria-label="Your library">
      <span lang="ja" aria-hidden="true">読</span>
    </a>
    <a class="pip current" href={tagsHref(null)} aria-current="true" title="Tags">
      <span aria-hidden="true">#</span>
      <span class="assistive">Tags</span>
    </a>
    <span class="grow"></span>
    <a class="pip" href="/settings" title="OCR engine settings">
      <span aria-hidden="true">⚙</span>
      <span class="assistive">Settings</span>
    </a>
  </nav>

  <main class="main">
    <header class="head">
      <h1>Manage tags</h1>
      <span class="total">{view.tags.length}</span>
      <a class="back" href={tagsHref(null)}>Back to tags</a>
    </header>

    {#if view.status === 'failed'}
      <p class="alert" role="alert">Your tags could not be read.</p>
    {/if}

    {#if manage.failure !== null}
      <p class="alert" role="alert">{manage.failure}</p>
    {/if}

    {#if empty !== null}
      <p class="notice">{empty}</p>
    {:else}
      <ul class="tags">
        {#each rows as row (row.id)}
          <li class="tag">
            <div class="line" style="--swatch: var(--c-tag-{row.tag.colour})">
              <span class="swatch" aria-hidden="true"></span>
              {#if manage.renaming === row.id}
                <form
                  class="rename"
                  id="rename-{row.id}"
                  onsubmit={(event) => submit(event, row.tag)}
                >
                  <label class="assistive" for="name-{row.id}">Rename {row.tag.name}</label>
                  <input
                    id="name-{row.id}"
                    class="field"
                    type="text"
                    bind:value={manage.draft}
                    onkeydown={abandon}
                    use:takeFocus
                  />
                </form>
              {:else}
                <span class="name">{row.tag.name}</span>
              {/if}
              <span class="count">
                {row.count}
                {row.count === 1 ? 'capture' : 'captures'}
              </span>
            </div>

            {#if manage.confirming === row.id}
              <div class="confirm" role="alertdialog" aria-label="Delete {row.tag.name}">
                <p class="warning">{row.warning}</p>
                <div class="choices">
                  <button class="keep" type="button" onclick={() => manage.dismissRemove()}>
                    Keep it
                  </button>
                  <button class="delete" type="button" onclick={() => void manage.remove(row.tag)}>
                    Delete
                  </button>
                </div>
              </div>
            {:else}
              <div class="controls">
                <div class="palette" role="group" aria-label="Colour for {row.tag.name}">
                  {#each TAG_COLOURS as colour (colour)}
                    <button
                      class="paint"
                      class:on={colour === row.tag.colour}
                      style="--swatch: var(--c-tag-{colour})"
                      type="button"
                      aria-pressed={colour === row.tag.colour}
                      aria-label="Make {row.tag.name} {colour}"
                      onclick={() => void manage.recolour(row.tag, colour)}
                    ></button>
                  {/each}
                </div>
                {#if manage.renaming === row.id}
                  <button class="act" type="submit" form="rename-{row.id}">Save</button>
                {:else}
                  <button class="act" type="button" onclick={() => manage.startRename(row.tag)}>
                    Rename
                  </button>
                {/if}
                <button class="act drop" type="button" onclick={() => manage.askRemove(row.tag)}>
                  Delete
                </button>
              </div>
            {/if}
          </li>
        {/each}
      </ul>
    {/if}
  </main>
</div>

<style>
  .screen {
    display: flex;
    height: 100vh;
    background: var(--c-surface-app);
    color: var(--c-text-2);
    font-family: var(--f-ui);
  }

  .rail {
    display: flex;
    flex: none;
    flex-direction: column;
    align-items: center;
    gap: var(--s-2);
    width: 62px;
    padding: var(--s-4) 0;
    border-right: 1px solid var(--c-border-1);
    background: var(--c-surface-rail);
  }

  .grow {
    flex: 1 1 auto;
  }

  .mark {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 30px;
    height: 30px;
    border-radius: var(--r-4);
    background: var(--c-accent);
    color: var(--c-accent-text);
    font-family: var(--f-ja);
    font-size: 15px;
    text-decoration: none;
  }

  .pip {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 30px;
    height: 30px;
    border: 1px solid var(--c-border-4);
    border-radius: var(--r-4);
    color: var(--c-text-7);
    font-size: 14px;
    text-decoration: none;
  }

  .pip:hover,
  .pip:focus-visible {
    border-color: var(--c-border-9);
    color: var(--c-text-3);
  }

  .pip.current {
    border-color: var(--c-border-9);
    background: var(--c-surface-card-quiet);
    color: var(--c-text-3);
  }

  .main {
    display: flex;
    flex: 1 1 auto;
    flex-direction: column;
    gap: var(--s-4);
    min-width: 0;
    min-height: 0;
    overflow-y: auto;
    padding: var(--s-5) var(--s-6);
  }

  .head {
    display: flex;
    flex: none;
    align-items: baseline;
    gap: var(--s-2);
  }

  .head h1 {
    margin: 0;
    color: var(--c-text-1);
    font-size: 19px;
    font-weight: 500;
    letter-spacing: -0.01em;
  }

  .total {
    flex: 1 1 auto;
    color: var(--c-text-9);
    font-family: var(--f-mono);
    font-size: 10px;
  }

  .back {
    flex: none;
    color: var(--c-text-7);
    font-size: 11.5px;
    text-decoration: none;
  }

  .back:hover,
  .back:focus-visible {
    color: var(--c-text-2);
    outline: none;
  }

  .alert {
    margin: 0;
    padding: var(--s-2) var(--s-3);
    border: 1px solid var(--c-warning-border);
    border-radius: var(--r-4);
    background: var(--c-warning-wash-faint);
    color: var(--c-warning-text-soft);
    font-size: 12px;
  }

  .notice {
    max-width: 52ch;
    margin: 0;
    color: var(--c-text-8);
    font-size: 12.5px;
    line-height: 1.5;
  }

  .tags {
    display: flex;
    flex-direction: column;
    gap: var(--s-2);
    max-width: 68ch;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .tag {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--s-2) var(--s-4);
    padding: var(--s-3);
    border: 1px solid var(--c-border-2);
    border-radius: var(--r-5);
    background: var(--c-surface-card-quiet);
  }

  .line {
    display: flex;
    flex: 1 1 220px;
    align-items: baseline;
    gap: var(--s-2);
    min-width: 0;
  }

  .swatch {
    flex: none;
    align-self: center;
    width: 9px;
    height: 9px;
    border-radius: 2px;
    background: var(--swatch);
  }

  .name {
    flex: 1 1 auto;
    min-width: 0;
    overflow: hidden;
    color: var(--c-text-2);
    font-size: 13px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .rename {
    display: flex;
    flex: 1 1 auto;
    min-width: 0;
  }

  .field {
    width: 100%;
    height: 26px;
    padding: 0 var(--s-2);
    border: 1px solid var(--c-border-8);
    border-radius: var(--r-3);
    background: var(--c-surface-popover);
    color: var(--c-text-1);
    font-family: var(--f-ui);
    font-size: 13px;
  }

  .field:focus-visible {
    border-color: var(--c-border-9);
    outline: none;
  }

  .count {
    flex: none;
    color: var(--c-text-9);
    font-family: var(--f-mono);
    font-size: 10px;
  }

  .controls {
    display: flex;
    flex: none;
    align-items: center;
    gap: var(--s-2);
  }

  .palette {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    max-width: 156px;
    gap: 5px;
    padding: 3px 5px;
    border: 1px solid var(--c-border-2);
    border-radius: var(--r-8);
  }

  .paint {
    width: 13px;
    height: 13px;
    padding: 0;
    border: 1px solid transparent;
    border-radius: 3px;
    background: var(--swatch);
    cursor: pointer;
    opacity: 0.55;
  }

  .paint:hover,
  .paint:focus-visible {
    outline: none;
    opacity: 1;
  }

  .paint.on {
    border-color: var(--c-text-1);
    opacity: 1;
  }

  .act {
    padding: var(--s-1) var(--s-3);
    border: 1px solid var(--c-border-4);
    border-radius: var(--r-pill);
    background: var(--c-surface-button);
    color: var(--c-text-5);
    font-family: var(--f-ui);
    font-size: 11px;
    cursor: pointer;
  }

  .act:hover,
  .act:focus-visible {
    border-color: var(--c-border-9);
    color: var(--c-text-1);
    outline: none;
  }

  .act.drop {
    border-color: var(--c-warning-border);
    color: var(--c-warning-text-soft);
  }

  .confirm {
    display: flex;
    flex: 1 1 100%;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--s-2) var(--s-3);
    padding: var(--s-2) var(--s-3);
    border: 1px solid var(--c-warning-border);
    border-radius: var(--r-4);
    background: var(--c-warning-wash-faint);
  }

  .warning {
    flex: 1 1 24ch;
    margin: 0;
    color: var(--c-text-2);
    font-size: 12px;
  }

  .choices {
    display: flex;
    flex: none;
    gap: var(--s-2);
  }

  .keep,
  .delete {
    padding: var(--s-1) var(--s-3);
    border: 1px solid var(--c-border-4);
    border-radius: var(--r-pill);
    background: var(--c-surface-button);
    color: var(--c-text-5);
    font-family: var(--f-ui);
    font-size: 11px;
    cursor: pointer;
  }

  .delete {
    border-color: var(--c-warning);
    color: var(--c-warning);
  }

  .keep:hover,
  .keep:focus-visible {
    border-color: var(--c-border-9);
    color: var(--c-text-1);
    outline: none;
  }

  .delete:hover,
  .delete:focus-visible {
    border-color: var(--c-warning-text);
    color: var(--c-warning-text);
    outline: none;
  }

  .assistive {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
  }

  @media (max-width: 860px) {
    .main {
      padding: var(--s-4) var(--s-4);
    }
  }
</style>
