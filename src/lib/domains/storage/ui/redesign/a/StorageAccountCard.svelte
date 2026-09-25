<script lang="ts">
  import type { StorageAccount } from '../../../domain/storage-parts';
  import {
    allowanceNote,
    measuredFigure,
    originFigure,
    partFigure,
    persistenceNote,
    unnamedFigure,
    unnamedNote,
  } from '../../storage-view.svelte';
  import './storage-account.css';

  type Props = { readonly account: StorageAccount; readonly engineHref: string };

  let { account, engineHref }: Props = $props();
</script>

<section class="storage-account surface bordered rounded-container overflow-hidden">
  <table class="w-full">
    <caption class="px-4 pt-3 pb-2 mono text-xs uppercase tracking-wide text-faint">
      Stored on this device
    </caption>
    <tbody>
      {#each account.parts as part (part.key)}
        <tr>
          <th scope="row" class="px-4 py-2 border-t weight-normal">
            <span class="col gap-1">
              <span class="text-sm">{part.label}</span>
              <span class="text-xs text-muted">{part.detail}</span>
            </span>
          </th>
          <td
            class={[
              'figure px-4 py-2 border-t mono',
              part.bytes === null ? 'text-xs text-faint' : 'text-sm',
            ]}
          >
            {partFigure(part)}
          </td>
        </tr>
      {/each}
      <tr>
        <th scope="row" class="px-4 py-2 border-t text-sm weight-semibold">Measured above</th>
        <td class="figure px-4 py-2 border-t mono text-sm weight-semibold"
          >{measuredFigure(account)}</td
        >
      </tr>
      {#if unnamedFigure(account) !== null}
        <tr>
          <th scope="row" class="px-4 py-2 border-t weight-normal">
            <span class="col gap-1">
              <span class="text-sm">Other browser storage</span>
              <span class="text-xs text-muted">{unnamedNote(account)}</span>
            </span>
          </th>
          <td class="figure px-4 py-2 border-t mono text-sm">{unnamedFigure(account)}</td>
        </tr>
      {/if}
      {#if originFigure(account) !== null}
        <tr class="total">
          <th scope="row" class="px-4 py-2 border-t text-sm weight-semibold">
            Counted by the browser for this app
          </th>
          <td class="figure px-4 py-2 border-t mono text-sm weight-semibold"
            >{originFigure(account)}</td
          >
        </tr>
      {/if}
    </tbody>
  </table>

  <div class="col gap-1 px-4 pt-3 pb-4 border-t">
    {#if allowanceNote(account) !== null}
      <p class="text-xs text-muted">{allowanceNote(account)}</p>
    {/if}
    <p class="text-xs text-muted">{persistenceNote(account)}</p>
    <p class="text-xs text-muted">
      Books are removed from your library. The model is removed on
      <a href={engineHref}>OCR engine</a>.
    </p>
  </div>
</section>
