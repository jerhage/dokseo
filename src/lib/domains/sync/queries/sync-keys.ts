const ALL = ['sync'] as const;

const syncKeys = {
  all: () => ALL,
  status: () => [...ALL, 'status'] as const,
  devices: () => [...ALL, 'devices'] as const,
  remoteBooks: () => [...ALL, 'remote-books'] as const,
};

export { syncKeys };
