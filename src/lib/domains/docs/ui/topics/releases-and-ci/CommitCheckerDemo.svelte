<script lang="ts">
  import Badge from '$lib/components/Badge.svelte';
  import Button from '$lib/components/Button.svelte';
  import Field from '$lib/components/Field.svelte';
  import Textarea from '$lib/components/Textarea.svelte';
  import { checkCommit, commitEffect, problemText } from '../../../domain/commit-check';
  import { DOKSEO_BUMP_OPTIONS, DOKSEO_CHANGELOG_SECTIONS } from '../../../domain/dokseo-release';
  import { formatVersion, parseVersion } from '../../../domain/release-bump';
  import type { Version } from '../../../domain/release-bump';
  import DocsDemo from '../../DocsDemo.svelte';
  import { releaseHeadline } from './release-text';

  const EXAMPLES = [
    { label: 'A fix', message: 'fix(reader): a tap on the last page turns once' },
    {
      label: 'A breaking footer',
      message:
        'feat(storage): keep captures in a new record format\n\nBREAKING CHANGE: export captures before updating, then import them',
    },
    { label: 'Release-As', message: 'chore: release 1.0.0\n\nRelease-As: 1.0.0' },
    { label: 'No type', message: 'Fix the tap on the last page' },
    { label: 'Wrong type', message: 'feature: tags' },
    {
      label: 'Lower-case footer',
      message: 'feat!: a new file format\n\nbreaking change: export again',
    },
  ] as const;

  function version(text: string): Version {
    const parsed = parseVersion(text);
    if (parsed === null) throw new Error(`Not a version: ${text}`);
    return parsed;
  }

  const FROM = [version('0.9.4'), version('1.2.0')] as const;

  let message = $state<string>(EXAMPLES[0].message);

  const check = $derived(checkCommit(message));
  const effects = $derived(
    FROM.map((from) => commitEffect(message, from, DOKSEO_BUMP_OPTIONS, DOKSEO_CHANGELOG_SECTIONS)),
  );
</script>

<DocsDemo label="Commit message checker">
  {#snippet caption()}
    The checks are the Conventional Commits rules that matter here, plus Dokseo's list of types. The
    effect comes from the same release-please port as the calculator, with this one commit as
    everything since the last release.
  {/snippet}
  <div class="stack-md">
    <div class="row wrap gap-2">
      {#each EXAMPLES as example (example.label)}
        <Button size="sm" variant="outline" onclick={() => (message = example.message)}>
          {example.label}
        </Button>
      {/each}
    </div>
    <Field label="Commit message">
      {#snippet children(control)}
        <Textarea {...control} rows={4} class="mono" bind:value={message} />
      {/snippet}
    </Field>
    <div class="stack-sm" aria-live="polite">
      {#if check.kind === 'accepted'}
        <p class="row wrap items-center gap-2 m-0">
          <Badge variant="success">Accepted</Badge>
          <span>type <code>{check.header.type}</code></span>
          {#if check.header.scope !== null}
            <span>scope <code>{check.header.scope}</code></span>
          {/if}
          {#if check.breaking}
            <Badge variant="warning">Breaking</Badge>
          {/if}
        </p>
        <ul class="m-0 text-sm">
          {#each effects as effect (effect.from.major)}
            <li>
              From {formatVersion(effect.from)}: {releaseHeadline(effect.release)}
            </li>
          {/each}
        </ul>
      {:else}
        <p class="m-0"><Badge variant="danger">Rejected</Badge></p>
        <ul class="m-0 text-sm">
          {#each check.problems as problem, index (index)}
            <li>{problemText(problem)}</li>
          {/each}
        </ul>
      {/if}
    </div>
  </div>
</DocsDemo>
