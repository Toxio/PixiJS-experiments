import './TestModal.css';
import type { ForceSpinPreset, WinLine } from '../../../hooks/useSlotsHubSignalR';

// ─── Helpers ─────────────────────────────────────────────────────────────────
function buildMatrix(overrides: (number | null)[][]): number[][] {
  const FILLERS = [2, 5, 1, 6, 0, 7, 4, 2, 6, 1];
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
        [2, 3, 0],
        [5, 3, 6],
        [1, 3, 7],
        [4, 3, 2],
        [0, 3, 5],
      ]),
      winLines: [wl(3, 1, 5, 100)],
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
        [1, 7, 4],
        [3, 7, 0],
        [5, 7, 2],
        [6, 7, 1],
        [4, 7, 3],
      ]),
      winLines: [wl(7, 1, 5, 80)],
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
        [0, 3, 5],
        [0, 6, 1],
        [0, 2, 4],
        [0, 7, 0],
        [0, 4, 3],
      ]),
      winLines: [wl(0, 2, 5, 60)],
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
        [2, 4, 1],
        [5, 0, 1],
        [7, 3, 1],
        [6, 2, 1],
        [4, 5, 1],
      ]),
      winLines: [wl(1, 3, 5, 40)],
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
        [5, 2, 1],
        [7, 2, 4],
        [1, 2, 6],
        [3, 0, 7],
        [6, 4, 2],
      ]),
      winLines: [wl(2, 1, 3, 10)],
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
        [0, 4, 3],
        [7, 4, 1],
        [2, 4, 5],
        [6, 1, 0],
        [3, 7, 6],
      ]),
      winLines: [wl(4, 1, 3, 8)],
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
        [3, 5, 1],
        [2, 3, 6],
        [4, 0, 3],
        [1, 3, 7],
        [3, 2, 4],
      ]),
      winLines: [wl(3, 4, 5, 100)],
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
        [4, 2, 0],
        [6, 0, 1],
        [0, 5, 7],
        [3, 0, 2],
        [7, 6, 0],
      ]),
      winLines: [wl(0, 5, 5, 60)],
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
        [3, 3, 3],
        [3, 3, 3],
        [3, 3, 3],
        [3, 3, 3],
        [3, 3, 3],
      ]),
      winLines: [
        wl(3, 1, 5, 100),
        wl(3, 2, 5, 100),
        wl(3, 3, 5, 100),
        wl(3, 4, 5, 100),
        wl(3, 5, 5, 100),
        wl(3, 6, 5, 100),
        wl(3, 7, 5, 100),
        wl(3, 8, 5, 100),
        wl(3, 9, 5, 100),
        wl(3, 10, 5, 100),
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
        [7, 7, 7],
        [7, 7, 7],
        [7, 7, 7],
        [7, 7, 7],
        [7, 7, 7],
      ]),
      winLines: [
        wl(7, 1, 5, 80),
        wl(7, 2, 5, 80),
        wl(7, 3, 5, 80),
        wl(7, 4, 5, 80),
        wl(7, 5, 5, 80),
        wl(7, 6, 5, 80),
        wl(7, 7, 5, 80),
        wl(7, 8, 5, 80),
        wl(7, 9, 5, 80),
        wl(7, 10, 5, 80),
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
        [0, 1, 2],
        [3, 4, 5],
        [6, 7, 0],
        [1, 2, 3],
        [4, 5, 6],
      ],
      winLines: [],
      winAmount: 0,
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
        [0, 1, 2],
        [3, 4, 5],
        [6, 7, 1],
        [2, 3, 4],
        [5, 6, 0],
      ]),
      winLines: [],
      winAmount: 0,
    },
  },
];

// ─── Component ────────────────────────────────────────────────────────────────
interface TestModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (preset: ForceSpinPreset) => void;
  disabled: boolean;
}

export function TestModal({ open, onClose, onSelect, disabled }: TestModalProps) {
  if (!open) return null;

  function handleSelect(preset: ForceSpinPreset) {
    onSelect(preset);
    onClose();
  }

  return (
    <div className="smp-tm-backdrop" onClick={onClose}>
      <div className="smp-tm-panel" onClick={(e) => e.stopPropagation()}>
        <div className="smp-tm-header">
          <span className="smp-tm-title">🧪 Test Results</span>
          <button className="smp-tm-close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <p className="smp-tm-hint">
          Force the next spin result — no server call, no balance deducted.
        </p>

        <div className="smp-tm-grid">
          {TEST_PRESETS.map((p) => (
            <button
              key={p.id}
              className="smp-tm-card"
              disabled={disabled}
              onClick={() => handleSelect(p.preset)}
            >
              <span className="smp-tm-card-badge" style={{ color: p.badgeColor }}>
                {p.badge}
              </span>
              <span className="smp-tm-card-label">{p.label}</span>
              <span className="smp-tm-card-sub">{p.subtitle}</span>
              {p.preset.winAmount > 0 && (
                <span className="smp-tm-card-win" style={{ color: p.badgeColor }}>
                  +{p.preset.winAmount}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
