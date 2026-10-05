<script lang="ts">
  import { tick } from 'svelte';
  import type { Attachment } from 'svelte/attachments';
  import Badge from '$lib/ui/components/Badge.svelte';
  import Button from '$lib/ui/components/Button.svelte';
  import Field from '$lib/ui/components/Field.svelte';
  import IconButton from '$lib/ui/components/IconButton.svelte';
  import X from '$lib/ui/components/icons/X.svelte';
  import Input from '$lib/ui/components/Input.svelte';
  import Modal from '$lib/ui/components/Modal.svelte';
  import Toggle from '$lib/ui/components/Toggle.svelte';
  import type { AccessReading } from '../../../domain/accessible-name';
  import DocsDemo from '../../DocsDemo.svelte';
  import { browserExposesReadings, browserReading, readElement } from './access-tree';
  import type { BrowserReading } from './access-tree';

  type Sample = {
    readonly key: string;
    readonly title: string;
    readonly code: string;
    readonly markup?: string;
  };

  type Inspected = {
    readonly reading: AccessReading;
    readonly browser: BrowserReading;
  };

  const ICON_PATHS = '<path d="M18 6 6 18"></path><path d="m6 6 12 12"></path>';

  const SAMPLES: readonly Sample[] = [
    { key: 'button', title: 'Button', code: '<Button>Save</Button>' },
    { key: 'icon', title: 'IconButton', code: '<IconButton icon={X} label="Close" />' },
    {
      key: 'field',
      title: 'Field with an Input',
      code: '<Field label="Title" hint="As it appears on the shelf." {error}>',
    },
    { key: 'dialog', title: 'Modal', code: '<Modal title="Reading settings">' },
    {
      key: 'bare-icon',
      title: 'An icon in a plain button',
      code: '<button class="btn btn-square"><svg aria-hidden="true">…</svg></button>',
      markup: `<button type="button" class="btn btn-square"><svg class="btn-icon" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">${ICON_PATHS}</svg></button>`,
    },
    {
      key: 'placeholder',
      title: 'A placeholder and no label',
      code: '<input class="input" placeholder="Search">',
      markup: '<input class="input" placeholder="Search">',
    },
    {
      key: 'div',
      title: 'A div that looks like a button',
      code: '<div class="btn">Next page</div>',
      markup: '<div class="btn">Next page</div>',
    },
    {
      key: 'role',
      title: 'A div with a button role',
      code: '<div class="btn" role="button" tabindex="0">Next page</div>',
      markup: '<div class="btn" role="button" tabindex="0">Next page</div>',
    },
  ];

  const exposes = browserExposesReadings();

  let hosts = $state<Record<string, HTMLElement>>({});
  let inspected = $state<Record<string, Inspected>>({});
  let showError = $state(false);
  let dialogOpen = $state(false);
  let openReading = $state<AccessReading | null>(null);

  const hosted =
    (key: string): Attachment<HTMLElement> =>
    (node) => {
      hosts[key] = node;
    };

  const withMarkup =
    (markup: string): Attachment<HTMLElement> =>
    (node) => {
      node.innerHTML = markup;
    };

  function target(key: string): Element | null {
    const host = hosts[key];
    if (host === undefined) return null;
    if (key === 'dialog') return host.querySelector('dialog');
    if (key === 'field') return host.querySelector('input');
    return host.firstElementChild;
  }

  function inspect(): void {
    const next: Record<string, Inspected> = {};
    for (const sample of SAMPLES) {
      const element = target(sample.key);
      if (element === null) continue;
      next[sample.key] = { reading: readElement(element), browser: browserReading(element) };
    }
    inspected = next;
  }

  async function inspectSoon(): Promise<void> {
    await tick();
    inspect();
  }

  async function readOpenDialog(): Promise<void> {
    await tick();
    const dialog = target('dialog');
    if (dialog !== null) openReading = readElement(dialog);
    inspect();
  }

  const inspectOnMount: Attachment<HTMLElement> = () => {
    void inspectSoon();
  };

  function toggleError(): void {
    showError = !showError;
    void inspectSoon();
  }

  function openDialog(): void {
    dialogOpen = true;
    void readOpenDialog();
  }

  function sourceText(reading: AccessReading): string {
    return reading.source === 'none' ? 'no name' : `from ${reading.source}`;
  }
</script>

<DocsDemo label="Accessible name inspector">
  {#snippet controls()}
    <Button size="sm" variant="ghost" onclick={inspect}>Read again</Button>
  {/snippet}
  {#snippet caption()}
    The top four are Dokseo's real base components; the bottom four are plain markup with a common
    mistake. {#if exposes}
      This browser exposes <code>computedRole</code> and <code>computedName</code>, so the browser's
      own result is shown under each reading.
    {:else}
      This browser does not expose <code>computedRole</code> and <code>computedName</code>, so each
      reading comes from the page's own simplified name computation, which follows the order in the
      Accessible Name specification. DevTools' Accessibility pane shows the browser's own result.
    {/if}
  {/snippet}
  <div class="stack-md" {@attach inspectOnMount}>
    {#each SAMPLES as sample (sample.key)}
      {@const shown = inspected[sample.key]}
      <div class="stack-sm bordered rounded-container p-3">
        <div class="row wrap items-center gap-3">
          <span class="text-sm weight-medium">{sample.title}</span>
          <code class="text-xs">{sample.code}</code>
        </div>
        <div class="row wrap items-center gap-3">
          {#if sample.markup !== undefined}
            <div {@attach hosted(sample.key)} {@attach withMarkup(sample.markup)}></div>
          {:else if sample.key === 'button'}
            <div {@attach hosted(sample.key)}><Button>Save</Button></div>
          {:else if sample.key === 'icon'}
            <div {@attach hosted(sample.key)}><IconButton icon={X} label="Close" /></div>
          {:else if sample.key === 'field'}
            <div class="stack-sm" {@attach hosted(sample.key)}>
              <Field
                label="Title"
                hint="As it appears on the shelf."
                error={showError ? 'A title cannot be empty.' : undefined}
              >
                {#snippet children(control)}
                  <Input {...control} value="Yotsuba&!" />
                {/snippet}
              </Field>
              <Toggle checked={showError} onchange={toggleError}>Show an error</Toggle>
            </div>
          {:else if sample.key === 'dialog'}
            <div {@attach hosted(sample.key)}>
              <Button variant="outline" size="sm" onclick={openDialog}>Open the dialog</Button>
              <Modal
                title="Reading settings"
                bind:open={dialogOpen}
                size="sm"
                onclose={() => void inspectSoon()}
              >
                <p class="m-0">
                  While this dialog is open, the page behind it is inert. Close it to see its
                  reading in the inspector.
                </p>
              </Modal>
            </div>
          {/if}
        </div>
        {#if shown !== undefined && shown.reading.hidden}
          <p class="m-0 text-sm">
            <Badge>hidden</Badge> Not rendered, so not in the accessibility tree.
          </p>
          {#if sample.key === 'dialog' && openReading !== null}
            <div class="row wrap items-center gap-2 text-sm">
              <span class="text-muted">While it was open:</span>
              <Badge variant="primary">{openReading.role}</Badge>
              <span>“{openReading.name}”</span>
              <span class="text-muted">{sourceText(openReading)}</span>
            </div>
          {/if}
        {:else if shown !== undefined}
          <div class="row wrap items-center gap-2 text-sm">
            <Badge variant="primary">{shown.reading.role}</Badge>
            {#if shown.reading.name === ''}
              <Badge variant="danger">no name</Badge>
            {:else}
              <span>“{shown.reading.name}”</span>
              <span class="text-muted">{sourceText(shown.reading)}</span>
            {/if}
            {#each shown.reading.states as state (state)}
              <Badge>{state}</Badge>
            {/each}
          </div>
          {#if shown.reading.description !== ''}
            <p class="m-0 text-sm text-muted">Description: “{shown.reading.description}”</p>
          {/if}
          {#if shown.browser.kind === 'exposed'}
            <p class="m-0 text-xs mono text-muted">
              Browser: role {shown.browser.role}, name “{shown.browser.name}”
            </p>
          {/if}
        {/if}
      </div>
    {/each}
  </div>
</DocsDemo>
