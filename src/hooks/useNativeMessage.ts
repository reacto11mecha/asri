import { useEffect } from "react";

export function useNativeMessage(callback: (uid: string) => void) {
  useEffect(() => {
    window.receiveRFID = (uid: string) => {
      const cleaned = uid
        .replace(/[^0-9A-Fa-f]/g, "")
        .toUpperCase()
        .slice(0, 8);
      callback(cleaned);
    };
    return () => {
      delete window.receiveRFID;
    };
  }, [callback]);
}
