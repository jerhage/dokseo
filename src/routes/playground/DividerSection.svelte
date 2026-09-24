<script lang="ts">
  import Card from '$lib/components/Card.svelte';
  import Divider from '$lib/components/Divider.svelte';
  import DemoSection from './DemoSection.svelte';
</script>

<DemoSection
  id="divider"
  title="Divider"
  classes={['divider', 'divider-labeled', 'divider-strong', 'divider-vertical']}
>
  <Card>
    <Divider />
    <Divider>or continue with</Divider>
    <Divider strong />
    <Divider strong>strong and labelled</Divider>
    <div class="row items-center gap-3">
      <span>Left</span>
      <Divider vertical />
      <span>Right</span>
    </div>
  </Card>
</DemoSection>
