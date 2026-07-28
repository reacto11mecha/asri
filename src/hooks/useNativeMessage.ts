import { useEffect } from "react";

export function useNativeMessage(callback: (uid: string) => void) {
  useEffect(() => {
    window.receiveRFID = (uid: string) => {
      callback(uid.toUpperCase());
    };
    return () => {
      delete window.receiveRFID;
    };
  }, [callback]);
}
