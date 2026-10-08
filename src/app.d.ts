declare global {
  namespace App {
    interface PageState {
      library?: import('$lib/domains/catalog/ui/library-history').LibraryHistoryState;
    }
  }

  interface ImportMetaEnv {
    readonly APP_VERSION: string;
  }
}

export {};
