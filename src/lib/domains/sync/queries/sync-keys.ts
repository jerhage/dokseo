const ALL = ['sync'] as const;

const syncKeys = {
  all: () => ALL,
  status: () => [...ALL, 'status'] as const,
  devices: () => [...ALL, 'devices'] as const,
};

export { syncKeys };
