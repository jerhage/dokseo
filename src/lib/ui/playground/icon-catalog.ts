type CatalogEntry<T> = {
  readonly name: string;
  readonly icon: T;
};

const BASE_ICON = 'Icon';

function iconCatalog<T>(modules: Readonly<Record<string, T>>): readonly CatalogEntry<T>[] {
  return Object.entries(modules)
    .map(([path, icon]) => ({
      name: path.slice(path.lastIndexOf('/') + 1, -'.svelte'.length),
      icon,
    }))
    .filter((entry) => entry.name !== BASE_ICON)
    .toSorted((left, right) => left.name.localeCompare(right.name));
}

export { iconCatalog };
export type { CatalogEntry };
