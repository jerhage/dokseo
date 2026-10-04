<script lang="ts">
  import StepItem from '$lib/components/StepItem.svelte';
  import StepList from '$lib/components/StepList.svelte';
  import DocsCode from '../../DocsCode.svelte';
  import DocsSection from '../../DocsSection.svelte';
  import { EXPORT_IMPORT_SECTIONS } from './export-import-sections';
  import {
    BROWSER_DOWNLOAD,
    PREPARED_ON_TICK,
    RAW_STATE,
    SAVE_FILE,
  } from './export-import-snippets';
  import SaveFileDemo from './SaveFileDemo.svelte';
</script>

<DocsSection title={EXPORT_IMPORT_SECTIONS.saveFile}>
  <p>
    Both exports save through one function, <code>saveFile</code> in
    <code>platform/files/save-file.ts</code>. It opens the share sheet only when the device has a
    touch screen, which it checks with the media query <code>(any-pointer: coarse)</code>, and
    <code>canShare({'{'} files {'}'})</code> returns <code>true</code>. Everywhere else it
    downloads. So a desktop always downloads, even Safari on a Mac, whose <code>canShare</code> accepts
    the file.
  </p>
  <DocsCode label={SAVE_FILE.label} code={SAVE_FILE.code} />
  <p>
    The <code>File</code> is built, <code>canShare</code> is asked and <code>share()</code> is
    called before the first <code>await</code>, so all three run inside the click that called
    <code>saveFile</code>. The two expected rejections become named outcomes:
    <code>AbortError</code> is <code>cancelled</code>, and the screen goes back to how it was
    without a message; <code>NotAllowedError</code> is <code>needs-another-tap</code>. Any other
    error is thrown.
  </p>
  <p>
    On <code>needs-another-tap</code>, the view model keeps the file it built and shows "The file is
    ready. Tap Save file to choose where it goes." with a Save file button. That button's click
    calls
    <code>saveFile</code> with the kept file, so <code>share()</code> runs with the new tap's activation.
    Gathering the captures again on that second tap would await the database again and lose the second
    activation the same way.
  </p>
  <DocsCode label={BROWSER_DOWNLOAD.label} code={BROWSER_DOWNLOAD.code} />
  <p>
    The download revokes its object URL 40 seconds later, not right after <code>click()</code>: I
    learned that revoking it in the same tick can cancel the download.
  </p>
  <SaveFileDemo />
</DocsSection>

<DocsSection title={EXPORT_IMPORT_SECTIONS.exportFirst}>
  <p>
    Three dialogs delete captures for good: Remove this upload with "Also delete its captures"
    ticked, Delete captures for a book in Removed books, and Delete every capture in the capture
    panel. Each one offers "Export these captures" first, which saves that book's captures, with
    only the tags they have, in the same version 1 format. The file is named after the shown title,
    for example
    <code>dokseo-captures-harbor-lights-volume-1-2026-10-03.json</code>.
  </p>
  <p>
    A dialog is the second way out of the activation problem. The file is built when the dialog
    opens, or on the first tick of "Also delete its captures", before anyone taps the button. So the
    button appears only when the book has captures, and its click calls <code>share()</code> with nothing
    awaited before it. After a save the dialog says so, for example "Saved 3 captures." The button deletes
    nothing; the delete keeps its own confirm. The capture panel exports the captures that are stored,
    so a card that has not been saved yet is not in the file.
  </p>
  <DocsCode label={PREPARED_ON_TICK.label} code={PREPARED_ON_TICK.code} />
</DocsSection>

<DocsSection title={EXPORT_IMPORT_SECTIONS.proxy}>
  <p>One bug in the import came from Svelte, not from the format. It went like this:</p>
  <StepList>
    <StepItem title="The view model kept its state in a deep $state">
      <p>
        Svelte wraps a plain object or array in a deep <code>$state</code> in a proxy, and does the same
        for every plain object and array inside it, so it can track reads and writes. The plan sat inside
        the state, so the plan and every capture in it became proxies too.
      </p>
    </StepItem>
    <StepItem title="Import handed a capture from the plan to IndexedDB">
      <p>
        <code>put()</code> copies its value with the structured clone algorithm, the same one
        <code>postMessage</code> and <code>structuredClone</code> use.
      </p>
    </StepItem>
    <StepItem title="The copy failed">
      <p>
        The HTML standard's serialization throws a <code>DataCloneError</code> for an exotic object, and
        a proxy is one. The write failed with "could not be cloned".
      </p>
    </StepItem>
  </StepList>
  <p>
    The unit tests ran in Node and passed; only a browser showed the error. The fix is
    <code>$state.raw</code>, which stores the value as it is, with no proxy. A raw value cannot be
    changed in place, only replaced, and the view model already replaced its state whole on every
    change. The other fix is <code>$state.snapshot</code>, which copies a proxied value into plain
    data just before it leaves for an API such as <code>structuredClone</code>.
  </p>
  <DocsCode label={RAW_STATE.label} code={RAW_STATE.code} />
</DocsSection>

<DocsSection title={EXPORT_IMPORT_SECTIONS.rule}>
  <p>
    A record that leaves the device goes with its global id, or with a description of itself that
    another device can match, never with a local key. The file says which format and version it is,
    and a reader rejects a version it was not written for. Each entry is read on its own and
    strictly, so one bad entry costs one entry. An import adds and updates and never deletes, so the
    same file twice changes nothing, and it writes only after the person has seen what it will do.
  </p>
</DocsSection>
