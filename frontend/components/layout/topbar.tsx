'use client';

import { useEffect, useRef, useState } from 'react';
import { LogOut, Pencil, X, Check, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/features/auth/auth-context';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

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

/* ── Topbar ─────────────────────────────────────────────────── */
export function Topbar() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [profileOpen, setProfileOpen] = useState(false);

  const avatar = initials(user?.fullName, user?.email);

  return (
    <>
      <header className="mb-6 flex items-center justify-between gap-4 rounded-2xl border bg-white px-5 py-3 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="h-2 w-2 rounded-full bg-emerald-500" />
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            IAV Hassan II — DEAA Hub
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Clickable user info → opens profile drawer */}
          <button
            type="button"
            onClick={() => setProfileOpen(true)}
            className="group flex items-center gap-2.5 rounded-xl px-3 py-1.5 transition hover:bg-slate-50"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-700 text-white text-[11px] font-bold shadow-sm">
              {avatar}
            </div>
            <div className="text-right text-sm hidden sm:block">
              <p className="font-semibold text-slate-900 leading-tight">{user?.fullName ?? user?.email}</p>
              <p className="text-xs text-slate-400 capitalize">{user?.role ?? 'viewer'}</p>
            </div>
            <Pencil
              size={12}
              className="text-slate-300 transition group-hover:text-slate-500"
            />
          </button>

          <button
            className="btn-outline py-2 px-3 text-xs"
            type="button"
            onClick={() => { logout(); router.push('/login'); }}
          >
            <LogOut size={14} />
            Déconnexion
          </button>
        </div>
      </header>

      {profileOpen && <ProfileDrawer onClose={() => setProfileOpen(false)} />}
    </>
  );
}
