import glassImg from '../../../assets/symbols/images/glass.png';
import gobletImg from '../../../assets/symbols/images/goblet.png';
import heelsImg from '../../../assets/heels/heels.png';
import lipsImg from '../../../assets/symbols/images/lips.png';
import lipstickImg from '../../../assets/symbols/images/lipstick.png';
import parfumeImg from '../../../assets/symbols/images/parfume.png';
import roseImg from '../../../assets/symbols/images/rose.png';
import scatterImg from '../../../assets/scatter/scatter.png';
import sevenImg from '../../../assets/symbols/images/seven.png';
import starImg from '../../../assets/symbols/images/star.png';
import wildImg from '../../../assets/wild/wild-icon.png';
import reelImg from '../../../assets/reel.png';

export const ALL_ASSETS = [
  { alias: 'reel', src: reelImg },
  { alias: 'rose', src: roseImg },
  { alias: 'star', src: starImg },
  { alias: 'goblet', src: gobletImg },
  { alias: 'seven', src: sevenImg },
  { alias: 'lips', src: lipsImg },
  { alias: 'lipstick', src: lipstickImg },
  { alias: 'parfume', src: parfumeImg },
  { alias: 'glass', src: glassImg },
  { alias: 'heels', src: heelsImg },
  { alias: 'wild', src: wildImg },
  { alias: 'scatter', src: scatterImg },
] as const;

/** Maps server symbol index (1-based) → PixiJS texture alias. */
const SYMBOL_MAP: Record<number, string> = {
  1: 'seven',
  2: 'lips',
  3: 'parfume',
  4: 'rose',
  5: 'glass',
  6: 'lipstick',
  7: 'goblet',
  8: 'heels',
  9: 'wild',
  10: 'scatter',
  11: 'star',
};

const SYMBOL_ALIASES = Object.values(SYMBOL_MAP);

export function symbolAlias(serverIdx: number): string {
  return SYMBOL_MAP[serverIdx] ?? 'seven';
}

export function randomAlias(): string {
  return SYMBOL_ALIASES[Math.floor(Math.random() * SYMBOL_ALIASES.length)];
}
