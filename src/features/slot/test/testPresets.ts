import type { ForceSpinPreset, WinLine } from '../../../hooks/useSlotsHubSignalR';

// ─── Helpers ─────────────────────────────────────────────────────────────────
function buildMatrix(overrides: (number | null)[][]): number[][] {
  const FILLERS = [7, 6, 11, 3, 4, 5, 2, 7, 3, 11];
  let fi = 0;
  const fill = () => FILLERS[fi++ % FILLERS.length];
  return Array.from({ length: 5 }, (_, r) =>
    Array.from({ length: 3 }, (_, row) => overrides[r]?.[row] ?? fill()),
  );
}

function wl(symbol: number, line: number, count: number, winAmount: number): WinLine {
  return { symbol, line, count, winAmount };
}

/** Payline 1 = middle row — five matches so each symbol’s win-Spine can play. */
function winAnimMidRowFive(symbol: number, winAmount: number): ForceSpinPreset {
  return {
    matrix: buildMatrix([
      [7, symbol, 4],
      [6, symbol, 3],
      [11, symbol, 5],
      [2, symbol, 7],
      [4, symbol, 6],
    ]),
    winLines: [wl(symbol, 1, 5, winAmount)],
    winAmount,
  };
}

// ─── Win-Spine preview (built after `TestPreset`; appended to TEST_PRESETS) ──

export interface TestPreset {
  id: string;
  label: string;
  subtitle: string;
  badge: string;
  badgeColor: string;
  preset: ForceSpinPreset;
}

const WIN_SPINE_ANIM_PRESETS: TestPreset[] = [
  {
    id: 'win-anim-seven',
    label: 'Win anim · Seven',
    subtitle: 'Spine · Line 1 · ×5',
    badge: '7️⃣×5',
    badgeColor: '#ff4d4d',
    preset: winAnimMidRowFive(1, 100),
  },
  {
    id: 'win-anim-lips',
    label: 'Win anim · Lips',
    subtitle: 'Spine · Line 1 · ×5',
    badge: '💋×5',
    badgeColor: '#ff6b9d',
    preset: winAnimMidRowFive(2, 95),
  },
  {
    id: 'win-anim-parfume',
    label: 'Win anim · Parfume',
    subtitle: 'Spine · Line 1 · ×5',
    badge: '🌸×5',
    badgeColor: '#e040fb',
    preset: winAnimMidRowFive(3, 92),
  },
  {
    id: 'win-anim-rose',
    label: 'Win anim · Rose',
    subtitle: 'Spine · Line 1 · ×5',
    badge: '🌹×5',
    badgeColor: '#ff5252',
    preset: winAnimMidRowFive(4, 88),
  },
  {
    id: 'win-anim-glass',
    label: 'Win anim · Glass',
    subtitle: 'Spine · Line 1 · ×5',
    badge: '🥂×5',
    badgeColor: '#80dfff',
    preset: winAnimMidRowFive(5, 80),
  },
  {
    id: 'win-anim-lipstick',
    label: 'Win anim · Lipstick',
    subtitle: 'Spine · Line 1 · ×5',
    badge: '💄×5',
    badgeColor: '#ff4081',
    preset: winAnimMidRowFive(6, 85),
  },
  {
    id: 'win-anim-goblet',
    label: 'Win anim · Goblet',
    subtitle: 'Spine · Line 1 · ×5',
    badge: '🏆×5',
    badgeColor: '#ffa040',
    preset: winAnimMidRowFive(7, 82),
  },
  {
    id: 'win-anim-heels',
    label: 'Win anim · Heels',
    subtitle: 'Spine · Line 1 · ×5',
    badge: '👠×5',
    badgeColor: '#ff80ab',
    preset: winAnimMidRowFive(8, 90),
  },
  {
    id: 'win-anim-wild',
    label: 'Win anim · Wild',
    subtitle: 'Spine · Line 1 · ×5 · expand',
    badge: '👸×5',
    badgeColor: '#c084fc',
    preset: {
      matrix: buildMatrix([
        [7, 1, 4],
        [9, 2, 3],
        [11, 9, 5],
        [2, 7, 9],
        [4, 5, 6],
      ]),
      winLines: [wl(9, 1, 5, 120)],
      winAmount: 120,
      expandingWild: [0, 9, 9, 9, 0],
    },
  },
  {
    id: 'win-anim-scatter',
    label: 'Win anim · Scatter',
    subtitle: 'Spine · Line 1 · ×5',
    badge: '📦×5',
    badgeColor: '#fbbf24',
    preset: winAnimMidRowFive(10, 150),
  },
  {
    id: 'win-anim-star',
    label: 'Win anim · Star',
    subtitle: 'Spine · Line 1 · ×5',
    badge: '⭐×5',
    badgeColor: '#ffe066',
    preset: winAnimMidRowFive(11, 40),
  },
];

// ─── Presets ─────────────────────────────────────────────────────────────────

export const TEST_PRESETS: TestPreset[] = [
  ...WIN_SPINE_ANIM_PRESETS,
  {
    id: 'star-bot',
    label: '5× Star',
    subtitle: 'Line 3 · Bottom row',
    badge: '⭐×5',
    badgeColor: '#ffe066',
    preset: {
      matrix: buildMatrix([
        [7, 2, 11],
        [6, 4, 11],
        [5, 1, 11],
        [3, 7, 11],
        [2, 6, 11],
      ]),
      winLines: [wl(11, 3, 5, 40)],
      winAmount: 40,
    },
  },
  {
    id: 'goblet-3',
    label: '3× Goblet',
    subtitle: 'Line 1 · Small win',
    badge: '🏆×3',
    badgeColor: '#ffa040',
    preset: {
      matrix: buildMatrix([
        [6, 7, 11],
        [5, 7, 2],
        [11, 7, 3],
        [1, 4, 5],
        [3, 2, 8],
      ]),
      winLines: [wl(7, 1, 3, 10)],
      winAmount: 10,
    },
  },
  {
    id: 'lips-3',
    label: '3× Lips',
    subtitle: 'Line 1 · Small win',
    badge: '💋×3',
    badgeColor: '#ff6b9d',
    preset: {
      matrix: buildMatrix([
        [4, 2, 1],
        [5, 2, 11],
        [7, 2, 6],
        [3, 11, 4],
        [1, 5, 3],
      ]),
      winLines: [wl(2, 1, 3, 8)],
      winAmount: 8,
    },
  },
  {
    id: 'seven-v',
    label: 'V-Shape Seven',
    subtitle: 'Line 4 · V pattern',
    badge: '7️⃣ V',
    badgeColor: '#ff4d4d',
    preset: {
      // Line 4 = rows [0,1,2,1,0]
      matrix: buildMatrix([
        [1, 5, 11],
        [7, 1, 3],
        [2, 4, 1],
        [11, 1, 5],
        [1, 7, 2],
      ]),
      winLines: [wl(1, 4, 5, 100)],
      winAmount: 100,
    },
  },
  {
    id: 'all-sevens',
    label: 'Full Board Sevens',
    subtitle: 'Lines 1–10 · Max win',
    badge: '7️⃣ ALL',
    badgeColor: '#ff4d4d',
    preset: {
      matrix: buildMatrix([
        [1, 1, 1],
        [1, 1, 1],
        [1, 1, 1],
        [1, 1, 1],
        [1, 1, 1],
      ]),
      winLines: [
        wl(1, 1, 5, 100),
        wl(1, 2, 5, 100),
        wl(1, 3, 5, 100),
        wl(1, 4, 5, 100),
        wl(1, 5, 5, 100),
        wl(1, 6, 5, 100),
        wl(1, 7, 5, 100),
        wl(1, 8, 5, 100),
        wl(1, 9, 5, 100),
        wl(1, 10, 5, 100),
      ],
      winAmount: 1000,
    },
  },
  {
    id: 'multi-line',
    label: 'Multi-Line Win',
    subtitle: 'Lines 1–10 · All glass',
    badge: '🥂 ALL',
    badgeColor: '#c9a6ff',
    preset: {
      matrix: buildMatrix([
        [5, 5, 5],
        [5, 5, 5],
        [5, 5, 5],
        [5, 5, 5],
        [5, 5, 5],
      ]),
      winLines: [
        wl(5, 1, 5, 80),
        wl(5, 2, 5, 80),
        wl(5, 3, 5, 80),
        wl(5, 4, 5, 80),
        wl(5, 5, 5, 80),
        wl(5, 6, 5, 80),
        wl(5, 7, 5, 80),
        wl(5, 8, 5, 80),
        wl(5, 9, 5, 80),
        wl(5, 10, 5, 80),
      ],
      winAmount: 800,
    },
  },
  {
    id: 'showcase',
    label: 'All Symbols',
    subtitle: 'Every symbol visible',
    badge: '🎰 show',
    badgeColor: '#aaa',
    preset: {
      matrix: [
        [1, 2, 3],
        [4, 5, 6],
        [7, 8, 11],
        [1, 2, 3],
        [4, 5, 6],
      ],
      winLines: [],
      winAmount: 0,
    },
  },
  {
    id: 'seven-3-wild-col2',
    label: '3× Seven + Wild',
    subtitle: 'Line 1 · Wild in 2nd column',
    badge: '7️⃣×3👸',
    badgeColor: '#f472b6',
    preset: {
      // Middle row (line 1): seven | wild | seven | … — three-of-a-kind with substitute on column 2.
      matrix: buildMatrix([
        [11, 1, 7],
        [9, 4, 6],
        [8, 1, 5],
        [3, 11, 4],
        [2, 7, 11],
      ]),
      winLines: [wl(1, 1, 3, 15)],
      winAmount: 15,
      expandingWild: [0, 9, 0, 0, 0],
    },
  },
  {
    id: 'big-win-20x',
    label: 'BIG WIN',
    subtitle: '20× · Line win + banner',
    badge: '20×',
    badgeColor: '#ffd54f',
    preset: {
      matrix: buildMatrix([
        [6, 7, 11],
        [5, 7, 2],
        [11, 7, 3],
        [1, 4, 5],
        [3, 2, 8],
      ]),
      winLines: [wl(7, 1, 3, 10)],
      winAmount: 200,
      odd: 20,
    },
  },
  {
    id: 'mega-win-50x',
    label: 'MEGA WIN',
    subtitle: '50× · Line win + banner',
    badge: '50×',
    badgeColor: '#ff9800',
    preset: {
      matrix: buildMatrix([
        [6, 7, 11],
        [5, 7, 2],
        [11, 7, 3],
        [1, 4, 5],
        [3, 2, 8],
      ]),
      winLines: [wl(7, 1, 3, 10)],
      winAmount: 500,
      odd: 50,
    },
  },
  {
    id: 'super-win-100x',
    label: 'SUPER WIN',
    subtitle: '100× · Line win + banner',
    badge: '100×',
    badgeColor: '#e040fb',
    preset: {
      matrix: buildMatrix([
        [6, 7, 11],
        [5, 7, 2],
        [11, 7, 3],
        [1, 4, 5],
        [3, 2, 8],
      ]),
      winLines: [wl(7, 1, 3, 10)],
      winAmount: 1000,
      odd: 100,
    },
  },
];
