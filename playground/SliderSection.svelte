<script lang="ts">
  import Card from '../components/Card.svelte';
  import Slider from '../components/Slider.svelte';
  import DemoSection from './DemoSection.svelte';

  const PAGES = 40;
  const CHAPTERS: readonly number[] = [12.5, 30, 55, 80];

  let page = $state(11);
  let committed = $state(11);
  let mirrored = $state(4);
  let progress = $state(250);
</script>

<DemoSection id="slider" title="Slider" classes={['slider', 'slider-wrapper', 'slider-tick']}>
  <div class="grid-2">
    <Card>
      <div class="col gap-2">
        <p class="text-sm text-muted">oninput previews, onchange commits</p>
        <Slider
          label="Go to page"
          value={page}
          max={PAGES - 1}
          valuetext="Page {page + 1} of {PAGES}"
          oninput={(event) => (page = Number(event.currentTarget.value))}
          onchange={(event) => (committed = Number(event.currentTarget.value))}
        />
        <span class="text-xs text-faint">showing {page + 1}, committed {committed + 1}</span>
      </div>
    </Card>
    <Card>
      <div class="col gap-2">
        <p class="text-sm text-muted">dir="rtl": the track fills from the right</p>
        <Slider
          label="Go to page, right to left"
          value={mirrored}
          max={9}
          dir="rtl"
          valuetext="Page {mirrored + 1} of 10"
          oninput={(event) => (mirrored = Number(event.currentTarget.value))}
        />
      </div>
    </Card>
    <Card>
      <div class="col gap-2">
        <p class="text-sm text-muted">ticks, as percent from the left edge</p>
        <Slider
          label="Reading progress"
          value={progress}
          max={1000}
          ticks={CHAPTERS}
          valuetext="{Math.round(progress / 10)}%"
          oninput={(event) => (progress = Number(event.currentTarget.value))}
        />
      </div>
    </Card>
    <Card>
      <div class="col gap-2">
        <p class="text-sm text-muted">disabled</p>
        <Slider label="Go to page, not ready" value={0} max={9} disabled />
      </div>
    </Card>
  </div>
</DemoSection>
