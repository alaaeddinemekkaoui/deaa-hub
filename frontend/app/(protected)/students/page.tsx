'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { BookOpen, CalendarRange, GraduationCap, KeyRound, Search, UserPlus, Users } from 'lucide-react';
import { EmptyState } from '@/components/admin/empty-state';
import { ExportDataButton } from '@/components/admin/export-data-button';
import { ImportDataButton } from '@/components/admin/import-data-button';
import { MetricCard } from '@/components/admin/metric-card';
import { ModalShell } from '@/components/admin/modal-shell';
import { PageHeader } from '@/components/admin/page-header';
import { api, fetchRef, getApiErrorMessage, PaginatedResponse } from '@/services/api';
import { useAuth } from '@/features/auth/auth-context';
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
  codeEtudiant?: string | null;
  cin: string;
  dateNaissance?: string;
  email?: string;
  telephone?: string;
  anneeAcademique: string;
  dateInscription?: string;
  bacType?: string | null;
  filiereId?: number | null;
  classId?: number | null;
  userId?: number | null;
  filiere?: { name: string } | null;
  academicClass?: { id?: number; name: string; year: number } | null;
  classHistory?: StudentClassHistory[];
  laureate?: { id: number; graduationYear: number; diplomaStatus: string } | null;
};

type Filiere = { id: number; name: string; departmentId?: number };
type AcademicClass = { id: number; name: string; year: number; filiereId?: number | null };

export default function StudentsPage() {
  const { user } = useAuth();
  const canDelete = user?.role === 'admin';
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
  const [codeEtudiant, setCodeEtudiant] = useState('');
  const [dateNaissance, setDateNaissance] = useState('2000-01-01');
  const [email, setEmail] = useState('');
  const [telephone, setTelephone] = useState('');
  const [filiereId, setFiliereId] = useState('');
  const [classId, setClassId] = useState('');
  const [bacType, setBacType] = useState('');
  const [anneeAcademique, setAnneeAcademique] = useState('2025/2026');
  const [dateInscription, setDateInscription] = useState(new Date().toISOString().split('T')[0]);
  const [isLaureate, setIsLaureate] = useState(false);
  const [graduationYear, setGraduationYear] = useState(String(new Date().getFullYear()));

  // Account-creation modal (single student)
  const [accountStudentId, setAccountStudentId] = useState<number | null>(null);
  const [accountStudentName, setAccountStudentName] = useState('');
  const [accountPassword, setAccountPassword] = useState('');
  const [accountSaving, setAccountSaving] = useState(false);

  // Bulk create-accounts modal
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [bulkPassword, setBulkPassword] = useState('');
  const [bulkSaving, setBulkSaving] = useState(false);

  const parseOptionalId = (value: string): number | undefined => {
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    const parsed = Number(trimmed);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
  };

  const getSortedHistory = (history: StudentClassHistory[] = []) =>
    [...history].sort(
      (a, b) => a.academicYear.localeCompare(b.academicYear) || a.id - b.id,
    );

  const isHistoryEntryRedoublant = (
    history: StudentClassHistory[],
    entryId: number,
  ): boolean => {
    const seenClassIds = new Set<number>();

    for (const entry of history) {
      const classId = entry.academicClass.id;
      const repeated = seenClassIds.has(classId);

      if (entry.id === entryId) {
        return repeated;
      }

      seenClassIds.add(classId);
    }

    return false;
  };

  const isCurrentClassRedoublant = (student: Student): boolean => {
    if (!student.academicClass || !student.classHistory?.length) {
      return false;
    }

    const sortedHistory = getSortedHistory(student.classHistory);
    const latestEntry = sortedHistory[sortedHistory.length - 1];

    if (!latestEntry || latestEntry.academicClass.id !== student.academicClass.id) {
      return false;
    }

    return isHistoryEntryRedoublant(sortedHistory, latestEntry.id);
  };

  // Load reference data once per session
  useEffect(() => {
    const loadRef = async () => {
      try {
        const [filieresData, classesData] = await Promise.all([
          fetchRef<PaginatedResponse<Filiere>>('/filieres?page=1&limit=1000&sortBy=name&sortOrder=asc'),
          fetchRef<PaginatedResponse<AcademicClass>>('/classes?page=1&limit=1000&sortBy=name&sortOrder=asc'),
        ]);
        setFilieres(filieresData.data);
        setClasses(classesData.data);
        if (filieresData.data.length > 0) setFiliereId(String(filieresData.data[0].id));
        if (classesData.data.length > 0) setClassId(String(classesData.data[0].id));
      } catch {
        // non-fatal
      }
    };
    void loadRef();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load students when search query or refresh changes
  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const studentParams: Record<string, string | number> = { page: 1, limit: 100 };
        const normalizedQuery = query.trim();
        if (normalizedQuery) studentParams.search = normalizedQuery;
        const studentsRes = await api.get<PaginatedResponse<Student>>('/students', { params: studentParams });
        setStudents(studentsRes.data.data);
      } catch (loadError) {
        setError(getApiErrorMessage(loadError, 'Failed to load students data'));
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [query, refreshKey]);

  const resetForm = () => {
    setEditingId(null);
    setFirstName('');
    setLastName('');
    setSex('male');
    setFirstYearEntry(String(new Date().getFullYear()));
    setCin('');
    setCodeMassar('');
    setCodeEtudiant('');
    setDateNaissance('2000-01-01');
    setEmail('');
    setTelephone('');
    setFiliereId('');
    setClassId('');
    setBacType('');
    setAnneeAcademique('2025/2026');
    setDateInscription(new Date().toISOString().split('T')[0]);
    setIsLaureate(false);
    setGraduationYear(String(new Date().getFullYear()));
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
        codeEtudiant: codeEtudiant.trim() || undefined,
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

        // Handle laureate status
        if (isLaureate) {
          await api.post(`/students/${editingId}/make-laureate`, {
            graduationYear: Number(graduationYear),
          });
        } else {
          // Remove laureate status if unchecked
          await api.delete(`/students/${editingId}/remove-laureate`).catch(() => {});
        }

        toast.success('Étudiant mis à jour avec succès');
      } else {
        await api.post('/students', payload);
        toast.success('Étudiant créé avec succès');
      }

      resetForm();
      setIsModalOpen(false);
      setRefreshKey((value) => value + 1);
    } catch {
      toast.error('Échec de l\'enregistrement de l\'étudiant');
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (id: number) => {
    if (!window.confirm('Supprimer cet étudiant ?')) return;
    try {
      await api.delete(`/students/${id}`);
      toast.success('Étudiant supprimé avec succès');
      if (editingId === id) resetForm();
      setRefreshKey((value) => value + 1);
    } catch {
      toast.error('Échec de la suppression de l\'étudiant');
    }
  };

  const onCreateAccount = async () => {
    if (!accountStudentId || accountPassword.length < 6) return;
    setAccountSaving(true);
    try {
      await api.post(`/students/${accountStudentId}/create-account`, { password: accountPassword });
      toast.success(`Compte créé pour ${accountStudentName}`);
      setAccountStudentId(null);
      setAccountStudentName('');
      setAccountPassword('');
      setRefreshKey((v) => v + 1);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Échec de la création du compte'));
    } finally {
      setAccountSaving(false);
    }
  };

  const onBulkCreateAccounts = async () => {
    if (bulkPassword.length < 6) return;
    const withoutAccount = students.filter((s) => !s.userId).map((s) => s.id);
    if (withoutAccount.length === 0) {
      toast.info('Tous les étudiants ont déjà un compte');
      return;
    }
    setBulkSaving(true);
    try {
      const res = await api.post<{ created: number; skipped: number }>(
        '/students/bulk-create-accounts',
        { studentIds: withoutAccount, defaultPassword: bulkPassword },
      );
      toast.success(`${res.data.created} compte(s) créé(s), ${res.data.skipped} ignoré(s)`);
      setBulkModalOpen(false);
      setBulkPassword('');
      setRefreshKey((v) => v + 1);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Échec de la création en masse'));
    } finally {
      setBulkSaving(false);
    }
  };

  const studentsWithoutAccount = students.filter((s) => !s.userId).length;

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
        {studentsWithoutAccount > 0 && (
          <button
            className="btn-outline flex items-center gap-1.5"
            type="button"
            onClick={() => setBulkModalOpen(true)}
          >
            <Users size={15} />
            Créer comptes ({studentsWithoutAccount})
          </button>
        )}
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
                <th>Code Étudiant</th>
                <th>CIN</th>
                <th>Filière</th>
                <th>Classe actuelle</th>
                <th>Année académique</th>
                <th>Lauréat</th>
                <th>Historique</th>
                <th>E-mail</th>
                <th>Téléphone</th>
                <th>Compte</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {students.map((student) => (
                <tr key={student.id}>
                  <td>{student.id}</td>
                  <td>
                    <div className="flex items-center gap-2">
                      <span>{student.fullName}</span>
                      {isCurrentClassRedoublant(student) && (
                        <span className="status-chip status-chip--warn text-xs">
                          Redoublant
                        </span>
                      )}
                    </div>
                  </td>
                  <td>{student.sex}</td>
                  <td>{student.firstYearEntry}</td>
                  <td>{student.codeMassar}</td>
                  <td>{student.codeEtudiant ?? '-'}</td>
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
                        {getSortedHistory(student.classHistory).map((entry, _idx, sortedHistory) => {
                          const isEntryRedoublant = isHistoryEntryRedoublant(
                            sortedHistory,
                            entry.id,
                          );

                          return (
                            <p key={entry.id} className="text-xs text-slate-600">
                              {entry.academicYear}: {entry.academicClass.name} (Y{entry.studyYear})
                              {isEntryRedoublant ? ' · Redoublant' : ''}
                            </p>
                          );
                        })}
                      </div>
                    ) : (
                      '-'
                    )}
                  </td>
                  <td>{student.email ?? '-'}</td>
                  <td>{student.telephone ?? '-'}</td>
                  <td>
                    {student.userId ? (
                      <span className="status-chip status-chip--ok">Actif</span>
                    ) : (
                      <span className="status-chip status-chip--muted">Aucun</span>
                    )}
                  </td>
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
                          setCodeEtudiant(student.codeEtudiant ?? '');
                          setDateNaissance(student.dateNaissance ? student.dateNaissance.split('T')[0] : '2000-01-01');
                          setEmail(student.email ?? '');
                          setTelephone(student.telephone ?? '');
                          setFiliereId(String(student.filiereId ?? ''));
                          setClassId(String(student.classId ?? student.academicClass?.id ?? ''));
                          setBacType(student.bacType ?? '');
                          setAnneeAcademique(student.anneeAcademique);
                          setDateInscription(student.dateInscription ? student.dateInscription.split('T')[0] : new Date().toISOString().split('T')[0]);
                          setIsLaureate(!!student.laureate);
                          setGraduationYear(String(student.laureate?.graduationYear ?? new Date().getFullYear()));
                          setIsModalOpen(true);
                        }}
                      >
                        Modifier
                      </button>
                      {!student.userId && (
                        <button
                          type="button"
                          className="btn-outline flex items-center gap-1"
                          title="Créer un compte pour cet étudiant"
                          onClick={() => {
                            setAccountStudentId(student.id);
                            setAccountStudentName(student.fullName);
                            setAccountPassword('');
                          }}
                        >
                          <UserPlus size={13} />
                          Compte
                        </button>
                      )}
                      {canDelete && (
                        <button type="button" className="btn-outline" onClick={() => onDelete(student.id)}>
                          Supprimer
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      )}

      {/* Add / Edit student modal */}
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
            <label className="field-label">Code Étudiant</label>
            <input className="input" value={codeEtudiant} onChange={(event) => setCodeEtudiant(event.target.value)} placeholder="Ex. ET2025001" />
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
            <select
              className="input"
              value={filiereId}
              onChange={(event) => {
                setFiliereId(event.target.value);
                setClassId('');
              }}
            >
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
              {classes
                .filter((item) => !filiereId || item.filiereId === Number(filiereId))
                .map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} (Année {item.year})
                  </option>
                ))}
            </select>
            {filiereId && classes.filter((c) => c.filiereId === Number(filiereId)).length === 0 && (
              <p className="text-xs text-slate-400">Aucune classe pour cette filière.</p>
            )}
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

          {/* Laureate section */}
          <div className="field-stack xl:col-span-2 border-t pt-4 mt-4">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="is-laureate"
                checked={isLaureate}
                onChange={(e) => setIsLaureate(e.target.checked)}
                className="w-4 h-4 cursor-pointer"
              />
              <label htmlFor="is-laureate" className="field-label cursor-pointer mb-0">
                Lauréat
              </label>
            </div>
            {isLaureate && (
              <div className="mt-3">
                <label className="field-label">Année de graduation</label>
                <input
                  className="input"
                  type="number"
                  min={1900}
                  max={2100}
                  value={graduationYear}
                  onChange={(event) => setGraduationYear(event.target.value)}
                />
              </div>
            )}
          </div>
        </div>
      </ModalShell>

      {/* Single account creation modal */}
      <ModalShell
        open={accountStudentId !== null}
        title="Créer un compte étudiant"
        description={`Créer un compte utilisateur pour ${accountStudentName}. Le code étudiant sera utilisé comme identifiant de connexion.`}
        onClose={() => { setAccountStudentId(null); setAccountPassword(''); }}
        footer={
          <>
            <button
              className="btn-primary flex items-center gap-1.5"
              type="button"
              onClick={onCreateAccount}
              disabled={accountSaving || accountPassword.length < 6}
            >
              <KeyRound size={14} />
              {accountSaving ? 'Création...' : 'Créer le compte'}
            </button>
            <button
              className="btn-outline"
              type="button"
              onClick={() => { setAccountStudentId(null); setAccountPassword(''); }}
            >
              Annuler
            </button>
          </>
        }
      >
        <div className="field-stack">
          <label className="field-label">Mot de passe par défaut</label>
          <input
            className="input"
            type="password"
            value={accountPassword}
            onChange={(e) => setAccountPassword(e.target.value)}
            placeholder="Minimum 6 caractères"
            autoComplete="new-password"
          />
          {accountPassword.length > 0 && accountPassword.length < 6 && (
            <p className="text-xs text-red-500">Le mot de passe doit comporter au moins 6 caractères.</p>
          )}
        </div>
      </ModalShell>

      {/* Bulk account creation modal */}
      <ModalShell
        open={bulkModalOpen}
        title="Créer des comptes en masse"
        description={`Créer des comptes pour ${studentsWithoutAccount} étudiant(s) sans compte. Un mot de passe commun sera appliqué à tous.`}
        onClose={() => { setBulkModalOpen(false); setBulkPassword(''); }}
        footer={
          <>
            <button
              className="btn-primary flex items-center gap-1.5"
              type="button"
              onClick={onBulkCreateAccounts}
              disabled={bulkSaving || bulkPassword.length < 6}
            >
              <Users size={14} />
              {bulkSaving ? 'Création...' : `Créer ${studentsWithoutAccount} compte(s)`}
            </button>
            <button
              className="btn-outline"
              type="button"
              onClick={() => { setBulkModalOpen(false); setBulkPassword(''); }}
            >
              Annuler
            </button>
          </>
        }
      >
        <div className="field-stack">
          <label className="field-label">Mot de passe commun</label>
          <input
            className="input"
            type="password"
            value={bulkPassword}
            onChange={(e) => setBulkPassword(e.target.value)}
            placeholder="Minimum 6 caractères"
            autoComplete="new-password"
          />
          {bulkPassword.length > 0 && bulkPassword.length < 6 && (
            <p className="text-xs text-red-500">Le mot de passe doit comporter au moins 6 caractères.</p>
          )}
          <p className="text-xs text-slate-500 mt-1">
            Les étudiants disposant déjà d'un compte seront ignorés automatiquement.
          </p>
        </div>
      </ModalShell>
    </div>
  );
}
