'use client';

import { useRef, useState } from 'react';
import { FileSpreadsheet, FileText, Upload, X } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { ModalShell } from '@/components/admin/modal-shell';
import { api } from '@/services/api';
import { toast } from 'sonner';

type ImportResult = { imported: number; errors: string[] };

type ImportDataButtonProps = {
  onSuccess?: () => void;
  label?: string;
};

const ROUTE_TO_ENDPOINT: Record<string, string> = {
  '/students':    '/students/import',
  '/teachers':    '/teachers/import',
  '/departments': '/departments/import',
  '/filieres':    '/filieres/import',
  '/classes':     '/classes/import',
  '/rooms':       '/rooms/import',
  '/laureates':   '/laureates/import',
};

const ROUTE_COLUMNS: Record<string, string> = {
  '/students':    'firstName, lastName, cin, codeMassar, sex, firstYearEntry, anneeAcademique, classId — (optional: filiereId, email, telephone, bacType)',
  '/teachers':    'firstName, lastName, departmentId, roleId, gradeId — (optional: cin, email, phoneNumber, filiereId)',
  '/departments': 'name',
  '/filieres':    'code, name, departmentId — (optional: filiereType)',
  '/classes':     'name, year — (optional: filiereId, classType)',
  '/rooms':       'name — (optional: capacity, availability)',
  '/laureates':   'studentId, graduationYear — (optional: diplomaStatus: retrieved | not_retrieved)',
};

export function ImportDataButton({ onSuccess, label = 'Import' }: ImportDataButtonProps) {
  const pathname = usePathname();
  const fileRef = useRef<HTMLInputElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  const endpoint = ROUTE_TO_ENDPOINT[pathname];
  const columns = ROUTE_COLUMNS[pathname];

  if (!endpoint) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0] ?? null;
    setFile(selected);
    setResult(null);
  };

  const handleClose = () => {
    setIsOpen(false);
    setFile(null);
    setResult(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleImport = async () => {
    if (!file) return;
    setLoading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const response = await api.post<ImportResult>(endpoint, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setResult(response.data);
      if (response.data.imported > 0) {
        toast.success(`${response.data.imported} record(s) imported successfully`);
        onSuccess?.();
      }
    } catch {
      toast.error('Import failed. Please check your file format.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        className="btn-outline gap-2"
        type="button"
        onClick={() => setIsOpen(true)}
      >
        <Upload size={16} />
        {label}
      </button>

      <ModalShell
        open={isOpen}
        title="Importer des données"
        description="Téléversez un fichier CSV ou Excel (.xlsx) pour importer des enregistrements en masse."
        onClose={handleClose}
        footer={
          result ? (
            <button className="btn-outline" type="button" onClick={handleClose}>
              Close
            </button>
          ) : (
            <>
              <button
                className="btn-primary"
                type="button"
                onClick={handleImport}
                disabled={!file || loading}
              >
                {loading ? 'Importing...' : 'Import now'}
              </button>
              <button className="btn-outline" type="button" onClick={handleClose}>
                Cancel
              </button>
            </>
          )
        }
      >
        {result ? (
          <div className="space-y-3">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
              <p className="text-sm font-semibold text-emerald-800">
                {result.imported} record(s) imported successfully
              </p>
            </div>
            {result.errors.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs font-semibold uppercase tracking-widest text-red-600">
                  {result.errors.length} row(s) skipped
                </p>
                <div className="max-h-48 overflow-y-auto rounded-xl border border-red-200 bg-red-50 px-3 py-2">
                  {result.errors.map((err, i) => (
                    <p key={i} className="text-xs text-red-700">{err}</p>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Format hint */}
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-500">
                Colonnes requises
              </p>
              <p className="text-xs leading-5 text-slate-600">{columns}</p>
            </div>

            {/* File picker */}
            <div
              className="cursor-pointer rounded-2xl border-2 border-dashed border-slate-300 px-5 py-8 text-center transition hover:border-primary hover:bg-emerald-50/40"
              onClick={() => fileRef.current?.click()}
            >
              {file ? (
                <div className="flex items-center justify-center gap-3">
                  {file.name.endsWith('.xlsx') ? (
                    <FileSpreadsheet size={22} className="text-emerald-600" />
                  ) : (
                    <FileText size={22} className="text-emerald-600" />
                  )}
                  <span className="text-sm font-medium text-slate-800">{file.name}</span>
                  <button
                    type="button"
                    className="ml-1 text-slate-400 hover:text-red-500"
                    onClick={(e) => {
                      e.stopPropagation();
                      setFile(null);
                      if (fileRef.current) fileRef.current.value = '';
                    }}
                  >
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <Upload size={28} className="mx-auto text-slate-400" />
                  <p className="text-sm font-medium text-slate-700">Cliquez pour sélectionner un fichier</p>
                  <p className="text-xs text-slate-400">CSV ou Excel (.xlsx), max 10 Mo</p>
                </div>
              )}
            </div>

            <input
              ref={fileRef}
              type="file"
              accept=".csv,.xlsx"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
        )}
      </ModalShell>
    </>
  );
}
