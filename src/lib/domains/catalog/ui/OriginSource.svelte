<script lang="ts">
  import type { BookId } from '$lib/shared/ids';
  import type { OriginsListed } from './catalog-list';
  import { badgeFor, sourceText } from './origin-filter';

  type Props = {
    readonly listed: OriginsListed;
    readonly id: BookId;
  };

  let { listed, id }: Props = $props();
</script>

<p class="text-sm text-muted">{sourceText(badgeFor(listed, id))}</p>
