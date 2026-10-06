<script lang="ts">
  import { tick } from 'svelte';
  import type { Attachment } from 'svelte/attachments';
  import type { ClassValue, HTMLInputAttributes } from 'svelte/elements';
  import { followAnchor } from './anchor-tracking';
  import { chosenText, comboboxKey, movedActive, openingActive, shownOptions } from './combobox';
  import type { ComboboxOpening, ComboboxOption } from './combobox';
  import Input from './Input.svelte';
  import {
    inlineDirection,
    menuInset,
    overlayPlacement,
    overlaySpacing,
  } from './overlay-placement';
  import type { OverlayPlacement } from './overlay-placement';

  type Props = Omit<
    HTMLInputAttributes,
    'children' | 'type' | 'value' | 'class' | 'role' | 'autocomplete'
  > & {
    label: string;
    options: readonly ComboboxOption[];
    value?: string | undefined;
    query?: string;
    hideLabel?: boolean;
    emptyLabel?: string;
    onchoose?: (value: string) => void;
    class?: ClassValue;
  };

  let {
    label,
    options,
    value = $bindable(),
    query = $bindable(chosenText(options, value)),
    hideLabel = false,
    emptyLabel = 'No matches',
    onchoose,
    class: className,
    ...rest
  }: Props = $props();

  const uid = $props.id();
  const inputId = `${uid}-input`;
  const labelId = `${uid}-label`;
  const listboxId = `${uid}-listbox`;
  let root = $state<HTMLDivElement>();
  let field = $state<HTMLInputElement | null>();
  let listbox = $state<HTMLDivElement>();
  let open = $state(false);
  let active = $state<number>();
  let placement = $state<OverlayPlacement>();
  let unfollow: (() => void) | undefined;
  const shown = $derived(shownOptions(options, query, value));
  const inset = $derived(menuInset(placement));
  const activeOption = $derived(open && active !== undefined ? shown[active] : undefined);
  const activeId = $derived(activeOption === undefined ? undefined : optionId(activeOption));

  function optionId(option: ComboboxOption): string {
    return `${uid}-option-${options.indexOf(option)}`;
  }

  function place(): void {
    if (field === null || field === undefined || listbox === undefined) return;
    const viewport = document.documentElement;
    const style = getComputedStyle(listbox);
    placement = overlayPlacement(
      field.getBoundingClientRect(),
      { width: viewport.clientWidth, height: viewport.clientHeight },
      { width: listbox.offsetWidth, height: listbox.offsetHeight },
      { align: 'start', direction: inlineDirection(style.direction), width: 'at-least-anchor' },
      overlaySpacing(style),
    );
  }

  function show(): void {
    open = true;
    if (listbox === undefined || unfollow !== undefined) return;
    if (!listbox.matches(':popover-open')) listbox.showPopover();
    place();
    unfollow = followAnchor(place);
  }

  function dismiss(): void {
    open = false;
    active = undefined;
    unfollow?.();
    unfollow = undefined;
    if (listbox?.matches(':popover-open') === true) listbox.hidePopover();
  }

  async function reveal(index: number | undefined): Promise<void> {
    active = index;
    await tick();
    const id = activeId;
    if (id === undefined) return;
    document.getElementById(id)?.scrollIntoView({ block: 'nearest' });
  }

  function opened(opening: ComboboxOpening): void {
    show();
    void reveal(openingActive(opening, shown.length));
  }

  function choose(option: ComboboxOption): void {
    value = option.value;
    query = option.label;
    dismiss();
    onchoose?.(option.value);
  }

  function typed(): void {
    active = undefined;
    show();
  }

  function keydown(event: KeyboardEvent): void {
    const action = comboboxKey(event.key, event.altKey, open);
    if (action.kind === 'ignore') return;
    if (action.kind === 'choose') {
      const option = activeOption;
      if (option === undefined) return;
      event.preventDefault();
      choose(option);
      return;
    }
    event.preventDefault();
    if (action.kind === 'open') opened(action.active);
    else if (action.kind === 'move') void reveal(movedActive(action.move, active, shown.length));
    else dismiss();
  }

  function restore(): void {
    dismiss();
    query = chosenText(options, value);
  }

  function focusout(event: FocusEvent): void {
    const next = event.relatedTarget;
    if (next instanceof Node && root?.contains(next) === true) return;
    restore();
  }

  function outside(event: PointerEvent): void {
    if (!open) return;
    if (event.target instanceof Node && root?.contains(event.target) === true) return;
    dismiss();
  }

  function left(): void {
    if (open) dismiss();
  }

  const picking: Attachment<HTMLDivElement> = (element) => {
    const keepFocus = (event: PointerEvent): void => event.preventDefault();
    const picked = (event: MouseEvent): void => {
      const target = event.target instanceof Element ? event.target : null;
      const id = target?.closest('.combobox-option')?.id;
      const option = shown.find((candidate) => optionId(candidate) === id);
      if (option !== undefined) choose(option);
    };
    element.addEventListener('pointerdown', keepFocus);
    element.addEventListener('click', picked);
    return () => {
      element.removeEventListener('pointerdown', keepFocus);
      element.removeEventListener('click', picked);
      unfollow?.();
      unfollow = undefined;
    };
  };
</script>

<svelte:document onpointerdown={outside} />
<svelte:window onblur={left} />

<div bind:this={root} class={['combobox', className]}>
  <label class={['field-label', { 'visually-hidden': hideLabel }]} for={inputId} id={labelId}
    >{label}</label
  >
  <div class="combobox-control">
    <Input
      {...rest}
      bind:value={query}
      bind:ref={field}
      id={inputId}
      type="text"
      role="combobox"
      autocomplete="off"
      aria-autocomplete="list"
      aria-expanded={open}
      aria-controls={listboxId}
      aria-activedescendant={activeId}
      oninput={typed}
      onkeydown={keydown}
      onfocusout={focusout}
    />
    <div
      bind:this={listbox}
      {@attach picking}
      id={listboxId}
      role="listbox"
      aria-labelledby={labelId}
      popover="manual"
      class="combobox-listbox"
      style:--combobox-top={inset.top}
      style:--combobox-left={inset.left}
      style:--combobox-anchor-width={inset.anchorWidth}
    >
      {#each shown as option, index (option.value)}
        <div
          id={optionId(option)}
          role="option"
          aria-selected={option.value === value ? 'true' : 'false'}
          class={[
            'combobox-option',
            { 'is-active': option.value === value, 'is-selected': open && index === active },
          ]}
        >
          {option.label}
        </div>
      {:else}
        <div class="combobox-empty" role="option" aria-selected="false" aria-disabled="true">
          {emptyLabel}
        </div>
      {/each}
    </div>
  </div>
</div>
