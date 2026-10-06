<script lang="ts">
  import type { HTMLAttributes } from 'svelte/elements';
  import { followAnchor } from './anchor-tracking';
  import { currentHeading, readingLine, scrolledToEnd } from './table-of-contents';
  import type { ContentsEntry, HeadingPlace } from './table-of-contents';

  type Props = Omit<HTMLAttributes<HTMLElement>, 'children' | 'title'> & {
    entries: readonly ContentsEntry[];
    title?: string;
    heading?: 'h2' | 'h3' | 'h4';
    current?: string | undefined;
  };

  type PlacedHeading = { readonly id: string; readonly element: HTMLElement };

  type AreaBox = { readonly top: number; readonly height: number };

  const SCROLLING_OVERFLOW = new Set(['auto', 'scroll', 'overlay']);

  let {
    entries,
    title = 'On this page',
    heading = 'h2',
    current = $bindable(),
    class: className,
    ...rest
  }: Props = $props();

  const uid = $props.id();

  function pageArea(): Element {
    return document.scrollingElement ?? document.documentElement;
  }

  function scrollArea(from: Element): Element {
    const page = pageArea();
    for (let element = from.parentElement; element !== null; element = element.parentElement) {
      if (element === page || element === document.body) return page;
      if (SCROLLING_OVERFLOW.has(getComputedStyle(element).overflowY)) return element;
    }
    return page;
  }

  function areaBox(area: Element): AreaBox {
    if (area === pageArea()) return { top: 0, height: document.documentElement.clientHeight };
    return { top: area.getBoundingClientRect().top, height: area.clientHeight };
  }

  function placedHeadings(): readonly PlacedHeading[] {
    return entries.flatMap((entry) => {
      const element = document.getElementById(entry.id);
      return element === null ? [] : [{ id: entry.id, element }];
    });
  }

  function place({ id, element }: PlacedHeading): HeadingPlace {
    return { id, top: element.getBoundingClientRect().top };
  }

  function refresh(): void {
    const placed = placedHeadings();
    const first = placed[0];
    if (first === undefined) return;
    const area = scrollArea(first.element);
    const box = areaBox(area);
    current = currentHeading(placed.map(place), {
      readingLine: readingLine(box.top, box.height),
      areaBottom: box.top + box.height,
      scrolledToEnd: scrolledToEnd(area),
    });
  }

  function everyHeadingPlaced(): boolean {
    return placedHeadings().length === entries.length;
  }

  $effect(() => {
    refresh();
    const stopFollowing = followAnchor(refresh);
    if (everyHeadingPlaced()) return stopFollowing;
    const arrivals = new MutationObserver(() => {
      refresh();
      if (everyHeadingPlaced()) arrivals.disconnect();
    });
    arrivals.observe(document.body, { childList: true, subtree: true });
    return () => {
      arrivals.disconnect();
      stopFollowing();
    };
  });
</script>

<nav {...rest} class={['table-of-contents', className]} aria-labelledby="{uid}-title">
  <svelte:element this={heading} class="table-of-contents-title eyebrow" id="{uid}-title"
    >{title}</svelte:element
  >
  <ol class="table-of-contents-list">
    {#each entries as entry (entry.id)}
      <li class={{ 'table-of-contents-item-nested': entry.level === 3 }}>
        <a
          class="table-of-contents-link"
          href={entry.href}
          aria-current={entry.id === current ? 'location' : undefined}>{entry.title}</a
        >
      </li>
    {/each}
  </ol>
</nav>
