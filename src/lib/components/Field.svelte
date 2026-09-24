<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLAttributes } from 'svelte/elements';
  import { fieldControl, fieldIds } from './field';
  import type { FieldControl } from './field';

  type Props = Omit<HTMLAttributes<HTMLDivElement>, 'children'> & {
    label: string;
    hint?: string;
    error?: string;
    children: Snippet<[FieldControl]>;
  };

  let { label, hint, error, class: className, children, ...rest }: Props = $props();

  const uid = $props.id();
  const ids = fieldIds(uid);
  const control = $derived(fieldControl(ids, hint !== undefined, error !== undefined));
</script>

<div {...rest} class={['field', { 'is-invalid': error !== undefined }, className]}>
  <label class="field-label" for={ids.control}>{label}</label>
  <div class="field-control">
    {@render children(control)}
  </div>
  {#if hint !== undefined}
    <p class="field-hint" id={ids.hint}>{hint}</p>
  {/if}
  {#if error !== undefined}
    <p class="field-error" id={ids.error}>{error}</p>
  {/if}
</div>
