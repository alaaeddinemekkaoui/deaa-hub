'use client';

import { useEffect, useRef, useState } from 'react';
import { Camera, RefreshCw, Square, SwitchCamera } from 'lucide-react';
import jsQR from 'jsqr';

type CameraDevice = {
  deviceId: string;
  label: string;
};

type CameraFacingMode = 'environment' | 'user';

type BarcodeDetectorLike = {
  detect: (source: HTMLVideoElement) => Promise<Array<{ rawValue: string }>>;
};

type BarcodeDetectorConstructor = new (opts: { formats: string[] }) => BarcodeDetectorLike;

export function CameraCodeScanner({
  onCode,
  label = 'Ouvrir la caméra',
  hint = 'Scannez un QR code ou un code-barres avec la caméra disponible.',
}: {
  onCode: (code: string) => void;
  label?: string;
  hint?: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [active, setActive] = useState(false);
  const [supported, setSupported] = useState(true);
  const [devices, setDevices] = useState<CameraDevice[]>([]);
  const [deviceId, setDeviceId] = useState('');
  const [preferredFacingMode, setPreferredFacingMode] = useState<CameraFacingMode>('environment');
  const [scanning, setScanning] = useState(false);

  const loadDevices = async () => {
    if (!navigator.mediaDevices?.enumerateDevices) return;
    const allDevices = await navigator.mediaDevices.enumerateDevices();
    const cameras = allDevices
      .filter((device) => device.kind === 'videoinput')
      .map((device, index) => ({
        deviceId: device.deviceId,
        label: device.label || `Caméra ${index + 1}`,
      }));
    setDevices(cameras);
    setDeviceId((currentDeviceId) => {
      if (!currentDeviceId) return '';
      return cameras.some((camera) => camera.deviceId === currentDeviceId) ? currentDeviceId : '';
    });
  };

  const toggleFacingMode = () => {
    setDeviceId('');
    setPreferredFacingMode((current) => (current === 'environment' ? 'user' : 'environment'));
  };

  useEffect(() => {
    void loadDevices();
  }, []);

  useEffect(() => {
    if (!active) return;
    let stream: MediaStream | null = null;
    let stopped = false;
    let detector: BarcodeDetectorLike | null = null;
    let fallbackTimer: number | null = null;

    const getCameraStream = async (): Promise<MediaStream> => {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('getUserMedia unavailable');
      }

      const facingFallback: CameraFacingMode = preferredFacingMode === 'environment' ? 'user' : 'environment';
      const preferredConstraints: MediaStreamConstraints[] = deviceId
        ? [
            { video: { deviceId: { exact: deviceId } } },
            { video: { facingMode: { ideal: preferredFacingMode } } },
            { video: { facingMode: { ideal: facingFallback } } },
            { video: true },
          ]
        : [
            { video: { facingMode: { ideal: preferredFacingMode } } },
            { video: { facingMode: { ideal: facingFallback } } },
            { video: true },
          ];

      let lastError: unknown = null;
      for (const constraints of preferredConstraints) {
        try {
          return await navigator.mediaDevices.getUserMedia(constraints);
        } catch (error) {
          lastError = error;
        }
      }

      throw lastError instanceof Error ? lastError : new Error('Unable to open camera');
    };

    const scanWithCanvas = () => {
      if (stopped || !videoRef.current || !canvasRef.current) return;
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const width = video.videoWidth;
      const height = video.videoHeight;

      if (width > 0 && height > 0) {
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext('2d', { willReadFrequently: true });
        if (context) {
          context.drawImage(video, 0, 0, width, height);
          const imageData = context.getImageData(0, 0, width, height);
          const result = jsQR(imageData.data, width, height);
          const raw = result?.data?.trim();
          if (raw) {
            onCode(raw);
            setActive(false);
            return;
          }
        }
      }

      fallbackTimer = window.setTimeout(scanWithCanvas, 350);
    };

    const start = async () => {
      try {
        const BarcodeDetectorCtor = (window as unknown as { BarcodeDetector?: BarcodeDetectorConstructor }).BarcodeDetector;
        if (!navigator.mediaDevices?.getUserMedia) {
          setSupported(false);
          return;
        }

        detector = BarcodeDetectorCtor
          ? new BarcodeDetectorCtor({
              formats: ['qr_code', 'code_128', 'code_39', 'ean_13'],
            })
          : null;

        stream = await getCameraStream();

        await loadDevices();
        if (!videoRef.current) return;
        videoRef.current.srcObject = stream;
        videoRef.current.muted = true;
        videoRef.current.playsInline = true;
        await videoRef.current.play();
        setScanning(true);
        setSupported(true);

        const tick = async () => {
          if (stopped || !videoRef.current) return;
          if (!detector) {
            scanWithCanvas();
            return;
          }
          const codes = await detector.detect(videoRef.current).catch(() => []);
          const raw = codes[0]?.rawValue?.trim();
          if (raw) {
            onCode(raw);
            setActive(false);
            return;
          }
          window.setTimeout(tick, 350);
        };
        void tick();
      } catch {
        setSupported(false);
        setScanning(false);
        setActive(false);
      }
    };

    void start();
    return () => {
      stopped = true;
      setScanning(false);
      if (fallbackTimer) window.clearTimeout(fallbackTimer);
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, [active, deviceId, onCode]);

  return (
    <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-3">
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="field-stack flex-1">
          <label className="field-label">Caméra</label>
          <select
            className="input"
            value={deviceId}
            onChange={(event) => setDeviceId(event.target.value)}
            disabled={devices.length === 0 || active}
          >
            <option value="">Caméra automatique intégrée</option>
            {devices.length > 0 ? (
              devices.map((device) => (
                <option key={device.deviceId} value={device.deviceId}>
                  {device.label}
                </option>
              ))
            ) : null}
          </select>
        </div>
          <div className="field-stack sm:min-w-[13rem]">
            <label className="field-label">Retourner</label>
            <button
              className="btn-outline flex h-11 items-center justify-center gap-2"
              type="button"
              onClick={toggleFacingMode}
              disabled={active && devices.length === 0}
              title={preferredFacingMode === 'environment' ? 'Passer à la caméra frontale' : 'Passer à la caméra arrière'}
              aria-label={preferredFacingMode === 'environment' ? 'Passer à la caméra frontale' : 'Passer à la caméra arrière'}
            >
              <SwitchCamera size={14} />
              <span className="text-sm">{preferredFacingMode === 'environment' ? 'Arrière' : 'Avant'}</span>
            </button>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 lg:justify-end">
          <button className="btn-outline flex-1 sm:flex-none" type="button" onClick={() => void loadDevices()} disabled={active}>
            <RefreshCw size={14} />
            Actualiser
          </button>
          {active ? (
            <button className="btn-outline flex-1 sm:flex-none" type="button" onClick={() => setActive(false)}>
              <Square size={14} />
              Stop
            </button>
          ) : (
            <button className="btn-primary flex-1 sm:flex-none" type="button" onClick={() => setActive(true)}>
              <Camera size={14} />
              {label}
            </button>
          )}
        </div>
      </div>

      {active && supported ? (
        <>
          <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-black">
            <video
              ref={videoRef}
              className="h-[min(72vh,34rem)] min-h-72 w-full object-cover"
              muted
              autoPlay
              playsInline
            />
            <div className="pointer-events-none absolute left-3 top-3 rounded-full bg-black/55 px-3 py-1 text-xs font-semibold text-white backdrop-blur-sm">
              {scanning ? 'Scan en cours…' : 'Ouverture de la caméra…'}
            </div>
          </div>
          <canvas ref={canvasRef} className="hidden" />
        </>
      ) : null}

      {!supported ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Scanner caméra non disponible sur ce navigateur. Sur iPhone/iPad Safari, ouvrez la page en HTTPS et autorisez la caméra. Sinon, utilisez le champ manuel ou un lecteur code-barres USB/clavier.
        </p>
      ) : (
        <p className="text-xs text-slate-400">
          {scanning ? 'Scan en cours...' : hint}
        </p>
      )}
    </div>
  );
}
