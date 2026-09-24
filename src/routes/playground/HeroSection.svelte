<script lang="ts">
  import Button from '$lib/components/Button.svelte';
  import Card from '$lib/components/Card.svelte';
  import DemoSection from './DemoSection.svelte';
</script>

<DemoSection
  id="l-hero"
  title="Hero"
  classes={['layout-hero', 'layout-hero-split', 'layout-hero-center']}
>
  <Card>
    <div class="layout-hero layout-hero-split">
      <div class="layout-hero-content">
        <span class="card-eyebrow">Split</span>
        <h2 class="layout-hero-title">Ship the brand, not the rewrite.</h2>
        <p class="layout-hero-lead">Swap semantic tokens per project. Components never change.</p>
        <div class="layout-hero-actions">
          <Button variant="primary" size="lg">Get started</Button>
          <Button variant="ghost" size="lg">Read the docs</Button>
        </div>
      </div>
      <div class="layout-hero-media"></div>
    </div>
  </Card>
  <Card>
    <div class="layout-hero layout-hero-center">
      <div class="layout-hero-content">
        <span class="card-eyebrow">Centre</span>
        <h2 class="layout-hero-title">One column, centred.</h2>
        <p class="layout-hero-lead">The content and the actions centre themselves.</p>
        <div class="layout-hero-actions">
          <Button variant="primary">Start</Button>
          <Button>Later</Button>
        </div>
      </div>
    </div>
  </Card>
</DemoSection>
