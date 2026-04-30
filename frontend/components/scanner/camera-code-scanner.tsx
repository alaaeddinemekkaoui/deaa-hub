'use client';

import { MobileQRScanner } from './mobile-qr-scanner';

export function CameraCodeScanner({
  onCode,
  label,
  hint,
}: {
  onCode: (code: string) => void;
  label?: string;
  hint?: string;
}) {
  return <MobileQRScanner onScan={onCode} label={label} hint={hint} />;
}
