<script lang="ts">
  import type { HTMLAnchorAttributes, HTMLButtonAttributes } from 'svelte/elements';
  import { useMenu } from './menu';

  type Looks = {
    danger?: boolean;
    hint?: string | undefined;
  };

  type ButtonProps = Looks &
    Omit<HTMLButtonAttributes, 'type' | 'role'> & {
      href?: undefined;
      selected?: boolean | undefined;
    };

  type LinkProps = Looks &
    Omit<HTMLAnchorAttributes, 'role'> & {
      href: string;
      current?: boolean;
    };

  type Props = ButtonProps | LinkProps;

  let { danger = false, hint, class: className, children, ...rest }: Props = $props();

  const menu = useMenu();

  function chosen(event: MouseEvent): void {
    if (!event.defaultPrevented) menu.close();
  }
</script>

{#snippet content()}
  {@render children?.()}
  {#if hint !== undefined}
    <span class="dropdown-item-hint">{hint}</span>
  {/if}
{/snippet}

{#if rest.href === undefined}
  {@const { selected, onclick, ...button } = rest}
  <button
    {...button}
    type="button"
    role={selected === undefined ? 'menuitem' : 'menuitemradio'}
    aria-checked={selected}
    tabindex="-1"
    class={[
      'dropdown-item',
      { 'dropdown-item-danger': danger, 'is-active': selected === true },
      className,
    ]}
    onclick={(event) => {
      onclick?.(event);
      chosen(event);
    }}
  >
    {@render content()}
  </button>
{:else}
  {@const { current = false, onclick, ...link } = rest}
  <a
    {...link}
    role="menuitem"
    aria-current={current ? 'page' : undefined}
    tabindex="-1"
    class={['dropdown-item', { 'dropdown-item-danger': danger, 'is-active': current }, className]}
    onclick={(event) => {
      onclick?.(event);
      chosen(event);
    }}
  >
    {@render content()}
  </a>
{/if}
