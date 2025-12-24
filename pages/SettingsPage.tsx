import React, { useMemo, useState } from 'react';
import { getStoredSettings, resetStoredSettings, setStoredSettings, type UserSettings } from '../lib/settingsStorage';

export default function SettingsPage() {
  const initial = useMemo(() => getStoredSettings(), []);
  const [settings, setSettings] = useState<UserSettings>(initial);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const save = (next: UserSettings) => {
    setSettings(next);
    setStoredSettings(next);
    setSavedAt(Date.now());
  };

  return (
    <div className="min-h-[calc(100vh-56px)] p-4 sm:p-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold">Settings</h1>
            <div className="text-sm text-yt-textSec mt-1">Customize your playback experience.</div>
          </div>
          <button
            className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15"
            onClick={() => {
              resetStoredSettings();
              const next = getStoredSettings();
              setSettings(next);
              setSavedAt(Date.now());
            }}
          >
            Reset
          </button>
        </div>

        {savedAt && <div className="mt-3 text-xs text-yt-textSec">Saved</div>}

        <div className="mt-5 space-y-4">
          <div className="bg-yt-gray/60 border border-white/10 rounded-2xl p-4">
            <div className="font-semibold">Playback</div>

            <div className="mt-4 space-y-4">
              <label className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-medium">Autoplay</div>
                  <div className="text-xs text-yt-textSec mt-0.5">Automatically start videos when opening a page.</div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.autoplay}
                  onChange={(e) => save({ ...settings, autoplay: e.target.checked })}
                />
              </label>

              <label className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-medium">Start muted</div>
                  <div className="text-xs text-yt-textSec mt-0.5">Useful for Shorts or quiet browsing.</div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.muted}
                  onChange={(e) => save({ ...settings, muted: e.target.checked })}
                />
              </label>

              <div>
                <div className="flex items-end justify-between">
                  <div>
                    <div className="text-sm font-medium">Default volume</div>
                    <div className="text-xs text-yt-textSec mt-0.5">Applies when starting a new video.</div>
                  </div>
                  <div className="text-xs text-yt-textSec">{Math.round(settings.defaultVolume * 100)}%</div>
                </div>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={settings.defaultVolume}
                  onChange={(e) => save({ ...settings, defaultVolume: Number(e.target.value) })}
                  className="w-full mt-3"
                />
              </div>

              <div>
                <div className="flex items-end justify-between">
                  <div>
                    <div className="text-sm font-medium">Default speed</div>
                    <div className="text-xs text-yt-textSec mt-0.5">Choose how fast videos play.</div>
                  </div>
                  <div className="text-xs text-yt-textSec">{settings.playbackSpeed}x</div>
                </div>
                <select
                  value={settings.playbackSpeed}
                  onChange={(e) => save({ ...settings, playbackSpeed: Number(e.target.value) })}
                  className="mt-3 w-full bg-[#121212] border border-white/10 rounded-xl px-3 py-2 outline-none"
                >
                  {[0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2].map((s) => (
                    <option key={s} value={s}>
                      {s}x
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="bg-yt-gray/60 border border-white/10 rounded-2xl p-4">
            <div className="font-semibold">Notes</div>
            <div className="text-sm text-yt-textSec mt-2">
              Changes apply when you open a new video or refresh the page.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
