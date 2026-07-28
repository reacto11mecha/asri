import { useEffect, useRef, useCallback } from "react";

interface UseRfidScannerOptions {
  onScan: (uid: string) => void;
  enabled: boolean;
}

export function useRfidScanner({ onScan, enabled }: UseRfidScannerOptions) {
  const inputRef = useRef<HTMLInputElement>(null);
  const bufferRef = useRef<string>("");
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const enabledRef = useRef(enabled);
  const onScanRef = useRef(onScan);

  // Sinkronisasi nilai dinamis ke ref
  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);

  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  // Handle fokus & disabled
  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;

    if (enabled) {
      input.disabled = false;
      input.value = ""; // bersihkan residual
      bufferRef.current = "";
      input.focus();

      const handleBlur = () => {
        setTimeout(() => {
          if (inputRef.current && enabledRef.current) {
            inputRef.current.focus();
          }
        }, 50);
      };

      input.addEventListener("blur", handleBlur);
      return () => input.removeEventListener("blur", handleBlur);
    } else {
      // Saat tidak aktif (error, sukses overlay)
      input.disabled = true;
      input.value = "";
      bufferRef.current = "";
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    }
  }, [enabled]);

  const handleInput = useCallback((e: React.FormEvent<HTMLInputElement>) => {
    if (!enabledRef.current) return;

    const value = e.currentTarget.value;

    // Jika reader mengirim Enter
    if (value.includes("\n") || value.includes("\r")) {
      const uid = value
        .replace(/[\n\r]/g, "")
        .replace(/[^0-9A-Fa-f]/g, "")
        .toUpperCase()
        .slice(0, 8);
      if (uid.length === 8) {
        onScanRef.current(uid);
      }
      e.currentTarget.value = "";
      bufferRef.current = "";
    } else {
      bufferRef.current += value;
      if (bufferRef.current.length >= 8) {
        const uid = bufferRef.current
          .slice(0, 8)
          .replace(/[^0-9A-Fa-f]/g, "")
          .toUpperCase();
        if (uid.length === 8) {
          onScanRef.current(uid);
        }
        bufferRef.current = "";
      }
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        bufferRef.current = "";
      }, 150);
    }
  }, []);

  return { inputRef, handleInput };
}
