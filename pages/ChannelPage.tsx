import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { meCreateSubmission, meListSubmissions } from '../lib/api';
import { useAuth } from '../context/AuthContext';

export default function ChannelPage() {
  const { user } = useAuth();

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [form, setForm] = useState({
    title: '',
    description: '',
    thumbnailUrl: '',
    videoSrc: '',
  });

  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);

  const loadSubmissions = async () => {
    setLoadingSubmissions(true);
    try {
      const res = await meListSubmissions();
      setSubmissions(res.submissions || []);
    } catch {
      setSubmissions([]);
    } finally {
      setLoadingSubmissions(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    void loadSubmissions();
  }, [user?.id]);

  const canSubmit = useMemo(() => {
    return Boolean(form.title.trim() && form.thumbnailUrl.trim() && form.videoSrc.trim());
  }, [form.title, form.thumbnailUrl, form.videoSrc]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!canSubmit) {
      setError('Please fill title, thumbnail url and video src');
      return;
    }

    setBusy(true);
    try {
      await meCreateSubmission({
        title: form.title.trim(),
        description: form.description.trim(),
        thumbnailUrl: form.thumbnailUrl.trim(),
        videoSrc: form.videoSrc.trim(),
      });
      setForm({ title: '', description: '', thumbnailUrl: '', videoSrc: '' });
      setSuccess('Submitted! Waiting for admin approval.');
      await loadSubmissions();
    } catch (e: any) {
      setError(e?.code || e?.message || 'Failed to submit');
    } finally {
      setBusy(false);
      setTimeout(() => setSuccess(null), 3000);
    }
  };

  if (!user) {
    return (
      <div className="min-h-[calc(100vh-56px)] flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-yt-gray/60 border border-white/10 rounded-2xl p-6">
          <h1 className="text-xl font-bold">Your Channel</h1>
          <p className="text-sm text-yt-textSec mt-2">Login to submit videos for approval.</p>
          <Link to="/login" className="inline-block mt-4 px-4 py-2 rounded-xl bg-white text-black font-semibold">Login</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-56px)] bg-yt-black">
      <div className="max-w-5xl mx-auto p-4 md:p-6">
        <div className="flex items-center justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl font-bold">Your Channel</h1>
            <p className="text-sm text-yt-textSec">Upload a video for admin approval. After approval it will appear on the site.</p>
          </div>
        </div>

        <div className="bg-yt-gray/60 border border-white/10 rounded-2xl p-5">
          <h2 className="font-semibold">Submit a video</h2>

          {error && <div className="mt-3 text-sm text-red-400">{error}</div>}
          {success && <div className="mt-3 text-sm text-green-300">{success}</div>}

          <form onSubmit={onSubmit} className="mt-4 space-y-3">
            <div>
              <label className="text-xs text-yt-textSec">Title</label>
              <input
                value={form.title}
                onChange={(e) => setForm((s) => ({ ...s, title: e.target.value }))}
                className="mt-1 w-full bg-[#121212] border border-white/10 rounded-xl px-3 py-2 outline-none"
              />
            </div>
            <div>
              <label className="text-xs text-yt-textSec">Description</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))}
                className="mt-1 w-full bg-[#121212] border border-white/10 rounded-xl px-3 py-2 outline-none min-h-24"
              />
            </div>
            <div>
              <label className="text-xs text-yt-textSec">Thumbnail URL</label>
              <input
                value={form.thumbnailUrl}
                onChange={(e) => setForm((s) => ({ ...s, thumbnailUrl: e.target.value }))}
                className="mt-1 w-full bg-[#121212] border border-white/10 rounded-xl px-3 py-2 outline-none"
              />
            </div>
            <div>
              <label className="text-xs text-yt-textSec">Video Source URL</label>
              <input
                value={form.videoSrc}
                onChange={(e) => setForm((s) => ({ ...s, videoSrc: e.target.value }))}
                className="mt-1 w-full bg-[#121212] border border-white/10 rounded-xl px-3 py-2 outline-none"
              />
            </div>

            <div className="flex justify-end">
              <button
                disabled={busy || !canSubmit}
                className="px-5 py-2 rounded-xl bg-white text-black font-semibold disabled:opacity-60"
              >
                {busy ? 'Submitting…' : 'Submit'}
              </button>
            </div>
          </form>
        </div>

        <div className="mt-8 bg-yt-gray/60 border border-white/10 rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Your submissions</h2>
            <button
              onClick={() => void loadSubmissions()}
              className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-sm"
              disabled={loadingSubmissions}
            >
              {loadingSubmissions ? 'Loading…' : 'Refresh'}
            </button>
          </div>

          <div className="mt-4 space-y-3">
            {submissions.length === 0 ? (
              <div className="text-sm text-yt-textSec">No submissions yet.</div>
            ) : (
              submissions.map((s) => (
                <div key={s.id} className="flex items-center justify-between gap-3 bg-black/20 border border-white/10 rounded-xl p-3">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{s.proposed_title}</div>
                    <div className="text-xs text-yt-textSec mt-1">Status: {s.status}</div>
                    {s.admin_note && <div className="text-xs text-yt-textSec mt-1">Note: {s.admin_note}</div>}
                  </div>
                  {s.approved_video_id && (
                    <Link
                      to={`/watch/${s.approved_video_id}`}
                      className="px-3 py-1.5 rounded-xl bg-white text-black text-sm font-semibold"
                    >
                      View
                    </Link>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
