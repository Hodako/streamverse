export type UserSettings = {
  autoplay: boolean;
  defaultVolume: number;
  muted: boolean;
  playbackSpeed: number;
};

const KEY = 'streamtube_settings';

const DEFAULTS: UserSettings = {
  autoplay: true,
  defaultVolume: 1,
  muted: false,
  playbackSpeed: 1,
};

export function getStoredSettings(): UserSettings {
  const raw = localStorage.getItem(KEY);
  if (!raw) return DEFAULTS;
  try {
    const parsed = JSON.parse(raw) as Partial<UserSettings>;
    const autoplay = typeof parsed.autoplay === 'boolean' ? parsed.autoplay : DEFAULTS.autoplay;
    const defaultVolume =
      typeof parsed.defaultVolume === 'number' && Number.isFinite(parsed.defaultVolume)
        ? Math.min(1, Math.max(0, parsed.defaultVolume))
        : DEFAULTS.defaultVolume;
    const muted = typeof parsed.muted === 'boolean' ? parsed.muted : DEFAULTS.muted;
    const playbackSpeed =
      typeof parsed.playbackSpeed === 'number' && Number.isFinite(parsed.playbackSpeed)
        ? Math.min(2, Math.max(0.25, parsed.playbackSpeed))
        : DEFAULTS.playbackSpeed;

    return { autoplay, defaultVolume, muted, playbackSpeed };
  } catch {
    return DEFAULTS;
  }
}

export function setStoredSettings(next: UserSettings) {
  localStorage.setItem(KEY, JSON.stringify(next));
}

export function resetStoredSettings() {
  localStorage.removeItem(KEY);
}
