const ALL = ['storage'] as const;

const storageKeys = {
  all: () => ALL,
  account: () => [...ALL, 'account'] as const,
};

export { storageKeys };
