export interface GameUrlParams {
  currency: string | null;
  /** Locale from `?Culture=en`. */
  culture: string;
}

function readQueryParam(...names: string[]): string | null {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  for (const name of names) {
    const value = params.get(name)?.trim();
    if (value) return value;
  }
  return null;
}

export function getGameUrlParams(): GameUrlParams {
  const currency = readQueryParam('Currency', 'currency');
  return {
    currency: currency ? currency.toUpperCase() : null,
    culture: readQueryParam('Culture', 'culture') ?? 'en',
  };
}
