type SettingsSection = 'engine' | 'storage' | 'appearance';

type SectionLink = {
  readonly id: SettingsSection;
  readonly name: string;
  readonly summary: string;
  readonly glyph: string;
  readonly href: string;
};

function settingsSections(root: string): readonly SectionLink[] {
  return [
    {
      id: 'engine',
      name: 'OCR engine',
      summary: 'Where recognition runs',
      glyph: '字',
      href: root,
    },
    {
      id: 'storage',
      name: 'Storage',
      summary: 'What this device keeps',
      glyph: '▤',
      href: `${root}/storage`,
    },
    {
      id: 'appearance',
      name: 'Appearance',
      summary: 'Theme and color scheme',
      glyph: '◐',
      href: `${root}/appearance`,
    },
  ];
}

export { settingsSections };
export type { SectionLink, SettingsSection };
