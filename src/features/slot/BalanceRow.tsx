interface BalanceRowProps {
  balance: number;
  currency: string;
  winAmount: number | null;
}

export function BalanceRow({ balance, currency, winAmount }: BalanceRowProps) {
  return (
    <div className="smp-hud">
      <div className="smp-hud-tile">
        <span className="smp-hud-label">Balance</span>
        <span className="smp-hud-value">
          {currency} {balance.toFixed(2)}
        </span>
      </div>

      {winAmount !== null && winAmount > 0 && (
        <div className="smp-hud-tile smp-hud-tile--win">
          <span className="smp-hud-label">Win</span>
          <span className="smp-hud-value smp-hud-value--win">{winAmount.toFixed(2)}</span>
        </div>
      )}
    </div>
  );
}
