<script lang="ts">
  import CodeBlock from '$lib/components/CodeBlock.svelte';

  const SECTIONS = [
    { id: 'tokens', label: 'Tokens' },
    { id: 'button', label: 'Button' },
    { id: 'badge', label: 'Badge and tag' },
    { id: 'form', label: 'Form field' },
    { id: 'upload', label: 'File upload' },
    { id: 'choice', label: 'Choices' },
    { id: 'card', label: 'Card' },
    { id: 'alert', label: 'Alert' },
    { id: 'tabs', label: 'Tabs' },
    { id: 'accordion', label: 'Accordion' },
    { id: 'table', label: 'Table' },
    { id: 'modal', label: 'Modal and toast' },
    { id: 'dropdown', label: 'Dropdown' },
    { id: 'navigation', label: 'Breadcrumb and pagination' },
    { id: 'avatar', label: 'Avatar' },
    { id: 'progress', label: 'Progress and skeleton' },
    { id: 'divider', label: 'Divider' },
    { id: 'layout', label: 'Layouts' },
  ];
</script>

<div class="layout-hero">
  <div class="layout-hero-content">
    <span class="card-eyebrow">Development only</span>
    <h1 class="layout-hero-title">One component set. Any theme.</h1>
    <p class="layout-hero-lead">
      Every base component and utility, in each variant, size and state. Switch the theme and the
      scheme above; no component changes.
    </p>
    <CodeBlock
      label="Layer order"
      code="@layer open-props, reset, base, tokens, components, features, utilities, overrides;"
    />
    <nav class="row wrap gap-2" aria-label="Sections">
      {#each SECTIONS as section (section.id)}
        <a class="tag" href="#{section.id}">{section.label}</a>
      {/each}
    </nav>
  </div>
</div>
