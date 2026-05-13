'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { BedDouble, Building2, MessageSquareText, Users } from 'lucide-react';
import { ImportDataButton } from '@/components/admin/import-data-button';
import { MetricCard } from '@/components/admin/metric-card';
import { PageHeader } from '@/components/admin/page-header';
import { api, getApiErrorMessage } from '@/services/api';
import { toast } from 'sonner';
import type { Room, StudentOption } from './types';

export default function InternatPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [loading, setLoading] = useState(true);

  const [roomName, setRoomName] = useState('');
  const [roomCapacity, setRoomCapacity] = useState('2');
  const [editingRoomId, setEditingRoomId] = useState<number | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      const [roomsRes, studentsRes] = await Promise.all([
        api.get<Room[]>('/internat/rooms'),
        api.get<StudentOption[]>('/internat/students'),
      ]);
      setRooms(Array.isArray(roomsRes.data) ? roomsRes.data : []);
      setStudents(Array.isArray(studentsRes.data) ? studentsRes.data : []);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Impossible de charger les chambres de l'internat."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
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

  const resetRoomForm = () => {
    setEditingRoomId(null);
    setRoomName('');
    setRoomCapacity('2');
  };

  const submitRoom = async () => {
    if (!roomName.trim()) return;
    try {
      if (editingRoomId) {
        await api.patch(`/internat/rooms/${editingRoomId}`, {
          name: roomName.trim(),
          capacity: Number(roomCapacity),
        });
        toast.success('Chambre mise à jour.');
      } else {
        await api.post('/internat/rooms', {
          name: roomName.trim(),
          capacity: Number(roomCapacity),
        });
        toast.success('Chambre ajoutée.');
      }
      resetRoomForm();
      await load();
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Impossible d'enregistrer la chambre."));
    }
  };

  const startRoomEdit = (room: Room) => {
    setEditingRoomId(room.id);
    setRoomName(room.name);
    setRoomCapacity(String(room.capacity));
  };

  const deleteRoom = async (id: number) => {
    if (!window.confirm('Supprimer cette chambre ?')) return;
    try {
      await api.delete(`/internat/rooms/${id}`);
      toast.success('Chambre supprimée.');
      if (editingRoomId === id) resetRoomForm();
      await load();
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Impossible de supprimer la chambre.'));
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Vie résidentielle"
        title="Gestion des chambres"
        description="Ajoutez des chambres, définissez leur capacité et suivez rapidement le taux d'occupation de l'internat."
        actions={(
          <Link className="btn-outline" href="/internat/affectations">
            Affectation des chambres
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
        <div>
          <h2 className="panel-title">{editingRoomId ? 'Modifier une chambre' : 'Ajouter une chambre'}</h2>
          <p className="panel-copy">Enregistrez la chambre et sa capacité maximale.</p>
        </div>

        <div className="form-grid md:grid-cols-2">
          <div className="field-stack">
            <label className="field-label">Nom de la chambre</label>
            <input
              className="input"
              value={roomName}
              onChange={(event) => setRoomName(event.target.value)}
              placeholder="ex. Bloc A - Chambre 12"
            />
          </div>
          <div className="field-stack">
            <label className="field-label">Capacité</label>
            <input
              className="input"
              type="number"
              min={1}
              value={roomCapacity}
              onChange={(event) => setRoomCapacity(event.target.value)}
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <ImportDataButton onSuccess={load} />
          <button className="btn-primary" type="button" onClick={() => void submitRoom()}>
            {editingRoomId ? 'Enregistrer' : 'Créer la chambre'}
          </button>
          {editingRoomId ? (
            <button className="btn-outline" type="button" onClick={resetRoomForm}>
              Annuler
            </button>
          ) : null}
        </div>
      </section>

      <section className="surface-card space-y-4">
        <div>
          <h2 className="panel-title">Liste des chambres</h2>
          <p className="panel-copy">Visualisez la capacité et l&apos;occupation actuelle. Les affectations se gèrent sur une page dédiée.</p>
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
                  <div className="flex gap-2">
                    <button className="btn-outline" type="button" onClick={() => startRoomEdit(room)}>
                      Modifier
                    </button>
                    <button className="btn-outline" type="button" onClick={() => void deleteRoom(room.id)}>
                      Supprimer
                    </button>
                  </div>
                </div>

                <div className="mt-4 space-y-3">
                  {room.assignments.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-500">
                      Aucun étudiant affecté.
                    </div>
                  ) : (
                    room.assignments.map((assignment) => {
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
