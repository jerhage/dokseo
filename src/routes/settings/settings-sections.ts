import type { Component } from 'svelte';
import BookOpen from '$lib/ui/components/icons/BookOpen.svelte';
import Database from '$lib/ui/components/icons/Database.svelte';
import File from '$lib/ui/components/icons/File.svelte';
import HardDrive from '$lib/ui/components/icons/HardDrive.svelte';
import type { IconProps } from '$lib/ui/components/icons/icon';
import Info from '$lib/ui/components/icons/Info.svelte';
import LayoutGrid from '$lib/ui/components/icons/LayoutGrid.svelte';
import Palette from '$lib/ui/components/icons/Palette.svelte';
import ScanText from '$lib/ui/components/icons/ScanText.svelte';

type SettingsSection =
  | 'engine'
  | 'storage'
  | 'data'
  | 'appearance'
  | 'library'
  | 'catalogs'
  | 'reading'
  | 'app';

type SectionLink = {
  readonly id: SettingsSection;
  readonly name: string;
  readonly summary: string;
  readonly icon: Component<IconProps>;
  readonly href: string;
  readonly pageHref: string;
};

function settingsSections(root: string): readonly SectionLink[] {
  return [
    {
      id: 'engine',
      name: 'OCR engine',
      summary: 'Where recognition runs',
      icon: ScanText,
      href: root,
      pageHref: `${root}/engine`,
    },
    {
      id: 'storage',
      name: 'Storage',
      summary: 'What this device keeps',
      icon: HardDrive,
      href: `${root}/storage`,
      pageHref: `${root}/storage`,
    },
    {
      id: 'data',
      name: 'Your data',
      summary: 'Export and import captures',
      icon: Database,
      href: `${root}/data`,
      pageHref: `${root}/data`,
    },
    {
      id: 'appearance',
      name: 'Appearance',
      summary: 'Theme and color scheme',
      icon: Palette,
      href: `${root}/appearance`,
      pageHref: `${root}/appearance`,
    },
    {
      id: 'library',
      name: 'Library',
      summary: 'How a file finds its book',
      icon: File,
      href: `${root}/library`,
      pageHref: `${root}/library`,
    },
    {
      id: 'catalogs',
      name: 'Catalogs',
      summary: 'OPDS servers to download from',
      icon: LayoutGrid,
      href: `${root}/catalogs`,
      pageHref: `${root}/catalogs`,
    },
    {
      id: 'reading',
      name: 'Reading defaults',
      summary: 'How each language reads',
      icon: BookOpen,
      href: `${root}/reading`,
      pageHref: `${root}/reading`,
    },
    {
      id: 'app',
      name: 'App',
      summary: 'Version and updates',
      icon: Info,
      href: `${root}/app`,
      pageHref: `${root}/app`,
    },
  ];
}

export { settingsSections };
export type { SectionLink, SettingsSection };
