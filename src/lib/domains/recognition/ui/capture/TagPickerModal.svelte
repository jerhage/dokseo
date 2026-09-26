<script lang="ts">
  import { match } from 'ts-pattern';
  import Badge from '$lib/components/Badge.svelte';
  import CommandItem from '$lib/components/CommandItem.svelte';
  import Input from '$lib/components/Input.svelte';
  import Modal from '$lib/components/Modal.svelte';
  import Tag from '$lib/components/Tag.svelte';
  import type { TagId } from '$lib/shared/ids';
  import type { TagChip } from './tag-chip';
  import type { PickerRow, TagPicker } from './tag-picker.svelte';
  import { pickerOffers } from './picker-offers';
  import { pickerKey } from './editor-keys';
  import './tag-picker.css';

  type Props = {
    readonly open: boolean;
    readonly picker: TagPicker;
    readonly place: string;
    readonly chips: readonly TagChip[];
    readonly onchoose: (row: PickerRow) => void;
    readonly onuntag: (tag: TagId) => void;
    readonly onclose: () => void;
  };

  let { open, picker, place, chips, onchoose, onuntag, onclose }: Props = $props();

  const uid = $props.id();

  let filter = $state<HTMLInputElement>();

  const offers = $derived(pickerOffers(picker.rows, picker.highlighted, uid));

  function take(row: PickerRow | null): void {
    if (row === null) return;

    onchoose(row);
    filter?.focus();
  }

  function picking(event: KeyboardEvent): void {
    const key = pickerKey(event);
    if (key === 'type') return;

    event.preventDefault();
    match(key)
      .with('down', () => picker.moveBy(1))
      .with('up', () => picker.moveBy(-1))
      .with('choose', () => take(picker.chosen))
      .with('close', () => onclose())
      .exhaustive();
  }
</script>

<Modal
  {open}
  title="Tags"
  size="sm"
  placement="top"
  body="flush"
  class="tag-picker"
  closeLabel="Done"
  onclose={() => onclose()}
>
  <div class="col gap-2 px-5 pb-4">
    <p class="m-0 text-xs text-muted">On the capture at {place}</p>
    <ul
      class="chips row items-center gap-1 list-reset overflow-auto min-w-0"
      aria-label="Tags on this capture"
    >
      {#each chips as chip (chip.id)}
        <li class="shrink-0">
          <Tag
            colour={chip.colour}
            onremove={() => onuntag(chip.id)}
            removeLabel="Remove the tag {chip.name} from the capture at {place}"
          >
            {chip.name}
          </Tag>
        </li>
      {:else}
        <li class="text-sm text-muted">No tags yet</li>
      {/each}
    </ul>

    <label class="visually-hidden" for="{uid}-filter">Filter or create a tag</label>
    <Input
      bind:ref={filter}
      bind:value={picker.query}
      id="{uid}-filter"
      type="text"
      role="combobox"
      autocomplete="off"
      autofocus
      placeholder="Filter or create a tag…"
      aria-expanded="true"
      aria-controls="{uid}-list"
      aria-activedescendant={offers.active}
      onkeydown={picking}
    />

    <ul class="col gap-0 list-reset" id="{uid}-list" role="listbox" aria-label="Tags">
      {#if offers.create !== null}
        {@const fresh = offers.create}
        <li role="presentation">
          <CommandItem
            id={fresh.id}
            role="option"
            tabindex={-1}
            aria-selected={fresh.selected}
            selected={fresh.selected}
            onclick={() => take(fresh.row)}
          >
            <span class="truncate">Create “{fresh.name}”</span>
          </CommandItem>
        </li>
      {:else}
        <li role="presentation" class="command-item text-muted" aria-hidden="true">
          Type a new name to create a tag
        </li>
      {/if}
      <li role="presentation" class="border-t">
        <ul
          class="picks col gap-0 list-reset overflow-y-auto pt-1"
          role="group"
          aria-label="Your tags"
        >
          {#each offers.tags as offer (offer.id)}
            <li role="presentation">
              <CommandItem
                id={offer.id}
                role="option"
                tabindex={-1}
                aria-selected={offer.selected}
                selected={offer.selected}
                hint={String(offer.count)}
                onclick={() => take(offer.row)}
              >
                <Badge colour={offer.tag.colour} quiet dot>{offer.tag.name}</Badge>
              </CommandItem>
            </li>
          {:else}
            <li class="px-3 py-2 text-sm text-muted">No other tag matches.</li>
          {/each}
        </ul>
      </li>
    </ul>
    <p class="m-0 text-xs text-muted">↑↓ move · ↵ adds · esc closes</p>
  </div>
</Modal>
