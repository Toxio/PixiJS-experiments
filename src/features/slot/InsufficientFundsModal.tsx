import './InsufficientFundsModal.css';

interface InsufficientFundsModalProps {
  open: boolean;
  onClose: () => void;
  message?: string;
}

export function InsufficientFundsModal({
  open,
  onClose,
  message = 'На балансе недостаточно средств для выбранной ставки.',
}: InsufficientFundsModalProps) {
  if (!open) return null;

  return (
    <div className="smp-inf-backdrop" role="presentation">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="smp-inf-title"
        className="smp-inf-dialog"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <h2 id="smp-inf-title" className="smp-inf-title">
          Недостаточно средств
        </h2>
        <p className="smp-inf-text">{message}</p>
        <div className="smp-inf-actions">
          <button type="button" className="smp-inf-close" onClick={onClose}>
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
}
