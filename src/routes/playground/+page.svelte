<script lang="ts">
  import type { Component } from 'svelte';
  import Divider from '$lib/components/Divider.svelte';
  import ToastRegion from '$lib/components/ToastRegion.svelte';
  import { setToaster } from '$lib/components/toast-context';
  import { createToaster } from '$lib/components/toaster.svelte';
  import AccordionSection from './AccordionSection.svelte';
  import AlertSection from './AlertSection.svelte';
  import AppShellSection from './AppShellSection.svelte';
  import AvatarSection from './AvatarSection.svelte';
  import BadgesSection from './BadgesSection.svelte';
  import BentoSection from './BentoSection.svelte';
  import ButtonsSection from './ButtonsSection.svelte';
  import CardSection from './CardSection.svelte';
  import ChoicesSection from './ChoicesSection.svelte';
  import CommandSection from './CommandSection.svelte';
  import DividerSection from './DividerSection.svelte';
  import DropdownSection from './DropdownSection.svelte';
  import FileUploadSection from './FileUploadSection.svelte';
  import FormSection from './FormSection.svelte';
  import GridSection from './GridSection.svelte';
  import HeroSection from './HeroSection.svelte';
  import LayoutsIntro from './LayoutsIntro.svelte';
  import ModalToastSection from './ModalToastSection.svelte';
  import MosaicSection from './MosaicSection.svelte';
  import NavigationSection from './NavigationSection.svelte';
  import OverlaySection from './OverlaySection.svelte';
  import PageWrapSection from './PageWrapSection.svelte';
  import PlaygroundHeader from './PlaygroundHeader.svelte';
  import PlaygroundIntro from './PlaygroundIntro.svelte';
  import ProgressSection from './ProgressSection.svelte';
  import SidebarSection from './SidebarSection.svelte';
  import SplitSection from './SplitSection.svelte';
  import TableSection from './TableSection.svelte';
  import TabsSection from './TabsSection.svelte';
  import TokensSection from './TokensSection.svelte';
  import ZPatternSection from './ZPatternSection.svelte';

  const SECTIONS: readonly Component[] = [
    TokensSection,
    ButtonsSection,
    BadgesSection,
    FormSection,
    FileUploadSection,
    ChoicesSection,
    CardSection,
    AlertSection,
    TabsSection,
    AccordionSection,
    TableSection,
    ModalToastSection,
    DropdownSection,
    CommandSection,
    NavigationSection,
    AvatarSection,
    ProgressSection,
    DividerSection,
    LayoutsIntro,
    PageWrapSection,
    AppShellSection,
    SidebarSection,
    HeroSection,
    SplitSection,
    ZPatternSection,
    OverlaySection,
    BentoSection,
    MosaicSection,
    GridSection,
  ];

  setToaster(createToaster());
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
  <ToastRegion />
</div>
