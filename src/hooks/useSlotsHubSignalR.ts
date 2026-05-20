import type { HubConnection } from '@microsoft/signalr';
import {
  type Dispatch,
  type SetStateAction,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { createSlotsHubConnection, DEFAULT_SLOTS_INITIAL_STATE } from '../api/slotsHubConnection';
import { canAffordStake, spendableBalanceForStake } from '../features/slot/stakeBalance';
import { resolveCurrencyCode } from '../utils/currency';

export type ConnStatus = 'connecting' | 'ready' | 'error';

/**
 * One line win from the server. `symbol` is the paytable / combo symbol used to
 * price the win (e.g. lemon), not the texture in every highlighted cell — expanding
 * wilds and substitution mean adjacent cells can still show 👑 / 🔔 while counting
 * toward that same `symbol`.
 */
export interface WinLine {
  symbol: number;
  line: number;
  count: number;
  winAmount: number;
}

export interface UseSlotsHubSignalROptions {
  /** Used for the safety timeout when the API is slow (matches reel speed). */
  spinSpeed: 1 | 2 | 3;
  /** Called when spin is blocked due to insufficient balance (checks run only before spin). */
  onInsufficientFunds?: () => void;
}

export interface ForceSpinPreset {
  matrix: number[][];
  winLines: WinLine[];
  winAmount: number;
  expandingWild?: number[];
  /** Total spin multiplier from server (`Odd`); drives BIG / MEGA / SUPER win overlay. */
  odd?: number;
}

export interface SlotsHubSignalRState {
  status: ConnStatus;
  balance: number;
  currency: string;
  matrix: number[][];
  setMatrix: Dispatch<SetStateAction<number[][]>>;
  quickBets: number[];
  betAmount: number;
  setBetAmount: Dispatch<SetStateAction<number>>;
  spinning: boolean;
  targetMatrix: number[][] | null;
  winAmount: number | null;
  winLines: WinLine[];
  expandingWild: number[];
  /** Last completed spin total multiplier (`Odd` from GameActionResult). */
  spinOdd: number | null;
  spin: () => Promise<void>;
  forceSpin: (preset: ForceSpinPreset) => void;
  handleSpinComplete: () => void;
}

const REEL_COUNT = 5;
const VISIBLE_ROWS = 3;

function defaultMatrix(): number[][] {
  return [
    [9, 6, 0],
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [9, 0, 1],
  ];
}

function isNumberMatrix(m: unknown): m is number[][] {
  return Array.isArray(m) && m.length > 0 && m.every((row) => Array.isArray(row) && row.length > 0);
}

/** Server sends `[reel][row]` (5×3). If we get 3×5 (rows × reels), transpose. */
function normalizeSpinMatrix(raw: number[][]): number[][] {
  let cols = raw;
  if (cols.length === VISIBLE_ROWS && cols[0] && cols[0].length === REEL_COUNT) {
    cols = Array.from({ length: REEL_COUNT }, (_, c) => [
      Number(cols[0][c]) || 0,
      Number(cols[1][c]) || 0,
      Number(cols[2][c]) || 0,
    ]);
  }
  const out: number[][] = [];
  for (let i = 0; i < REEL_COUNT; i++) {
    const col = cols[i] ?? [];
    out.push([Number(col[0]) || 0, Number(col[1]) || 0, Number(col[2]) || 0]);
  }
  return out;
}

function matrixFromRecord(obj: Record<string, unknown> | undefined): number[][] | undefined {
  if (!obj) return undefined;
  const raw = (obj.Matrix ?? obj.matrix) as unknown;
  if (!isNumberMatrix(raw)) return undefined;
  return normalizeSpinMatrix(raw);
}

/** Spin payload: `result.result.matrix` or `result.matrix` (see GameActionResult). */
function extractSpinMatrixFromGameAction(data: Record<string, unknown>): number[][] | undefined {
  const payload = (data.Result ?? data.result) as Record<string, unknown> | undefined;
  const inner = payload
    ? ((payload.Result ?? payload.result) as Record<string, unknown> | undefined)
    : undefined;
  return matrixFromRecord(inner) ?? matrixFromRecord(payload) ?? matrixFromRecord(data);
}

export function useSlotsHubSignalR({
  spinSpeed,
  onInsufficientFunds,
}: UseSlotsHubSignalROptions): SlotsHubSignalRState {
  const connRef = useRef<HubConnection | null>(null);
  /** Latest grid result for the in-flight spin — read in handleSpinComplete without nested setState. */
  const targetMatrixRef = useRef<number[][] | null>(null);

  const [status, setStatus] = useState<ConnStatus>('connecting');
  const [balance, setBalance] = useState(0);
  const [currency, setCurrency] = useState(() => resolveCurrencyCode());
  const [matrix, setMatrix] = useState<number[][]>(defaultMatrix());
  const [quickBets, setQuickBets] = useState<number[]>([1, 2, 5, 10]);
  const [betAmount, setBetAmountState] = useState(2);
  const [spinning, setSpinning] = useState(false);
  const [targetMatrix, setTargetMatrix] = useState<number[][] | null>(null);
  const [winAmount, setWinAmount] = useState<number | null>(null);
  const [winLines, setWinLines] = useState<WinLine[]>([]);
  const [expandingWild, setExpandingWild] = useState<number[]>([0, 0, 0, 0, 0]);
  const [spinOdd, setSpinOdd] = useState<number | null>(null);

  useEffect(() => {
    targetMatrixRef.current = targetMatrix;
  }, [targetMatrix]);

  const setBetAmount = useCallback((value: SetStateAction<number>) => {
    setBetAmountState(value);
  }, []);

  useEffect(() => {
    let disposed = false;
    const connection = createSlotsHubConnection();

    connection.on('InitialStateResult', (data: Record<string, unknown>) => {
      if (disposed) return;
      console.log('InitialStateResult', data);
      const bal = Number(data.Balance ?? data.balance ?? 0);
      setBalance(bal);
      setCurrency(resolveCurrencyCode(String(data.CurrencyCode ?? data.currencyCode ?? 'USD')));
      const matRaw = (data.Matrix ?? data.matrix) as unknown;
      if (isNumberMatrix(matRaw)) setMatrix(normalizeSpinMatrix(matRaw));
      const qb = (data.QuickBets ?? data.quickBets) as number[] | undefined;
      if (qb?.length) setQuickBets(qb);
      const dba = Number(data.DefaultBetAmount ?? data.defaultBetAmount ?? 0);
      if (dba) setBetAmountState(dba);
      setStatus('ready');
    });

    connection.on('GameActionResult', (data: Record<string, unknown>) => {
      if (disposed) return;
      console.log('GameActionResult', data);
      const payload = (data.Result ?? data.result) as Record<string, unknown> | undefined;
      const spinResult = (payload?.Result ?? payload?.result) as
        | Record<string, unknown>
        | undefined;
      const mat = extractSpinMatrixFromGameAction(data);
      const additional = (spinResult?.Additional ?? spinResult?.additional) as
        | Record<string, unknown>
        | undefined;
      const rawWins = (additional?.Wins ?? additional?.wins) as
        | Array<Record<string, unknown>>
        | undefined;

      setBalance(Number(payload?.Balance ?? payload?.balance ?? data.Balance ?? data.balance ?? 0));
      const rawWin = Number(
        payload?.WinAmount ?? payload?.winAmount ?? data.WinAmount ?? data.winAmount ?? 0,
      );
      setWinAmount(Number.isFinite(rawWin) ? rawWin : 0);
      const rawOdd = Number(payload?.Odd ?? payload?.odd ?? data.Odd ?? data.odd ?? Number.NaN);
      setSpinOdd(Number.isFinite(rawOdd) ? rawOdd : null);
      setWinLines(
        (rawWins ?? []).map((w) => ({
          symbol: Number(w.Symbol ?? w.symbol),
          line: Number(w.Line ?? w.line),
          count: Number(w.Count ?? w.count),
          winAmount: Number(w.LineWinAmount ?? w.lineWinAmount),
        })),
      );
      const rawEW = (additional?.ExpandingWild ?? additional?.expandingWild) as
        | number[]
        | undefined;
      setExpandingWild(
        Array.isArray(rawEW) && rawEW.length === REEL_COUNT ? rawEW.map(Number) : [0, 0, 0, 0, 0],
      );
      if (mat?.length) setTargetMatrix(mat);
    });

    connRef.current = connection;

    void connection
      .start()
      .then(async () => {
        if (disposed) return;
        await connection.invoke('InitialState', DEFAULT_SLOTS_INITIAL_STATE);
      })
      .catch(() => {
        if (disposed) return;
        setStatus('error');
      });

    return () => {
      disposed = true;
      connRef.current = null;
      void connection.stop();
    };
  }, []);

  const safetyMs = spinSpeed === 1 ? 350 : spinSpeed === 2 ? 180 : 80;
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
    const stakePool = spendableBalanceForStake(balance, winAmount);
    if (!canAffordStake(betAmount, stakePool)) {
      onInsufficientFunds?.();
      return;
    }
    setSpinning(true);
    setWinAmount(null);
    setWinLines([]);
    setExpandingWild([0, 0, 0, 0, 0]);
    setSpinOdd(null);
    setTargetMatrix(null);
    try {
      await connRef.current.invoke('GameAction', {
        ActionType: 'Spin',
        Model: { Amount: betAmount },
      });
    } catch {
      setSpinning(false);
    }
  }, [spinning, status, betAmount, balance, winAmount, onInsufficientFunds]);

  const forceSpin = useCallback(
    (preset: ForceSpinPreset) => {
      if (spinning) return;
      const stakePool = spendableBalanceForStake(balance, winAmount);
      if (!canAffordStake(betAmount, stakePool)) {
        onInsufficientFunds?.();
        return;
      }
      setSpinning(true);
      setWinAmount(null);
      setWinLines([]);
      setExpandingWild([0, 0, 0, 0, 0]);
      setSpinOdd(null);
      setTargetMatrix(null);
      setTimeout(() => {
        setTargetMatrix(preset.matrix);
        setWinLines(preset.winLines);
        setWinAmount(preset.winAmount);
        setExpandingWild(preset.expandingWild ?? [0, 0, 0, 0, 0]);
        setSpinOdd(preset.odd !== undefined && Number.isFinite(preset.odd) ? preset.odd : null);
      }, 0);
    },
    [spinning, betAmount, balance, winAmount, onInsufficientFunds],
  );

  const handleSpinComplete = useCallback(() => {
    const committed = targetMatrixRef.current;
    if (committed) setMatrix(committed);
    setSpinning(false);
    setTargetMatrix(null);
  }, []);

  return {
    status,
    balance,
    currency,
    matrix,
    setMatrix,
    quickBets,
    betAmount,
    setBetAmount,
    spinning,
    targetMatrix,
    winAmount,
    winLines,
    expandingWild,
    spinOdd,
    spin,
    forceSpin,
    handleSpinComplete,
  };
}
