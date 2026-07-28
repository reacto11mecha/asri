// src/types/global.d.ts
export {};

declare global {
  interface Window {
    receiveRFID?: (uid: string) => void;
    ReactNativeWebView?: {
      postMessage: (message: string) => void;
    };
  }
}
