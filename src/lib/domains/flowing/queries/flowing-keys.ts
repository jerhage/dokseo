const ALL = ['flowing'] as const;

const flowingKeys = {
  all: () => ALL,
  settings: () => [...ALL, 'settings'] as const,
};

export { flowingKeys };
