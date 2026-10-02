declare global {
  namespace App {}

  interface ImportMetaEnv {
    readonly APP_VERSION: string;
  }
}

export {};
