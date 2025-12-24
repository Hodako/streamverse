const KEY = 'streamtube_local_user';

type LocalUserState = {
  liked: string[];
  saved: string[];
  history: { videoId: string; progressSeconds: number; lastWatchedAt: number }[];
};

function read(): LocalUserState {
  const raw = localStorage.getItem(KEY);
  if (!raw) return { liked: [], saved: [], history: [] };
  try {
    const parsed = JSON.parse(raw) as LocalUserState;
    return {
      liked: Array.isArray(parsed.liked) ? parsed.liked : [],
      saved: Array.isArray(parsed.saved) ? parsed.saved : [],
      history: Array.isArray(parsed.history) ? parsed.history : [],
    };
  } catch {
    return { liked: [], saved: [], history: [] };
  }
}

function write(state: LocalUserState) {
  localStorage.setItem(KEY, JSON.stringify(state));
}

export function localIsLiked(videoId: string) {
  return read().liked.includes(videoId);
}

export function localToggleLike(videoId: string) {
  const state = read();
  const idx = state.liked.indexOf(videoId);
  if (idx >= 0) state.liked.splice(idx, 1);
  else state.liked.unshift(videoId);
  write(state);
  return idx < 0;
}

export function localGetLiked() {
  return read().liked;
}

export function localIsSaved(videoId: string) {
  return read().saved.includes(videoId);
}

export function localToggleSaved(videoId: string) {
  const state = read();
  const idx = state.saved.indexOf(videoId);
  if (idx >= 0) state.saved.splice(idx, 1);
  else state.saved.unshift(videoId);
  write(state);
  return idx < 0;
}

export function localGetSaved() {
  return read().saved;
}

export function localUpsertHistory(videoId: string, progressSeconds: number) {
  const state = read();
  const existingIdx = state.history.findIndex((h) => h.videoId === videoId);
  const entry = { videoId, progressSeconds, lastWatchedAt: Date.now() };
  if (existingIdx >= 0) state.history.splice(existingIdx, 1);
  state.history.unshift(entry);
  state.history = state.history.slice(0, 500);
  write(state);
}

export function localGetHistory() {
  return read().history;
}
