<script lang="ts">
  import Button from '$lib/components/Button.svelte';
  import Card from '$lib/components/Card.svelte';
  import Progress from '$lib/components/Progress.svelte';
  import Skeleton from '$lib/components/Skeleton.svelte';
  import type { ControlSize, ProgressVariant } from '$lib/components/classes';
  import DemoSection from './DemoSection.svelte';

  const VARIANTS: readonly ProgressVariant[] = [
    'primary',
    'success',
    'warning',
    'danger',
    'accent',
  ];

  const SIZES: readonly ControlSize[] = ['sm', 'md', 'lg'];

  let value = $state(64);
</script>

<DemoSection
  id="progress"
  title="Progress and skeleton"
  classes={['progress-track', 'progress-fill', 'progress-indeterminate', 'skeleton']}
>
  <div class="grid-2 gap-5">
    <Card>
      {#each VARIANTS as variant (variant)}
        <Progress label="{variant} progress" {variant} {value} />
      {/each}
      {#each SIZES as size (size)}
        <Progress label="{size} progress" {size} value={38} />
      {/each}
      <Progress label="Loading" />
      <div class="row items-center gap-2">
        <Button size="sm" onclick={() => (value = Math.max(0, value - 10))}>−10</Button>
        <Button size="sm" onclick={() => (value = Math.min(100, value + 10))}>+10</Button>
        <span class="text-sm text-muted">{value}%</span>
      </div>
    </Card>
    <Card aria-busy="true">
      <div class="row items-center gap-3">
        <Skeleton shape="circle" />
        <div class="stack-sm flex-1">
          <Skeleton shape="text" width="45%" />
          <Skeleton shape="text" width="30%" />
        </div>
      </div>
      <Skeleton shape="title" />
      <Skeleton shape="text" />
      <Skeleton shape="text" width="85%" />
      <Skeleton />
      <Skeleton shape="block" />
    </Card>
  </div>
</DemoSection>
