'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ExportDataButton } from '@/components/admin/export-data-button';
import { ImportDataButton } from '@/components/admin/import-data-button';
import { PageHeader } from '@/components/admin/page-header';
import { api } from '@/services/api';
import { toast } from 'sonner';

type Department = { id: number; name: string };

type Room = {
  id: number;
  name: string;
  capacity: number;
  availability: boolean;
  departmentId?: number | null;
  department?: { id: number; name: string } | null;
};

export default function RoomsPage() {
  const [rows, setRows] = useState<Room[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [name, setName] = useState('');
  const [capacity, setCapacity] = useState('30');
  const [availability, setAvailability] = useState(true);
  const [departmentId, setDepartmentId] = useState('');
  const [equipment, setEquipment] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setCapacity('30');
    setAvailability(true);
    setDepartmentId('');
    setEquipment('');
  };

  const load = () => {
    Promise.all([
      api.get<Room[]>('/rooms'),
      api.get('/departments', {
        params: { page: 1, limit: 200, sortBy: 'name', sortOrder: 'asc' },
      }),
    ]).then(([roomsResponse, departmentsResponse]) => {
      setRows(Array.isArray(roomsResponse.data) ? roomsResponse.data : []);
      setDepartments(
        Array.isArray(departmentsResponse.data?.data)
          ? departmentsResponse.data.data
          : [],
      );
    });
  };

  useEffect(() => {
    load();
  }, []);

  const onSubmit = async () => {
    if (!name.trim()) return;

    const payload = {
      name: name.trim(),
      capacity: Number(capacity),
      availability,
      departmentId: departmentId ? Number(departmentId) : null,
      equipment: equipment
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
    };

    try {
      if (editingId) {
        await api.patch(`/rooms/${editingId}`, payload);
        toast.success('Salle mise à jour avec succès');
      } else {
        await api.post('/rooms', payload);
        toast.success('Salle créée avec succès');
      }
      resetForm();
      load();
    } catch {
      toast.error("Échec de l'enregistrement de la salle");
    }
  };

  const onDelete = async (id: number) => {
    if (!window.confirm('Supprimer cette salle ?')) return;
    try {
      await api.delete(`/rooms/${id}`);
      toast.success('Salle supprimée avec succès');
      if (editingId === id) resetForm();
      load();
    } catch {
      toast.error('Échec de la suppression de la salle');
    }
  };

  const onEdit = (item: Room) => {
    setEditingId(item.id);
    setName(item.name);
    setCapacity(String(item.capacity));
    setAvailability(item.availability);
    setDepartmentId(item.departmentId ? String(item.departmentId) : '');
    setEquipment('');
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Infrastructure"
        title="Gestion des salles"
        description="Gérez les salles de cours, leur capacité et leur disponibilité."
      />

      <div className="surface-card space-y-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
          {editingId ? 'Modifier la salle' : 'Nouvelle salle'}
        </p>

        <div className="grid gap-3 md:grid-cols-7">
          <div className="field-stack md:col-span-2">
            <label className="field-label">Nom</label>
            <input
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="ex. Salle A1"
            />
          </div>

          <div className="field-stack md:col-span-2">
            <label className="field-label">Département</label>
            <select
              className="input"
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value)}
            >
              <option value="">Aucun département</option>
              {departments.map((department) => (
                <option key={department.id} value={String(department.id)}>
                  {department.name}
                </option>
              ))}
            </select>
          </div>

          <div className="field-stack">
            <label className="field-label">Capacité</label>
            <input
              className="input"
              type="number"
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
              min={1}
            />
          </div>

          <div className="field-stack md:col-span-2">
            <label className="field-label">
              Équipements (séparés par des virgules)
            </label>
            <input
              className="input"
              value={equipment}
              onChange={(e) => setEquipment(e.target.value)}
              placeholder="projecteur, tableau blanc"
            />
          </div>

          <div className="flex items-center gap-2 pt-6">
            <input
              id="availability"
              type="checkbox"
              checked={availability}
              onChange={(e) => setAvailability(e.target.checked)}
            />
            <label htmlFor="availability" className="text-sm">
              Disponible
            </label>
          </div>
        </div>

        <div className="flex gap-2">
          <ImportDataButton onSuccess={load} />
          <ExportDataButton />
          <Link className="btn-outline" href="/room-reservations">
            Réservations
          </Link>
          <button className="btn-primary" type="button" onClick={onSubmit}>
            {editingId ? 'Enregistrer' : 'Créer'}
          </button>
          {editingId ? (
            <button className="btn-outline" type="button" onClick={resetForm}>
              Annuler
            </button>
          ) : null}
        </div>
      </div>

      <div className="data-table-wrap">
        <div className="table-scroll">
          <table className="table-base">
            <thead>
              <tr>
                <th>Nom</th>
                <th>Département</th>
                <th>Capacité</th>
                <th>Disponibilité</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((item) => (
                <tr key={item.id}>
                  <td>{item.name}</td>
                  <td>{item.department?.name ?? '—'}</td>
                  <td>{item.capacity}</td>
                  <td>
                    <span
                      className={
                        item.availability
                          ? 'status-chip status-chip--ok'
                          : 'status-chip status-chip--muted'
                      }
                    >
                      {item.availability ? 'Disponible' : 'Indisponible'}
                    </span>
                  </td>
                  <td>
                    <div className="flex gap-2">
                      <button
                        className="btn-outline"
                        type="button"
                        onClick={() => onEdit(item)}
                      >
                        Modifier
                      </button>
                      <button
                        className="btn-outline"
                        type="button"
                        onClick={() => onDelete(item.id)}
                      >
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
    </div>
  );
}
