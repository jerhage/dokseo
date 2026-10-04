<script lang="ts">
  import DocsPage from '../DocsPage.svelte';
  import IdentityConcepts from './book-identity/IdentityConcepts.svelte';
  import IdentityDokseo from './book-identity/IdentityDokseo.svelte';
  import IdentityRecovery from './book-identity/IdentityRecovery.svelte';
  import { IDENTITY_SECTIONS } from './book-identity/sections';
</script>

<DocsPage slug="book-identity" sections={Object.values(IDENTITY_SECTIONS)}>
  {#snippet lead()}
    Dokseo recognizes a book by a sampled hash of its bytes, falls back to its file name and title
    to recover one it lost, and keeps enough of a removed or unreadable book to give its captures
    back to the next upload of it.
  {/snippet}

  <IdentityConcepts />
  <IdentityDokseo />
  <IdentityRecovery />
</DocsPage>
