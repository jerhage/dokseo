<script lang="ts">
  import type { ClassValue, HTMLInputAttributes } from 'svelte/elements';
  import IconButton from './IconButton.svelte';
  import X from './icons/X.svelte';
  import Input from './Input.svelte';
  import { CLEAR_LABEL, searchFieldId, showsClear } from './search-field';
  import type { SearchFieldType } from './search-field';

  type Props = Omit<HTMLInputAttributes, 'children' | 'type' | 'value' | 'class'> & {
    label: string;
    hideLabel?: boolean;
    type?: SearchFieldType;
    clearable?: boolean;
    clearLabel?: string;
    onclear?: () => void;
    value?: string;
    ref?: HTMLInputElement | null | undefined;
    class?: ClassValue;
  };

  let {
    label,
    hideLabel = false,
    type = 'search',
    clearable = false,
    clearLabel = CLEAR_LABEL,
    onclear,
    value = $bindable(''),
    ref = $bindable(),
    id,
    class: className,
    ...rest
  }: Props = $props();

  const uid = $props.id();
  const fieldId = $derived(searchFieldId(id, uid));

  function keepFocus(event: MouseEvent): void {
    event.preventDefault();
  }

  function clear(): void {
    value = '';
    onclear?.();
    ref?.focus();
  }
</script>

<div class={['search-field', { 'search-field-clearable': clearable }, className]}>
  <label class={['field-label', { 'visually-hidden': hideLabel }]} for={fieldId}>{label}</label>
  <div class="search-field-control">
    <Input {...rest} bind:value bind:ref id={fieldId} {type} />
    {#if showsClear(clearable, value)}
      <IconButton
        variant="ghost"
        size="sm"
        class="search-field-clear"
        label={clearLabel}
        tooltip={false}
        onmousedown={keepFocus}
        onclick={clear}
      >
        <X />
      </IconButton>
    {/if}
  </div>
</div>
