'use client';

import { useMemo, useState } from 'react';
import {
  FileStack,
  GraduationCap,
  History,
  Settings,
  Users,
} from 'lucide-react';
import { PageHeader } from '@/components/admin/page-header';
import { cn } from '@/lib/utils';
import DocumentTypesPage from '@/app/(protected)/settings/document-types/page';
import ProfileDocumentTypesPage from '@/app/(protected)/settings/profile-document-types/page';
import RestaurationSettingsPage from '@/app/(protected)/settings/restauration/page';
import TeacherGradesPage from '@/app/(protected)/settings/teacher-grades/page';
import TeacherRolesPage from '@/app/(protected)/settings/teacher-roles/page';
import ActivityLogsPage from '@/app/(protected)/activity-logs/page';

const SETTINGS = [
  { key: 'logs', label: 'Logs / Historique', icon: History, description: 'Historique des opérations sensibles.', component: ActivityLogsPage },
  { key: 'documents', label: 'Types de Documents', icon: FileStack, description: 'Documents administratifs et pièces du profil.', component: DocumentTypesPage },
  { key: 'teacher-roles', label: 'Rôles Enseignants', icon: Users, description: 'Fonctions : permanent, vacataire, intervenant.', component: TeacherRolesPage },
  { key: 'teacher-grades', label: 'Grades Enseignants', icon: GraduationCap, description: 'PH, PA, assistant, doctorant.', component: TeacherGradesPage },
  { key: 'restauration', label: 'Types de Repas', icon: Settings, description: 'Repas, prix et options de restauration.', component: RestaurationSettingsPage },
  { key: 'profile-documents', label: 'Types de Documents Profil', icon: FileStack, description: 'Pièces attendues dans les profils étudiants et enseignants.', component: ProfileDocumentTypesPage },
];

export default function SettingsPage() {
  const [activeKey, setActiveKey] = useState(SETTINGS[0].key);
  const active = useMemo(
    () => SETTINGS.find((item) => item.key === activeKey) ?? SETTINGS[0],
    [activeKey],
  );
  const ActiveIcon = active.icon;
  const ActiveContent = active.component;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Administration"
        title="Paramètres"
        description="Centre de configuration académique et administratif."
      />

      <section className="grid gap-5 lg:grid-cols-[280px_1fr]">
        <aside className="lg:sticky lg:top-28 lg:self-start">
          <div className="rounded-2xl border border-slate-200 bg-white/90 p-2 shadow-[0_20px_55px_-42px_rgba(15,23,42,0.35)]">
            {SETTINGS.map((item) => {
              const Icon = item.icon;
              const selected = item.key === active.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  className={cn(
                    'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition',
                    selected
                      ? 'bg-emerald-50 text-emerald-800'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950',
                  )}
                  onClick={() => setActiveKey(item.key)}
                >
                  <Icon size={16} />
                  <span className="font-medium">{item.label}</span>
                </button>
              );
            })}
          </div>
        </aside>

        <div className="min-w-0 space-y-5">
          <div className="surface-card flex items-start gap-4">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                <ActiveIcon size={20} />
              </span>
              <div>
                <h2 className="panel-title">{active.label}</h2>
                <p className="panel-copy">{active.description}</p>
              </div>
            </div>
          </div>

          <div className="min-w-0 rounded-2xl border border-slate-200 bg-white/92 p-4 shadow-[0_20px_55px_-45px_rgba(15,23,42,0.35)]">
            <ActiveContent />
          </div>
        </div>
      </section>
    </div>
  );
}
