<script lang="ts">
  import Button from '$lib/components/Button.svelte';
  import Card from '$lib/components/Card.svelte';
  import SearchField from '$lib/components/SearchField.svelte';
  import DemoSection from './DemoSection.svelte';

  let hidden = $state('');
  let shown = $state('');
  let clearable = $state('harbour');
  let clears = $state(0);
  let filter = $state('');
  let field = $state<HTMLInputElement>();
</script>

<DemoSection
  id="search-field"
  title="Search field"
  classes={['search-field', 'search-field-control', 'input-clearable', 'input-clear']}
>
  <div class="grid-2">
    <Card>
      <div class="col gap-2">
        <p class="text-sm text-muted">hidden label</p>
        <SearchField
          bind:value={hidden}
          label="Search the projects"
          hideLabel
          placeholder="Search the projects"
        />
      </div>
    </Card>
    <Card>
      <div class="col gap-2">
        <p class="text-sm text-muted">visible label, bind:ref</p>
        <SearchField
          bind:value={shown}
          bind:ref={field}
          label="Search the archive"
          enterkeyhint="search"
          placeholder="Names, dates, places"
        />
        <div class="row">
          <Button size="sm" onclick={() => field?.select()}>Select the query</Button>
        </div>
      </div>
    </Card>
    <Card>
      <div class="col gap-2">
        <p class="text-sm text-muted">clearable: a drawn ✕ on a coarse pointer only</p>
        <SearchField
          bind:value={clearable}
          label="Search the harbours"
          hideLabel
          clearable
          onclear={() => (clears += 1)}
          placeholder="Search the harbours"
        />
        <span class="text-xs text-faint">cleared {clears} times</span>
      </div>
    </Card>
    <Card>
      <div class="col gap-2">
        <p class="text-sm text-muted">type text, for a combobox filter</p>
        <SearchField
          bind:value={filter}
          label="Filter or create a label"
          hideLabel
          type="text"
          autocomplete="off"
          placeholder="Filter or create a label…"
        />
      </div>
    </Card>
  </div>
</DemoSection>
