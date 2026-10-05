<script lang="ts">
  import Button from '$lib/ui/components/Button.svelte';
  import Field from '$lib/ui/components/Field.svelte';
  import Input from '$lib/ui/components/Input.svelte';
  import SegmentedControl from '$lib/ui/components/SegmentedControl.svelte';
  import Textarea from '$lib/ui/components/Textarea.svelte';
  import { changelogMarkdown } from '../../../domain/release-bump';
  import DocsCode from '../../DocsCode.svelte';
  import DocsDemo from '../../DocsDemo.svelte';
  import { BumpCalculator, COMMIT_PRESETS } from './bump-calculator.svelte';
  import type { CalculatorResult } from './bump-calculator.svelte';
  import { releaseHeadline } from './release-text';

  const SETTINGS = [
    { value: 'dokseo', label: "Dokseo's settings" },
    { value: 'defaults', label: 'release-please defaults' },
  ] as const;

  const calculator = new BumpCalculator();

  function headline(result: CalculatorResult): string {
    return result.kind === 'bad-version'
      ? `"${result.text}" is not a version such as 0.9.4.`
      : releaseHeadline(result.release);
  }

  const changelog = $derived.by(() => {
    const result = calculator.before;
    if (result.kind !== 'computed' || result.release.kind !== 'release') return null;

    return changelogMarkdown(result.release.version, result.release.changelog);
  });
</script>

<DocsDemo label="Version bump calculator">
  {#snippet caption()}
    The rules are a port of release-please's <code>DefaultVersioningStrategy</code> and the parts of
    <code>BaseStrategy</code>
    that pick the version and skip an empty release, with the changelog sections from Dokseo's
    <code>release-please-config.json</code>. The real changelog also links each entry to its commit
    and sorts a section by scope and subject; this one keeps the order above.
  {/snippet}
  <div class="stack-md">
    <div class="row wrap gap-2">
      {#each COMMIT_PRESETS as preset (preset.key)}
        <Button size="sm" variant="outline" onclick={() => calculator.load(preset.key)}>
          {preset.label}
        </Button>
      {/each}
      <Button size="sm" variant="ghost" onclick={() => calculator.clear()}>Clear</Button>
    </div>
    <Field label="A commit message" hint="Add puts it at the top, as the newest commit.">
      {#snippet children(control)}
        <Textarea
          {...control}
          rows={3}
          class="mono"
          placeholder={'fix(reader): a tap on the last page turns once'}
          bind:value={calculator.draft}
        />
      {/snippet}
    </Field>
    <div class="row wrap gap-2">
      <Button size="sm" onclick={() => calculator.add()} disabled={calculator.draft.trim() === ''}>
        Add commit
      </Button>
    </div>
    <ol class="stack-sm m-0" aria-label="Commits since the last release, newest first">
      {#each calculator.commits as commit (commit.id)}
        {@const [summary, ...rest] = commit.message.split('\n')}
        <li class="row items-start justify-between gap-2">
          <span class="col gap-1">
            <code>{summary}</code>
            {#each rest.filter((line) => line.trim() !== '') as line, index (index)}
              <code class="text-xs text-muted">{line}</code>
            {/each}
          </span>
          <Button size="sm" variant="ghost" onclick={() => calculator.remove(commit.id)}>
            Remove
          </Button>
        </li>
      {:else}
        <li class="list-reset text-muted">No commits since the last release.</li>
      {/each}
    </ol>
    <SegmentedControl label="Bump settings" options={SETTINGS} bind:value={calculator.settings} />
    <div class="grid-2 gap-4">
      <div class="stack-sm">
        <Field label="Current version before 1.0">
          {#snippet children(control)}
            <Input {...control} class="mono" bind:value={calculator.beforeOne} />
          {/snippet}
        </Field>
        <p class="m-0 text-sm" aria-live="polite">{headline(calculator.before)}</p>
      </div>
      <div class="stack-sm">
        <Field label="Current version from 1.0 on">
          {#snippet children(control)}
            <Input {...control} class="mono" bind:value={calculator.afterOne} />
          {/snippet}
        </Field>
        <p class="m-0 text-sm" aria-live="polite">{headline(calculator.after)}</p>
      </div>
    </div>
    {#if changelog !== null}
      <DocsCode label="CHANGELOG.md entry, from the first version" code={changelog} />
    {/if}
  </div>
</DocsDemo>
