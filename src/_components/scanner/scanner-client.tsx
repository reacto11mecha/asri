"use client";

import { useEffect, useRef } from "react";
import QrScanner from "qr-scanner";

interface ScannerClientProps {
  cameraConfig: string | MediaTrackConstraints;
  onScan: (decodedText: string) => void;
  isPaused: boolean;
  onError?: (errorMessage: string) => void;
}

export default function ScannerClient({
  cameraConfig,
  onScan,
  isPaused,
  onError,
}: ScannerClientProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const scannerRef = useRef<QrScanner | null>(null);
  const scannerInstanceIdRef = useRef(0);
  const isPausedRef = useRef(isPaused);
  const onScanRef = useRef(onScan);

  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const currentInstanceId = ++scannerInstanceIdRef.current;

    const scanner = new QrScanner(
      video,
      (result) => {
        if (!isPausedRef.current) {
          onScanRef.current(result.data);
        }
      },
      {
        maxScansPerSecond: 10,
        highlightCodeOutline: true,
      },
    );
    scannerRef.current = scanner;

    const startScanner = async () => {
      try {
        let targetCamera: string | undefined;

        if (typeof cameraConfig === "string") {
          targetCamera = cameraConfig;
        } else if (cameraConfig && typeof cameraConfig === "object") {
          if (
            "deviceId" in cameraConfig &&
            cameraConfig.deviceId &&
            typeof cameraConfig.deviceId === "object" &&
            "exact" in cameraConfig.deviceId
          ) {
            const exactVal = cameraConfig.deviceId.exact;
            if (typeof exactVal === "string") {
              targetCamera = exactVal;
            } else if (Array.isArray(exactVal) && exactVal.length > 0) {
              targetCamera = exactVal[0];
            }
          } else if (
            "deviceId" in cameraConfig &&
            typeof cameraConfig.deviceId === "string"
          ) {
            targetCamera = cameraConfig.deviceId;
          } else if ("facingMode" in cameraConfig && cameraConfig.facingMode) {
            targetCamera = cameraConfig.facingMode as string;
          }
        }

        if (targetCamera) {
          try {
            await scanner.setCamera(targetCamera);
          } catch (setErr) {
            if (setErr instanceof Error && setErr.name === "AbortError") {
              return;
            }
            throw setErr;
          }
        }

        if (currentInstanceId !== scannerInstanceIdRef.current) {
          return;
        }

        try {
          await scanner.start();
        } catch (startErr) {
          if (startErr instanceof Error && startErr.name === "AbortError") {
            return;
          }
          throw startErr;
        }
      } catch (err) {
        if (currentInstanceId !== scannerInstanceIdRef.current) {
          return;
        }
        if (err instanceof Error && err.name === "AbortError") {
          return;
        }
        if (onError) {
          onError(`Gagal mengakses kamera: ${String(err)}`);
        }
      }
    };

    startScanner();

    return () => {
      // Cleanup
      if (scannerRef.current) {
        // stop() mungkin synchronous atau Promise, bungkus dengan Promise.resolve agar selalu Promise
        Promise.resolve(scannerRef.current.stop()).catch(() => {});
        scannerRef.current.destroy();
        scannerRef.current = null;
      }
      if (video.srcObject) {
        (video.srcObject as MediaStream)
          .getTracks()
          .forEach((track) => track.stop());
        video.srcObject = null;
      }
    };
  }, [cameraConfig, onError]);

  return (
    <div className="relative h-full w-full overflow-hidden">
      <video ref={videoRef} className="h-full w-full object-cover" />
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="relative h-64 w-64 md:h-72 md:w-72">
          <div className="absolute top-0 left-0 h-8 w-8 rounded-tl-lg border-t-4 border-l-4 border-yellow-400" />
          <div className="absolute top-0 right-0 h-8 w-8 rounded-tr-lg border-t-4 border-r-4 border-yellow-400" />
          <div className="absolute bottom-0 left-0 h-8 w-8 rounded-bl-lg border-b-4 border-l-4 border-yellow-400" />
          <div className="absolute right-0 bottom-0 h-8 w-8 rounded-br-lg border-r-4 border-b-4 border-yellow-400" />
          <div className="absolute inset-0 rounded-lg border-2 border-yellow-400/30" />
          <div className="absolute inset-0 overflow-hidden rounded-lg">
            <div
              className="animate-scan absolute right-0 left-0 h-0.5 bg-yellow-400 shadow-[0_0_8px_#facc15]"
              style={{ top: "0%" }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
