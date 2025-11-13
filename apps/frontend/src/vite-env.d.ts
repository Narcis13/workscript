/// <reference types="vite/client" />

interface ImportMetaEnv {
  /**
   * The base URL for the backend API server
   * @default "http://localhost:3013"
   */
  readonly VITE_API_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
