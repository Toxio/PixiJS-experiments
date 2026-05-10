import {useState} from 'react';

const PAGE_SIZE = 7;

interface SlotBetRowProps {
    quickBets: number[];
    betAmount: number;
    disabled: boolean;
    onBetChange: (amount: number) => void;
}

export function SlotBetRow({quickBets, betAmount, disabled, onBetChange}: SlotBetRowProps) {
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

            {visible.map((b) => (
                <button
                    key={b}
                    type="button"
                    className={`smp-bet-chip${betAmount === b ? ' smp-bet-chip--active' : ''}`}
                    onClick={() => onBetChange(b)}
                    disabled={disabled}
                >
                    {b}
                </button>
            ))}

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
