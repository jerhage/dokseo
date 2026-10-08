<script lang="ts">
  import Breadcrumb from '../components/Breadcrumb.svelte';
  import Card from '../components/Card.svelte';
  import Divider from '../components/Divider.svelte';
  import NavLink from '../components/NavLink.svelte';
  import Pagination from '../components/Pagination.svelte';
  import DemoSection from './DemoSection.svelte';

  const CRUMBS = [
    { label: 'Workspace', href: '#navigation' },
    { label: 'Projects', href: '#navigation' },
    { label: 'Northwind redesign' },
  ];

  let depth = $state(2);
  const FEED_CRUMBS = $derived(
    ['Feeds', 'Tech', 'Reviews']
      .slice(0, depth + 1)
      .map((label, index) =>
        index < depth ? { label, onselect: () => (depth = index) } : { label },
      ),
  );

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
    <Breadcrumb label="Feed path" items={FEED_CRUMBS} />
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
