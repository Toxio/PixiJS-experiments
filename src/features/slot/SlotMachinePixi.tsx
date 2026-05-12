import { Application } from '@pixi/react';
import { useRef, useState } from 'react';

import { useSlotsHubSignalR } from '../../hooks/useSlotsHubSignalR';
import { SlotBetRow } from './SlotBetRow';
import { BalanceRow } from './BalanceRow';
import { SlotReels } from './SlotReels';
import { BuyBonusModal } from '../buyBonus/BuyBonusModal';
import { TestModal } from './test/TestModal';

export function SlotMachinePixi() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [buyBonusOpen, setBuyBonusOpen] = useState(false);
  const [testOpen, setTestOpen] = useState(false);

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
    forceSpin,
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
        <Application resizeTo={containerRef} antialias backgroundAlpha={0}>
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

        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <button
            className="smp-buy-bonus-btn"
            type="button"
            onClick={() => setBuyBonusOpen(true)}
            disabled={spinning || status !== 'ready'}
          >
            Buy Bonus
          </button>

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

          <button
            className="smp-test-btn"
            type="button"
            onClick={() => setTestOpen(true)}
            disabled={spinning}
            title="Open test preset panel"
          >
            🧪
          </button>
        </div>
      </div>

      {buyBonusOpen && (
        <BuyBonusModal
          onClose={() => setBuyBonusOpen(false)}
          onBuy={(optionId, bet) => {
            console.log('Buy bonus', { optionId, bet });
            setBuyBonusOpen(false);
          }}
          currency={currency}
          quickBets={quickBets}
          defaultBet={betAmount}
        />
      )}

      <TestModal
        open={testOpen}
        onClose={() => setTestOpen(false)}
        onSelect={forceSpin}
        disabled={spinning}
      />
    </div>
  );
}
