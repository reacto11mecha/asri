import { useEffect, useRef } from "react";

export function useBeep() {
  const successRef = useRef<HTMLAudioElement | null>(null);
  const errorRef = useRef<HTMLAudioElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    // Inisialisasi AudioContext (tapi belum di-resume)
    audioCtxRef.current = new (
      window.AudioContext || (window as any).webkitAudioContext
    )();

    successRef.current = new Audio("/sounds/success.mp3");
    errorRef.current = new Audio("/sounds/error.mp3");
    successRef.current.load();
    errorRef.current.load();
  }, []);

  const playSuccess = () => {
    if (successRef.current) {
      // Pastikan AudioContext aktif
      resumeAudioContext();
      successRef.current.currentTime = 0;
      successRef.current.play().catch(() => {});
    }
  };

  const playError = () => {
    if (errorRef.current) {
      resumeAudioContext();
      errorRef.current.currentTime = 0;
      errorRef.current.play().catch(() => {});
    }
  };

  // Fungsi untuk meresume AudioContext tanpa mengeluarkan suara
  const resumeAudioContext = () => {
    if (audioCtxRef.current && audioCtxRef.current.state === "suspended") {
      audioCtxRef.current.resume().catch(() => {});
    }
  };

  // Prewarm: cukup resume AudioContext (tidak ada suara)
  const prewarm = () => {
    resumeAudioContext();
  };

  return { playSuccess, playError, prewarm };
}
