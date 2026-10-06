<script lang="ts">
  import AppearanceSwitcher from '../components/AppearanceSwitcher.svelte';
  import { SCHEME_LABELS, THEME_LABELS } from '../components/appearance-labels';
  import Card from '../components/Card.svelte';
  import type { Appearance } from '../core/appearance.js';
  import DemoSection from './DemoSection.svelte';

  let appearance: Appearance = $state({ theme: 'base', colorScheme: 'automatic' });
  let chosen = $state('nothing yet');
</script>

<DemoSection
  id="appearance-switcher"
  title="Appearance switcher"
  classes={['dropdown', 'dropdown-item', 'is-active', 'visually-hidden']}
>
  <Card>
    <p class="text-sm text-muted">
      Shows the appearance it is given and reports a choice through onchoose; the page saves and
      applies it. This one only reports, so the page keeps its own theme.
    </p>
    <div class="row wrap items-center gap-3">
      <AppearanceSwitcher
        bind:appearance
        onchoose={(next) =>
          (chosen = `${THEME_LABELS[next.theme]}, ${SCHEME_LABELS[next.colorScheme]}`)}
      />
      <AppearanceSwitcher bind:appearance variant="outline" size="md" align="start" />
    </div>
    <p class="text-sm text-muted">Last chosen: {chosen}</p>
  </Card>
</DemoSection>
