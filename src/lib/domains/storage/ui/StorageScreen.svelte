<script lang="ts">
  import {
    allowanceNote,
    measuredFigure,
    originFigure,
    partFigure,
    persistenceNote,
    unnamedFigure,
    unnamedNote,
  } from './storage-view.svelte';
  import type { StorageSettingsView } from './storage-view.svelte';

  type Props = { readonly view: StorageSettingsView };

  let { view }: Props = $props();

  const account = $derived(view.account);
</script>

<header class="head">
  <h1 class="title">Storage</h1>
  <p class="lead">
    Everything this app keeps on this device, part by part. The parts are added up, then compared
    with the total the browser reports for this app, so that whatever the parts do not explain is
    named rather than hidden.
  </p>
</header>

{#if account === null}
  <p class="notice">{view.message ?? 'Reading what is stored…'}</p>
{:else}
  <section class="card">
    <table class="parts">
      <caption class="caption">Stored on this device</caption>
      <tbody>
        {#each account.parts as part (part.key)}
          <tr>
            <th scope="row">
              <span class="what">{part.label}</span>
              <span class="detail">{part.detail}</span>
            </th>
            <td class="figure" class:vague={part.bytes === null}>{partFigure(part)}</td>
          </tr>
        {/each}
        <tr class="sum">
          <th scope="row"><span class="what">Measured above</span></th>
          <td class="figure">{measuredFigure(account)}</td>
        </tr>
        {#if unnamedFigure(account) !== null}
          <tr>
            <th scope="row">
              <span class="what">Other browser storage</span>
              <span class="detail">{unnamedNote(account)}</span>
            </th>
            <td class="figure">{unnamedFigure(account)}</td>
          </tr>
        {/if}
        {#if originFigure(account) !== null}
          <tr class="sum total">
            <th scope="row"><span class="what">Counted by the browser for this app</span></th>
            <td class="figure">{originFigure(account)}</td>
          </tr>
        {/if}
      </tbody>
    </table>

    <div class="notes">
      {#if allowanceNote(account) !== null}
        <p class="footnote">{allowanceNote(account)}</p>
      {/if}
      <p class="footnote">{persistenceNote(account)}</p>
      <p class="footnote">
        Books are removed from your library. The model is removed on
        <a class="link" href="/settings">OCR engine</a>.
      </p>
    </div>
  </section>
{/if}

<style>
  .head {
    flex: none;
    padding: var(--s-5) var(--s-6) var(--s-4);
    border-bottom: 1px solid var(--c-border-1);
  }

  .title {
    margin: 0;
    color: var(--c-text-1);
    font-size: 20px;
    font-weight: 500;
    letter-spacing: -0.01em;
  }

  .lead {
    max-width: 620px;
    margin: var(--s-1) 0 0;
    color: var(--c-text-7);
    font-size: 12.5px;
    line-height: 1.5;
  }

  .notice {
    margin: var(--s-5) var(--s-6);
    color: var(--c-text-7);
    font-size: 12.5px;
  }

  .card {
    margin: var(--s-4) var(--s-6) var(--s-6);
    overflow: hidden;
    border: 1px solid var(--c-border-6);
    border-radius: var(--r-6);
    background: var(--c-surface-card-quiet);
  }

  .parts {
    width: 100%;
    border-collapse: collapse;
  }

  .caption {
    padding: var(--s-3) var(--s-4) var(--s-2);
    color: var(--c-text-10);
    font-family: var(--f-mono);
    font-size: 9.5px;
    letter-spacing: 0.1em;
    text-align: left;
    text-transform: uppercase;
  }

  th {
    padding: var(--s-2) var(--s-4);
    border-top: 1px solid var(--c-border-2);
    font-weight: 400;
    text-align: left;
  }

  .what {
    display: block;
    color: var(--c-text-2);
    font-size: 12.5px;
  }

  .detail {
    display: block;
    margin-top: 2px;
    color: var(--c-text-9);
    font-size: 10.5px;
  }

  .figure {
    padding: var(--s-2) var(--s-4);
    border-top: 1px solid var(--c-border-2);
    color: var(--c-text-2);
    font-family: var(--f-mono);
    font-size: 13px;
    text-align: right;
    white-space: nowrap;
  }

  .figure.vague {
    color: var(--c-text-9);
    font-size: 11px;
  }

  .sum .what,
  .sum .figure {
    color: var(--c-text-1);
  }

  .total .what,
  .total .figure {
    color: var(--c-accent);
  }

  .notes {
    display: flex;
    flex-direction: column;
    gap: var(--s-1);
    padding: var(--s-3) var(--s-4) var(--s-4);
    border-top: 1px solid var(--c-border-2);
  }

  .footnote {
    margin: 0;
    color: var(--c-text-9);
    font-size: 10.5px;
    line-height: 1.5;
  }

  .link {
    color: var(--c-accent);
  }
</style>
