import { getGameUrlParams } from './getGameUrlParams';

export function resolveCurrencyCode(serverCode?: string | null): string {
  const fromUrl = getGameUrlParams().currency;
  if (fromUrl) return fromUrl;
  const fromServer = serverCode?.trim();
  return fromServer ? fromServer.toUpperCase() : 'USD';
}

/** Symbol for a currency code (e.g. EUR → €, USD → $). */
export function getCurrencySymbol(
  currencyCode: string,
  locale = getGameUrlParams().culture,
): string {
  const code = currencyCode.trim().toUpperCase();

  try {
    const part = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: code,
      currencyDisplay: 'narrowSymbol',
    })
      .formatToParts(0)
      .find((p) => p.type === 'currency')?.value;

    if (part && part.toUpperCase() !== code) return part;
  } catch {
    // Invalid ISO code — fall back to the code itself below.
  }

  return code;
}
