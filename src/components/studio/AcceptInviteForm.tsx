import { useState, type FormEvent } from 'react';

/** Eye icon for the password visibility toggle. */
function EyeIcon({ open }: { open: boolean }) {
  if (open) {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
        <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
        <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
        <line x1="1" y1="1" x2="23" y2="23" />
      </svg>
    );
  }
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

/** Password input with a show/hide toggle button. */
function PasswordInput({
  id,
  value,
  onChange,
  placeholder,
  autoComplete = 'current-password',
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  autoComplete?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        id={id}
        type={show ? 'text' : 'password'}
        required
        autoComplete={autoComplete}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-card border border-ink-200 bg-paper px-3 py-2 pr-10 text-sm outline-none focus:border-ink-400"
        placeholder={placeholder}
      />
      <button
        type="button"
        onClick={() => setShow((v) => !v)}
        aria-label={show ? 'Hide password' : 'Show password'}
        title={show ? 'Hide password' : 'Show password'}
        className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-ink-400 transition hover:text-ink-700"
      >
        <EyeIcon open={show} />
      </button>
    </div>
  );
}

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
            <div className="mt-1">
              <PasswordInput
                id="invite-password"
                value={password}
                onChange={setPassword}
                placeholder="At least 8 characters"
                autoComplete="new-password"
              />
            </div>
            <div className="mt-2">
              <PasswordInput
                id="invite-password-confirm"
                value={confirm}
                onChange={setConfirm}
                placeholder="Repeat password"
                autoComplete="new-password"
              />
            </div>
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
