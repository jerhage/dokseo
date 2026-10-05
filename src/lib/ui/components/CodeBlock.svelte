<script lang="ts">
  import type { ClassValue, HTMLAttributes } from 'svelte/elements';
  import IconButton from './IconButton.svelte';
  import Check from './icons/Check.svelte';
  import Copy from './icons/Copy.svelte';

  type Props = Omit<HTMLAttributes<HTMLPreElement>, 'oncopy'> & {
    code?: string | undefined;
    label?: string | undefined;
    wrap?: boolean;
    oncopy?: ((text: string) => void) | undefined;
    copied?: boolean;
    copyLabel?: string;
    copiedLabel?: string;
  };

  let {
    code,
    label,
    wrap = false,
    oncopy,
    copied = false,
    copyLabel = 'Copy the code',
    copiedLabel = 'Copied',
    class: className,
    children,
    ...rest
  }: Props = $props();

  let content = $state<HTMLElement | null>();

  function copy(run: (text: string) => void): void {
    run(code ?? content?.textContent ?? '');
  }
</script>

{#snippet block(blockClass: ClassValue)}
  <pre
    role={label === undefined ? undefined : 'region'}
    aria-label={label}
    {...rest}
    class={blockClass}><code bind:this={content}
      >{#if code !== undefined}{code}{:else}{@render children?.()}{/if}</code
    ></pre>
{/snippet}

{#if oncopy === undefined}
  {@render block(['codeblock', wrap && 'codeblock-wrap', className])}
{:else}
  <div class={['codeblock-frame', className]}>
    {@render block(['codeblock', wrap && 'codeblock-wrap'])}
    <IconButton
      size="sm"
      class="codeblock-copy"
      icon={copied ? Check : Copy}
      label={copied ? copiedLabel : copyLabel}
      onclick={() => copy(oncopy)}
    />
  </div>
{/if}
