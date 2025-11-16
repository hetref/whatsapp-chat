// Global window type extensions
declare global {
  interface Window {
    mediaRefreshErrorCount?: { [messageId: string]: number };
  }
}

export {};