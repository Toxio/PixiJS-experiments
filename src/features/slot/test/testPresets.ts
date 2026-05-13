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

// ─── Presets ─────────────────────────────────────────────────────────────────
export interface TestPreset {
  id: string;
  label: string;
  subtitle: string;
  badge: string;
  badgeColor: string;
  preset: ForceSpinPreset;
}

export const TEST_PRESETS: TestPreset[] = [
  {
    id: 'seven-mid',
    label: '5× Seven',
    subtitle: 'Line 1 · Middle row',
    badge: '7️⃣×5',
    badgeColor: '#ff4d4d',
    preset: {
      matrix: buildMatrix([
        [7, 1, 4],
        [6, 1, 3],
        [11, 1, 5],
        [2, 1, 7],
        [4, 1, 6],
      ]),
      winLines: [wl(1, 1, 5, 100)],
      winAmount: 100,
    },
  },
  {
    id: 'glass-mid',
    label: '5× Glass',
    subtitle: 'Line 1 · Middle row',
    badge: '🥂×5',
    badgeColor: '#80dfff',
    preset: {
      matrix: buildMatrix([
        [11, 5, 2],
        [1, 5, 4],
        [6, 5, 7],
        [3, 5, 11],
        [2, 5, 1],
      ]),
      winLines: [wl(5, 1, 5, 80)],
      winAmount: 80,
    },
  },
  {
    id: 'rose-top',
    label: '5× Rose',
    subtitle: 'Line 2 · Top row',
    badge: '🌹×5',
    badgeColor: '#ff6b9d',
    preset: {
      matrix: buildMatrix([
        [4, 1, 6],
        [4, 3, 11],
        [4, 7, 2],
        [4, 5, 8],
        [4, 2, 1],
      ]),
      winLines: [wl(4, 2, 5, 60)],
      winAmount: 60,
    },
  },
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
    id: 'rose-rev-v',
    label: 'Rev-V Rose',
    subtitle: 'Line 5 · Zigzag',
    badge: '🌹 rev-V',
    badgeColor: '#ff6b9d',
    preset: {
      // Line 5 = rows [2,1,0,1,2]
      matrix: buildMatrix([
        [2, 11, 4],
        [3, 4, 11],
        [4, 6, 5],
        [1, 4, 7],
        [5, 3, 4],
      ]),
      winLines: [wl(4, 5, 5, 60)],
      winAmount: 60,
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
    id: 'wild-mid',
    label: '5× Wild',
    subtitle: 'Line 1 · Middle row',
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
    id: 'scatter-mid',
    label: '5× Scatter',
    subtitle: 'Line 1 · Middle row',
    badge: '📦×5',
    badgeColor: '#fbbf24',
    preset: {
      matrix: buildMatrix([
        [7, 10, 4],
        [6, 10, 3],
        [11, 10, 5],
        [2, 10, 7],
        [4, 10, 6],
      ]),
      winLines: [wl(10, 1, 5, 150)],
      winAmount: 150,
    },
  },
  {
    id: 'heels-mid',
    label: '5× Heels',
    subtitle: 'Line 1 · Middle row',
    badge: '👠×5',
    badgeColor: '#ff80ab',
    preset: {
      matrix: buildMatrix([
        [7, 8, 4],
        [6, 8, 3],
        [11, 8, 5],
        [2, 8, 7],
        [4, 8, 6],
      ]),
      winLines: [wl(8, 1, 5, 90)],
      winAmount: 90,
    },
  },
  {
    id: 'no-win',
    label: 'No Win',
    subtitle: 'Mixed · No lines',
    badge: '✕ miss',
    badgeColor: '#777',
    preset: {
      matrix: buildMatrix([
        [4, 1, 7],
        [1, 5, 11],
        [3, 8, 6],
        [7, 2, 4],
        [6, 11, 3],
      ]),
      winLines: [],
      winAmount: 0,
    },
  },
];
