declare global {
  namespace App {
    interface PageState {
      library?: import('$lib/domains/catalog/ui/navigation').HistoryState;
    }
  }

  interface ImportMetaEnv {
    readonly APP_VERSION: string;
  }
}

export {};
