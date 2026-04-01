'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  Activity,
  BookOpen,
  Building2,
  CalendarRange,
  ChevronRight,
  FileStack,
  GraduationCap,
  Users,
} from 'lucide-react';
import { EmptyState } from '@/components/admin/empty-state';
import { MetricCard } from '@/components/admin/metric-card';
import { PageHeader } from '@/components/admin/page-header';
import { api, getApiErrorMessage } from '@/services/api';

type Overview = {
  stats: {
    totalStudents: number;
    teachersCount: number;
    departmentsCount: number;
    filieresCount: number;
    classesCount: number;
    dossiersCount: number;
  };
  studentsPerFiliere: Array<{ filiere: string; total: number }>;
  studentsPerCycle: Array<{ cycle: string; total: number }>;
  laureatesPerYear: Array<{ year: number; total: number }>;
  recentActivity: Array<{
    id: number;
    action: string;
    timestamp: string;
    user: { id: number; fullName: string; role: string };
  }>;
};

const COLORS = ['#1a6b4a', '#2f855a', '#c97b2f', '#0f766e', '#475569'];

const quickLinks = [
  {
    href: '/departments',
    title: 'Départements',
    copy: 'Maintenez les structures académiques cohérentes et prêtes pour la croissance des programmes.',
  },
  {
    href: '/filieres',
    title: 'Filières',
    copy: 'Vérifiez la propriété du programme, les codes et les relations de structure d\'enseignement.',
  },
  {
    href: '/classes',
    title: 'Classes',
    copy: 'Suivez la configuration de la cohorte, les affectations annuelles et la disponibilité opérationnelle.',
  },
];

export default function DashboardPage() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await api.get<Overview>('/dashboard/overview');
        setOverview(response.data);
      } catch (loadError) {
        setError(
          getApiErrorMessage(loadError, "Impossible de charger l'aperçu du tableau de bord."),
        );
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const stats = overview?.stats;
  const topFilieres = (overview?.studentsPerFiliere ?? []).slice(0, 6);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Aperçu institutionnel"
        title="Opérations académiques en un coup d'œil"
        description="Supervisez les départements, les programmes, les classes et l'activité administrative récente à partir d'une seule surface de contrôle polie."
        actions={
          <>
            <div className="stat-inline">
              <Building2 size={14} />
              {stats?.departmentsCount ?? 0} départements
            </div>
            <div className="stat-inline">
              <BookOpen size={14} />
              {stats?.filieresCount ?? 0} filières
            </div>
            <div className="stat-inline">
              <CalendarRange size={14} />
              {stats?.classesCount ?? 0} classes
            </div>
          </>
        }
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <MetricCard
          label="Étudiants"
          value={stats?.totalStudents ?? 0}
          hint="Enregistrements d'apprenants suivis"
          icon={GraduationCap}
        />
        <MetricCard
          label="Enseignants"
          value={stats?.teachersCount ?? 0}
          hint="Personnel permanent et vacataires"
          icon={Users}
        />
        <MetricCard
          label="Départements"
          value={stats?.departmentsCount ?? 0}
          hint="Structures institutionnelles"
          icon={Building2}
        />
        <MetricCard
          label="Filières"
          value={stats?.filieresCount ?? 0}
          hint="Programmes académiques"
          icon={BookOpen}
        />
        <MetricCard
          label="Classes"
          value={stats?.classesCount ?? 0}
          hint="Cohortes et groupes gérés"
          icon={CalendarRange}
        />
        <MetricCard
          label="Documents"
          value={stats?.dossiersCount ?? 0}
          hint="Fichiers administratifs suivis"
          icon={FileStack}
        />
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.25fr_0.95fr]">
        <div className="surface-card space-y-5">
          <div className="panel-header">
            <div>
              <h2 className="panel-title">Distribution des étudiants par filière</h2>
              <p className="panel-copy">
                Utilisez cette vue pour identifier la concentration du programme et la pression d’effectifs potentielle.
              </p>
            </div>
          </div>

          {loading ? (
            <div className="empty-note">Chargement des données du graphique...</div>
          ) : error ? (
            <div className="empty-note">{error}</div>
          ) : topFilieres.length === 0 ? (
            <EmptyState
              title="Aucune distribution d'étudiants disponible pour l'instant"
              description="Une fois les dossiers d'étudiants créés, ce graphique résumera où les cohortes sont concentrées."
            />
          ) : (
            <div className="h-[340px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topFilieres} barSize={28}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#d8e4dc" />
                  <XAxis
                    dataKey="filiere"
                    tick={{ fontSize: 12, fill: '#475569' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 12, fill: '#475569' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip cursor={{ fill: 'rgba(26, 107, 74, 0.08)' }} />
                  <Bar dataKey="total" radius={[12, 12, 0, 0]} fill="#1a6b4a" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="surface-card space-y-5">
          <div className="panel-header">
            <div>
              <h2 className="panel-title">Distribution des étudiants par cycle</h2>
              <p className="panel-copy">
                Équilibre au haut niveau entre les parcours prépa, ingénieur et vétérinaire.
              </p>
            </div>
          </div>

          {loading ? (
            <div className="empty-note">Chargement des informations sur les cycles...</div>
          ) : error ? (
            <div className="empty-note">{error}</div>
          ) : (overview?.studentsPerCycle ?? []).length === 0 ? (
            <EmptyState
              title="Aucune donnée de cycle disponible pour l'instant"
              description="Créez des dossiers d'étudiants pour visualiser la distribution des cycles académiques."
            />
          ) : (
            <div className="h-[340px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={overview?.studentsPerCycle ?? []}
                    dataKey="total"
                    nameKey="cycle"
                    innerRadius={72}
                    outerRadius={110}
                    paddingAngle={4}
                  >
                    {(overview?.studentsPerCycle ?? []).map((item, index) => (
                      <Cell key={`${item.cycle}-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[0.95fr_1.25fr]">
        <div className="surface-card space-y-5">
          <div className="panel-header">
            <div>
              <h2 className="panel-title">Lauréats par année de graduation</h2>
              <p className="panel-copy">
                Suivez la disponibilité de récupération du diplôme archivé à travers les cohortes de graduation.
              </p>
            </div>
          </div>

          {loading ? (
            <div className="empty-note">Chargement des tendances de lauréat...</div>
          ) : error ? (
            <div className="empty-note">{error}</div>
          ) : (overview?.laureatesPerYear ?? []).length === 0 ? (
            <EmptyState
              title="Pas encore d’archive de lauréat"
              description="Les tendances de graduation apparaîtront ici une fois les dossiers de lauréat saisis."
            />
          ) : (
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={overview?.laureatesPerYear ?? []} barSize={34}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#d8e4dc" />
                  <XAxis
                    dataKey="year"
                    tick={{ fontSize: 12, fill: '#475569' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 12, fill: '#475569' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip />
                  <Bar dataKey="total" radius={[12, 12, 0, 0]} fill="#c97b2f" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="surface-card space-y-5">
          <div className="panel-header">
            <div>
              <h2 className="panel-title">Activité administrative récente</h2>
              <p className="panel-copy">
                Examinez les actions les plus récentes de l’utilisateur pour surveiller le flux opérationnel.
              </p>
            </div>
          </div>

          {loading ? (
            <div className="empty-note">Chargement du flux d’activités...</div>
          ) : error ? (
            <div className="empty-note">{error}</div>
          ) : (overview?.recentActivity ?? []).length === 0 ? (
            <EmptyState
              title="Aucune activité récente enregistrée"
              description="Lorsque le personnel interagit avec la plateforme, leurs dernières actions apparaîtront ici."
            />
          ) : (
            <div className="space-y-3">
              {(overview?.recentActivity ?? []).map((item) => (
                <div
                  key={item.id}
                  className="rounded-3xl border bg-white/75 px-4 py-4 shadow-[0_20px_50px_-36px_rgba(15,36,26,0.32)]"
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="flex items-start gap-3">
                      <div className="mt-1 flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 text-primary">
                        <Activity size={18} />
                      </div>
                      <div className="space-y-1">
                        <p className="font-medium text-slate-950">{item.action}</p>
                        <p className="text-sm text-slate-500">
                          {item.user.fullName} • <span className="capitalize">{item.user.role}</span>
                        </p>
                      </div>
                    </div>
                    <span className="status-chip status-chip--muted">
                      {new Date(item.timestamp).toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="surface-card space-y-5">
        <div className="panel-header">
          <div>
            <h2 className="panel-title">Surfaces d’administration prioritaires</h2>
            <p className="panel-copy">
              Accédez directement aux structures de données qui façonnent les départements, les filières et les classes.
            </p>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          {quickLinks.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="group rounded-[1.75rem] border bg-white/90 px-5 py-5 transition hover:-translate-y-0.5 hover:border-emerald-200 hover:bg-emerald-50/55"
            >
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-lg font-semibold text-slate-950">{item.title}</h3>
                <ChevronRight
                  size={18}
                  className="text-slate-400 transition group-hover:text-primary"
                />
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-500">{item.copy}</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
