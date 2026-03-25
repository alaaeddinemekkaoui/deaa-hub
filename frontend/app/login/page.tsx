'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/features/auth/auth-context';
import { api } from '@/services/api';

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [identifier, setIdentifier] = useState('admin');
  const [password, setPassword] = useState('admin');
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
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
      <div className="card w-full max-w-md">
        <div className="mb-2 flex items-center gap-2">
          <Image src="/logo0.png" alt="DEAA-Hub logo" width={30} height={30} priority />
          <h1 className="text-2xl font-bold text-primary">DEAA-Hub</h1>
        </div>
        <p className="subtle mb-6">Connectez-vous pour accéder à la plateforme</p>

        <form
          className="space-y-4"
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
          <div>
            <label className="mb-1 block text-sm">Username or Email</label>
            <input
              className="input"
              value={identifier}
              onChange={(event) => setIdentifier(event.target.value)}
              type="text"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm">Mot de passe</label>
            <input
              className="input"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              required
            />
          </div>

          {error ? <p className="text-sm text-rose-600">{error}</p> : null}

          <button className="btn-primary w-full" type="submit" disabled={loading}>
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>
      </div>
    </div>
  );
}
