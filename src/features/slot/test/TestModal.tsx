import './TestModal.css';
import type { ForceSpinPreset } from '../../../hooks/useSlotsHubSignalR';
import { TEST_PRESETS } from './testPresets';

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
