import { useState, type FormEvent } from 'react';

/**
 * The form half of the invitation page.
 * mode "set_password": create the account (email is fixed by the invitation).
 * mode "accept": link the current session's account to the invitation.
 */
export default function AcceptInviteForm({
  token,
  mode,
  email,
  role,
}: {
  token: string;
  mode: 'set_password' | 'accept';
  email: string;
  role: 'author' | 'editor';
}) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (mode === 'set_password') {
      if (password.length < 8) {
        setError('Password must be at least 8 characters.');
        return;
      }
      if (password !== confirm) {
        setError('Passwords do not match.');
        return;
      }
    }

    setBusy(true);
    const res = await fetch('/api/studio/invitations/accept', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ token, password }),
    });
    setBusy(false);
    const data = await res.json();

    if (!res.ok) {
      if (data.code === 'already_registered') {
        setError(data.error);
        setTimeout(() => (window.location.href = '/studio/login'), 2500);
        return;
      }
      setError(data.error ?? 'Could not accept the invitation.');
      return;
    }

    setDone(true);
    setTimeout(() => (window.location.href = '/studio'), 1200);
  }

  if (done) {
    return (
      <div className="text-sm text-ink-600">
        <p className="font-semibold text-green-700">Welcome aboard!</p>
        <p className="mt-2">Invitation accepted as {role}. Taking you to the studio…</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <p className="font-display text-xl font-bold text-ink-950">You're invited</p>
        <p className="mt-1 text-sm text-ink-600">
          <strong>{email}</strong> is invited to join Did You Hear? as{' '}
          <strong>{role}</strong>.
        </p>
      </div>

      <div>
        <label htmlFor="invite-password" className="block text-sm font-medium text-ink-700">
          {mode === 'set_password' ? 'Choose a password' : 'Confirm your email to accept'}
        </label>
        {mode === 'set_password' && (
          <>
            <input
              id="invite-password"
              type="password"
              required
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-card border border-ink-200 bg-paper px-3 py-2 text-sm outline-none focus:border-ink-400"
              placeholder="At least 8 characters"
            />
            <input
              type="password"
              required
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="mt-2 w-full rounded-card border border-ink-200 bg-paper px-3 py-2 text-sm outline-none focus:border-ink-400"
              placeholder="Repeat password"
            />
          </>
        )}
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
        {busy ? 'Accepting…' : mode === 'set_password' ? 'Create account & join' : 'Accept invitation'}
      </button>
    </form>
  );
}
