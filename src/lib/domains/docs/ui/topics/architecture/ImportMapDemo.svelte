<script lang="ts">
  import Badge from '$lib/components/Badge.svelte';
  import Diagram from '$lib/components/Diagram.svelte';
  import Select from '$lib/components/Select.svelte';
  import Field from '$lib/components/Field.svelte';
  import { MAP_AREAS } from '../../../domain/import-map';
  import DocsDemo from '../../DocsDemo.svelte';
  import { importMapDiagram } from './architecture-diagrams';
  import { ImportMapView } from './import-map.svelte';
  import { architectureHref } from './architecture-sections';
  import { ruleNote } from './rule-notes';

  const view = new ImportMapView();

  const diagram = $derived(importMapDiagram(view.area, view.verdicts));

  const folderOptions = $derived(
    view.folders.map((folder) => ({ value: folder, label: `${folder}/` })),
  );
</script>

<DocsDemo label="What a folder may import">
  <div class="stack-md">
    <div class="grid-2 gap-2">
      <Field label="Importing area">
        {#snippet children(control)}
          <Select
            {...control}
            value={view.area.id}
            onchange={(event) => view.choose(event.currentTarget.value)}
          >
            {#each MAP_AREAS as area (area.id)}
              <option value={area.id}>
                {area.kind === 'domain'
                  ? `${area.label} (${area.leaf ? 'leaf' : 'non-leaf'} domain)`
                  : area.label}
              </option>
            {/each}
          </Select>
        {/snippet}
      </Field>
      {#if folderOptions.length > 0}
        <Field label="Folder inside {view.area.label}">
          {#snippet children(control)}
            <Select
              {...control}
              value={view.folder ?? undefined}
              onchange={(event) => view.chooseFolder(event.currentTarget.value)}
            >
              {#each folderOptions as option (option.value)}
                <option value={option.value}>{option.label}</option>
              {/each}
            </Select>
          {/snippet}
        </Field>
      {/if}
    </div>
    <Diagram {...diagram} />
    <ul class="stack-sm list-reset">
      {#each view.verdicts as area (area.area.id)}
        <li class="col gap-1 bordered rounded-container p-3 min-w-0">
          <strong>{area.area.label}</strong>
          <ul class="col gap-1 list-reset">
            {#each area.targets as target (target.path)}
              <li class="row wrap items-center gap-2 min-w-0">
                <code>{target.folder === null ? target.path : `${target.folder}/`}</code>
                {#if target.verdict.kind === 'allowed'}
                  <Badge variant="success">allowed</Badge>
                {:else if target.verdict.kind === 'type-only'}
                  <Badge variant="warning">import type only</Badge>
                  <span class="text-sm text-muted">{target.verdict.rules.join(', ')}</span>
                {:else}
                  <Badge variant="danger">forbidden</Badge>
                  <span
                    class="text-sm text-muted"
                    title={target.verdict.rules.map(ruleNote).join(' ')}
                    >{target.verdict.rules.join(', ')}</span
                  >
                {/if}
              </li>
            {/each}
          </ul>
        </li>
      {/each}
    </ul>
  </div>
  {#snippet caption()}
    Every verdict is the ported rule set run on a sample path in each folder, so a box marked partly
    has some folders allowed and some refused. The same area appears in its own list, which shows
    what its folders may import from each other. A box above the importing folder can show as
    allowed because no rule covers that edge; <a href={architectureHref('limits')}
      >What the rules do not reach</a
    > lists those.
  {/snippet}
</DocsDemo>
