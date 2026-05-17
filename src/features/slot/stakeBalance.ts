/** Currency-safe comparison (avoids float noise). */
export function betExceedsBalance(bet: number, balance: number): boolean {
  return Math.round(bet * 100) > Math.round(balance * 100);
}

/**
 * Money available for the next stake before the Spin request flies: wallet + last spin `Win`
 * shown in UI when backend still sends `balance` without that win credited (common interim state).
 */
export function spendableBalanceForStake(balance: number, pendingWinAmount: number | null): number {
  const b = Number.isFinite(balance) ? balance : 0;
  let w = 0;
  if (pendingWinAmount !== null && Number.isFinite(pendingWinAmount) && pendingWinAmount > 0) {
    w = pendingWinAmount;
  }
  return b + w;
}

/**
 * True if stake is valid (>0) and does not exceed the effective budget (`balance`, or balance from {@link spendableBalanceForStake}).
 */
export function canAffordStake(bet: number, stakeBudget: number): boolean {
  const stakeCents = Math.round(bet * 100);
  const balanceCents = Math.round(stakeBudget * 100);
  if (!Number.isFinite(stakeCents) || !Number.isFinite(balanceCents)) return false;
  if (stakeCents <= 0) return false;
  return stakeCents <= balanceCents;
}
