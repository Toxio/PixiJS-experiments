/**
 * “Back to lobby”: read URL from query `exitURL` or `exit_url`.
 * Allows only `http:` / `https:` URLs and relative paths (resolved against current origin).
 */
export function getExitLobbyHref(): string | null {
  if (typeof window === 'undefined') return null;

  let raw =
    new URLSearchParams(window.location.search).get('exitURL') ??
    new URLSearchParams(window.location.search).get('exit_url');
  raw = raw?.trim() ?? '';
  if (!raw) return null;

  try {
    const resolved = /^https?:\/\//i.test(raw)
      ? new URL(raw)
      : new URL(raw, window.location.origin);
    return resolved.protocol === 'http:' || resolved.protocol === 'https:' ? resolved.href : null;
  } catch {
    return null;
  }
}

export function exitToLobby(): void {
  const href = getExitLobbyHref();
  if (href) {
    window.location.assign(href);
    return;
  }
  window.history.back();
}
