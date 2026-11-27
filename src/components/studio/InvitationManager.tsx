import { useCallback, useEffect, useState, type FormEvent } from 'react';

/**
 * Invitation management for the owner and editors (v1: no email sending —
 * the owner copies the one-time link and delivers it personally).
 * - Lists invitations straight from the database (RLS: editors+ only).
 * - Creating returns the raw invite link exactly once (only the SHA-256
 *   hash is stored server-side, so a lost link must be re-issued).
 * - Pending invitations can be revoked.
 */

interface Invitation {
  id: string;
  email: string;
  role: string;
  status: string;
  expires_at: string;
  created_at: string;
}

export default function InvitationManager({ canInviteEditors }: { canInviteEditors: boolean }) {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('author');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdLink, setCreatedLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch('/api/studio/invitations');
    if (res.status === 401) {
      window.location.href = '/studio/login';
      return;
    }
    const data = await res.json();
    if (Array.isArray(data.invitations)) setInvitations(data.invitations);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setCreatedLink(null);
    setBusy(true);
    const res = await fetch('/api/studio/invitations', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: email.trim(), role }),
    });
    setBusy(false);
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? 'Could not create the invitation.');
      return;
    }
    setCreatedLink(data.link);
    setEmail('');
    load();
  }

  async function handleRevoke(id: string) {
    await fetch('/api/studio/invitations/revoke', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    load();
  }

  async function copyLink() {
    if (!createdLink) return;
    await navigator.clipboard.writeText(createdLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const pending = invitations.filter((i) => i.status === 'pending');
  const history = invitations.filter((i) => i.status !== 'pending');

  return (
    <div className="space-y-6">
      {/* Create */}
      <form onSubmit={handleCreate} className="flex flex-wrap items-end gap-3">
        <div className="min-w-56 flex-1">
          <label htmlFor="invite-email" className="block text-sm font-medium text-ink-700">
            Invite by email
          </label>
          <input
            id="invite-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="author@example.com"
            className="mt-1 w-full rounded-card border border-ink-200 bg-paper px-3 py-2 text-sm outline-none focus:border-ink-400"
          />
        </div>
        <div>
          <label htmlFor="invite-role" className="block text-sm font-medium text-ink-700">
            Role
          </label>
          <select
            id="invite-role"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="mt-1 rounded-card border border-ink-200 bg-paper px-3 py-2 text-sm outline-none focus:border-ink-400"
          >
            <option value="author">Author</option>
            {canInviteEditors && <option value="editor">Editor</option>}
          </select>
        </div>
        <button
          type="submit"
          disabled={busy}
          className="rounded-card bg-ink-950 px-4 py-2 text-sm font-semibold text-paper transition hover:bg-ink-800 disabled:opacity-50"
        >
          {busy ? 'Creating…' : 'Create invitation'}
        </button>
      </form>

      {error && (
        <p className="rounded-card border border-accent-200 bg-accent-50 px-3 py-2 text-sm text-accent-800">
          {error}
        </p>
      )}

      {createdLink && (
        <div className="rounded-card border border-ink-300 bg-ink-50 p-4">
          <p className="text-sm font-semibold text-ink-900">
            Invitation created — copy the link now
          </p>
          <p className="mt-1 text-xs text-ink-500">
            This link is shown only once and expires in 7 days. Send it to the person you
            invited — anyone who opens it can activate the account.
          </p>
          <div className="mt-3 flex items-center gap-2">
            <code className="flex-1 overflow-x-auto rounded-card border border-ink-200 bg-white px-3 py-2 text-xs text-ink-700">
              {createdLink}
            </code>
            <button
              onClick={copyLink}
              className="shrink-0 rounded-card border border-ink-300 bg-white px-3 py-2 text-xs font-semibold text-ink-700 transition hover:bg-ink-100"
            >
              {copied ? 'Copied ✓' : 'Copy'}
            </button>
          </div>
        </div>
      )}

      {/* Pending */}
      {pending.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-ink-900">Pending invitations</h3>
          <ul className="mt-2 divide-y divide-ink-100 rounded-card border border-ink-200 bg-white">
            {pending.map((i) => (
              <li key={i.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-ink-900">{i.email}</p>
                  <p className="text-xs text-ink-500">
                    {i.role} · expires {new Date(i.expires_at).toLocaleDateString()}
                  </p>
                </div>
                <button
                  onClick={() => handleRevoke(i.id)}
                  className="rounded-card border border-accent-300 px-3 py-1.5 text-xs font-semibold text-accent-700 transition hover:bg-accent-50"
                >
                  Revoke
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* History */}
      {history.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-ink-900">Earlier invitations</h3>
          <ul className="mt-2 divide-y divide-ink-100 rounded-card border border-ink-200 bg-white">
            {history.map((i) => (
              <li key={i.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-ink-700">{i.email}</p>
                  <p className="text-xs text-ink-400">{i.role}</p>
                </div>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    i.status === 'accepted'
                      ? 'bg-green-50 text-green-700'
                      : 'bg-ink-100 text-ink-500'
                  }`}
                >
                  {i.status}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
