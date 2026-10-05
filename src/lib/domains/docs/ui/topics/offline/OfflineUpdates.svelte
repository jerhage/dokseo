<script lang="ts">
  import { version } from '$app/environment';
  import Badge from '$lib/ui/components/Badge.svelte';
  import Diagram from '$lib/ui/components/Diagram.svelte';
  import Figure from '$lib/ui/components/Figure.svelte';
  import { APP_VERSION } from '$lib/shared/app-version';
  import {
    SHELL_RECHECK_MS,
    SHELL_UPDATE_ACTION,
    SHELL_UPDATE_TITLE,
  } from '$lib/shared/shell-updates';
  import DocsCode from '../../DocsCode.svelte';
  import DocsSection from '../../DocsSection.svelte';
  import { UPDATE_TIMELINE } from './offline-diagrams';
  import { APPLY_UPDATE, RECHECK, WATCH_UPDATES } from './offline-snippets';
  import { OFFLINE_SECTIONS, offlineHref } from './sections';
  import UpdateCheckDemo from './UpdateCheckDemo.svelte';
</script>

<DocsSection title={OFFLINE_SECTIONS.version}>
  <p>
    The shell cache name has to change whenever the files in it can change, and they change on every
    build: Vite gives each changed file a new hashed name. SvelteKit's <code>version</code> does
    exactly that. Unless the config sets <code>kit.version.name</code>, it is the time of the build,
    <code>Date.now()</code> as a string, and Dokseo leaves it unset. The value is written into
    <code>/service-worker.js</code> itself, so each build's worker differs from the last byte for byte,
    which is what makes the browser install it.
  </p>
  <p>
    The release version is a separate number. Dokseo's semver lives in <code>package.json</code>,
    and <code>vite.config.ts</code> defines it as <code>import.meta.env.APP_VERSION</code>. It
    changes only when a release is cut, while builds happen between releases and a release can be
    built again. Used as the cache name, it would let two different builds share one cache.
    Settings, App shows both:
  </p>
  <p class="row wrap items-center gap-2">
    This page: version <Badge>{APP_VERSION}</Badge> build <Badge>{version}</Badge>
  </p>
</DocsSection>

<DocsSection title={OFFLINE_SECTIONS.offer}>
  <p>
    <code>ShellUpdates</code>, in <code>src/lib/shared/shell-updates.ts</code>, is the page side.
    The root layout always creates one and provides it to the tree, and outside
    <code>dev</code> starts it watching:
  </p>
  <DocsCode label={WATCH_UPDATES.file} code={WATCH_UPDATES.code} />
  <p>
    <code>watch()</code> registers <code>/service-worker.js</code>. A worker already waiting at that
    moment is offered at once. After that, each <code>updatefound</code> event names an installing
    worker, and when its state reaches <code>installed</code> it is offered too. Both paths offer only
    when the page already has a controller: the very first install has nothing to replace.
  </p>
  <p>
    The offer is a toast, <q>{SHELL_UPDATE_TITLE}</q>, with a <q>{SHELL_UPDATE_ACTION}</q> button. A toast
    with an action stays until it is used or dismissed, and a second offer while it shows only moves its
    button to the newer worker. Nothing reloads by itself, so a reload never lands in the middle of reading:
    the reader picks the moment.
  </p>
  <DocsCode label={APPLY_UPDATE.label} code={APPLY_UPDATE.code} />
  <p>
    The listener goes on before the message is posted, and it fires once. The order matters because
    <code>controllerchange</code> fires in other cases too, such as the first worker claiming a page that
    had no controller. Reloading on it only after Reload was tapped keeps a first visit from reloading
    under the reader.
  </p>
  <Figure>
    <Diagram {...UPDATE_TIMELINE} />
    {#snippet caption()}
      From a deploy to the reload. Toast, Reload tapped and controllerchange happen in the page; the
      other steps after the deploy happen in the browser.
    {/snippet}
  </Figure>
  <p>
    The first version of this waited for the browser's own checks. In the installed app, the toast
    appeared only after the app was closed completely and opened again: the open app made no
    navigation request, so nothing checked. <code>recheck()</code> now runs whenever the page
    becomes visible again and every {SHELL_RECHECK_MS / 60000} minutes.
  </p>
  <DocsCode label={RECHECK.label} code={RECHECK.code} />
  <p>
    Offline, <code>update()</code> rejects with a <code>TypeError</code>, because the Service
    Workers specification's update algorithm rejects that way when the script cannot be fetched. The
    first version logged that as an unexpected failure, on every recheck, for a device that was only
    offline. <code>recheck()</code> now skips the request while <code>navigator.onLine</code> is
    false. <code>onLine</code> being true only means some network interface is up, not that the server
    is reachable, so a rejection that is a network failure is also dropped. Any other rejection is still
    logged.
  </p>
</DocsSection>

<DocsSection title={OFFLINE_SECTIONS.check}>
  <p>
    Settings, App also has a Check for updates button, for the moment someone knows a release is
    out. It calls <code>checkNow()</code>, which returns one <code>ManualUpdateCheck</code>, a union
    of eight named outcomes, and shows one toast for each. The outcome comes from pure functions:
    <code>shellCheckState</code> names the registration's state, <code>checkBeforeRequest</code>
    settles the outcomes that need no request (no registration, a worker already waiting, offline), and
    <code>checkAfterRequest</code>
    names the rest from how <code>update()</code> settled. The automatic rechecks stay silent; only the
    button reports.
  </p>
  <UpdateCheckDemo />
  <p>
    Each run creates a new <code>ShellUpdates</code> whose service worker container, registration
    and worker are stand-ins, so nothing touches the browser's real registration. The toasts and
    their text come from the real class. A unit test runs every outcome the same way and checks the
    table above against what the class shows, so the table cannot drift from the code. The
    <a href={offlineHref('readout')}>readout</a> above shows the real registration.
  </p>
</DocsSection>
