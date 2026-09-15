"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { BrowserMultiFormatReader, IScannerControls } from "@zxing/browser";
import { Button } from "@/components/ui/Button";
import { useLang } from "@/lib/i18n/LanguageContext";

interface BarcodeScannerProps {
  open: boolean;
  onDetected: (text: string) => void;
  onClose: () => void;
}

type ScannerStatus = "starting" | "scanning" | "error";

/**
 * Modal scanner barcode via kamera (ZXing / @zxing/browser).
 * Membutuhkan konteks aman (HTTPS / localhost) untuk getUserMedia.
 */
export function BarcodeScanner({ open, onDetected, onClose }: BarcodeScannerProps) {
  const { t } = useLang();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const cancelledRef = useRef(false);
  const lastRef = useRef<{ text: string; at: number }>({ text: "", at: 0 });
  const onDetectedRef = useRef(onDetected);
  onDetectedRef.current = onDetected;
  const [status, setStatus] = useState<ScannerStatus>("starting");
  const [errorMessage, setErrorMessage] = useState("");

  const stopScanner = useCallback(() => {
    try {
      controlsRef.current?.stop();
    } catch {
      // scanner memang belum berjalan
    }
    controlsRef.current = null;
    readerRef.current = null;
  }, []);

  const startScanner = useCallback(async () => {
    stopScanner();
    cancelledRef.current = false;
    lastRef.current = { text: "", at: 0 };
    setStatus("starting");
    setErrorMessage("");
    try {
      const { BrowserMultiFormatReader } = await import("@zxing/browser");
      const reader = new BrowserMultiFormatReader();
      readerRef.current = reader;
      const controls = await reader.decodeFromVideoDevice(
        undefined, // undefined = kamera belakang (facingMode environment) bila tersedia
        videoRef.current ?? undefined,
        (result) => {
          if (cancelledRef.current || !result) return;
          const text = result.getText();
          const now = Date.now();
          if (text === lastRef.current.text && now - lastRef.current.at < 2000) return;
          lastRef.current = { text, at: now };
          onDetectedRef.current(text);
        }
      );
      if (cancelledRef.current) {
        controls.stop();
        return;
      }
      controlsRef.current = controls;
      setStatus("scanning");
    } catch (err) {
      if (cancelledRef.current) return;
      setStatus("error");
      setErrorMessage(errorFor(err));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stopScanner]);

  const errorFor = (err: unknown): string => {
    if (typeof navigator !== "undefined" && !navigator.mediaDevices?.getUserMedia) {
      return t.scanner.errorInsecure;
    }
    const name = err instanceof Error ? err.name : "";
    if (name === "NotAllowedError") return t.scanner.errorPermission;
    if (name === "NotFoundError" || name === "OverconstrainedError") return t.scanner.errorNoCamera;
    return t.scanner.errorUnknown;
  };

  // Mulai / hentikan stream saat modal dibuka-tutup ATAU komponen unmount.
  useEffect(() => {
    if (!open) return;
    startScanner();
    return () => {
      cancelledRef.current = true;
      stopScanner();
    };
  }, [open, startScanner, stopScanner]);

  // Escape menutup scanner saja (capture phase) tanpa ikut menutup modal form di bawahnya.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      onClose();
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t.scanner.title}
        className="relative bg-card rounded-xl border border-line shadow-lg w-full max-w-md overflow-hidden"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-line shrink-0">
          <h3 className="text-sm font-semibold text-foreground">{t.scanner.title}</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.scanner.close}
            className="text-muted hover:text-foreground cursor-pointer"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="relative aspect-[4/3] bg-black">
          <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover" muted playsInline />
          {status === "scanning" && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-3/5 h-24 border-2 border-white/90 rounded-lg shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
            </div>
          )}
          {status === "starting" && (
            <p className="absolute inset-0 flex items-center justify-center text-sm text-white/80">
              {t.scanner.starting}
            </p>
          )}
          {status === "error" && (
            <div role="alert" className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center">
              <p className="text-sm text-white/90">{errorMessage}</p>
              <Button variant="secondary" size="sm" onClick={startScanner}>
                {t.scanner.retry}
              </Button>
            </div>
          )}
        </div>
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-t border-line shrink-0">
          <p className="text-xs text-muted">{status === "scanning" ? t.scanner.hint : ""}</p>
          <Button variant="secondary" size="sm" onClick={onClose}>
            {t.scanner.close}
          </Button>
        </div>
      </div>
    </div>
  );
}
