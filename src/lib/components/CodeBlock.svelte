<script lang="ts">
  import type { HTMLAttributes } from 'svelte/elements';

  type Props = HTMLAttributes<HTMLPreElement> & {
    code?: string | undefined;
    label?: string | undefined;
  };

  let { code, label, class: className, children, ...rest }: Props = $props();
</script>

<pre
  role={label === undefined ? undefined : 'region'}
  aria-label={label}
  {...rest}
  class={['codeblock', className]}><code
    >{#if code !== undefined}{code}{:else}{@render children?.()}{/if}</code
  ></pre>
