'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, Square } from 'lucide-react';
import QrScanner from 'qr-scanner';

type MobileQRScannerProps = {
  onScan: (value: string) => void;
  label?: string;
  hint?: string;
};

export function MobileQRScanner({
  onScan,
  label = 'Autoriser la caméra',
  hint = 'Scannez le QR code avec la caméra arrière du téléphone ou la webcam.',
}: MobileQRScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const scannerRef = useRef<QrScanner | null>(null);
  const lockedRef = useRef(false);
  const onScanRef = useRef(onScan);
  const [active, setActive] = useState(false);
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasCamera, setHasCamera] = useState(true);

  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  const stopScanner = useCallback(() => {
    const scanner = scannerRef.current;
    scannerRef.current = null;
    lockedRef.current = false;
    scanner?.stop();
    scanner?.destroy();
  }, []);

  useEffect(() => {
    let cancelled = false;

    const start = async () => {
      if (!active) {
        stopScanner();
        return;
      }

      if (!window.isSecureContext) {
        setError('Safari bloque la caméra sur HTTP. Lancez le frontend en HTTPS puis ouvrez https://IP-DE-VOTRE-PC:3000.');
        setActive(false);
        return;
      }

      if (!navigator.mediaDevices?.getUserMedia) {
        setHasCamera(false);
        setError('Caméra non disponible. Vérifiez Réglages Safari > Caméra > Autoriser, puis rechargez la page.');
        setActive(false);
        return;
      }

      const video = videoRef.current;
      if (!video) return;

      lockedRef.current = false;
      setOpening(true);
      setError(null);

      const createScanner = (preferredCamera: QrScanner.FacingMode) =>
        new QrScanner(
          video,
          (result) => {
            const value = result.data.trim();
            if (!value || lockedRef.current) return;

            lockedRef.current = true;
            onScanRef.current(value);
            stopScanner();
            if (!cancelled) {
              setOpening(false);
              setActive(false);
            }
          },
          {
            preferredCamera,
            maxScansPerSecond: 10,
            highlightScanRegion: true,
            highlightCodeOutline: true,
            returnDetailedScanResult: true,
            onDecodeError: () => {},
          },
        );

      const startWithCamera = async (preferredCamera: QrScanner.FacingMode) => {
        const scanner = createScanner(preferredCamera);
        scannerRef.current = scanner;
        video.muted = true;
        video.playsInline = true;
        video.setAttribute('playsinline', 'true');
        video.setAttribute('webkit-playsinline', 'true');
        await scanner.start();
      };

      try {
        await startWithCamera('environment');
        if (!cancelled) {
          setHasCamera(true);
          setOpening(false);
        }
      } catch (firstError) {
        stopScanner();
        const errorName = firstError instanceof DOMException ? firstError.name : '';
        const canRetryFrontCamera = !['NotAllowedError', 'SecurityError', 'PermissionDeniedError'].includes(errorName);

        try {
          if (!canRetryFrontCamera) throw firstError;
          await startWithCamera('user');
          if (!cancelled) {
            setHasCamera(true);
            setOpening(false);
          }
        } catch {
          stopScanner();
          if (!cancelled) {
            setHasCamera(false);
            setError('Caméra introuvable ou refusée. Sur Safari, ouvrez en HTTPS et autorisez Caméra dans les réglages du site.');
            setOpening(false);
            setActive(false);
          }
        }
      }
    };

    void start();

    return () => {
      cancelled = true;
      stopScanner();
    };
  }, [active, stopScanner]);

  return (
    <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-slate-500">{active ? 'Scan QR en cours...' : hint}</p>
        {active ? (
          <button className="btn-outline" type="button" onClick={() => setActive(false)}>
            <Square size={14} />
            Stop
          </button>
        ) : (
          <button
            className="btn-primary"
            type="button"
            onClick={() => {
              setError(null);
              setActive(true);
            }}
          >
            <Camera size={14} />
            {label}
          </button>
        )}
      </div>

      {active ? (
        <div className="relative overflow-hidden rounded-lg border border-slate-200 bg-black">
          <video
            ref={videoRef}
            className="h-[min(68vh,32rem)] min-h-72 w-full object-cover"
            muted
            autoPlay
            playsInline
          />
          {opening ? (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60 px-4 text-center text-sm font-semibold text-white">
              Ouverture de la caméra...
            </div>
          ) : null}
          <div className="pointer-events-none absolute inset-0 m-auto h-44 w-44 rounded-2xl border-2 border-white/80 shadow-[0_0_0_999px_rgba(0,0,0,0.28)]" />
        </div>
      ) : null}

      {error ? (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">{error}</p>
      ) : !hasCamera ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Aucune caméra détectée. Vous pouvez utiliser le champ manuel.
        </p>
      ) : null}
    </div>
  );
}
