<script lang="ts">
  import Badge from '../components/Badge.svelte';
  import Button from '../components/Button.svelte';
  import Card from '../components/Card.svelte';
  import Carousel from '../components/Carousel.svelte';
  import Slider from '../components/Slider.svelte';
  import { CAROUSEL_REST, carouselAround } from '../components/carousel';
  import type { CarouselMotion, CarouselSide, CarouselSlide } from '../components/carousel';
  import type { TagColour } from '../core/tag-colours.js';
  import DemoSection from './DemoSection.svelte';

  const COLOURS: readonly TagColour[] = ['clay', 'sage', 'sky', 'plum', 'copper'];

  const REACH = 400;

  let forward = $state(0);
  let backward = $state(0);
  let driven = $state(0);
  let travel = $state(0);
  let motion = $state.raw<CarouselMotion>(CAROUSEL_REST);
  let steered = $state<ReturnType<typeof Carousel> | null>(null);

  function colourAt(slide: CarouselSlide): TagColour {
    return COLOURS[Number(slide.key) % COLOURS.length] ?? 'slate';
  }

  function moved(index: number, towards: CarouselSide): number {
    return Math.max(0, Math.min(COLOURS.length - 1, index + towards));
  }

  function follow(value: number): void {
    travel = value;
    steered?.drive({ kind: 'follow', travel: value });
  }

  function release(towards: CarouselSide | null): void {
    travel = 0;
    const handed = steered?.drive({ kind: 'release', towards }) ?? false;
    if (!handed && towards !== null) driven = moved(driven, towards);
  }
</script>

{#snippet coloured(slide: CarouselSlide)}
  <div class="flex-1 col items-center justify-center surface-raised bordered rounded-container">
    <Badge color={colourAt(slide)} emphasis="solid">Slide {Number(slide.key) + 1}</Badge>
  </div>
{/snippet}

<DemoSection
  id="carousel"
  title="Carousel"
  classes={['carousel', 'carousel-swipeable', 'carousel-slot', 'is-beside', 'is-settling']}
>
  <p class="text-sm text-muted">
    Up to three keyed slides: before, current and after. A neighbour is inert. With reduced motion
    the slides do not follow the finger, and a swipe moves at once.
  </p>
  <div class="grid-2">
    <Card>
      <div class="col gap-2">
        <p class="text-sm text-muted">its own swipe, left to right</p>
        <Carousel
          class="aspect-video"
          slides={carouselAround(forward, COLOURS.length)}
          slide={coloured}
          aria-label="Coloured slides"
          onsettled={(towards) => (forward = moved(forward, towards))}
        />
        <span class="text-xs text-faint">slide {forward + 1} of {COLOURS.length}</span>
      </div>
    </Card>
    <Card>
      <div class="col gap-2">
        <p class="text-sm text-muted">dir="rtl": the slide after waits on the left</p>
        <Carousel
          class="aspect-video"
          dir="rtl"
          slides={carouselAround(backward, COLOURS.length)}
          slide={coloured}
          aria-label="Coloured slides, right to left"
          onsettled={(towards) => (backward = moved(backward, towards))}
        />
        <span class="text-xs text-faint">slide {backward + 1} of {COLOURS.length}</span>
      </div>
    </Card>
    <Card>
      <div class="col gap-2">
        <p class="text-sm text-muted">driven: the caller feeds the travel and the release</p>
        <Carousel
          bind:this={steered}
          bind:motion
          class="aspect-video"
          driven
          slides={carouselAround(driven, COLOURS.length)}
          slide={coloured}
          aria-label="Coloured slides, driven"
          onsettled={(towards) => (driven = moved(driven, towards))}
        />
        <Slider
          label="Travel"
          value={travel}
          min={-REACH}
          max={REACH}
          valuetext="{travel} px"
          oninput={(event) => follow(Number(event.currentTarget.value))}
        />
        <div class="row wrap gap-2">
          <Button size="sm" variant="ghost" onclick={() => release(-1)}>Settle before</Button>
          <Button size="sm" variant="ghost" onclick={() => release(null)}>Snap back</Button>
          <Button size="sm" variant="ghost" onclick={() => release(1)}>Settle after</Button>
        </div>
        <span class="text-xs text-faint">
          slide {driven + 1} of {COLOURS.length}, motion {motion.kind}
        </span>
      </div>
    </Card>
  </div>
</DemoSection>
