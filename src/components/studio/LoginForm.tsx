import { useState, type FormEvent } from 'react';
import { getSupabaseBrowserClient } from '../../lib/supabase/client';

/**
 * Email + password sign-in for the studio. Uses the cookie-based browser
 * client (@supabase/ssr) so the session is visible to server middleware.
 * On success the browser is sent to /studio, where the middleware now
 * recognizes the session.
 */
export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setError('Supabase is not configured. Add the env values and restart.');
      return;
    }

    setBusy(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setBusy(false);

    if (signInError) {
      setError(
        signInError.message === 'Invalid login credentials'
          ? 'Wrong email or password.'
          : signInError.message,
      );
      return;
    }

    window.location.href = '/studio';
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-ink-700">
          Email
        </label>
        <input
          id="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1 w-full rounded-card border border-ink-200 bg-paper px-3 py-2 text-sm outline-none focus:border-ink-400"
          placeholder="you@example.com"
        />
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-ink-700">
          Password
        </label>
        <input
          id="password"
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1 w-full rounded-card border border-ink-200 bg-paper px-3 py-2 text-sm outline-none focus:border-ink-400"
          placeholder="••••••••"
        />
      </div>

      {error && (
        <p className="rounded-card border border-accent-200 bg-accent-50 px-3 py-2 text-sm text-accent-800">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={busy}
        className="w-full rounded-card bg-ink-950 px-4 py-2.5 text-sm font-semibold text-paper transition hover:bg-ink-800 disabled:opacity-50"
      >
        {busy ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  );
}
