<script lang="ts">
  import Card from '../components/Card.svelte';
  import Stat from '../components/Stat.svelte';
  import DemoSection from './DemoSection.svelte';
</script>

<DemoSection id="stat" title="Stat" classes={['stat', 'stat-sm']}>
  <div class="grid-2">
    <Card>
      <span class="eyebrow text-faint weight-semibold">Default</span>
      <Stat class="p-0" label="Active users" value="3,914" delta="+3.1%" trend="up" />
    </Card>
    <Card>
      <span class="eyebrow text-faint weight-semibold">
        size="sm" listed, in a dl the caller supplies
      </span>
      <dl class="grid-2-col gap-2">
        <Stat
          size="sm"
          listed
          class="surface-sunken bordered rounded-control"
          label="Download"
          value="about 120 MB"
        />
        <Stat
          size="sm"
          listed
          class="surface-sunken bordered rounded-control"
          label="On disk"
          value="about 140 MB"
          delta="after unpacking"
        />
      </dl>
    </Card>
  </div>
</DemoSection>
