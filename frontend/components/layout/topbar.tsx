'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Bell, Check, Eye, EyeOff, Grid3X3, LogOut, Menu, MessageSquare, Pencil, Search, X } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/features/auth/auth-context';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { api } from '@/services/api';
import { cn } from '@/lib/utils';

/* ── Helpers ─────────────────────────────────────────────────── */
function initials(name?: string, email?: string): string {
  if (name) {
    return name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0].toUpperCase())
      .join('');
  }
  return (email?.[0] ?? 'U').toUpperCase();
}

/* ── Profile drawer ─────────────────────────────────────────── */
function ProfileDrawer({ onClose }: { onClose: () => void }) {
  const { user, updateProfile } = useAuth();

  const [fullName, setFullName] = useState(user?.fullName ?? '');
  const [email, setEmail]       = useState(user?.email ?? '');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm]   = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [saving, setSaving]     = useState(false);

  const drawerRef = useRef<HTMLDivElement>(null);

  // Close on backdrop click
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const handleSave = async () => {
    if (password && password !== confirm) {
      toast.error('Les mots de passe ne correspondent pas.');
      return;
    }
    if (password && password.length < 6) {
      toast.error('Le mot de passe doit contenir au moins 6 caractères.');
      return;
    }

    const payload: { fullName?: string; email?: string; password?: string } = {};
    if (fullName.trim() && fullName.trim() !== user?.fullName) payload.fullName = fullName.trim();
    if (email.trim() && email.trim() !== user?.email)           payload.email   = email.trim();
    if (password)                                                payload.password = password;

    if (Object.keys(payload).length === 0) {
      toast.info('Aucune modification détectée.');
      return;
    }

    try {
      setSaving(true);
      await updateProfile(payload);
      toast.success('Profil mis à jour avec succès.');
      setPassword('');
      setConfirm('');
      onClose();
    } catch {
      toast.error('Impossible de mettre à jour le profil.');
    } finally {
      setSaving(false);
    }
  };

  const avatar = initials(user?.fullName, user?.email);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[2px]"
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        ref={drawerRef}
        className="fixed right-0 top-0 z-50 flex h-full w-full max-w-sm flex-col bg-white shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-700 text-white text-sm font-bold shadow">
              {avatar}
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900 leading-tight">
                {user?.fullName ?? user?.email}
              </p>
              <p className="text-xs text-slate-400 capitalize">{user?.role}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Form */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">
            Informations personnelles
          </p>

          {/* Full name */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">Nom complet</label>
            <input
              type="text"
              className="input w-full"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Votre nom complet"
            />
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">Adresse e-mail</label>
            <input
              type="email"
              className="input w-full"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@exemple.com"
            />
          </div>

          <div className="border-t border-slate-100 pt-4">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400 mb-4">
              Changer le mot de passe
            </p>

            {/* New password */}
            <div className="space-y-1.5 mb-4">
              <label className="text-xs font-semibold text-slate-700">Nouveau mot de passe</label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  className="input w-full pr-10"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Laisser vide pour ne pas modifier"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            {/* Confirm password */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Confirmer le mot de passe</label>
              <input
                type={showPw ? 'text' : 'password'}
                className={`input w-full ${
                  confirm && password !== confirm ? 'border-red-400 focus:ring-red-300' : ''
                }`}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Répéter le nouveau mot de passe"
              />
              {confirm && password !== confirm && (
                <p className="text-[11px] text-red-500">Les mots de passe ne correspondent pas.</p>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-100 px-6 py-4 flex gap-3">
          <button
            type="button"
            className="btn-outline flex-1"
            onClick={onClose}
            disabled={saving}
          >
            Annuler
          </button>
          <button
            type="button"
            className="btn-primary flex-1 flex items-center justify-center gap-2"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            ) : (
              <Check size={14} />
            )}
            {saving ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </div>
      </div>
    </>
  );
}

/* ── Notification Bell ──────────────────────────────────────── */
type Notification = {
  id: number;
  content: string;
  read: boolean;
  createdAt: string;
  type: string;
  message?: {
    id: number;
    sender?: { id: number; fullName: string };
    group?: { id: number; name: string };
  } | null;
};

function NotificationBell() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [count, setCount] = useState(0);
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const fetchCount = useCallback(async () => {
    try {
      const res = await api.get<{ count: number }>('/notifications/count');
      setCount(res.data.count);
    } catch { /* silent */ }
  }, []);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<Notification[]>('/notifications', { params: { unreadOnly: false } });
      setItems(res.data);
    } catch { /* silent */ } finally {
      setLoading(false);
    }
  }, []);

  // Poll count every 30 s
  useEffect(() => {
    void fetchCount();
    const id = setInterval(() => void fetchCount(), 30_000);
    return () => clearInterval(id);
  }, [fetchCount]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleOpen = () => {
    setOpen((v) => !v);
    void fetchNotifications();
  };

  const markRead = async (id: number) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
      setCount((c) => Math.max(0, c - 1));
    } catch { /* silent */ }
  };

  const markAllRead = async () => {
    try {
      await api.patch('/notifications/mark-all-read');
      setItems((prev) => prev.map((n) => ({ ...n, read: true })));
      setCount(0);
    } catch { /* silent */ }
  };

  const clearRead = async () => {
    try {
      await api.delete('/notifications/read');
      setItems((prev) => prev.filter((n) => !n.read));
    } catch { /* silent */ }
  };

  const openFromNotification = (notification: Notification) => {
    if (!notification.read) void markRead(notification.id);

    setOpen(false);

    if (notification.type.startsWith('room_request')) {
      router.push('/room-reservations');
      return;
    }

    if (notification.type.startsWith('workflow')) {
      router.push('/workflows');
      return;
    }

    const groupId = notification.message?.group?.id;
    const senderId = notification.message?.sender?.id;

    if (groupId) {
      router.push(`/messages?tab=groups&groupId=${groupId}`);
      return;
    }

    if (senderId) {
      router.push(`/messages?tab=received&peerId=${senderId}`);
      return;
    }

    router.push('/messages');
  };

  const featuredItems = items.slice(0, 5);
  const olderItems = items.slice(5);
  const readCount = items.filter((item) => item.read).length;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={handleOpen}
        className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-colors"
        title="Notifications"
      >
        <Bell size={15} />
        {count > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-0.5 text-[10px] font-bold text-white leading-none">
            {count > 99 ? '99+' : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-50 w-80 rounded-2xl border border-slate-200 bg-white shadow-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <span className="text-sm font-semibold text-slate-800">Notifications</span>
            <div className="flex items-center gap-3">
              {count > 0 && (
                <button type="button" onClick={markAllRead} className="text-[11px] text-emerald-600 hover:text-emerald-700">
                  Tout marquer lu
                </button>
              )}
              {readCount > 0 && (
                <button type="button" onClick={clearRead} className="text-[11px] text-slate-500 hover:text-slate-700">
                  Nettoyer les lues
                </button>
              )}
            </div>
          </div>
          <div className="divide-y divide-slate-50">
            {loading ? (
              <div className="py-6 text-center text-xs text-slate-400">Chargement…</div>
            ) : items.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">Aucune notification</div>
            ) : (
              <>
                <div>
                  {featuredItems.map((n) => (
                    <div
                      key={n.id}
                      className={cn('flex gap-2.5 px-4 py-3 hover:bg-slate-50 cursor-pointer transition-colors', !n.read && 'bg-emerald-50/60')}
                      onClick={() => openFromNotification(n)}
                    >
                      <div className={cn('mt-0.5 h-2 w-2 shrink-0 rounded-full', n.read ? 'bg-slate-200' : 'bg-emerald-500')} />
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] text-slate-700 leading-snug">{n.content}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          {new Date(n.createdAt).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                {olderItems.length > 0 && (
                  <div>
                    <div className="border-y border-slate-100 bg-slate-50 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                      Plus anciennes
                    </div>
                    <div className="max-h-56 overflow-y-auto">
                      {olderItems.map((n) => (
                        <div
                          key={n.id}
                          className={cn('flex gap-2.5 px-4 py-3 hover:bg-slate-50 cursor-pointer transition-colors', !n.read && 'bg-emerald-50/60')}
                          onClick={() => openFromNotification(n)}
                        >
                          <div className={cn('mt-0.5 h-2 w-2 shrink-0 rounded-full', n.read ? 'bg-slate-200' : 'bg-emerald-500')} />
                          <div className="flex-1 min-w-0">
                            <p className="text-[12px] text-slate-700 leading-snug">{n.content}</p>
                            <p className="text-[10px] text-slate-400 mt-0.5">
                              {new Date(n.createdAt).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
          <div className="border-t border-slate-100 px-4 py-2.5">
            <Link href="/messages" onClick={() => setOpen(false)} className="flex items-center gap-1.5 text-[12px] text-emerald-600 hover:text-emerald-700 font-medium">
              <MessageSquare size={12} />
              Ouvrir la messagerie
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Topbar ─────────────────────────────────────────────────── */
type TopbarProps = {
  sidebarOpen?: boolean;
  onToggleSidebar?: () => void;
};

export function Topbar({ sidebarOpen = true, onToggleSidebar }: TopbarProps) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [profileOpen, setProfileOpen] = useState(false);

  const avatar = initials(user?.fullName, user?.email);

  return (
    <>
      <header className="sticky top-3 z-30 mx-3 rounded-[1.6rem] border border-slate-200/80 bg-white/88 px-4 py-3 text-slate-950 shadow-[0_24px_70px_-46px_rgba(15,36,26,0.55)] backdrop-blur-xl supports-[backdrop-filter]:bg-white/72">
        <div className="mx-auto grid w-full max-w-[1800px] gap-3 lg:grid-cols-[auto_minmax(260px,620px)_auto] lg:items-center">
          <div className="flex min-w-0 items-center gap-3">
          {onToggleSidebar && (
            <button
              type="button"
              onClick={onToggleSidebar}
              className={cn(
                'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition-[background-color,border-color,color,box-shadow,transform] duration-300 hover:-translate-y-0.5 active:scale-95',
                sidebarOpen
                  ? 'border-[#1b5e3b]/20 bg-[#1b5e3b] text-white shadow-sm'
                  : 'border-slate-200 bg-white text-[#1b5e3b] hover:bg-slate-50',
              )}
              title={sidebarOpen ? 'Masquer le menu' : 'Afficher le menu'}
              aria-label={sidebarOpen ? 'Masquer le menu' : 'Afficher le menu'}
              aria-pressed={sidebarOpen}
            >
              <Menu
                size={16}
                className={cn(
                  'transition-transform duration-300',
                  sidebarOpen ? 'rotate-90 scale-95' : 'rotate-0 scale-100',
                )}
              />
            </button>
          )}
            <Link href="/dashboard" className="flex min-w-0 items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
                <Image src="/logo0.png" alt="DEAA Hub" width={24} height={24} priority />
              </div>
              <div className="min-w-0">
                <p className="truncate text-base font-bold leading-tight text-[#082f1d]">DEAA Hub</p>
                <p className="truncate text-[10px] uppercase tracking-[0.24em] text-[#1b5e3b]/70">IAV Hassan II</p>
              </div>
            </Link>
          </div>

          <div className="flex min-w-0 items-center gap-2 rounded-2xl border border-slate-200 bg-white/92 px-4 py-2.5 text-slate-500 shadow-sm">
            <Search size={16} className="text-[#1b5e3b]" />
            <input
              className="w-full bg-transparent text-sm text-slate-900 placeholder:text-slate-400"
              placeholder="Recherche rapide"
              aria-label="Recherche rapide"
            />
          </div>

          <div className="flex min-w-0 items-center justify-end gap-3 text-slate-950">
            <Link
              href="/modules"
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 hover:text-[#1b5e3b]"
              title="Tous les modules"
              aria-label="Tous les modules"
            >
              <Grid3X3 size={15} />
            </Link>
            <NotificationBell />

          {/* Clickable user info → opens profile drawer */}
          <button
            type="button"
            onClick={() => setProfileOpen(true)}
            className="group flex items-center gap-2.5 rounded-xl px-3 py-1.5 transition hover:bg-slate-100/70"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#00a66a] text-white text-[12px] font-bold shadow-sm ring-2 ring-white/20">
              {avatar}
            </div>
            <div className="text-right text-sm hidden sm:block">
              <p className="font-semibold text-[#082f1d] leading-tight">{user?.fullName ?? user?.email}</p>
              <p className="text-xs text-slate-500 capitalize">{user?.role ?? 'viewer'}</p>
            </div>
            <Pencil
              size={12}
              className="text-slate-300 transition group-hover:text-slate-500"
            />
          </button>

          <button
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-[#0b2417] shadow-sm transition hover:border-[#b71c1c]/30 hover:text-[#b71c1c]"
            type="button"
            onClick={() => { logout(); router.push('/login'); }}
            title="Déconnexion"
            aria-label="Déconnexion"
          >
            <LogOut size={14} />
          </button>
        </div>
        </div>
      </header>

      {profileOpen && <ProfileDrawer onClose={() => setProfileOpen(false)} />}
    </>
  );
}
