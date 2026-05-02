import { Application } from '@pixi/react';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useSlotsHubSignalR } from '../hooks/useSlotsHubSignalR';
import { SlotReels } from './SlotReels';

export function SlotsScene() {
  const containerRef = useRef<HTMLDivElement>(null);
  const quickBetsRef = useRef<HTMLDivElement>(null);
  // 1 = slow (~2 s), 2 = normal (~1 s), 3 = fast (~0.4 s)
  const [spinSpeed, setSpinSpeed] = useState<1 | 2 | 3>(1);

  const {
    status,
    balance,
    currency,
    matrix,
    quickBets,
    betAmount,
    setBetAmount,
    spinning,
    targetMatrix,
    winAmount,
    winLines,
    spin,
    handleSpinComplete,
  } = useSlotsHubSignalR({ spinSpeed });

  const [quickBetsScroll, setQuickBetsScroll] = useState({ atStart: true, atEnd: true });

  const updateQuickBetsScrollEdges = useCallback(() => {
    const el = quickBetsRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    const epsilon = 2;
    setQuickBetsScroll({
      atStart: scrollLeft <= epsilon,
      atEnd: scrollLeft + clientWidth >= scrollWidth - epsilon,
    });
  }, []);

  useLayoutEffect(() => {
    updateQuickBetsScrollEdges();
  }, [quickBets, updateQuickBetsScrollEdges]);

  useEffect(() => {
    const el = quickBetsRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => updateQuickBetsScrollEdges());
    ro.observe(el);
    return () => ro.disconnect();
  }, [updateQuickBetsScrollEdges]);

  const scrollQuickBets = useCallback((direction: -1 | 1) => {
    const el = quickBetsRef.current;
    if (!el) return;
    const step = Math.max(el.clientWidth * 0.65, 120);
    el.scrollBy({ left: direction * step, behavior: 'smooth' });
  }, []);

  return (
    <div ref={containerRef} className="canvas-wrapper">
      <Application background={0x050d3a} resizeTo={containerRef} antialias>
        <SlotReels
          matrix={matrix}
          spinning={spinning}
          targetMatrix={targetMatrix}
          onSpinComplete={handleSpinComplete}
          spinSpeed={spinSpeed}
        />
      </Application>

      <div className="sc-ui">
        {status === 'connecting' && (
          <div className="sc-overlay-center">
            <span className="sc-dot" />
            Connecting…
          </div>
        )}

        <div className="sc-top-bar">
          <div className="sc-stat">
            <span className="sc-stat-label">Balance</span>
            <span className="sc-stat-value">
              {balance.toFixed(2)} {currency}
            </span>
          </div>

          {winAmount !== null && (
            <div className={`sc-stat${winAmount > 0 ? ' sc-stat--win' : ''}`}>
              <span className="sc-stat-label">Win</span>
              <span className="sc-stat-value">{winAmount.toFixed(2)}</span>
            </div>
          )}

          {status === 'error' && (
            <div className="sc-stat sc-stat--error">
              <span className="sc-stat-label">Status</span>
              <span className="sc-stat-value">Offline</span>
            </div>
          )}
        </div>

        {winLines.length > 0 && !spinning && (
          <div className="sc-win-lines">
            {winLines.map((w, i) => (
              <span key={i} className="sc-win-chip">
                Line {w.line} · ×{w.count} · {w.winAmount.toFixed(2)}
              </span>
            ))}
          </div>
        )}

        <div className="sc-bottom-bar">
          <div className="sc-speed-selector">
            {([1, 2, 3] as const).map((s) => (
              <button
                key={s}
                className={`sc-speed-btn${spinSpeed === s ? ' sc-speed-btn--active' : ''}`}
                onClick={() => setSpinSpeed(s)}
                disabled={spinning}
                title={s === 1 ? '~2s' : s === 2 ? '~1s' : '~0.4s'}
              >
                {'▶'.repeat(s)}
              </button>
            ))}
          </div>

          <div className="sc-quick-bets-wrap">
            <div className="sc-quick-bets-row">
              <button
                type="button"
                className="sc-quick-bets-arrow sc-quick-bets-arrow--prev"
                aria-label="Scroll bets left"
                disabled={spinning || quickBetsScroll.atStart}
                onClick={() => scrollQuickBets(-1)}
              >
                ‹
              </button>
              <div
                ref={quickBetsRef}
                className="sc-quick-bets"
                onScroll={updateQuickBetsScrollEdges}
              >
                {quickBets.map((b) => (
                  <button
                    key={b}
                    className={`sc-bet-chip${betAmount === b ? ' sc-bet-chip--active' : ''}`}
                    onClick={() => setBetAmount(b)}
                    disabled={spinning}
                  >
                    {b}
                  </button>
                ))}
              </div>
              <button
                type="button"
                className="sc-quick-bets-arrow sc-quick-bets-arrow--next"
                aria-label="Scroll bets right"
                disabled={spinning || quickBetsScroll.atEnd}
                onClick={() => scrollQuickBets(1)}
              >
                ›
              </button>
            </div>
          </div>

          <div className="sc-bottom-bar-end">
            <div className="sc-stat sc-bet-stat">
              <span className="sc-stat-label">Bet</span>
              <span className="sc-stat-value">{betAmount.toFixed(2)}</span>
            </div>

            <button
              className={`sc-spin-btn${spinning ? ' sc-spin-btn--spinning' : ''}`}
              onClick={spin}
              disabled={spinning || status !== 'ready'}
            >
              {spinning ? '◉' : 'SPIN'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
