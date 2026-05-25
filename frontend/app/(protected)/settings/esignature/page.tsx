'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { PenTool, Upload } from 'lucide-react';
import { PageHeader } from '@/components/admin/page-header';
import { api, getApiErrorMessage } from '@/services/api';
import { toast } from 'sonner';

type ESignature = {
  id: number;
  name: string;
  mimeType: string;
  size?: number | null;
  uploadedAt: string;
};

export default function ESignatureSettingsPage() {
  const [signature, setSignature] = useState<ESignature | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const objectUrlRef = useRef<string | null>(null);

  const setPreviewUrl = useCallback((url: string | null) => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
    }
    objectUrlRef.current = url;
    setImageUrl(url);
  }, []);

  const load = useCallback(async () => {
    try {
      const res = await api.get<ESignature | null>('/documents/e-signature');
      setSignature(res.data);
      if (!res.data) {
        setPreviewUrl(null);
        return;
      }
      const image = await api.get<Blob>('/documents/e-signature/image', {
        responseType: 'blob',
      });
      setPreviewUrl(URL.createObjectURL(image.data));
    } catch {
      setSignature(null);
      setPreviewUrl(null);
    }
  }, [setPreviewUrl]);

  useEffect(() => {
    void load();
    return () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    };
  }, [load]);

  const uploadSignature = async (file: File) => {
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      await api.post('/documents/e-signature/upload', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success('Signature électronique mise à jour');
      await load();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Upload de la signature impossible'));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Paramètres"
        title="E-signature"
        description="Image officielle utilisée dans les documents générés automatiquement."
      />

      <section className="surface-card space-y-5">
        <div className="panel-header">
          <div>
            <h2 className="panel-title">Signature active</h2>
            <p className="panel-copy">
              Une seule image est conservée comme signature officielle.
            </p>
          </div>
          <button
            type="button"
            className="btn-primary flex items-center gap-2"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
          >
            <Upload size={14} />
            {uploading ? 'Upload...' : 'Uploader'}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".png,.jpg,.jpeg"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void uploadSignature(file);
            }}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-[260px_1fr]">
          <div className="flex min-h-40 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4">
            {imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={imageUrl}
                alt="Signature électronique"
                className="max-h-28 max-w-full object-contain"
              />
            ) : (
              <div className="text-center text-slate-400">
                <PenTool className="mx-auto mb-2" size={28} />
                <p className="text-sm">Aucune signature</p>
              </div>
            )}
          </div>
          <div className="space-y-2 text-sm text-slate-600">
            <p>
              <span className="font-semibold text-slate-900">Fichier:</span>{' '}
              {signature?.name ?? 'Non configuré'}
            </p>
            <p>
              <span className="font-semibold text-slate-900">Format:</span>{' '}
              {signature?.mimeType ?? 'PNG ou JPG'}
            </p>
            <p>
              <span className="font-semibold text-slate-900">Dernière mise à jour:</span>{' '}
              {signature
                ? new Date(signature.uploadedAt).toLocaleString('fr-FR')
                : '—'}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
