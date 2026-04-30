'use client';

import type { ComponentType } from 'react';
import {
  Activity,
  ArrowLeftRight,
  BadgeX,
  BarChart2,
  BookOpen,
  BookOpenCheck,
  Building2,
  CalendarRange,
  CalendarDays,
  CopyPlus,
  DoorOpen,
  FileStack,
  FileText,
  GraduationCap,
  Home,
  Layers,
  Medal,
  MessageSquare,
  NotebookPen,
  RefreshCw,
  Scale,
  Settings,
  UserCog,
  Users,
  Utensils,
} from 'lucide-react';

export type NavItem = {
  href: string;
  label: string;
  caption: string;
  icon: ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
  roles?: string[];
};

export type NavGroup = {
  heading: string;
  items: NavItem[];
  roles?: string[];
};

export const ACADEMIC_ROLES = ['admin', 'staff', 'viewer', 'user', 'teacher', 'student', 'inspector'];
export const ADMIN_ROLES = ['admin', 'staff'];
export const RESTAURATION_ROLES = ['admin', 'staff', 'restauration', 'student'];
export const STUDENT_ONLY_ROUTES = [
  '/dashboard',
  '/students',
  '/grades',
  '/timetable',
  '/attendance',
  '/room-reservations',
  '/restauration',
  '/cours-resources',
  '/workflows',
  '/modules',
  '/messages',
];

export const navigation: NavGroup[] = [
  {
    heading: 'Accueil',
    items: [
      { href: '/dashboard', label: 'Tableau de bord', caption: 'Vue générale', icon: Home },
    ],
  },
  {
    heading: 'Étudiants',
    roles: ACADEMIC_ROLES,
    items: [
      { href: '/students', label: 'Étudiants', caption: 'Profils et cohortes', icon: GraduationCap, roles: ['admin', 'staff', 'viewer', 'user', 'teacher', 'inspector'] },
      { href: '/grades', label: 'Notes', caption: 'Mes notes et résultats', icon: BookOpen, roles: ['student'] },
      { href: '/grades', label: 'Épreuves', caption: 'Notes par classe et module', icon: BookOpen, roles: ['admin', 'staff', 'viewer', 'user', 'teacher', 'inspector'] },
      { href: '/deliberation', label: 'Délibération', caption: 'Résultats et relevés de notes', icon: Scale, roles: ['admin', 'staff', 'viewer', 'user', 'teacher', 'inspector'] },
      { href: '/laureates', label: 'Lauréats', caption: 'Diplômes et suivi', icon: Medal, roles: ['admin', 'staff', 'viewer', 'user', 'teacher', 'inspector'] },
      { href: '/transfers', label: 'Transferts', caption: 'Passage inter-établissements', icon: ArrowLeftRight, roles: ['admin', 'staff', 'viewer', 'user', 'teacher', 'inspector'] },
    ],
  },
  {
    heading: 'Enseignants',
    roles: ACADEMIC_ROLES,
    items: [
      { href: '/teachers', label: 'Professeurs', caption: 'Permanents et vacataires', icon: Users, roles: ['admin', 'staff', 'viewer', 'user', 'teacher', 'inspector'] },
    ],
  },
  {
    heading: 'Structure Académique',
    roles: ACADEMIC_ROLES,
    items: [
      { href: '/academic', label: 'Modules & Éléments', caption: 'Modules · CM · TD · TP', icon: BookOpenCheck, roles: ['admin', 'staff', 'viewer', 'user', 'teacher', 'inspector'] },
      { href: '/cours-resources', label: 'Ressources cours', caption: 'Supports et fichiers', icon: FileText, roles: ['admin', 'staff', 'viewer', 'user', 'teacher', 'student', 'inspector'] },
    ],
  },
  {
    heading: 'Classes',
    roles: ACADEMIC_ROLES,
    items: [
      { href: '/classes', label: 'Gestion des Classes', caption: 'Cohortes et groupes', icon: CalendarRange, roles: ['admin', 'staff', 'viewer', 'user', 'teacher', 'inspector'] },
      { href: '/classes/cours', label: 'Cours par classe', caption: 'Affectation des cours', icon: NotebookPen, roles: ['admin', 'staff', 'viewer', 'user', 'teacher', 'inspector'] },
      { href: '/classes/transfer', label: 'Transfert de classe', caption: 'Clonage inter-années', icon: CopyPlus, roles: ['admin', 'staff', 'viewer', 'user', 'teacher', 'inspector'] },
    ],
  },
  {
    heading: 'Emploi du Temps & Salles',
    roles: ACADEMIC_ROLES,
    items: [
      { href: '/timetable', label: 'Emploi du temps', caption: 'Planification hebdomadaire', icon: CalendarDays },
      { href: '/attendance', label: 'Absence & présence', caption: 'QR, retards et pointage', icon: BadgeX },
      { href: '/rooms', label: 'Gestion des salles', caption: 'Espaces et équipements', icon: DoorOpen, roles: ['admin', 'staff', 'viewer', 'user', 'teacher', 'inspector'] },
      { href: '/room-reservations', label: 'Réservation de salle', caption: 'Occupation des salles', icon: CalendarRange },
    ],
  },
  {
    heading: 'Structure Organisationnelle',
    roles: ACADEMIC_ROLES,
    items: [
      { href: '/departments', label: 'Départements', caption: "Structures de l'établissement", icon: Building2, roles: ['admin', 'staff', 'viewer', 'user', 'teacher', 'inspector'] },
      { href: '/filieres', label: 'Filières', caption: 'Programmes et voies', icon: BookOpen, roles: ['admin', 'staff', 'viewer', 'user', 'teacher', 'inspector'] },
      { href: '/structure', label: 'Options', caption: 'Spécialités par filière', icon: Layers, roles: ['admin', 'staff', 'viewer', 'user', 'teacher', 'inspector'] },
      { href: '/cycles', label: 'Cycles', caption: 'Cycles académiques', icon: RefreshCw, roles: ['admin', 'staff', 'viewer', 'user', 'teacher', 'inspector'] },
    ],
  },
  {
    heading: 'Messagerie',
    roles: ACADEMIC_ROLES,
    items: [
      { href: '/messages', label: 'Messages', caption: 'Groupes et conversations', icon: MessageSquare, roles: ['admin', 'staff', 'viewer', 'user', 'teacher', 'student', 'inspector'] },
    ],
  },
  {
    heading: 'Restauration',
    roles: RESTAURATION_ROLES,
    items: [
      { href: '/restauration', label: 'Restauration', caption: 'Repas, solde et reçus', icon: Utensils },
      { href: '/restauration/tickets', label: 'Mes tickets', caption: 'Ticket quotidien', icon: FileText, roles: ['student'] },
      { href: '/restauration/verification', label: 'Validation tickets', caption: 'Codes et tickets', icon: FileText, roles: ['admin', 'staff', 'restauration'] },
    ],
  },
  {
    heading: 'Demandes de documents',
    roles: ['admin', 'staff', 'viewer', 'student'],
    items: [
      { href: '/workflows', label: 'Demandes', caption: 'Suivi des demandes de docs', icon: FileText },
    ],
  },
  {
    heading: 'Administration',
    roles: ADMIN_ROLES,
    items: [
      { href: '/users', label: 'Utilisateurs', caption: 'Accès et rôles', icon: UserCog },
      { href: '/statistics', label: 'Statistiques', caption: 'Données et exports CSV', icon: BarChart2 },
    ],
  },
  {
    heading: 'Paramètres',
    roles: ADMIN_ROLES,
    items: [
      { href: '/settings/academic-years', label: 'Années académiques', caption: 'Gérer les années académiques', icon: Settings },
      { href: '/settings/restauration', label: 'Repas restauration', caption: 'Prix et repas actifs', icon: Utensils },
      { href: '/settings/document-types', label: 'Types de documents', caption: 'Catégories de documents admin', icon: FileStack },
      { href: '/settings/teacher-roles', label: 'Rôles enseignants', caption: 'Fonctions : permanent, vacataire', icon: Users },
      { href: '/settings/teacher-grades', label: 'Grades enseignants', caption: 'PH, PA, assistant, doctorant', icon: GraduationCap },
      { href: '/settings/profile-document-types', label: 'Types de docs profil', caption: 'CIN, photo, acte de naissance…', icon: FileStack },
      { href: '/activity-logs', label: 'Journaux', caption: "Historique d'activité", icon: Activity },
    ],
  },
];

export const allHrefs = navigation.flatMap((group) => group.items.map((item) => item.href));

export function filterNavigationForRole(role: string) {
  return navigation
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => !item.roles || item.roles.includes(role)),
    }))
    .filter((group) => (!group.roles || group.roles.includes(role)) && group.items.length > 0);
}

export function getActiveHref(pathname: string): string | undefined {
  return allHrefs
    .filter((href) => pathname === href || pathname.startsWith(`${href}/`))
    .sort((a, b) => b.length - a.length)[0];
}

export function getActiveGroup(pathname: string): string | undefined {
  const best = getActiveHref(pathname);
  if (!best) return undefined;
  return navigation.find((group) => group.items.some((item) => item.href === best))?.heading;
}
