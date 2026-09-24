<script lang="ts">
  import Accordion from '$lib/components/Accordion.svelte';
  import AccordionItem from '$lib/components/AccordionItem.svelte';
  import DemoSection from './DemoSection.svelte';
</script>

{#snippet richTitle()}
  A title given as a <em>snippet</em>
{/snippet}

<DemoSection
  id="accordion"
  title="Accordion"
  classes={['accordion', 'accordion-item', 'accordion-trigger']}
>
  <Accordion class="prose w-full">
    <AccordionItem title="Where do raw values live?" open>
      Only in the base layer, as primitives. Nothing downstream uses a raw value.
    </AccordionItem>
    <AccordionItem title="How does the dark scheme work?">
      Each theme colour is one light-dark() pair. The color-scheme property picks the half, so no
      component CSS is duplicated.
    </AccordionItem>
    <AccordionItem title="Can one open at a time?" name="exclusive">
      Items that share a name close each other, natively.
    </AccordionItem>
    <AccordionItem title={richTitle} name="exclusive">
      This one shares the name above, so opening it closes the other.
    </AccordionItem>
  </Accordion>
</DemoSection>
