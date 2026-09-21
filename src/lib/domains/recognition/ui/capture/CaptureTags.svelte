<script lang="ts">
  import type { TagId } from '$lib/shared/ids';
  import type { TagChip } from './tag-chip';

  type Props = {
    readonly chips: readonly TagChip[];
    readonly place: string;
    readonly onremove: (tag: TagId) => void;
    readonly onadd: (trigger: HTMLButtonElement) => void;
  };

  let { chips, place, onremove, onadd }: Props = $props();
</script>

<div class="tags">
  {#each chips as chip (chip.id)}
    <span class="chip" style="--swatch: var(--c-tag-{chip.colour})">
      <span class="swatch" aria-hidden="true"></span>
      <span class="label">{chip.name}</span>
      <button class="tool" type="button" onclick={() => onremove(chip.id)}>
        <span class="glyph" aria-hidden="true">×</span>
        <span class="assistive">Remove the tag {chip.name} from the capture at {place}</span>
      </button>
    </span>
  {/each}
  <button class="chip add" type="button" onclick={(event) => onadd(event.currentTarget)}>
    <span class="glyph" aria-hidden="true">+</span>
    <span class="label" aria-hidden="true">tag</span>
    <span class="assistive">Add a tag to the capture at {place}</span>
  </button>
</div>

<style>
  .tags {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--s-1);
    margin-top: var(--s-2);
  }

  .chip {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 4px 9px;
    border: 1px solid var(--c-border-8);
    border-radius: var(--r-8);
    background: var(--c-surface-tag);
    color: var(--c-text-tag);
    font-family: var(--f-ui);
    font-size: 11px;
    line-height: 1;
  }

  .swatch {
    flex: none;
    width: 5px;
    height: 5px;
    border-radius: 1px;
    background: var(--swatch);
  }

  .label {
    white-space: nowrap;
  }

  .add {
    border-style: dashed;
    border-color: var(--c-border-9);
    background: none;
    color: var(--c-text-7);
    cursor: pointer;
  }

  .add:hover,
  .add:focus-visible {
    border-color: var(--c-text-7);
    color: var(--c-text-5);
  }

  .tool {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 12px;
    height: 12px;
    padding: 0;
    border: 0;
    border-radius: var(--r-1);
    background: none;
    color: var(--c-text-8);
    font-family: var(--f-ui);
    opacity: 0;
    cursor: pointer;
  }

  .chip:hover .tool,
  .tool:focus {
    opacity: 1;
  }

  .tool:hover,
  .tool:focus {
    color: var(--c-warning);
  }

  .glyph {
    font-size: 11px;
    line-height: 1;
  }

  .assistive {
    position: absolute;
    width: 1px;
    height: 1px;
    margin: 0;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
  }
</style>
