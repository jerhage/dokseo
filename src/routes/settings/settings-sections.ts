import type { Component } from 'svelte';
import File from '$lib/components/icons/File.svelte';
import HardDrive from '$lib/components/icons/HardDrive.svelte';
import type { IconProps } from '$lib/components/icons/icon';
import Info from '$lib/components/icons/Info.svelte';
import Palette from '$lib/components/icons/Palette.svelte';
import ScanText from '$lib/components/icons/ScanText.svelte';

type SettingsSection = 'engine' | 'storage' | 'appearance' | 'library' | 'app';

type SectionLink = {
  readonly id: SettingsSection;
  readonly name: string;
  readonly summary: string;
  readonly icon: Component<IconProps>;
  readonly href: string;
};

function settingsSections(root: string): readonly SectionLink[] {
  return [
    {
      id: 'engine',
      name: 'OCR engine',
      summary: 'Where recognition runs',
      icon: ScanText,
      href: root,
    },
    {
      id: 'storage',
      name: 'Storage',
      summary: 'What this device keeps',
      icon: HardDrive,
      href: `${root}/storage`,
    },
    {
      id: 'appearance',
      name: 'Appearance',
      summary: 'Theme and color scheme',
      icon: Palette,
      href: `${root}/appearance`,
    },
    {
      id: 'library',
      name: 'Library',
      summary: 'How a file finds its book',
      icon: File,
      href: `${root}/library`,
    },
    {
      id: 'app',
      name: 'App',
      summary: 'Version and updates',
      icon: Info,
      href: `${root}/app`,
    },
  ];
}

export { settingsSections };
export type { SectionLink, SettingsSection };
