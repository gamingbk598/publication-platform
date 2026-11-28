import { useMemo, useState, type FormEvent } from 'react';
import type { ContentBlock } from '../../types/article';

/**
 * The Phase 4 article editor: structured block editing (no raw HTML ever
 * enters the database) plus the editorial workflow actions.
 *
 * Every mutation goes through /api/studio/articles/* endpoints, which run
 * under the signed-in user's session — Row Level Security decides what is
 * actually allowed. The UI merely shows the buttons the role/status permit.
 */

export interface EditorArticle {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  excerpt: string;
  contentType: string;
  categoryId: string;
  status: string;
  tags: string[];
  body: ContentBlock[];
  eventDate: string | null;
  location: string | null;
  featured: boolean;
  editorsPick: boolean;
  breaking: boolean;
  scheduledAt: string | null;
}

export interface ReviewEntry {
  id: string;
  decision: string;
  comment: string;
  is_author_response: boolean;
  created_at: string;
  reviewer: { display_name: string } | null;
}

interface Props {
  mode: 'create' | 'edit';
  article?: EditorArticle;
  categories: { id: string; name: string }[];
  existingTags: string[];
  role: 'owner' | 'editor' | 'author';
  reviews?: ReviewEntry[];
}

const CONTENT_TYPES = [
  ['article', 'Article'],
  ['news', 'News report'],
  ['blog', 'Blog post'],
  ['opinion', 'Opinion'],
  ['analysis', 'Analysis'],
  ['guide', 'Guide'],
  ['review', 'Review'],
  ['interview', 'Interview'],
  ['explainer', 'Explainer'],
] as const;

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-ink-100 text-ink-600',
  submitted: 'bg-amber-50 text-amber-700',
  in_review: 'bg-amber-50 text-amber-700',
  changes_requested: 'bg-orange-50 text-orange-700',
  approved: 'bg-green-50 text-green-700',
  scheduled: 'bg-sky-50 text-sky-700',
  published: 'bg-green-100 text-green-800',
  rejected: 'bg-accent-50 text-accent-700',
  archived: 'bg-ink-100 text-ink-400',
};

const inputCls =
  'w-full rounded-card border border-ink-200 bg-paper px-3 py-2 text-sm outline-none focus:border-ink-400';
const labelCls = 'block text-sm font-medium text-ink-700';
const btnPrimary =
  'rounded-card bg-ink-950 px-4 py-2 text-sm font-semibold text-paper transition hover:bg-ink-800 disabled:opacity-50';
const btnGhost =
  'rounded-card border border-ink-300 bg-white px-4 py-2 text-sm font-semibold text-ink-700 transition hover:bg-ink-100 disabled:opacity-50';

export default function ArticleEditor({
  mode,
  article,
  categories,
  existingTags,
  role,
  reviews = [],
}: Props) {
  const isEditor = role === 'owner' || role === 'editor';

  const [title, setTitle] = useState(article?.title ?? '');
  const [subtitle, setSubtitle] = useState(article?.subtitle ?? '');
  const [excerpt, setExcerpt] = useState(article?.excerpt ?? '');
  const [contentType, setContentType] = useState(article?.contentType ?? 'article');
  const [categoryId, setCategoryId] = useState(article?.categoryId ?? '');
  const [tags, setTags] = useState((article?.tags ?? []).join(', '));
  const [eventDate, setEventDate] = useState(article?.eventDate ?? '');
  const [location, setLocation] = useState(article?.location ?? '');
  const [body, setBody] = useState<ContentBlock[]>(article?.body ?? []);
  const [featured, setFeatured] = useState(article?.featured ?? false);
  const [editorsPick, setEditorsPick] = useState(article?.editorsPick ?? false);
  const [breaking, setBreaking] = useState(article?.breaking ?? false);
  const [publishAt, setPublishAt] = useState('');
  const [comment, setComment] = useState('');

  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(article?.id ?? null);
  const [status, setStatus] = useState(article?.status ?? 'draft');

  const words = useMemo(() => {
    const text = body
      .map((b) => {
        switch (b.type) {
          case 'heading':
          case 'paragraph':
            return b.text;
          case 'quote':
            return b.text;
          case 'list':
            return b.items.join(' ');
          case 'code':
            return b.code;
          default:
            return '';
        }
      })
      .join(' ');
    return text.split(/\s+/).filter(Boolean).length;
  }, [body]);

  const tagList = () =>
    tags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

  async function save(): Promise<string | null> {
    setError(null);
    setNotice(null);
    const payload = {
      title: title.trim(),
      subtitle,
      excerpt,
      contentType,
      categoryId,
      tags: tagList(),
      eventDate: contentType === 'news' ? eventDate : '',
      location: contentType === 'news' ? location : '',
      body,
      ...(isEditor ? { featured, editorsPick, breaking } : {}),
    };
    if (!payload.title) {
      setError('Give the article a title first.');
      return null;
    }

    const res = await fetch(
      savedId ? `/api/studio/articles/${savedId}` : '/api/studio/articles',
      {
        method: savedId ? 'PATCH' : 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      },
    );
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? 'Could not save.');
      return null;
    }
    return data.article.id as string;
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setBusy('save');
    const id = await save();
    setBusy(null);
    if (id) {
      setSavedId(id);
      setNotice('Saved.');
      if (mode === 'create') window.location.href = `/studio/articles/${id}`;
    }
  }

  async function transition(action: string, extra: Record<string, unknown> = {}) {
    setError(null);
    setNotice(null);
    setBusy(action);
    const id = savedId ?? (await save());
    if (!id) {
      setBusy(null);
      return;
    }
    const res = await fetch(`/api/studio/articles/${id}/transition`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action, comment, ...extra }),
    });
    const data = await res.json();
    setBusy(null);
    if (!res.ok) {
      setError(data.error ?? 'Action failed.');
      return;
    }
    setComment('');
    // Refresh to pick up the new status + review thread.
    window.location.reload();
  }

  // ── block helpers ────────────────────────────────────────────────────────
  function updateBlock(i: number, b: ContentBlock) {
    setBody((prev) => prev.map((old, idx) => (idx === i ? b : old)));
  }
  function addBlock(type: ContentBlock['type']) {
    const templates: Record<string, ContentBlock> = {
      heading: { type: 'heading', level: 2, text: '' },
      paragraph: { type: 'paragraph', text: '' },
      quote: { type: 'quote', text: '', attribution: '' },
      list: { type: 'list', ordered: false, items: [''] },
      code: { type: 'code', language: 'text', code: '' },
      image: { type: 'image', caption: '' },
    };
    setBody((prev) => [...prev, templates[type]]);
  }
  function moveBlock(i: number, dir: -1 | 1) {
    setBody((prev) => {
      const j = i + dir;
      if (j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }
  function removeBlock(i: number) {
    setBody((prev) => prev.filter((_, idx) => idx !== i));
  }

  const editable = status === 'draft' || status === 'submitted' || status === 'changes_requested';

  return (
    <div className="space-y-6">
      {/* Status header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${STATUS_STYLES[status] ?? 'bg-ink-100 text-ink-600'}`}
          >
            {status.replace(/_/g, ' ')}
          </span>
          <span className="text-xs text-ink-400">
            {words} words · ~{Math.max(1, Math.round(words / 220))} min read
          </span>
        </div>
        <button
          type="button"
          onClick={handleSave}
          disabled={busy !== null || (mode === 'edit' && !editable && !isEditor)}
          className={btnPrimary}
        >
          {busy === 'save' ? 'Saving…' : mode === 'create' ? 'Create draft' : 'Save changes'}
        </button>
      </div>

      {error && (
        <p className="rounded-card border border-accent-200 bg-accent-50 px-3 py-2 text-sm text-accent-800">
          {error}
        </p>
      )}
      {notice && (
        <p className="rounded-card border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
          {notice}
        </p>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Meta card */}
        <div className="space-y-4 rounded-card border border-ink-200 bg-white p-6">
          <div>
            <label htmlFor="ae-title" className={labelCls}>
              Title
            </label>
            <input
              id="ae-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
              required
              placeholder="A headline readers click"
              className={`mt-1 ${inputCls} font-display text-lg`}
            />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label htmlFor="ae-subtitle" className={labelCls}>
                Subtitle
              </label>
              <input
                id="ae-subtitle"
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                maxLength={300}
                placeholder="Optional deck below the headline"
                className={`mt-1 ${inputCls}`}
              />
            </div>
            <div>
              <label htmlFor="ae-excerpt" className={labelCls}>
                Excerpt <span className="font-normal text-ink-400">(max 500)</span>
              </label>
              <textarea
                id="ae-excerpt"
                value={excerpt}
                onChange={(e) => setExcerpt(e.target.value)}
                maxLength={500}
                rows={2}
                placeholder="Shown on cards and social previews"
                className={`mt-1 ${inputCls}`}
              />
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label htmlFor="ae-type" className={labelCls}>
                Content type
              </label>
              <select
                id="ae-type"
                value={contentType}
                onChange={(e) => setContentType(e.target.value)}
                className={`mt-1 ${inputCls}`}
              >
                {CONTENT_TYPES.map(([v, label]) => (
                  <option key={v} value={v}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="ae-cat" className={labelCls}>
                Category
              </label>
              <select
                id="ae-cat"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className={`mt-1 ${inputCls}`}
              >
                <option value="">— none —</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="ae-tags" className={labelCls}>
                Tags <span className="font-normal text-ink-400">(comma separated)</span>
              </label>
              <input
                id="ae-tags"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                list="ae-tag-options"
                placeholder="press, ethics, ai"
                className={`mt-1 ${inputCls}`}
              />
              <datalist id="ae-tag-options">
                {existingTags.map((t) => (
                  <option key={t} value={t} />
                ))}
              </datalist>
              {!isEditor && (
                <p className="mt-1 text-xs text-ink-400">
                  Only existing tags can be attached (editors create new ones).
                </p>
              )}
            </div>
          </div>

          {contentType === 'news' && (
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label htmlFor="ae-event" className={labelCls}>
                  Event date
                </label>
                <input
                  id="ae-event"
                  type="date"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  className={`mt-1 ${inputCls}`}
                />
              </div>
              <div>
                <label htmlFor="ae-loc" className={labelCls}>
                  Location
                </label>
                <input
                  id="ae-loc"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  maxLength={120}
                  placeholder="Where it happened"
                  className={`mt-1 ${inputCls}`}
                />
              </div>
            </div>
          )}

          {isEditor && (
            <div className="flex flex-wrap gap-5 border-t border-ink-100 pt-4">
              <label className="flex items-center gap-2 text-sm text-ink-700">
                <input
                  type="checkbox"
                  checked={featured}
                  onChange={(e) => setFeatured(e.target.checked)}
                />
                Featured (hero slot)
              </label>
              <label className="flex items-center gap-2 text-sm text-ink-700">
                <input
                  type="checkbox"
                  checked={editorsPick}
                  onChange={(e) => setEditorsPick(e.target.checked)}
                />
                Editor's pick
              </label>
              <label className="flex items-center gap-2 text-sm text-ink-700">
                <input
                  type="checkbox"
                  checked={breaking}
                  onChange={(e) => setBreaking(e.target.checked)}
                />
                Breaking
              </label>
            </div>
          )}
        </div>

        {/* Body blocks */}
        <div className="rounded-card border border-ink-200 bg-white p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-display text-lg font-bold text-ink-950">Body</h2>
            <div className="flex flex-wrap gap-2">
              {(['paragraph', 'heading', 'quote', 'list', 'code'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => addBlock(t)}
                  className="rounded-card border border-ink-300 bg-white px-3 py-1.5 text-xs font-semibold text-ink-700 transition hover:bg-ink-100"
                >
                  + {t}
                </button>
              ))}
            </div>
          </div>

          {body.length === 0 && (
            <p className="rounded-card border border-dashed border-ink-200 px-4 py-8 text-center text-sm text-ink-400">
              Empty so far — add a paragraph to start writing.
            </p>
          )}

          <div className="space-y-3">
            {body.map((b, i) => (
              <div key={i} className="rounded-card border border-ink-200 bg-paper p-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wide text-ink-400">
                    {b.type === 'heading' ? `heading h${b.level}` : b.type}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => moveBlock(i, -1)}
                      className="rounded px-2 py-0.5 text-xs text-ink-500 hover:bg-ink-100"
                      aria-label="Move up"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => moveBlock(i, 1)}
                      className="rounded px-2 py-0.5 text-xs text-ink-500 hover:bg-ink-100"
                      aria-label="Move down"
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      onClick={() => removeBlock(i)}
                      className="rounded px-2 py-0.5 text-xs text-accent-600 hover:bg-accent-50"
                      aria-label="Remove block"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                {b.type === 'heading' && (
                  <div className="flex gap-2">
                    <select
                      value={b.level}
                      onChange={(e) =>
                        updateBlock(i, { ...b, level: Number(e.target.value) as 2 | 3 })
                      }
                      className="rounded-card border border-ink-200 bg-white px-2 py-2 text-sm"
                    >
                      <option value={2}>H2</option>
                      <option value={3}>H3</option>
                    </select>
                    <input
                      value={b.text}
                      onChange={(e) => updateBlock(i, { ...b, text: e.target.value })}
                      placeholder="Section heading"
                      className={inputCls}
                    />
                  </div>
                )}

                {b.type === 'paragraph' && (
                  <textarea
                    value={b.text}
                    onChange={(e) => updateBlock(i, { ...b, text: e.target.value })}
                    rows={4}
                    placeholder="Write the story…"
                    className={inputCls}
                  />
                )}

                {b.type === 'quote' && (
                  <div className="space-y-2">
                    <textarea
                      value={b.text}
                      onChange={(e) => updateBlock(i, { ...b, text: e.target.value })}
                      rows={2}
                      placeholder="The quote"
                      className={inputCls}
                    />
                    <input
                      value={b.attribution ?? ''}
                      onChange={(e) => updateBlock(i, { ...b, attribution: e.target.value })}
                      placeholder="— who said it"
                      className={inputCls}
                    />
                  </div>
                )}

                {b.type === 'list' && (
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-xs text-ink-600">
                      <input
                        type="checkbox"
                        checked={b.ordered}
                        onChange={(e) => updateBlock(i, { ...b, ordered: e.target.checked })}
                      />
                      Numbered list
                    </label>
                    <textarea
                      value={b.items.join('\n')}
                      onChange={(e) =>
                        updateBlock(i, { ...b, items: e.target.value.split('\n') })
                      }
                      rows={3}
                      placeholder={'One item per line'}
                      className={inputCls}
                    />
                  </div>
                )}

                {b.type === 'code' && (
                  <div className="space-y-2">
                    <input
                      value={b.language}
                      onChange={(e) => updateBlock(i, { ...b, language: e.target.value })}
                      placeholder="language (e.g. python)"
                      className={inputCls}
                    />
                    <textarea
                      value={b.code}
                      onChange={(e) => updateBlock(i, { ...b, code: e.target.value })}
                      rows={4}
                      className={`${inputCls} font-mono`}
                    />
                  </div>
                )}

                {b.type === 'image' && (
                  <input
                    value={b.caption ?? ''}
                    onChange={(e) => updateBlock(i, { ...b, caption: e.target.value })}
                    placeholder="Image caption (image upload arrives with Phase 8)"
                    className={inputCls}
                    disabled
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      </form>

      {/* Workflow actions (edit mode only) */}
      {mode === 'edit' && savedId && (
        <div className="space-y-4 rounded-card border border-ink-200 bg-white p-6">
          <h2 className="font-display text-lg font-bold text-ink-950">Workflow</h2>

          <div className="flex flex-wrap gap-2">
            {['draft', 'changes_requested', 'rejected'].includes(status) && (
              <button
                type="button"
                onClick={() => transition('submit')}
                disabled={busy !== null}
                className={btnPrimary}
              >
                {busy === 'submit' ? 'Submitting…' : 'Submit for review'}
              </button>
            )}
            {isEditor && status === 'submitted' && (
              <button type="button" onClick={() => transition('start_review')} disabled={busy !== null} className={btnGhost}>
                Start review
              </button>
            )}
            {isEditor && ['submitted', 'in_review', 'approved'].includes(status) && (
              <>
                <button
                  type="button"
                  onClick={() => transition('request_changes')}
                  disabled={busy !== null}
                  className={btnGhost}
                >
                  Request changes
                </button>
                <button
                  type="button"
                  onClick={() => transition('approve')}
                  disabled={busy !== null}
                  className={btnGhost}
                >
                  Approve
                </button>
              </>
            )}
            {isEditor && ['submitted', 'in_review'].includes(status) && (
              <button
                type="button"
                onClick={() => transition('reject')}
                disabled={busy !== null}
                className="rounded-card border border-accent-300 bg-white px-4 py-2 text-sm font-semibold text-accent-700 transition hover:bg-accent-50 disabled:opacity-50"
              >
                Reject
              </button>
            )}
            {isEditor && status === 'approved' && (
              <button
                type="button"
                onClick={() => transition('publish')}
                disabled={busy !== null}
                className={btnPrimary}
              >
                {busy === 'publish' ? 'Publishing…' : 'Publish now'}
              </button>
            )}
            {isEditor && ['draft', 'approved', 'submitted', 'in_review', 'changes_requested'].includes(status) && (
              <div className="flex items-end gap-2">
                <div>
                  <label htmlFor="ae-publishat" className="block text-xs text-ink-500">
                    Schedule
                  </label>
                  <input
                    id="ae-publishat"
                    type="datetime-local"
                    value={publishAt}
                    onChange={(e) => setPublishAt(e.target.value)}
                    className="mt-1 rounded-card border border-ink-200 bg-paper px-2 py-1.5 text-sm"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => transition('schedule', { scheduledAt: publishAt })}
                  disabled={busy !== null || !publishAt}
                  className={btnGhost}
                >
                  Schedule
                </button>
              </div>
            )}
            {isEditor && ['published', 'scheduled'].includes(status) && (
              <button
                type="button"
                onClick={() => transition('unpublish')}
                disabled={busy !== null}
                className={btnGhost}
              >
                Unpublish (back to draft)
              </button>
            )}
            {isEditor && !['archived'].includes(status) && (
              <button
                type="button"
                onClick={() => transition('archive')}
                disabled={busy !== null}
                className={btnGhost}
              >
                Archive
              </button>
            )}
            {status === 'published' && article?.slug && (
              <a
                href={`/article/${article.slug}`}
                target="_blank"
                rel="noreferrer"
                className="rounded-card border border-green-300 bg-green-50 px-4 py-2 text-sm font-semibold text-green-800 transition hover:bg-green-100"
              >
                View live ↗
              </a>
            )}
          </div>

          {/* Comment box */}
          <div>
            <label htmlFor="ae-comment" className={labelCls}>
              Note for the thread <span className="font-normal text-ink-400">(optional)</span>
            </label>
            <textarea
              id="ae-comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={2}
              maxLength={2000}
              placeholder={
                isEditor ? 'Feedback for the author…' : 'Reply to the editors…'
              }
              className={`mt-1 ${inputCls}`}
            />
            <button
              type="button"
              onClick={() => transition('comment')}
              disabled={busy !== null || !comment.trim()}
              className={`mt-2 ${btnGhost}`}
            >
              {busy === 'comment' ? 'Posting…' : 'Post comment'}
            </button>
          </div>

          {/* Review thread */}
          {reviews.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-ink-900">Editorial thread</h3>
              <ul className="mt-2 space-y-2">
                {reviews.map((r) => (
                  <li
                    key={r.id}
                    className={`rounded-card border px-3 py-2 text-sm ${
                      r.is_author_response
                        ? 'border-ink-200 bg-ink-50'
                        : 'border-ink-200 bg-white'
                    }`}
                  >
                    <p className="text-xs text-ink-400">
                      <strong className="text-ink-700">
                        {r.reviewer?.display_name ?? 'Member'}
                      </strong>{' '}
                      · {new Date(r.created_at).toLocaleString()} ·{' '}
                      <span className="capitalize">{r.decision.replace(/_/g, ' ')}</span>
                    </p>
                    {r.comment && <p className="mt-1 whitespace-pre-wrap text-ink-800">{r.comment}</p>}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
