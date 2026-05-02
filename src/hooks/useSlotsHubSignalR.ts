import type { HubConnection } from '@microsoft/signalr';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react';
import { createSlotsHubConnection, DEFAULT_SLOTS_INITIAL_STATE } from '../api/slotsHubConnection';

export type ConnStatus = 'connecting' | 'ready' | 'error';

export interface WinLine {
  symbol: number;
  line: number;
  count: number;
  winAmount: number;
}

export interface UseSlotsHubSignalROptions {
  /** Used for the safety timeout when the API is slow (matches reel speed). */
  spinSpeed: 1 | 2 | 3;
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
  spin: () => Promise<void>;
  handleSpinComplete: () => void;
}

function defaultMatrix(): number[][] {
  return [
    [9, 6, 0],
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [9, 0, 1],
  ];
}

export function useSlotsHubSignalR({ spinSpeed }: UseSlotsHubSignalROptions): SlotsHubSignalRState {
  const connRef = useRef<HubConnection | null>(null);

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

  useEffect(() => {
    const connection = createSlotsHubConnection();

    connection.on('InitialStateResult', (data: Record<string, unknown>) => {
      console.log('InitialStateResult', data);
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
      console.log('GameActionResult', data);
      const payload = (data.Result ?? data.result) as Record<string, unknown> | undefined;
      const spinResult = (payload?.Result ?? payload?.result) as
        | Record<string, unknown>
        | undefined;
      const mat = (spinResult?.Matrix ?? spinResult?.matrix) as number[][] | undefined;
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
      .then(() => connection.invoke('InitialState', DEFAULT_SLOTS_INITIAL_STATE))
      .catch(() => setStatus('error'));

    return () => {
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
    spin,
    handleSpinComplete,
  };
}
