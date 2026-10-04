<script lang="ts">
  import Badge from '$lib/components/Badge.svelte';
  import Field from '$lib/components/Field.svelte';
  import Select from '$lib/components/Select.svelte';
  import DocsDemo from '../../DocsDemo.svelte';
  import { CREATE_VERSIONS } from './tag-doubles';
  import type { DoubleKind } from './tag-doubles';
  import { DoublesBench } from './testing-demos.svelte';

  const bench = new DoublesBench();
  void bench.run();

  const DOUBLES: readonly { readonly kind: DoubleKind; readonly title: string }[] = [
    { kind: 'fake', title: 'Against a fake: checks what the store holds' },
    { kind: 'mock', title: 'Against a mock: checks the calls it received' },
  ];
</script>

<DocsDemo label="createTag against a fake and a mock">
  {#snippet caption()}
    The first version is the real <code>createTag</code>. The other two are copies written for this
    demo, each a few lines different. The fake keeps saved tags in an array and lists them back; the
    mock returns a scripted list from <code>list()</code> and records every call. Nothing touches this
    browser's tags.
  {/snippet}
  <div class="stack-md">
    <Field label="Version of createTag">
      {#snippet children(control)}
        <Select
          {...control}
          value={bench.version}
          onchange={(event) => void bench.choose(event.currentTarget.value)}
        >
          {#each CREATE_VERSIONS as version (version.value)}
            <option value={version.value}>{version.label}</option>
          {/each}
        </Select>
      {/snippet}
    </Field>
    <div class="grid-2 gap-4">
      {#each DOUBLES as double (double.kind)}
        <div class="stack-sm">
          <h3 class="m-0 text-base">{double.title}</h3>
          <ul class="list-reset stack-sm">
            {#each bench.tests.filter((test) => test.double === double.kind) as test (test.name)}
              <li class="stack-sm">
                <div class="row gap-2 items-center">
                  {#if test.outcome.kind === 'passed'}
                    <Badge variant="success">passed</Badge>
                  {:else}
                    <Badge variant="danger">failed</Badge>
                  {/if}
                  <span class="text-sm">{test.name}</span>
                </div>
                <p class="m-0 text-sm text-muted">
                  Calls: <code>{test.calls.join(', ')}</code>
                </p>
                {#if test.outcome.kind === 'failed'}
                  <p class="m-0 text-sm text-muted">
                    Expected <code>{test.outcome.expected}</code>, received
                    <code>{test.outcome.received}</code>
                  </p>
                {/if}
              </li>
            {/each}
          </ul>
        </div>
      {/each}
    </div>
  </div>
</DocsDemo>
