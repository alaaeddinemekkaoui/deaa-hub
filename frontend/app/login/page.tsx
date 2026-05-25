'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, ArrowRight, Eye, EyeOff, Lock, Mail } from 'lucide-react';
import { useAuth } from '@/features/auth/auth-context';
import { api } from '@/services/api';

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [identifier, setIdentifier] = useState('admin');
  const [password, setPassword] = useState('admin');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api
      .get('/db-status')
      .then((response) => {
        console.log('[DEAA-Hub] DB status:', response.data);
      })
      .catch((dbError) => {
        console.error('[DEAA-Hub] DB status check failed:', dbError);
      });
  }, []);

  return (
    <div className="min-h-screen overflow-hidden bg-[#0f3b20] text-slate-950">
      <div className="grid min-h-screen lg:grid-cols-[52%_48%]">
        <section className="relative flex min-h-[44vh] flex-col items-center justify-center overflow-hidden bg-white px-6 py-12 lg:min-h-screen">
          <div
            className="absolute inset-0 opacity-[0.18]"
            style={{
              backgroundImage: 'radial-gradient(circle at 1px 1px, #0f3b20 1px, transparent 0)',
              backgroundSize: '32px 32px',
            }}
          />
          <div className="absolute bottom-0 left-0 right-0 grid h-1.5 grid-cols-[34%_34%_32%]">
            <span className="bg-[#c83a2b]" />
            <span className="bg-[#16813a]" />
            <span className="bg-[#c7a23b]" />
          </div>

          <div className="relative z-10 flex w-full max-w-3xl flex-col items-center text-center">
            <div className="flex flex-col items-center gap-5 sm:flex-row sm:text-left">
              <Image
                src="/logo0.png"
                alt="Institut Agronomique et Vétérinaire Hassan II"
                width={138}
                height={138}
                priority
                className="h-28 w-28 object-contain sm:h-36 sm:w-36"
              />
              <div className="space-y-2">
                <p className="text-2xl font-semibold leading-tight text-[#162016] sm:text-3xl" dir="rtl">
                  معهد الحسن الثاني للزراعة و البيطرة
                </p>
                <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-800 sm:text-sm">
                  Institut Agronomique et Vétérinaire Hassan II
                </p>
              </div>
            </div>

            <div className="my-12 flex w-full max-w-2xl items-center gap-5">
              <span className="h-px flex-1 bg-slate-200" />
              <span className="text-xs font-bold uppercase tracking-[0.52em] text-[#c7a23b]">Depuis 1966</span>
              <span className="h-px flex-1 bg-slate-200" />
            </div>

            <div className="space-y-5">
              <h1 className="text-2xl font-black uppercase tracking-[0.22em] text-[#021f14] sm:text-3xl">
                Institut Agronomique
                <span className="mt-3 block">et Vétérinaire Hassan II</span>
              </h1>
              <p className="text-lg text-slate-400" dir="rtl">معهد الحسن الثاني للزراعة والبيطرة</p>
              <p className="text-sm text-slate-500 sm:text-base">
                Plateforme académique, pédagogique et administrative
              </p>
            </div>
          </div>

          <p className="relative z-10 mt-12 text-xs uppercase tracking-[0.45em] text-slate-400 lg:absolute lg:bottom-7">
            Rabat · Agadir · Maroc
          </p>
        </section>

        <section className="relative flex min-h-[56vh] flex-col justify-center bg-[#103e21] px-6 py-12 text-white lg:min-h-screen lg:px-20">
          <div className="absolute inset-x-0 top-0 grid h-1 grid-cols-[33%_34%_33%]">
            <span className="bg-[#c83a2b]" />
            <span className="bg-[#16813a]" />
            <span className="bg-[#c7a23b]" />
          </div>
          <div className="mx-auto w-full max-w-[475px]">
            <div className="mb-11">
              <p className="mb-5 text-xs font-bold uppercase tracking-[0.55em] text-[#b2932e]">Espace numérique</p>
              <h2 className="text-5xl font-black tracking-tight sm:text-6xl">Connexion</h2>
              <p className="mt-4 text-base text-white/48">Accédez à votre espace de travail</p>
            </div>

            <form
              className="space-y-7"
              onSubmit={async (event) => {
                event.preventDefault();
                setLoading(true);
                setError(null);
                try {
                  await login(identifier, password);
                  router.push('/dashboard');
                } catch {
                  setError('Identifiant ou mot de passe invalide');
                } finally {
                  setLoading(false);
                }
              }}
            >
              <div className="space-y-3">
                <label className="block text-xs font-black uppercase tracking-[0.48em] text-white/44">
                  Email ou identifiant
                </label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-[#103e21]/35" />
                  <input
                    className="h-[60px] w-full rounded-xl border border-transparent bg-[#e5eefc] px-14 text-base text-[#06170d] shadow-[0_18px_40px_rgba(0,0,0,0.12)] transition placeholder:text-slate-400 focus:border-[#c7a23b] focus:bg-white"
                    value={identifier}
                    onChange={(event) => setIdentifier(event.target.value)}
                    type="text"
                    autoComplete="username"
                    required
                  />
                </div>
              </div>

              <div className="space-y-3">
                <label className="block text-xs font-black uppercase tracking-[0.48em] text-white/44">
                  Mot de passe
                </label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-white/22" />
                  <input
                    className="h-[60px] w-full rounded-xl border border-white/10 bg-white/8 px-14 pr-14 text-base text-white transition placeholder:text-white/30 focus:border-[#c7a23b] focus:bg-white/12"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                  />
                  <button
                    type="button"
                    className="absolute right-5 top-1/2 -translate-y-1/2 text-white/30 transition hover:text-white/75"
                    onClick={() => setShowPassword((current) => !current)}
                    aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                  >
                    {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
                  </button>
                </div>
              </div>

              <div className="flex justify-end">
                <button type="button" className="text-sm font-semibold text-[#b2932e] transition hover:text-[#d5b75a]">
                  Mot de passe oublié ?
                </button>
              </div>

              {error ? (
                <div className="flex items-center gap-3 rounded-xl border border-[#c83a2b]/55 bg-[#c83a2b]/10 px-5 py-4 text-sm text-[#ff8a73]">
                  <AlertCircle size={18} />
                  {error}
                </div>
              ) : null}

              <button
                className="flex h-[66px] w-full items-center justify-center gap-3 rounded-full bg-[#178338] text-sm font-black uppercase tracking-[0.24em] text-white shadow-[0_18px_35px_rgba(0,0,0,0.18)] transition hover:bg-[#126f2f] disabled:pointer-events-none disabled:opacity-65"
                type="submit"
                disabled={loading}
              >
                {loading ? 'Connexion...' : 'Se connecter'}
                <ArrowRight size={20} />
              </button>

              <p className="pt-4 text-center text-sm text-white/32">
                Accès réservé aux membres de l&apos;établissement
              </p>
            </form>
          </div>

          <p className="mt-12 text-center text-[11px] uppercase tracking-[0.42em] text-white/16 lg:absolute lg:bottom-7 lg:left-0 lg:right-0">
            © 2026 IAV Hassan II · Tous droits réservés
          </p>
        </section>
      </div>
    </div>
  );
}
