import { useState } from 'react';

import './BuyBonusModal.css';

import headerImg from '../../assets/buy-bonus/header.png';
import exitImg from '../../assets/buy-bonus/exit.png';
import minusImg from '../../assets/buy-bonus/minus.png';
import plusImg from '../../assets/buy-bonus/plus.png';
import buyImg from '../../assets/buy-bonus/buy.png';
import card5 from '../../assets/buy-bonus/5usd.png';
import card15 from '../../assets/buy-bonus/15usd.png';
import card35 from '../../assets/buy-bonus/35usd.png';
import card10 from '../../assets/buy-bonus/10usd.png';

const BONUS_OPTIONS = [
  { id: 1, image: card5, alt: '5 USD – 5 Free Spins' },
  { id: 2, image: card15, alt: '15 USD – 5 Free Spins' },
  { id: 3, image: card35, alt: '35 USD – 5 Free Spins' },
  { id: 4, image: card10, alt: '10 USD – 5 Free Spins' },
];

interface BuyBonusModalProps {
  onClose: () => void;
  onBuy: (optionId: number, betAmount: number) => void;
  currency: string;
  quickBets: number[];
  defaultBet: number;
}

export function BuyBonusModal({
  onClose,
  onBuy,
  currency,
  quickBets,
  defaultBet,
}: BuyBonusModalProps) {
  const [selectedOption, setSelectedOption] = useState<number>(1);
  const [betIndex, setBetIndex] = useState(() => {
    const idx = quickBets.indexOf(defaultBet);
    return idx >= 0 ? idx : 0;
  });

  const bet = quickBets[betIndex] ?? defaultBet;

  const decreaseBet = () => setBetIndex((i) => Math.max(0, i - 1));
  const increaseBet = () => setBetIndex((i) => Math.min(quickBets.length - 1, i + 1));

  return (
    <div className="bb-backdrop" onClick={onClose}>
      <div className="bb-modal" onClick={(e) => e.stopPropagation()}>

        <button
          className="bb-close-btn"
          type="button"
          onClick={onClose}
          aria-label="Close"
        >
          <img src={exitImg} alt="Close" />
        </button>

        <button className="bb-help-btn" type="button" aria-label="Help">
          ?
        </button>

        <img src={headerImg} alt="Buy Bonus" className="bb-header" />

        <div className="bb-options">
          {BONUS_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              className={`bb-option${selectedOption === option.id ? ' bb-option--selected' : ''}`}
              onClick={() => setSelectedOption(option.id)}
              aria-label={option.alt}
            >
              <img src={option.image} alt={option.alt} className="bb-option-img" />
            </button>
          ))}
        </div>

        <div className="bb-bet-control">
          <button
            className="bb-bet-adj"
            type="button"
            onClick={decreaseBet}
            disabled={betIndex === 0}
            aria-label="Decrease bet"
          >
            <img src={minusImg} alt="−" />
          </button>

          <span className="bb-bet-display">
            {bet.toFixed(2)} {currency}
          </span>

          <button
            className="bb-bet-adj"
            type="button"
            onClick={increaseBet}
            disabled={betIndex === quickBets.length - 1}
            aria-label="Increase bet"
          >
            <img src={plusImg} alt="+" />
          </button>
        </div>

        <button
          className="bb-buy-btn"
          type="button"
          onClick={() => onBuy(selectedOption, bet)}
          aria-label="Buy"
        >
          <img src={buyImg} alt="Buy" />
        </button>
      </div>
    </div>
  );
}
