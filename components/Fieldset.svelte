<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLFieldsetAttributes } from 'svelte/elements';
  import { fieldControl, fieldIds } from './field';

  type Props = Omit<HTMLFieldsetAttributes, 'children'> & {
    legend: string | Snippet;
    hint?: string | undefined;
    children: Snippet;
  };

  let { legend, hint, class: className, children, ...rest }: Props = $props();

  const uid = $props.id();
  const ids = fieldIds(uid);
  const described = $derived(fieldControl(ids, hint !== undefined, false)['aria-describedby']);
</script>

<fieldset aria-describedby={described} {...rest} class={['fieldset', className]}>
  <legend class="fieldset-legend">
    {#if typeof legend === 'string'}
      {legend}
    {:else}
      {@render legend()}
    {/if}
  </legend>
  {#if hint !== undefined}
    <p class="field-hint" id={ids.hint}>{hint}</p>
  {/if}
  {@render children()}
</fieldset>
