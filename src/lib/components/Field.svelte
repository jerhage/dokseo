<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLAttributes } from 'svelte/elements';
  import { FIELD_LAYOUTS } from './classes';
  import type { FieldLayout } from './classes';
  import { fieldControl, fieldIds } from './field';
  import type { FieldControl } from './field';
  import CircleX from './icons/CircleX.svelte';

  type Props = Omit<HTMLAttributes<HTMLDivElement>, 'children'> & {
    label: string;
    hint?: string | undefined;
    error?: string | undefined;
    hideLabel?: boolean;
    announceError?: boolean;
    layout?: FieldLayout;
    children: Snippet<[FieldControl]>;
  };

  let {
    label,
    hint,
    error,
    hideLabel = false,
    announceError = false,
    layout = 'stacked',
    class: className,
    children,
    ...rest
  }: Props = $props();

  const uid = $props.id();
  const ids = fieldIds(uid);
  const control = $derived(fieldControl(ids, hint !== undefined, error !== undefined));
</script>

<div
  {...rest}
  class={['field', FIELD_LAYOUTS[layout], { 'is-invalid': error !== undefined }, className]}
>
  <label class={['field-label', { 'visually-hidden': hideLabel }]} for={ids.control}>{label}</label>
  <div class="field-control">
    {@render children(control)}
  </div>
  {#if hint !== undefined}
    <p class="field-hint" id={ids.hint}>{hint}</p>
  {/if}
  {#if error !== undefined}
    <p class="field-error" id={ids.error} role={announceError ? 'alert' : undefined}>
      <CircleX class="field-error-icon" />{error}
    </p>
  {/if}
</div>
