<script lang="ts">
  import { pressHeaderField } from '$lib/shared/header-search';
  import type { HeaderSearch } from '$lib/shared/header-search';
  import SearchField from '$lib/ui/components/SearchField.svelte';

  type Props = { readonly field: HeaderSearch };

  let { field }: Props = $props();
</script>

<div class="row items-center layout-app-shell-narrow-only" role="search">
  <SearchField
    bind:value={() => field.value, (next) => field.oninput(next)}
    label={field.placeholder}
    hideLabel
    class="flex-1"
    placeholder={field.placeholder}
    disabled={field.disabled}
    onkeydown={(event) => pressHeaderField(event, field)}
  />
</div>
