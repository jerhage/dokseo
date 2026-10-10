<script lang="ts">
  import type { Component, Snippet } from 'svelte';
  import Divider from '../components/Divider.svelte';
  import AccordionSection from './AccordionSection.svelte';
  import AlertSection from './AlertSection.svelte';
  import AppShellSection from './AppShellSection.svelte';
  import AppearanceSwitcherSection from './AppearanceSwitcherSection.svelte';
  import AvatarSection from './AvatarSection.svelte';
  import BadgesSection from './BadgesSection.svelte';
  import BentoSection from './BentoSection.svelte';
  import BreakpointProbeSection from './BreakpointProbeSection.svelte';
  import ButtonGroupSection from './ButtonGroupSection.svelte';
  import ButtonsSection from './ButtonsSection.svelte';
  import CardSection from './CardSection.svelte';
  import CarouselSection from './CarouselSection.svelte';
  import ChromeBarSection from './ChromeBarSection.svelte';
  import ChromeSection from './ChromeSection.svelte';
  import ChoicesSection from './ChoicesSection.svelte';
  import CodeBlockSection from './CodeBlockSection.svelte';
  import ComboboxSection from './ComboboxSection.svelte';
  import CommandSection from './CommandSection.svelte';
  import ContextMenuSection from './ContextMenuSection.svelte';
  import DiagramSection from './DiagramSection.svelte';
  import DividerSection from './DividerSection.svelte';
  import DockSection from './DockSection.svelte';
  import DrawerSection from './DrawerSection.svelte';
  import DropdownSection from './DropdownSection.svelte';
  import EmptyStateSection from './EmptyStateSection.svelte';
  import EyebrowSection from './EyebrowSection.svelte';
  import FigureSection from './FigureSection.svelte';
  import FileUploadSection from './FileUploadSection.svelte';
  import FormSection from './FormSection.svelte';
  import GestureSection from './GestureSection.svelte';
  import GridSection from './GridSection.svelte';
  import HeroSection from './HeroSection.svelte';
  import HighlightSection from './HighlightSection.svelte';
  import IconButtonSection from './IconButtonSection.svelte';
  import IconsSection from './IconsSection.svelte';
  import InputGroupSection from './InputGroupSection.svelte';
  import KeyHintsSection from './KeyHintsSection.svelte';
  import KeyboardScrollingSection from './KeyboardScrollingSection.svelte';
  import LayoutsIntro from './LayoutsIntro.svelte';
  import ListGroupSection from './ListGroupSection.svelte';
  import MarqueeSelectionSection from './MarqueeSelectionSection.svelte';
  import ModalToastSection from './ModalToastSection.svelte';
  import MosaicSection from './MosaicSection.svelte';
  import NavigationSection from './NavigationSection.svelte';
  import OverflowListSection from './OverflowListSection.svelte';
  import OverlaySection from './OverlaySection.svelte';
  import PageHeaderSection from './PageHeaderSection.svelte';
  import PageWrapSection from './PageWrapSection.svelte';
  import PanZoomSection from './PanZoomSection.svelte';
  import PopoverSection from './PopoverSection.svelte';
  import RegionBoxSection from './RegionBoxSection.svelte';
  import PlaygroundHeader from './PlaygroundHeader.svelte';
  import PlaygroundIntro from './PlaygroundIntro.svelte';
  import ProgressSection from './ProgressSection.svelte';
  import SearchFieldSection from './SearchFieldSection.svelte';
  import SegmentedSection from './SegmentedSection.svelte';
  import SidebarSection from './SidebarSection.svelte';
  import SliderSection from './SliderSection.svelte';
  import SplitSection from './SplitSection.svelte';
  import StatSection from './StatSection.svelte';
  import StatusIconSection from './StatusIconSection.svelte';
  import PacketLayoutSection from './PacketLayoutSection.svelte';
  import SequenceDiagramSection from './SequenceDiagramSection.svelte';
  import StepThroughSection from './StepThroughSection.svelte';
  import StepListSection from './StepListSection.svelte';
  import StepperSection from './StepperSection.svelte';
  import TableOfContentsSection from './TableOfContentsSection.svelte';
  import TableSection from './TableSection.svelte';
  import TabsSection from './TabsSection.svelte';
  import ThumbnailSection from './ThumbnailSection.svelte';
  import ToastSection from './ToastSection.svelte';
  import TooltipSection from './TooltipSection.svelte';
  import TokensSection from './TokensSection.svelte';
  import ZPatternSection from './ZPatternSection.svelte';

  type Props = {
    readonly appearanceControl?: Snippet;
    readonly demos?: Snippet;
  };

  let { appearanceControl, demos }: Props = $props();

  const SECTIONS: readonly Component[] = [
    TokensSection,
    EyebrowSection,
    IconsSection,
    ButtonsSection,
    IconButtonSection,
    ButtonGroupSection,
    BadgesSection,
    FormSection,
    InputGroupSection,
    SearchFieldSection,
    ComboboxSection,
    FileUploadSection,
    ChoicesSection,
    SegmentedSection,
    CardSection,
    AlertSection,
    StatusIconSection,
    EmptyStateSection,
    TabsSection,
    AccordionSection,
    TableSection,
    ListGroupSection,
    ModalToastSection,
    DrawerSection,
    ToastSection,
    DropdownSection,
    ContextMenuSection,
    AppearanceSwitcherSection,
    PopoverSection,
    TooltipSection,
    CommandSection,
    KeyHintsSection,
    KeyboardScrollingSection,
    NavigationSection,
    PageHeaderSection,
    StepperSection,
    AvatarSection,
    ThumbnailSection,
    OverflowListSection,
    HighlightSection,
    CarouselSection,
    DockSection,
    GestureSection,
    PanZoomSection,
    RegionBoxSection,
    MarqueeSelectionSection,
    BreakpointProbeSection,
    ProgressSection,
    SliderSection,
    StatSection,
    DividerSection,
    CodeBlockSection,
    FigureSection,
    TableOfContentsSection,
    DiagramSection,
    SequenceDiagramSection,
    PacketLayoutSection,
    StepThroughSection,
    StepListSection,
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

<div class="surface-bg min-h-screen">
  <PlaygroundHeader {appearanceControl} />
  <main class="page-wrap">
    <div class="stack-lg">
      <PlaygroundIntro />
      {#each SECTIONS as Section, index (index)}
        <Divider />
        <Section />
      {/each}
      {#if demos}
        <Divider />
        {@render demos()}
      {/if}
      <Divider />
    </div>
  </main>
</div>
