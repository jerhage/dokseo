const STORAGE_SECTIONS = {
  apis: 'Where a web app can keep data',
  indexeddb: 'IndexedDB',
  opfs: 'The origin private file system',
  quota: 'Quotas and the estimate',
  modes: 'Best-effort and persistent storage',
  eviction: 'Eviction',
  safari: "Safari's seven-day rule",
  persist: 'Asking for persistence',
  homeScreen: 'The home-screen app on iOS',
  map: 'Where Dokseo keeps each kind of data',
  databases: "Dokseo's four databases",
  books: 'Book files and the writer worker',
  cache: 'Model weights and the app shell',
  preferences: 'Preferences in localStorage',
  account: 'The storage account',
  asking: 'When Dokseo asks for persistence',
  rows: 'Reading a stored row back',
  rule: 'Caching is not durability',
} as const;

export { STORAGE_SECTIONS };
