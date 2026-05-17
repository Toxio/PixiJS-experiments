import { Application } from '@pixi/react';
import { useCallback, useMemo, useRef, useState } from 'react';

import { useSlotsHubSignalR } from '../../hooks/useSlotsHubSignalR';
import { canAffordStake, spendableBalanceForStake } from './stakeBalance';
import { exitToLobby, getExitLobbyHref } from '../../utils/getExitLobbyUrl';
import { BalanceRow } from './BalanceRow';
import { InsufficientFundsModal } from './InsufficientFundsModal';
import { SlotBetRow } from './SlotBetRow';
import { SlotReels } from './reels';
import { BuyBonusModal } from '../buyBonus/BuyBonusModal';
import { TestModal } from './test/TestModal';

export function SlotMachinePixi() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [buyBonusOpen, setBuyBonusOpen] = useState(false);
  const [testOpen, setTestOpen] = useState(false);
  const [insufficientModalOpen, setInsufficientModalOpen] = useState(false);

  const showInsufficientFunds = useCallback(() => setInsufficientModalOpen(true), []);

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
    expandingWild,
    spinOdd,
    spin,
    forceSpin,
    handleSpinComplete,
  } = useSlotsHubSignalR({
    spinSpeed: 2,
    onInsufficientFunds: showInsufficientFunds,
  });

  const stakePool = spendableBalanceForStake(balance, winAmount);
  const cannotAffordBet = !canAffordStake(betAmount, stakePool);

  const handleSpinClick = useCallback(() => {
    if (cannotAffordBet) {
      showInsufficientFunds();
      return;
    }
    void spin();
  }, [cannotAffordBet, showInsufficientFunds, spin]);

  const handleTestPanelClick = useCallback(() => {
    if (cannotAffordBet) {
      showInsufficientFunds();
      return;
    }
    setTestOpen(true);
  }, [cannotAffordBet, showInsufficientFunds]);

  const lobbyButtonTitle = useMemo(
    () =>
      getExitLobbyHref()
        ? 'Вернуться в лобби (exitURL)'
        : 'Параметр exitURL не найден — будет выполнен переход назад по истории браузера.',
    [],
  );

  const handleLobbyClick = useCallback(() => {
    exitToLobby();
  }, []);

  return (
    <div className="smp-wrapper">
      <div className="smp-top-bar">
        <BalanceRow balance={balance} currency={currency} winAmount={winAmount} />
        <button
          type="button"
          className="smp-lobby-btn"
          onClick={handleLobbyClick}
          title={lobbyButtonTitle}
        >
          Назад в лобби
        </button>
      </div>

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
            expandingWild={expandingWild}
            spinOdd={spinOdd}
            onSpinComplete={handleSpinComplete}
          />
        </Application>
      </div>

      <div className="smp-controls">
        <SlotBetRow
          quickBets={quickBets}
          betAmount={betAmount}
          stakingBalance={stakePool}
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
            className={`smp-spin-btn${cannotAffordBet ? ' smp-spin-btn--insufficient' : ''}`}
            type="button"
            onClick={handleSpinClick}
            disabled={spinning || status !== 'ready'}
            title={
              cannotAffordBet && status === 'ready' && !spinning
                ? 'Недостаточно средств на балансе для этой ставки'
                : undefined
            }
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
            onClick={handleTestPanelClick}
            disabled={spinning}
            title={
              cannotAffordBet && !spinning
                ? 'Недостаточно средств на балансе'
                : 'Open test preset panel'
            }
          >
            🧪
          </button>
        </div>
      </div>

      <InsufficientFundsModal
        open={insufficientModalOpen}
        onClose={() => setInsufficientModalOpen(false)}
      />

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
