<script module lang="ts">
  import AccordionItem from '../components/AccordionItem.svelte';
  import Button from '../components/Button.svelte';
  import Carousel from '../components/Carousel.svelte';
  import CodeBlock from '../components/CodeBlock.svelte';
  import Dock from '../components/Dock.svelte';
  import Dropdown from '../components/Dropdown.svelte';
  import DropdownItem from '../components/DropdownItem.svelte';
  import DropdownLabel from '../components/DropdownLabel.svelte';
  import DropdownSeparator from '../components/DropdownSeparator.svelte';
  import Dropzone from '../components/Dropzone.svelte';
  import MarqueeSelection from '../components/MarqueeSelection.svelte';
  import Modal from '../components/Modal.svelte';
  import Popover from '../components/Popover.svelte';
  import SearchField from '../components/SearchField.svelte';
  import TableOfContents from '../components/TableOfContents.svelte';
  import Tabs from '../components/Tabs.svelte';
  import Toast from '../components/Toast.svelte';
  import ToastRegion from '../components/ToastRegion.svelte';
  import WindowDropzone from '../components/WindowDropzone.svelte';
  import { ENTRIES, SLIDES, TABS, TABS_WITH_DISABLED } from './case-data';
  import type { RuleControls } from './rule-controls.svelte';

  export {
    accordionItemClosed,
    accordionItemOpen,
    carouselDefault,
    carouselDriven,
    codeBlockCopy,
    dockSheet,
    dockSide,
    dropdownDefault,
    dropzoneDefault,
    dropzoneTitled,
    marqueeSelectionIdle,
    modalDefault,
    modalFooter,
    popoverDefault,
    searchFieldClearableEmpty,
    searchFieldClearableFilled,
    tableOfContentsDefault,
    tabsDisabledTab,
    tabsUnderline,
    toastRegionBottom,
    toasts,
    windowDropzoneIdle,
  };
</script>

{#snippet accordionItemClosed(_controls: RuleControls)}
  <AccordionItem title="Details">Body</AccordionItem>
{/snippet}

{#snippet accordionItemOpen(_controls: RuleControls)}
  <AccordionItem title="Details" open>Body</AccordionItem>
{/snippet}

{#snippet carouselDefault(controls: RuleControls)}
  <Carousel slides={SLIDES} onsettled={controls.record('onsettled')}>
    {#snippet slide(item)}<p>{item.key}</p>{/snippet}
  </Carousel>
{/snippet}

{#snippet carouselDriven(controls: RuleControls)}
  <Carousel slides={SLIDES} driven onsettled={controls.record('onsettled')}>
    {#snippet slide(item)}<p>{item.key}</p>{/snippet}
  </Carousel>
{/snippet}

{#snippet codeBlockCopy(controls: RuleControls)}
  <CodeBlock code={'const a = 1;'} oncopy={controls.record('oncopy')} />
{/snippet}

{#snippet dockSide(controls: RuleControls)}
  <Dock
    placement="side"
    label="Notes"
    expandLabel="Show notes"
    collapseLabel="Hide notes"
    resizeLabel="Resize notes"
    ontoggle={controls.record('ontoggle')}><p>Panel</p></Dock
  >
{/snippet}

{#snippet dockSheet(controls: RuleControls)}
  <Dock
    placement="sheet"
    label="Notes"
    expandLabel="Show notes"
    collapseLabel="Hide notes"
    resizeLabel="Resize notes"
    ontoggle={controls.record('ontoggle')}><p>Panel</p></Dock
  >
{/snippet}

{#snippet dropdownDefault(_controls: RuleControls)}
  <Dropdown
    >{#snippet trigger()}Sort{/snippet}<DropdownLabel>Order</DropdownLabel><DropdownItem
      selected={true}>Newest</DropdownItem
    ><DropdownItem selected={false}>Oldest</DropdownItem><DropdownSeparator /><DropdownItem danger
      >Clear</DropdownItem
    ></Dropdown
  >
{/snippet}

{#snippet dropzoneDefault(controls: RuleControls)}
  <Dropzone onfiles={controls.record('onfiles')} />
{/snippet}

{#snippet dropzoneTitled(controls: RuleControls)}
  <Dropzone
    title="Drop a book"
    hint="EPUB or PDF, up to 50 MB"
    accept=".epub,.pdf"
    multiple
    onfiles={controls.record('onfiles')}
  />
{/snippet}

{#snippet marqueeSelectionIdle(controls: RuleControls)}
  <MarqueeSelection
    bind:this={controls.marquee}
    within={controls.surface}
    pointerTypes={['mouse', 'pen', 'touch']}
    slop={() => 4}
    minimum={8}
    onstart={controls.record('onstart')}
    ondraw={controls.record('ondraw')}
    onend={controls.record('onend')}
  />
{/snippet}

{#snippet modalDefault(controls: RuleControls)}
  <Modal
    title="Rename"
    bind:open={controls.open}
    wrapFocus={controls.wrapFocus}
    onclose={controls.record('onclose')}>Body</Modal
  >
{/snippet}

{#snippet modalFooter(controls: RuleControls)}
  <Modal
    title="Rename"
    bind:open={controls.open}
    wrapFocus={controls.wrapFocus}
    onclose={controls.record('onclose')}
    >Body{#snippet footer(close)}<Button onclick={close}>Cancel</Button>{/snippet}</Modal
  >
{/snippet}

{#snippet popoverDefault(_controls: RuleControls)}
  <Popover label="Filters"
    >{#snippet trigger(props)}<button {...props} class="btn">Filters</button>{/snippet}
    <p>Body</p></Popover
  >
{/snippet}

{#snippet searchFieldClearableEmpty(controls: RuleControls)}
  <SearchField label="Search" clearable onclear={controls.record('onclear')} />
{/snippet}

{#snippet searchFieldClearableFilled(controls: RuleControls)}
  <SearchField label="Search" clearable value="moby" onclear={controls.record('onclear')} />
{/snippet}

{#snippet tableOfContentsDefault(_controls: RuleControls)}
  <TableOfContents entries={ENTRIES} />
{/snippet}

{#snippet tabsUnderline(controls: RuleControls)}
  <Tabs label="Library" tabs={TABS} onselectedchange={controls.record('onselectedchange')}
    >{#snippet panel(tab)}<p>{tab.label} panel</p>{/snippet}</Tabs
  >
{/snippet}

{#snippet tabsDisabledTab(controls: RuleControls)}
  <Tabs
    label="Library"
    tabs={TABS_WITH_DISABLED}
    onselectedchange={controls.record('onselectedchange')}
    >{#snippet panel(tab)}<p>{tab.label} panel</p>{/snippet}</Tabs
  >
{/snippet}

{#snippet toastRegionBottom(controls: RuleControls)}
  <ToastRegion toaster={controls.toaster} />
{/snippet}

{#snippet toasts(controls: RuleControls)}
  {#each controls.toaster.toasts as toast (toast.id)}
    <Toast {toast} toaster={controls.toaster} dismissLabel="Dismiss" />
  {/each}
{/snippet}

{#snippet windowDropzoneIdle(controls: RuleControls)}
  <WindowDropzone onfiles={controls.record('onfiles')}>Drop to add</WindowDropzone>
{/snippet}
