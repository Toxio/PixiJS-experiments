import { useState } from 'react';

import { canAffordStake } from './stakeBalance';

const PAGE_SIZE = 7;

interface SlotBetRowProps {
  quickBets: number[];
  betAmount: number;
  /** Wallet + unpaid last-spin win in UI until the next spin is sent. */
  stakingBalance: number;
  disabled: boolean;
  onBetChange: (amount: number) => void;
}

export function SlotBetRow({
  quickBets,
  betAmount,
  stakingBalance,
  disabled,
  onBetChange,
}: SlotBetRowProps) {
  const [start, setStart] = useState(0);
  const visible = quickBets.slice(start, start + PAGE_SIZE);
  const canLeft = start > 0;
  const canRight = start + PAGE_SIZE < quickBets.length;

  return (
    <div className="smp-bet-row">
      <span className="smp-bet-label">Bet</span>

      <button
        type="button"
        className="smp-bet-arrow"
        onClick={() => setStart((s) => Math.max(0, s - 1))}
        disabled={!canLeft || disabled}
        aria-label="Previous bets"
      >
        ‹
      </button>

      {visible.map((b) => {
        const tooHighForBalance = !canAffordStake(b, stakingBalance);
        return (
          <button
            key={b}
            type="button"
            className={`smp-bet-chip${betAmount === b ? ' smp-bet-chip--active' : ''}${tooHighForBalance ? ' smp-bet-chip--blocked' : ''}`}
            onClick={() => {
              if (disabled) return;
              onBetChange(b);
            }}
            disabled={disabled}
            title={
              tooHighForBalance
                ? 'Ставка больше доступного баланса — измените сумму или пополните'
                : undefined
            }
          >
            {b}
          </button>
        );
      })}

      <button
        type="button"
        className="smp-bet-arrow"
        onClick={() => setStart((s) => Math.min(quickBets.length - PAGE_SIZE, s + 1))}
        disabled={!canRight || disabled}
        aria-label="Next bets"
      >
        ›
      </button>
    </div>
  );
}
