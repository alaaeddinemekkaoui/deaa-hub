'use client';

import { useEffect, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';
import { toast } from 'sonner';
import { api, getApiErrorMessage } from '@/services/api';
import type { StudentLookupResult } from './types';

type StudentLookupProps = {
  selectedStudent: StudentLookupResult | null;
  onSelect: (student: StudentLookupResult) => void;
  onClear: () => void;
};

export function StudentLookup({
  selectedStudent,
  onSelect,
  onClear,
}: StudentLookupProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<StudentLookupResult[]>([]);
  const [loading, setLoading] = useState(false);
  const latestQueryRef = useRef('');

  useEffect(() => {
    const normalizedQuery = query.trim();
    latestQueryRef.current = normalizedQuery;

    if (normalizedQuery.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const timeout = window.setTimeout(async () => {
      try {
        const response = await api.get<StudentLookupResult[]>('/restauration/students/search', {
          params: { q: normalizedQuery, limit: 12 },
        });

        if (latestQueryRef.current === normalizedQuery) {
          setResults(response.data);
        }
      } catch (error) {
        if (latestQueryRef.current === normalizedQuery) {
          setResults([]);
        }
        toast.error(getApiErrorMessage(error, 'Recherche etudiant impossible'));
      } finally {
        if (latestQueryRef.current === normalizedQuery) {
          setLoading(false);
        }
      }
    }, 250);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [query]);

  const handleSelect = (student: StudentLookupResult) => {
    onSelect(student);
    setQuery(student.fullName);
    setResults([]);
  };

  return (
    <section className="surface-card space-y-4">
      <div className="panel-header">
        <div>
          <h2 className="panel-title">Recherche etudiant</h2>
          <p className="panel-copy">Le champ reste vide jusqu&apos;a votre recherche. Aucun chargement massif.</p>
        </div>
      </div>

      <div className="field-stack">
        <label className="field-label">Nom ou code</label>
        <div className="relative">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            className="input pl-9"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Tapez au moins 2 caracteres"
          />
        </div>
      </div>

      {selectedStudent ? (
        <div className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3">
          <div>
            <p className="font-semibold text-emerald-900">{selectedStudent.fullName}</p>
            <p className="text-sm text-emerald-700">
              {selectedStudent.codeEtudiant || selectedStudent.codeMassar || 'Sans code'}
            </p>
          </div>
          <button
            className="btn-outline"
            type="button"
            onClick={() => {
              setQuery('');
              setResults([]);
              onClear();
            }}
          >
            <X size={14} />
            Effacer
          </button>
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white px-4 py-3 text-sm text-slate-500">
          Aucun etudiant selectionne.
        </div>
      )}

      {query.trim().length >= 2 && (
        <div className="rounded-lg border border-slate-200 bg-white">
          {loading ? (
            <div className="px-4 py-3 text-sm text-slate-500">Recherche...</div>
          ) : results.length === 0 ? (
            <div className="px-4 py-3 text-sm text-slate-500">Aucun resultat.</div>
          ) : (
            <div className="max-h-72 overflow-y-auto">
              {results.map((student) => (
                <button
                  key={student.id}
                  type="button"
                  className="flex w-full items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 text-left last:border-b-0 hover:bg-slate-50"
                  onClick={() => handleSelect(student)}
                >
                  <span>
                    <span className="block font-medium text-slate-950">{student.fullName}</span>
                    <span className="text-xs text-slate-400">
                      {student.codeEtudiant || student.codeMassar || 'Sans code'}
                    </span>
                  </span>
                  <span className="text-xs font-semibold text-emerald-700">Choisir</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
