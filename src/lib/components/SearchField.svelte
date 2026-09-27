<script lang="ts">
  import type { ClassValue, HTMLInputAttributes } from 'svelte/elements';
  import Button from './Button.svelte';
  import X from './icons/X.svelte';
  import Input from './Input.svelte';
  import { CLEAR_LABEL, searchFieldId, showsClear } from './search-field';
  import type { SearchFieldType } from './search-field';

  type Props = Omit<HTMLInputAttributes, 'children' | 'type' | 'value' | 'class'> & {
    label: string;
    hideLabel?: boolean;
    type?: SearchFieldType;
    clearable?: boolean;
    onclear?: () => void;
    value?: string;
    ref?: HTMLInputElement | undefined;
    class?: ClassValue;
  };

  let {
    label,
    hideLabel = false,
    type = 'search',
    clearable = false,
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

<div class={['search-field', className]}>
  <label class={['field-label', { 'visually-hidden': hideLabel }]} for={fieldId}>{label}</label>
  <div class={['search-field-control', { 'input-clearable': clearable }]}>
    <Input {...rest} bind:value bind:ref id={fieldId} {type} />
    {#if showsClear(clearable, value)}
      <Button
        variant="ghost"
        size="sm"
        square
        class="input-clear"
        aria-label={CLEAR_LABEL}
        onmousedown={keepFocus}
        onclick={clear}
      >
        <X />
      </Button>
    {/if}
  </div>
</div>
