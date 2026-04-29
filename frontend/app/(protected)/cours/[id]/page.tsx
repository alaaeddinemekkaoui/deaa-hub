'use client';

import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, CheckCircle2, Clock3, QrCode, Users } from 'lucide-react';
import { PageHeader } from '@/components/admin/page-header';
import { EmptyState } from '@/components/admin/empty-state';
import { api, getApiErrorMessage } from '@/services/api';
import { toast } from 'sonner';

type Profile = {
  cours: {
    id: number;
    name: string;
    type: string;
    elementModule?: {
      id: number;
      name: string;
      type: string;
      volumeHoraire?: number | null;
      module: { id: number; name: string };
    } | null;
    classes: Array<{
      classId: number;
      class: {
        id: number;
        name: string;
        year: number;
        filiere?: { name: string; department?: { name: string } } | null;
      };
      teacher?: { id: number; firstName: string; lastName: string } | null;
    }>;
  };
  selectedClassId: number | null;
  students: Array<{ id: number; fullName: string; codeMassar: string; codeEtudiant?: string | null }>;
  sessions: Array<{
    sessionId: number;
    className: string;
    teacherName: string | null;
    roomName: string | null;
    weekStart: string | null;
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    present: number;
    absent: number;
    pending: number;
  }>;
  stats: {
    totalHours: number;
    totalStudents: number;
    totalSessions: number;
    totalPresent: number;
    totalAbsent: number;
  };
};

export default function CoursProfilePage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const classId = searchParams.get('classId');
  const dateFrom = searchParams.get('dateFrom');
  const dateTo = searchParams.get('dateTo');

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await api.get<Profile>(`/cours/${params.id}/profile`, {
          params: {
            classId: classId || undefined,
            dateFrom: dateFrom || undefined,
            dateTo: dateTo || undefined,
          },
        });
        setProfile(res.data);
      } catch (error) {
        toast.error(getApiErrorMessage(error, 'Impossible de charger le profil du cours.'));
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [classId, dateFrom, dateTo, params.id]);

  const selectedClass = useMemo(
    () => profile?.cours.classes.find((item) => item.classId === profile.selectedClassId)?.class ?? null,
    [profile],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Profil du cours"
        title={profile?.cours.name ?? 'Cours'}
        description="Consultez les heures, la classe, les étudiants, les séances planifiées et le suivi des absences."
        actions={
          profile?.selectedClassId ? (
            <Link href={`/attendance?classId=${profile.selectedClassId}&courseId=${params.id}`} className="btn-primary flex items-center gap-2">
              <QrCode size={14} />
              Ouvrir présence
            </Link>
          ) : undefined
        }
      />

      {loading ? (
        <div className="empty-note">Chargement du cours...</div>
      ) : !profile ? (
        <EmptyState title="Cours introuvable" description="Le profil demandé n'a pas pu être chargé." />
      ) : (
        <>
          <section className="grid gap-4 md:grid-cols-4">
            <div className="surface-card">
              <p className="metric-card__label">Module</p>
              <p className="mt-2 text-lg font-semibold text-slate-950">{profile.cours.elementModule?.module.name ?? 'Non lié'}</p>
            </div>
            <div className="surface-card">
              <p className="metric-card__label">Volume horaire</p>
              <p className="mt-2 text-lg font-semibold text-slate-950">{profile.stats.totalHours}h</p>
            </div>
            <div className="surface-card">
              <p className="metric-card__label">Étudiants</p>
              <p className="mt-2 text-lg font-semibold text-slate-950">{profile.stats.totalStudents}</p>
            </div>
            <div className="surface-card">
              <p className="metric-card__label">Séances</p>
              <p className="mt-2 text-lg font-semibold text-slate-950">{profile.stats.totalSessions}</p>
            </div>
          </section>

          <section className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
            <div className="surface-card space-y-4">
              <div className="panel-header">
                <div>
                  <h2 className="panel-title">Contexte</h2>
                  <p className="panel-copy">Classe, enseignant et rattachement du cours.</p>
                </div>
              </div>
              <div className="grid gap-3 text-sm">
                <div className="rounded-2xl bg-slate-50 p-3">
                  <p className="text-slate-500">Classe active</p>
                  <p className="font-semibold text-slate-900">{selectedClass ? `${selectedClass.name} (Année ${selectedClass.year})` : 'Aucune'}</p>
                </div>
                {profile.cours.classes.map((item) => (
                  <div key={`${item.classId}-${item.teacher?.id ?? 'none'}`} className="rounded-2xl border p-3">
                    <p className="font-semibold text-slate-900">{item.class.name}</p>
                    <p className="text-xs text-slate-500">
                      {item.teacher ? `${item.teacher.firstName} ${item.teacher.lastName}` : 'Enseignant non assigné'}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="surface-card space-y-4">
              <div className="panel-header">
                <div>
                  <h2 className="panel-title">Étudiants de la classe</h2>
                  <p className="panel-copy">La liste est prête pour le pointage et le suivi des absences.</p>
                </div>
              </div>
              {profile.students.length === 0 ? (
                <EmptyState title="Aucun étudiant" description="Aucun étudiant n'est associé à cette classe." />
              ) : (
                <div className="grid gap-3 md:grid-cols-2">
                  {profile.students.map((student) => (
                    <div key={student.id} className="rounded-2xl border bg-white p-3 shadow-sm">
                      <p className="font-semibold text-slate-950">{student.fullName}</p>
                      <p className="text-xs text-slate-500">{student.codeEtudiant ?? student.codeMassar}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          <section className="surface-card space-y-4">
            <div className="panel-header">
              <div>
                <h2 className="panel-title">Séances et absences</h2>
                <p className="panel-copy">Nom, heures, enseignant, salle, absents et présents pour la période choisie.</p>
              </div>
            </div>
            {profile.sessions.length === 0 ? (
              <EmptyState title="Aucune séance" description="Aucune séance n'est planifiée pour ce filtre." />
            ) : (
              <div className="grid gap-3">
                {profile.sessions.map((session) => (
                  <div key={session.sessionId} className="rounded-3xl border bg-white px-4 py-4 shadow-sm">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div className="space-y-1">
                        <p className="font-semibold text-slate-950">{session.className}</p>
                        <div className="flex flex-wrap gap-3 text-xs text-slate-500">
                          <span className="inline-flex items-center gap-1"><Clock3 size={12} />{session.startTime} - {session.endTime}</span>
                          <span className="inline-flex items-center gap-1"><CalendarDays size={12} />{session.weekStart ? new Date(session.weekStart).toLocaleDateString('fr-FR') : 'Hebdomadaire'}</span>
                          <span className="inline-flex items-center gap-1"><Users size={12} />{session.teacherName ?? 'Sans enseignant'}</span>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <span className="status-chip status-chip--ok">Présents {session.present}</span>
                        <span className="status-chip status-chip--danger">Absents {session.absent}</span>
                        <span className="status-chip status-chip--warn">Pending {session.pending}</span>
                        <Link href={`/attendance?sessionId=${session.sessionId}`} className="btn-outline px-3 py-1.5 text-xs">
                          <CheckCircle2 size={12} />
                          Détails présence
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
