import { useState, useEffect } from "react";

export interface ParentCredentials {
  nipd: string;
  birthdate: string;
}

const STORAGE_KEY = "parent_auth_session";

export function useParentAuth() {
  // 1. Lazy Initialization: Fungsi ini hanya dijalankan sekali saat inisialisasi awal.
  const [credentials, setCredentials] = useState<ParentCredentials | null>(
    () => {
      // Karena Next.js melakukan SSR, pastikan kita hanya mengakses localStorage di klien
      if (typeof window === "undefined") return null;

      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        return stored ? JSON.parse(stored) : null;
      } catch (error) {
        console.error("Gagal mem-parsing kredensial orang tua", error);
        localStorage.removeItem(STORAGE_KEY);
        return null;
      }
    },
  );

  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Membungkus dengan setTimeout untuk menjadikannya asinkron
    // Ini menghindari "cascading renders" yang diprotes oleh ESLint
    const timeoutId = setTimeout(() => {
      setIsLoaded(true);
    }, 0);

    // Bersihkan timeout jika komponen dilepas sebelum waktu habis
    return () => clearTimeout(timeoutId);
  }, []);

  const login = (nipd: string, birthdate: string) => {
    const newCredentials = { nipd, birthdate };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newCredentials));
    setCredentials(newCredentials);
  };

  const logout = () => {
    localStorage.removeItem(STORAGE_KEY);
    setCredentials(null);
  };

  return {
    credentials,
    isLoaded,
    login,
    logout,
  };
}
