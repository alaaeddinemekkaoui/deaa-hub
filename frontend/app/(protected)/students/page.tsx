'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { BookOpen, CalendarRange, GraduationCap, Search } from 'lucide-react';
import { EmptyState } from '@/components/admin/empty-state';
import { ExportDataButton } from '@/components/admin/export-data-button';
import { ImportDataButton } from '@/components/admin/import-data-button';
import { MetricCard } from '@/components/admin/metric-card';
import { ModalShell } from '@/components/admin/modal-shell';
import { PageHeader } from '@/components/admin/page-header';
import { api, getApiErrorMessage, PaginatedResponse } from '@/services/api';
import { toast } from 'sonner';

type StudentClassHistory = {
  id: number;
  academicYear: string;
  studyYear: number;
  academicClass: {
    id: number;
    name: string;
    year?: number;
  };
};

type Student = {
  id: number;
  firstName?: string | null;
  lastName?: string | null;
  fullName: string;
  sex: 'male' | 'female';
  firstYearEntry: number;
  codeMassar: string;
  cin: string;
  dateNaissance?: string;
  email?: string;
  telephone?: string;
  anneeAcademique: string;
  dateInscription?: string;
  bacType?: string | null;
  filiereId?: number | null;
  classId?: number | null;
  filiere?: { name: string } | null;
  academicClass?: { id?: number; name: string; year: number } | null;
  classHistory?: StudentClassHistory[];
  laureate?: { id: number; graduationYear: number; diplomaStatus: string } | null;
};

type Filiere = { id: number; name: string };
type AcademicClass = { id: number; name: string; year: number };

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [filieres, setFilieres] = useState<Filiere[]>([]);
  const [classes, setClasses] = useState<AcademicClass[]>([]);
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [sex, setSex] = useState<'male' | 'female'>('male');
  const [firstYearEntry, setFirstYearEntry] = useState(String(new Date().getFullYear()));
  const [cin, setCin] = useState('');
  const [codeMassar, setCodeMassar] = useState('');
  const [dateNaissance, setDateNaissance] = useState('2000-01-01');
  const [email, setEmail] = useState('');
  const [telephone, setTelephone] = useState('');
  const [filiereId, setFiliereId] = useState('');
  const [classId, setClassId] = useState('');
  const [bacType, setBacType] = useState('');
  const [anneeAcademique, setAnneeAcademique] = useState('2025/2026');
  const [dateInscription, setDateInscription] = useState(new Date().toISOString().split('T')[0]);

  const parseOptionalId = (value: string): number | undefined => {
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    const parsed = Number(trimmed);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
  };

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);

        const studentParams: Record<string, string | number> = {
          page: 1,
          limit: 100,
        };

        const normalizedQuery = query.trim();
        if (normalizedQuery) {
          studentParams.search = normalizedQuery;
        }

        const [studentsRes, filieresRes, classesRes] = await Promise.all([
          api.get<PaginatedResponse<Student>>('/students', {
            params: studentParams,
          }),
          api.get<PaginatedResponse<Filiere>>('/filieres', {
            params: { page: 1, limit: 1000, sortBy: 'name', sortOrder: 'asc' },
          }),
          api.get<PaginatedResponse<AcademicClass>>('/classes', {
            params: { page: 1, limit: 1000, sortBy: 'name', sortOrder: 'asc' },
          }),
        ]);

        const nextStudents = studentsRes.data.data;
        const nextFilieres = filieresRes.data.data;
        const nextClasses = classesRes.data.data;

        setStudents(nextStudents);
        setFilieres(nextFilieres);
        setClasses(nextClasses);

        if (!filiereId && nextFilieres.length > 0) {
          setFiliereId(String(nextFilieres[0].id));
        }
        if (!classId && nextClasses.length > 0) {
          setClassId(String(nextClasses[0].id));
        }
      } catch (loadError) {
        setError(getApiErrorMessage(loadError, 'Failed to load students data'));
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [query, refreshKey, filiereId, classId]);

  const resetForm = () => {
    setEditingId(null);
    setFirstName('');
    setLastName('');
    setSex('male');
    setFirstYearEntry(String(new Date().getFullYear()));
    setCin('');
    setCodeMassar('');
    setDateNaissance('2000-01-01');
    setEmail('');
    setTelephone('');
    setFiliereId('');
    setClassId('');
    setBacType('');
    setAnneeAcademique('2025/2026');
    setDateInscription(new Date().toISOString().split('T')[0]);
  };

  const openCreateModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    resetForm();
  };

  const onSubmit = async () => {
    if (
      !firstName.trim() ||
      !lastName.trim() ||
      !cin.trim() ||
      !codeMassar.trim() ||
      !classId ||
      !firstYearEntry
    ) {
      return;
    }

    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        fullName: `${firstName.trim()} ${lastName.trim()}`.trim(),
        sex,
        firstYearEntry: Number(firstYearEntry),
        cin: cin.trim(),
        codeMassar: codeMassar.trim(),
        dateNaissance,
        email: email.trim() || undefined,
        telephone: telephone.trim() || undefined,
        anneeAcademique: anneeAcademique.trim(),
        dateInscription,
        classId: Number(classId),
      };

      const parsedFiliereId = parseOptionalId(filiereId);
      payload.filiereId = parsedFiliereId ?? null;
      payload.bacType = bacType.trim() || null;

      if (editingId) {
        await api.patch(`/students/${editingId}`, payload);
        toast.success('Student updated successfully');
      } else {
        await api.post('/students', payload);
        toast.success('Student created successfully');
      }

      resetForm();
      setIsModalOpen(false);
      setRefreshKey((value) => value + 1);
    } catch {
      toast.error('Failed to save student');
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (id: number) => {
    if (!window.confirm('Supprimer cet étudiant ?')) return;
    try {
      await api.delete(`/students/${id}`);
      toast.success('Student deleted successfully');
      if (editingId === id) resetForm();
      setRefreshKey((value) => value + 1);
    } catch {
      toast.error('Failed to delete student');
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Administration des étudiants"
        description="Gérez les profils d'étudiants, les affectations de classes et les dossiers académiques. Importez en masse ou ajoutez individuellement."
      />

      <section className="grid gap-4 md:grid-cols-3">
        <MetricCard
          label="Total d'étudiants"
          value={students.length}
          hint="Enregistrements actuellement chargés"
          icon={GraduationCap}
        />
        <MetricCard
          label="Filières"
          value={filieres.length}
          hint="Programmes disponibles"
          icon={BookOpen}
        />
        <MetricCard
          label="Classes"
          value={classes.length}
          hint="Groupes académiques actifs"
          icon={CalendarRange}
        />
      </section>

      <section className="flex justify-end gap-2">
        <ImportDataButton onSuccess={() => setRefreshKey((k) => k + 1)} />
        <ExportDataButton />
        <button className="btn-primary" type="button" onClick={openCreateModal}>
          Ajouter un étudiant
        </button>
      </section>

      <div className="toolbar-shell">
        <div className="toolbar-group">
          <div className="relative flex-1 max-w-sm">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              className="input pl-9"
              placeholder="Chercher par nom, CIN, Massar..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && setQuery(search.trim())}
            />
          </div>
          <button className="btn-primary" type="button" onClick={() => setQuery(search.trim())}>
            Chercher
          </button>
          {query && (
            <button
              className="btn-outline"
              type="button"
              onClick={() => { setSearch(''); setQuery(''); }}
            >
              Effacer
            </button>
          )}
        </div>
      </div>

      {loading && <div className="empty-note">Chargement des étudiants...</div>}
      {!loading && error && <div className="empty-note">{error}</div>}
      {!loading && !error && students.length === 0 && (
        <EmptyState
          title="Aucun étudiant trouvé"
          description="Ajoutez un étudiant manuellement ou importez un fichier CSV/Excel pour commencer."
        />
      )}

      {!loading && students.length > 0 && (
      <div className="data-table-wrap">
        <div className="table-scroll max-h-[70vh] overflow-y-auto">
          <table className="table-base">
            <thead>
              <tr>
                <th>ID</th>
                <th>Nom complet</th>
                <th>Sexe</th>
                <th>Année d'entrée</th>
                <th>Code Massar</th>
                <th>CIN</th>
                <th>Filière</th>
                <th>Classe actuelle</th>
                <th>Année académique</th>
                <th>Lauréat</th>
                <th>Historique</th>
                <th>E-mail</th>
                <th>Téléphone</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {students.map((student) => (
                <tr key={student.id}>
                  <td>{student.id}</td>
                  <td>{student.fullName}</td>
                  <td>{student.sex}</td>
                  <td>{student.firstYearEntry}</td>
                  <td>{student.codeMassar}</td>
                  <td>{student.cin}</td>
                  <td>{student.filiere?.name ?? '-'}</td>
                  <td>{student.academicClass ? `${student.academicClass.name} (Année ${student.academicClass.year})` : '-'}</td>
                  <td>{student.anneeAcademique}</td>
                  <td>
                    {student.laureate ? (
                      <span className="status-chip status-chip--ok">
                        Lauréat {student.laureate.graduationYear}
                      </span>
                    ) : (
                      <span className="status-chip status-chip--muted">Non</span>
                    )}
                  </td>
                  <td>
                    {student.classHistory && student.classHistory.length > 0 ? (
                      <div className="space-y-1">
                        {student.classHistory.map((entry) => (
                          <p key={entry.id} className="text-xs text-slate-600">
                            {entry.academicYear}: {entry.academicClass.name} (Y{entry.studyYear})
                          </p>
                        ))}
                      </div>
                    ) : (
                      '-'
                    )}
                  </td>
                  <td>{student.email ?? '-'}</td>
                  <td>{student.telephone ?? '-'}</td>
                  <td>
                    <div className="flex flex-wrap gap-2">
                      <Link className="btn-outline" href={`/students/${student.id}`}>
                        Profil
                      </Link>
                      <button
                        type="button"
                        className="btn-outline"
                        onClick={() => {
                          setEditingId(student.id);
                          const inferredFirstName =
                            student.firstName?.trim() ||
                            student.fullName?.split(' ')[0] ||
                            '';
                          const inferredLastName =
                            student.lastName?.trim() ||
                            student.fullName?.split(' ').slice(1).join(' ') ||
                            '';
                          setFirstName(inferredFirstName);
                          setLastName(inferredLastName);
                          setSex(student.sex);
                          setFirstYearEntry(String(student.firstYearEntry));
                          setCin(student.cin);
                          setCodeMassar(student.codeMassar);
                          setDateNaissance(student.dateNaissance ? student.dateNaissance.split('T')[0] : '2000-01-01');
                          setEmail(student.email ?? '');
                          setTelephone(student.telephone ?? '');
                          setFiliereId(String(student.filiereId ?? ''));
                          setClassId(String(student.classId ?? student.academicClass?.id ?? ''));
                          setBacType(student.bacType ?? '');
                          setAnneeAcademique(student.anneeAcademique);
                          setDateInscription(student.dateInscription ? student.dateInscription.split('T')[0] : new Date().toISOString().split('T')[0]);
                          setIsModalOpen(true);
                        }}
                      >
                        Modifier
                      </button>
                      <button type="button" className="btn-outline" onClick={() => onDelete(student.id)}>
                        Supprimer
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      )}

      <ModalShell
        open={isModalOpen}
        title={editingId ? 'Modifier l\'étudiant' : 'Ajouter un étudiant'}
        description="Créez ou mettez à jour les détails du profil d'étudiant, le placement en classe et les informations de type bac."
        onClose={closeModal}
        footer={
          <>
            <button
              className="btn-primary"
              type="button"
              onClick={onSubmit}
              disabled={saving}
            >
              {editingId ? 'Enregistrer les modifications' : 'Créer un étudiant'}
            </button>
            <button className="btn-outline" type="button" onClick={closeModal}>
              Annuler
            </button>
          </>
        }
      >
        <div className="form-grid md:grid-cols-1 xl:grid-cols-2">
          <div className="field-stack xl:col-span-2">
            <label className="field-label">Prénom</label>
            <input className="input" value={firstName} onChange={(event) => setFirstName(event.target.value)} />
          </div>
          <div className="field-stack xl:col-span-2">
            <label className="field-label">Nom</label>
            <input className="input" value={lastName} onChange={(event) => setLastName(event.target.value)} />
          </div>
          <div className="field-stack">
            <label className="field-label">Sexe</label>
            <select className="input" value={sex} onChange={(event) => setSex(event.target.value as 'male' | 'female')}>
              <option value="male">Homme</option>
              <option value="female">Femme</option>
            </select>
          </div>
          <div className="field-stack">
            <label className="field-label">Année d'entrée</label>
            <input
              className="input"
              type="number"
              min={1900}
              max={2100}
              value={firstYearEntry}
              onChange={(event) => setFirstYearEntry(event.target.value)}
            />
          </div>
          <div className="field-stack">
            <label className="field-label">CIN</label>
            <input className="input" value={cin} onChange={(event) => setCin(event.target.value)} />
          </div>
          <div className="field-stack">
            <label className="field-label">Code Massar</label>
            <input className="input" value={codeMassar} onChange={(event) => setCodeMassar(event.target.value)} />
          </div>
          <div className="field-stack">
            <label className="field-label">Date de naissance</label>
            <input className="input" type="date" value={dateNaissance} onChange={(event) => setDateNaissance(event.target.value)} />
          </div>
          <div className="field-stack">
            <label className="field-label">Année académique</label>
            <input className="input" value={anneeAcademique} onChange={(event) => setAnneeAcademique(event.target.value)} />
          </div>
          <div className="field-stack">
            <label className="field-label">Date d'inscription</label>
            <input className="input" type="date" value={dateInscription} onChange={(event) => setDateInscription(event.target.value)} />
          </div>
          <div className="field-stack">
            <label className="field-label">Filière</label>
            <select className="input" value={filiereId} onChange={(event) => setFiliereId(event.target.value)}>
              <option value="">Non assignée</option>
              {filieres.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field-stack">
            <label className="field-label">Classe</label>
            <select className="input" value={classId} onChange={(event) => setClassId(event.target.value)}>
              <option value="">Sélectionner une classe</option>
              {classes.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} (Année {item.year})
                </option>
              ))}
            </select>
          </div>
          <div className="field-stack">
            <label className="field-label">Type de bac</label>
            <input className="input" value={bacType} onChange={(event) => setBacType(event.target.value)} placeholder="Ex. Sciences Math A" />
          </div>
          <div className="field-stack">
            <label className="field-label">E-mail</label>
            <input className="input" type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
          </div>
          <div className="field-stack xl:col-span-2">
            <label className="field-label">Téléphone</label>
            <input className="input" value={telephone} onChange={(event) => setTelephone(event.target.value)} />
          </div>
        </div>
      </ModalShell>
    </div>
  );
}
