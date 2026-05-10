import { Application } from '@pixi/react';
import { useRef } from 'react';

import { useSlotsHubSignalR } from '../../hooks/useSlotsHubSignalR';
import { SlotBetRow } from './SlotBetRow';
import { BalanceRow } from './BalanceRow';
import { SlotReels } from './SlotReels';

export function SlotMachinePixi() {
  const containerRef = useRef<HTMLDivElement>(null);

  const {
    status,
    balance,
    currency,
    quickBets,
    betAmount,
    setBetAmount,
    spinning,
    matrix,
    targetMatrix,
    winAmount,
    winLines,
    spin,
    handleSpinComplete,
  } = useSlotsHubSignalR({ spinSpeed: 2 });

  return (
    <div className="smp-wrapper">
      <BalanceRow balance={balance} currency={currency} winAmount={winAmount} />

      <div ref={containerRef} className="smp-canvas">
        {status === 'connecting' && <div className="smp-overlay">Connecting…</div>}
        {status === 'error' && (
          <div className="smp-overlay smp-overlay--error">Connection failed</div>
        )}
        <Application resizeTo={containerRef} antialias>
          <SlotReels
            spinning={spinning}
            targetMatrix={targetMatrix}
            matrix={matrix}
            winLines={winLines}
            onSpinComplete={handleSpinComplete}
          />
        </Application>
      </div>

      <div className="smp-controls">
        <SlotBetRow
          quickBets={quickBets}
          betAmount={betAmount}
          disabled={spinning}
          onBetChange={setBetAmount}
        />

        <button
          className="smp-spin-btn"
          type="button"
          onClick={spin}
          disabled={spinning || status !== 'ready'}
        >
          {status === 'connecting'
            ? 'Connecting…'
            : status === 'error'
              ? 'Error'
              : spinning
                ? 'Spinning…'
                : 'SPIN'}
        </button>
      </div>
    </div>
  );
}
