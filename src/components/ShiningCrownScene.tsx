import { Application } from '@pixi/react';
import * as signalR from '@microsoft/signalr';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ShiningCrownReels } from './ShiningCrownReels';

const HUB_URL = 'https://slotgamesapi.yogames.win/slots';

function defaultMatrix(): number[][] {
  return [
    [9, 6, 0],
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [9, 0, 1],
  ];
}

type ConnStatus = 'connecting' | 'ready' | 'error';

interface WinLine {
  symbol: number;
  line: number;
  count: number;
  winAmount: number;
}

export function ShiningCrownScene() {
  const containerRef = useRef<HTMLDivElement>(null);
  const connRef = useRef<signalR.HubConnection | null>(null);

  const [status, setStatus] = useState<ConnStatus>('connecting');
  const [balance, setBalance] = useState(0);
  const [currency, setCurrency] = useState('USD');
  const [matrix, setMatrix] = useState<number[][]>(defaultMatrix());
  const [quickBets, setQuickBets] = useState<number[]>([1, 2, 5, 10]);
  const [betAmount, setBetAmount] = useState(2);
  const [spinning, setSpinning] = useState(false);
  const [targetMatrix, setTargetMatrix] = useState<number[][] | null>(null);
  const [winAmount, setWinAmount] = useState<number | null>(null);
  const [winLines, setWinLines] = useState<WinLine[]>([]);
  // 1 = slow (~2 s), 2 = normal (~1 s), 3 = fast (~0.4 s)
  const [spinSpeed, setSpinSpeed] = useState<1 | 2 | 3>(1);

  useEffect(() => {
    const connection = new signalR.HubConnectionBuilder()
      .withUrl(HUB_URL)
      .withAutomaticReconnect()
      .build();

    connection.on('InitialStateResult', (data: Record<string, unknown>) => {
      setBalance(Number(data.Balance ?? data.balance ?? 0));
      setCurrency(String(data.CurrencyCode ?? data.currencyCode ?? 'USD'));
      const mat = (data.Matrix ?? data.matrix) as number[][] | undefined;
      if (mat) setMatrix(mat);
      const qb = (data.QuickBets ?? data.quickBets) as number[] | undefined;
      if (qb?.length) setQuickBets(qb);
      const dba = Number(data.DefaultBetAmount ?? data.defaultBetAmount ?? 0);
      if (dba) setBetAmount(dba);
      setStatus('ready');
    });

    connection.on('GameActionResult', (data: Record<string, unknown>) => {
      const result = (data.Result ?? data.result) as Record<string, unknown> | undefined;
      const mat = (result?.Matrix ?? result?.matrix) as number[][] | undefined;
      const additional = (result?.Additional ?? result?.additional) as
        | Record<string, unknown>
        | undefined;
      const rawWins = (additional?.Wins ?? additional?.wins) as
        | Array<Record<string, unknown>>
        | undefined;

      setBalance(Number(data.Balance ?? data.balance ?? 0));
      setWinAmount(Number(data.WinAmount ?? data.winAmount ?? 0));
      setWinLines(
        (rawWins ?? []).map((w) => ({
          symbol: Number(w.Symbol ?? w.symbol),
          line: Number(w.Line ?? w.line),
          count: Number(w.Count ?? w.count),
          winAmount: Number(w.LineWinAmount ?? w.lineWinAmount),
        })),
      );
      if (mat) setTargetMatrix(mat);
    });

    connRef.current = connection;

    connection
      .start()
      .then(() =>
        connection.invoke('InitialState', {
          GameName: 'ShiningCrown',
          IsDemo: true,
          PartnerId: 12345,
        }),
      )
      .catch(() => setStatus('error'));

    return () => {
      connection.stop();
    };
  }, []);

  // Safety timeout — if API doesn't respond, fall back to a random local result.
  // Timeout matches the selected spin speed so the spin never runs longer than intended.
  const safetyMs = spinSpeed === 1 ? 800 : spinSpeed === 2 ? 400 : 200;
  useEffect(() => {
    if (!spinning) return;
    const t = setTimeout(() => {
      setTargetMatrix((prev) => {
        if (prev) return prev;
        return Array.from({ length: 5 }, () =>
          Array.from({ length: 3 }, () => Math.floor(Math.random() * 10)),
        );
      });
    }, safetyMs);
    return () => clearTimeout(t);
  }, [spinning, safetyMs]);

  const spin = useCallback(async () => {
    if (!connRef.current || spinning || status !== 'ready') return;
    setSpinning(true);
    setWinAmount(null);
    setWinLines([]);
    setTargetMatrix(null);
    try {
      await connRef.current.invoke('GameAction', {
        ActionType: 'Spin',
        Model: { Amount: betAmount },
      });
    } catch {
      setSpinning(false);
    }
  }, [spinning, status, betAmount]);

  const handleSpinComplete = useCallback(() => {
    setTargetMatrix((prev) => {
      if (prev) setMatrix(prev);
      return null;
    });
    setSpinning(false);
  }, []);

  return (
    <div ref={containerRef} className="canvas-wrapper">
      <Application background={0x050d3a} resizeTo={containerRef} antialias>
        <ShiningCrownReels
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

          <div className="sc-quick-bets">
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
  );
}
