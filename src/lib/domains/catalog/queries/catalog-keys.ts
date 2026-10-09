const ALL = ['catalog'] as const;

const catalogKeys = {
  all: () => ALL,
  catalogs: () => [...ALL, 'catalogs'] as const,
  origins: () => [...ALL, 'origins'] as const,
};

export { catalogKeys };
