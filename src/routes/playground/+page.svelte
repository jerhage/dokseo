<script lang="ts">
  import type { Component } from 'svelte';
  import Divider from '$lib/components/Divider.svelte';
  import AccordionSection from './AccordionSection.svelte';
  import AlertSection from './AlertSection.svelte';
  import AppShellSection from './AppShellSection.svelte';
  import AvatarSection from './AvatarSection.svelte';
  import BadgesSection from './BadgesSection.svelte';
  import BentoSection from './BentoSection.svelte';
  import ButtonsSection from './ButtonsSection.svelte';
  import CardSection from './CardSection.svelte';
  import CarouselSection from './CarouselSection.svelte';
  import ChromeBarSection from './ChromeBarSection.svelte';
  import ChromeSection from './ChromeSection.svelte';
  import ChoicesSection from './ChoicesSection.svelte';
  import CommandSection from './CommandSection.svelte';
  import DividerSection from './DividerSection.svelte';
  import DockSection from './DockSection.svelte';
  import DropdownSection from './DropdownSection.svelte';
  import EmptyStateSection from './EmptyStateSection.svelte';
  import EyebrowSection from './EyebrowSection.svelte';
  import FileUploadSection from './FileUploadSection.svelte';
  import FormSection from './FormSection.svelte';
  import GestureSection from './GestureSection.svelte';
  import GridSection from './GridSection.svelte';
  import HeroSection from './HeroSection.svelte';
  import IconButtonSection from './IconButtonSection.svelte';
  import IconsSection from './IconsSection.svelte';
  import KeyHintsSection from './KeyHintsSection.svelte';
  import LayoutsIntro from './LayoutsIntro.svelte';
  import ListGroupSection from './ListGroupSection.svelte';
  import ModalToastSection from './ModalToastSection.svelte';
  import MosaicSection from './MosaicSection.svelte';
  import NavigationSection from './NavigationSection.svelte';
  import OverlaySection from './OverlaySection.svelte';
  import PageWrapSection from './PageWrapSection.svelte';
  import PanZoomSection from './PanZoomSection.svelte';
  import PopoverSection from './PopoverSection.svelte';
  import PlaygroundHeader from './PlaygroundHeader.svelte';
  import PlaygroundIntro from './PlaygroundIntro.svelte';
  import ProgressSection from './ProgressSection.svelte';
  import SearchFieldSection from './SearchFieldSection.svelte';
  import SegmentedSection from './SegmentedSection.svelte';
  import SidebarSection from './SidebarSection.svelte';
  import SliderSection from './SliderSection.svelte';
  import SplitSection from './SplitSection.svelte';
  import StatSection from './StatSection.svelte';
  import TableSection from './TableSection.svelte';
  import TabsSection from './TabsSection.svelte';
  import ThumbnailSection from './ThumbnailSection.svelte';
  import TokensSection from './TokensSection.svelte';
  import ZPatternSection from './ZPatternSection.svelte';

  const SECTIONS: readonly Component[] = [
    TokensSection,
    EyebrowSection,
    IconsSection,
    ButtonsSection,
    IconButtonSection,
    BadgesSection,
    FormSection,
    SearchFieldSection,
    FileUploadSection,
    ChoicesSection,
    SegmentedSection,
    CardSection,
    AlertSection,
    EmptyStateSection,
    TabsSection,
    AccordionSection,
    TableSection,
    ListGroupSection,
    ModalToastSection,
    DropdownSection,
    PopoverSection,
    CommandSection,
    KeyHintsSection,
    NavigationSection,
    AvatarSection,
    ThumbnailSection,
    CarouselSection,
    DockSection,
    GestureSection,
    PanZoomSection,
    ProgressSection,
    SliderSection,
    StatSection,
    DividerSection,
    LayoutsIntro,
    PageWrapSection,
    AppShellSection,
    SidebarSection,
    HeroSection,
    SplitSection,
    ZPatternSection,
    OverlaySection,
    ChromeSection,
    ChromeBarSection,
    BentoSection,
    MosaicSection,
    GridSection,
  ];
</script>

<svelte:head>
  <title>Component library</title>
</svelte:head>

<div class="surface-bg min-h-screen">
  <PlaygroundHeader />
  <main class="page-wrap">
    <div class="stack-lg">
      <PlaygroundIntro />
      {#each SECTIONS as Section, index (index)}
        <Divider />
        <Section />
      {/each}
      <Divider />
    </div>
  </main>
</div>
