<script lang="ts">
  import Breadcrumb from '$lib/components/Breadcrumb.svelte';
  import Card from '$lib/components/Card.svelte';
  import Divider from '$lib/components/Divider.svelte';
  import NavLink from '$lib/components/NavLink.svelte';
  import Pagination from '$lib/components/Pagination.svelte';
  import DemoSection from './DemoSection.svelte';

  const CRUMBS = [
    { label: 'Workspace', href: '#navigation' },
    { label: 'Projects', href: '#navigation' },
    { label: 'Northwind redesign' },
  ];

  let page = $state(1);
  let short = $state(2);
</script>

<DemoSection
  id="navigation"
  title="Breadcrumb and pagination"
  classes={['breadcrumb', 'pagination', 'pagination-item', 'nav-link']}
>
  <Card>
    <Breadcrumb items={CRUMBS} />
    <Divider />
    <Pagination total={12} bind:page />
    <p class="text-sm text-muted">Page {page} of 12</p>
    <Divider />
    <Pagination
      total={20}
      page={10}
      siblings={2}
      href={(target) => `#page-${target}`}
      label="Linked pages"
    />
    <Divider />
    <Pagination total={3} bind:page={short} label="Three pages" />
    <Divider />
    <nav class="row wrap gap-1" aria-label="Nav links">
      <NavLink href="#navigation" current>Overview</NavLink>
      <NavLink href="#navigation">Projects</NavLink>
      <NavLink href="#navigation">Reports</NavLink>
    </nav>
  </Card>
</DemoSection>
