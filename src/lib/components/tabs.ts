type TabItem = {
  readonly id: string;
  readonly label: string;
  readonly disabled?: boolean;
};

function shownTab(tabs: readonly TabItem[], selected: string | undefined): string | undefined {
  const usable = tabs.filter((tab) => tab.disabled !== true);
  return (usable.find((tab) => tab.id === selected) ?? usable[0])?.id;
}

export { shownTab };
export type { TabItem };
