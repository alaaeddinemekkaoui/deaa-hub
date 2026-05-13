'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { BedDouble, Building2, MessageSquareText, Users } from 'lucide-react';
import { MetricCard } from '@/components/admin/metric-card';
import { PageHeader } from '@/components/admin/page-header';
import { api, getApiErrorMessage } from '@/services/api';
import { toast } from 'sonner';
import type { FlatAssignment, Room, StudentOption } from '../types';

export default function InternatAssignmentsPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [assignments, setAssignments] = useState<FlatAssignment[]>([]);
  const [loading, setLoading] = useState(true);

  const [studentSearch, setStudentSearch] = useState('');
  const [studentId, setStudentId] = useState('');
  const [roomId, setRoomId] = useState('');
  const [comment, setComment] = useState('');
  const [editingAssignmentId, setEditingAssignmentId] = useState<number | null>(null);

  const load = async (search = studentSearch) => {
    try {
      setLoading(true);
      const [roomsRes, studentsRes, assignmentsRes] = await Promise.all([
        api.get<Room[]>('/internat/rooms'),
        api.get<StudentOption[]>('/internat/students', { params: { search: search.trim() || undefined } }),
        api.get<FlatAssignment[]>('/internat/assignments'),
      ]);
      setRooms(Array.isArray(roomsRes.data) ? roomsRes.data : []);
      setStudents(Array.isArray(studentsRes.data) ? studentsRes.data : []);
      setAssignments(Array.isArray(assignmentsRes.data) ? assignmentsRes.data : []);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Impossible de charger les affectations de l'internat."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load('');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totalBeds = useMemo(
    () => rooms.reduce((sum, room) => sum + room.capacity, 0),
    [rooms],
  );
  const occupiedBeds = useMemo(
    () => rooms.reduce((sum, room) => sum + room.assignments.length, 0),
    [rooms],
  );
  const unassignedStudents = useMemo(
    () => students.filter((student) => !student.internatAssignment).length,
    [students],
  );

  const resetAssignmentForm = () => {
    setEditingAssignmentId(null);
    setStudentId('');
    setRoomId('');
    setComment('');
  };

  const submitAssignment = async () => {
    if (!studentId || !roomId) return;
    try {
      if (editingAssignmentId) {
        await api.patch(`/internat/assignments/${editingAssignmentId}`, {
          roomId: Number(roomId),
          comment,
        });
        toast.success("Affectation mise à jour.");
      } else {
        await api.post('/internat/assignments', {
          studentId: Number(studentId),
          roomId: Number(roomId),
          comment,
        });
        toast.success("Étudiant affecté à la chambre.");
      }
      resetAssignmentForm();
      await load();
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Impossible d'enregistrer l'affectation."));
    }
  };

  const startAssignmentEdit = (assignment: FlatAssignment) => {
    setEditingAssignmentId(assignment.id);
    setStudentId(String(assignment.student.id));
    setRoomId(String(assignment.room.id));
    setComment(assignment.comment ?? '');
  };

  const deleteAssignment = async (id: number) => {
    if (!window.confirm("Retirer cet étudiant de l'internat ?")) return;
    try {
      await api.delete(`/internat/assignments/${id}`);
      toast.success('Affectation supprimée.');
      if (editingAssignmentId === id) resetAssignmentForm();
      await load();
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Impossible de supprimer l'affectation."));
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Vie résidentielle"
        title="Affectation des chambres"
        description="Affectez les étudiants aux chambres, mettez à jour les observations et suivez l'occupation actuelle."
        actions={(
          <Link className="btn-outline" href="/internat">
            Gestion des chambres
          </Link>
        )}
      />

      <section className="grid gap-4 md:grid-cols-4">
        <MetricCard label="Chambres" value={rooms.length} hint="Capacité résidentielle" icon={Building2} />
        <MetricCard label="Places" value={totalBeds} hint="Toutes chambres confondues" icon={BedDouble} />
        <MetricCard label="Occupées" value={occupiedBeds} hint="Étudiants actuellement logés" icon={Users} />
        <MetricCard label="Sans chambre" value={unassignedStudents} hint="Étudiants non affectés" icon={MessageSquareText} />
      </section>

      <section className="surface-card space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="panel-title">{editingAssignmentId ? 'Modifier une affectation' : 'Affecter un étudiant'}</h2>
            <p className="panel-copy">Sélectionnez l&apos;étudiant, la chambre et ajoutez une observation si nécessaire.</p>
          </div>
          <div className="w-full max-w-xs field-stack">
            <label className="field-label">Recherche étudiant</label>
            <input
              className="input"
              value={studentSearch}
              onChange={(event) => setStudentSearch(event.target.value)}
              onBlur={() => void load(studentSearch)}
              placeholder="Nom, Massar, code étudiant"
            />
          </div>
        </div>

        <div className="form-grid md:grid-cols-2">
          <div className="field-stack">
            <label className="field-label">Étudiant</label>
            <select className="input" value={studentId} onChange={(event) => setStudentId(event.target.value)}>
              <option value="">Choisir un étudiant</option>
              {students.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.fullName} · {student.codeEtudiant ?? student.codeMassar}
                  {student.internatAssignment ? ` · ${student.internatAssignment.room.name}` : ''}
                </option>
              ))}
            </select>
          </div>
          <div className="field-stack">
            <label className="field-label">Chambre</label>
            <select className="input" value={roomId} onChange={(event) => setRoomId(event.target.value)}>
              <option value="">Choisir une chambre</option>
              {rooms.map((room) => (
                <option key={room.id} value={room.id}>
                  {room.name} · {room.assignments.length}/{room.capacity}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="field-stack">
          <label className="field-label">Observation / commentaire</label>
          <textarea
            className="input min-h-24"
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            placeholder="Ex. Allergies, autorisation spéciale, remarque de suivi..."
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <button className="btn-primary" type="button" onClick={() => void submitAssignment()}>
            {editingAssignmentId ? "Mettre à jour l'affectation" : "Affecter l'étudiant"}
          </button>
          {editingAssignmentId ? (
            <button className="btn-outline" type="button" onClick={resetAssignmentForm}>
              Annuler
            </button>
          ) : null}
        </div>
      </section>

      <section className="surface-card space-y-4">
        <div>
          <h2 className="panel-title">Occupation des chambres</h2>
          <p className="panel-copy">Visualisez la capacité, les occupants et leurs commentaires.</p>
        </div>

        {loading ? (
          <div className="empty-note">Chargement des chambres...</div>
        ) : rooms.length === 0 ? (
          <div className="empty-note">Aucune chambre enregistrée pour le moment.</div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {rooms.map((room) => (
              <article key={room.id} className="rounded-[1.4rem] border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-lg font-semibold text-slate-950">{room.name}</p>
                    <p className="text-sm text-slate-500">
                      Occupation: {room.assignments.length}/{room.capacity}
                    </p>
                  </div>
                </div>

                <div className="mt-4 space-y-3">
                  {room.assignments.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-500">
                      Aucun étudiant affecté.
                    </div>
                  ) : (
                    room.assignments.map((assignment) => {
                      const flat = assignments.find((item) => item.id === assignment.id);
                      return (
                        <div key={assignment.id} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <p className="font-medium text-slate-950">{assignment.student.fullName}</p>
                              <p className="text-sm text-slate-500">
                                {assignment.student.codeEtudiant ?? assignment.student.codeMassar}
                                {assignment.student.academicClass
                                  ? ` · ${assignment.student.academicClass.name} (${assignment.student.academicClass.year}A)`
                                  : ''}
                              </p>
                              <p className="mt-2 text-sm text-slate-600">
                                {flat?.comment?.trim() ? flat.comment : 'Aucun commentaire.'}
                              </p>
                            </div>
                            <div className="flex gap-2">
                              <button
                                className="btn-outline"
                                type="button"
                                onClick={() => flat && startAssignmentEdit(flat)}
                              >
                                Modifier
                              </button>
                              <button
                                className="btn-outline"
                                type="button"
                                onClick={() => void deleteAssignment(assignment.id)}
                              >
                                Retirer
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
