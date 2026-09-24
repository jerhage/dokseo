<script lang="ts">
  const LAYOUTS = [
    { id: 'l-page', label: 'Page wrap' },
    { id: 'l-shell', label: 'App shell' },
    { id: 'l-sidebar', label: 'Sidebar' },
    { id: 'l-hero', label: 'Hero' },
    { id: 'l-split', label: 'Split' },
    { id: 'l-z', label: 'Z-pattern' },
    { id: 'l-overlay', label: 'Overlay' },
    { id: 'l-bento', label: 'Bento' },
    { id: 'l-mosaic', label: 'Mosaic' },
    { id: 'l-grid', label: 'Grid, span and stack' },
  ];
</script>

<div id="layout" class="stack-sm">
  <span class="card-eyebrow">Layout</span>
  <h2>Layouts and grids</h2>
  <p class="text-muted prose">
    Layout patterns are query containers: their children re-place themselves as the container
    narrows. Resize the window to see each collapse.
  </p>
  <nav class="row wrap gap-2" aria-label="Layouts">
    {#each LAYOUTS as layout (layout.id)}
      <a class="tag" href="#{layout.id}">{layout.label}</a>
    {/each}
  </nav>
</div>
